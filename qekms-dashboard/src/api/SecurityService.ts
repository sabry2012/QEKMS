/**
 * SecurityService.ts
 * Zero Trust Cryptographic Layer — Frontend
 *
 * CRITICAL ALIGNMENT NOTE:
 * The backend (QEKMS_service.py) uses:
 *   1. ECDH shared_secret = server_priv.exchange(ECDH, client_pub)  ← raw bytes, NO HKDF
 *   2. wrapped = aes_key_wrap(wrapping_key=shared_secret, plain_key=master_key)  ← RFC 3394
 *   3. signing_key = HKDF(master_key, info=b"sig")
 *   4. enc_key    = HKDF(master_key, info=b"enc")
 *
 * This frontend MUST mirror (1) and (2) exactly:
 *   - deriveBits(ECDH)  → 256 raw bits = wrapping key material
 *   - importKey("raw", rawBits, AES-KW) → wrapping CryptoKey
 *   - unwrapKey("raw", wrappedMaster, wrappingKey, AES-KW, HKDF) → CMK for HKDF
 *
 * Then (3) and (4) are applied client-side to derive enc/sig keys.
 */

class SecurityService {
  // The client's ephemeral ECDH key-pair (generated once per session)
  private clientKeyPair: CryptoKeyPair | null = null;

  // The raw ECDH shared secret imported as an AES-KW CryptoKey
  private userWrappingKey: CryptoKey | null = null;

  // PEM-formatted client public key (sent to server)
  public clientPublicKeyPem: string | null = null;

  // channelKey cache: `${channelId}-${version}` → { enc, sig }
  private channelKeys: Map<string, { enc: CryptoKey; sig: CryptoKey; version: number }> = new Map();

  // Guard: handshake runs exactly once per browser session
  private sessionInitialized = false;

  // ──────────────────────────────────────────────────────────────────
  //  1. ECDH Handshake
  // ──────────────────────────────────────────────────────────────────

  /**
   * Perform ECDH key exchange with the server.
   * Returns base64(PEM(clientPublicKey)) for the backend.
   *
   * Idempotent: safe to call multiple times; only runs once.
   */
  async establishSession(serverPublicKeyPemB64: string): Promise<string> {
    if (this.sessionInitialized && this.clientPublicKeyPem) {
      return btoa(this.clientPublicKeyPem);
    }

    try {
      // Generate ephemeral client ECDH key-pair
      this.clientKeyPair = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']           // ← deriveBits, NOT deriveKey
      );

      // Export client public key → SPKI → PEM
      const spkiBuffer = await window.crypto.subtle.exportKey('spki', this.clientKeyPair.publicKey);
      this.clientPublicKeyPem = this._spkiToPem(spkiBuffer);

      // Import server public key
      const serverPemBytes = this._pemToSpki(atob(serverPublicKeyPemB64));
      const serverPublicKey = await window.crypto.subtle.importKey(
        'spki',
        serverPemBytes,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      // ── CRITICAL: derive raw ECDH shared secret (256 bits = 32 bytes) ──
      // Backend does: shared_secret = server_priv.exchange(ECDH, client_pub)
      // This is the P-256 raw shared secret x-coordinate — 32 bytes.
      const rawSharedBits = await window.crypto.subtle.deriveBits(
        { name: 'ECDH', public: serverPublicKey },
        this.clientKeyPair.privateKey,
        256  // 32 bytes
      );

      // Import those 32 raw bytes as an AES-KW key — matches backend's aes_key_wrap()
      this.userWrappingKey = await window.crypto.subtle.importKey(
        'raw',
        rawSharedBits,
        { name: 'AES-KW' },
        false,
        ['unwrapKey']
      );

      this.sessionInitialized = true;
      return btoa(this.clientPublicKeyPem);

    } catch (error) {
      console.error('[SecurityService] Session establishment failed:', error);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  //  2. Channel Key Loading
  // ──────────────────────────────────────────────────────────────────

  /**
   * Unwrap the channel master key (sent wrapped by the server),
   * then derive enc + sig sub-keys via HKDF — matching backend's
   * derive_encryption_key() and derive_signing_key().
   *
   * Idempotent: if already loaded for this version, returns immediately.
   */
  async loadChannelKey(channelId: string, wrappedKeyB64: string, version: number): Promise<void> {
    const cacheKey = `${channelId}-${version}`;
    if (this.channelKeys.has(cacheKey)) return;

    if (!this.userWrappingKey) {
      throw new Error('[SecurityService] Session not established — call establishSession() first.');
    }

    try {
      const wrappedBuffer = this._b64ToBuffer(wrappedKeyB64);

      // ── Step 1: AES-KW unwrap via SubtleCrypto ──────────────────────────
      // WebCrypto does not support HKDF as a target algorithm for unwrapKey,
      // so we unwrap into a raw extractable key first, then re-import as HKDF.
      //
      // Backend: aes_key_wrap(raw_ecdh_secret_32b, master_key_32b)
      //          → 40-byte RFC 3394 wrapped blob → base64
      const masterKeyHandle = await window.crypto.subtle.unwrapKey(
        'raw',                      // format of the plaintext key bytes
        wrappedBuffer,              // the 40-byte AES-KW wrapped blob
        this.userWrappingKey,       // AES-256-KW key (raw ECDH shared secret)
        { name: 'AES-KW' },         // unwrapping algorithm
        { name: 'AES-GCM', length: 256 }, // temp format — we'll export & re-import
        true,                       // extractable so we can export the raw bytes
        ['encrypt', 'decrypt']      // temp usage (just to satisfy the API)
      );

      // ── Step 2: Export raw bytes, re-import as HKDF base key ────────────
      const rawMasterBytes = await window.crypto.subtle.exportKey('raw', masterKeyHandle);

      const hkdfBaseKey = await window.crypto.subtle.importKey(
        'raw',
        rawMasterBytes,
        { name: 'HKDF' },
        false,
        ['deriveKey']
      );

      // ── Step 3: Derive AES-GCM enc key — HKDF(master, info="enc") ───────
      // Matches backend: derive_encryption_key(master) → HKDF(SHA-256, info=b"enc")
      const encKey = await window.crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: new Uint8Array(0),
          info: new TextEncoder().encode('enc'),
        },
        hkdfBaseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // ── Step 4: Derive HMAC sig key — HKDF(master, info="sig") ──────────
      const sigKey = await window.crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: new Uint8Array(0),
          info: new TextEncoder().encode('sig'),
        },
        hkdfBaseKey,
        { name: 'HMAC', hash: 'SHA-256', length: 256 },
        false,
        ['sign', 'verify']
      );

      this.channelKeys.set(cacheKey, { enc: encKey, sig: sigKey, version });

    } catch (error) {
      console.error(`[SecurityService] loadChannelKey failed for ${channelId} v${version}:`, error);
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  //  3. Encrypt outgoing message
  // ──────────────────────────────────────────────────────────────────

  async prepareOutgoing(text: string, channelId: string, version: number) {
    const cacheKey = `${channelId}-${version}`;
    const keySet = this.channelKeys.get(cacheKey);
    if (!keySet) throw new Error(`[SecurityService] Keys not loaded for ${channelId} v${version}`);

    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const nonce = this._bufToB64(window.crypto.getRandomValues(new Uint8Array(16)).buffer);
    const timestamp = Date.now();

    // AES-GCM encrypt
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      keySet.enc,
      data
    );

    const ciphertext = this._bufToB64(ciphertextBuffer);
    const ivB64 = this._bufToB64(iv.buffer);
    const fullCiphertext = `${ciphertext}:${ivB64}`;

    // HMAC sign: ciphertext + nonce + timestamp (Standardized with separators)
    const signedData = encoder.encode(`${fullCiphertext}|${nonce}|${timestamp}`);
    const signatureBuffer = await window.crypto.subtle.sign({ name: 'HMAC' }, keySet.sig, signedData);

    return {
      ciphertext: fullCiphertext,
      nonce,
      timestamp,
      signature: this._bufToB64(signatureBuffer),
      key_version: version,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  //  4. Decrypt incoming message
  // ──────────────────────────────────────────────────────────────────

  async processIncoming(payload: any, channelId: string): Promise<string> {
    const { ciphertext, nonce, timestamp, signature, key_version } = payload;
    const version = key_version ?? 1;
    const cacheKey = `${channelId}-${version}`;
    const keySet = this.channelKeys.get(cacheKey);

    if (!keySet) {
      throw new Error(`[SecurityService] Keys not loaded for channel ${channelId} v${version}`);
    }

    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 2) throw new Error('Malformed ciphertext — expected "cipher:iv"');

      const [actualCipher, ivB64] = parts;
      const iv = this._b64ToBuffer(ivB64);
      const sig = this._b64ToBuffer(signature);

      // Verify HMAC — Standardized with separators
      const encoder = new TextEncoder();
      const signedData = encoder.encode(`${ciphertext}|${nonce}|${timestamp}`);
      const isValid = await window.crypto.subtle.verify({ name: 'HMAC' }, keySet.sig, sig, signedData);
      if (!isValid) throw new Error('Integrity Failure: HMAC signature mismatch');

      // AES-GCM decrypt
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        keySet.enc,
        this._b64ToBuffer(actualCipher)
      );

      return new TextDecoder().decode(decryptedBuffer);

    } catch (err: any) {
      console.error('[SecurityService] Decryption failed:', err);
      throw new Error(`Decryption failed: ${err.message ?? 'Unknown error'}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  //  Public helpers
  // ──────────────────────────────────────────────────────────────────

  public getEncodedClientPublicKey(): string {
    if (!this.clientPublicKeyPem) {
      throw new Error('[SecurityService] Public key not yet generated — call establishSession() first.');
    }
    return btoa(this.clientPublicKeyPem);
  }

  public hasKey(channelId: string, version: number): boolean {
    return this.channelKeys.has(`${channelId}-${version}`);
  }

  public isReady(): boolean {
    return this.sessionInitialized && this.userWrappingKey !== null;
  }

  // ──────────────────────────────────────────────────────────────────
  //  Private utility methods
  // ──────────────────────────────────────────────────────────────────

  private _bufToB64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private _b64ToBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private _spkiToPem(spkiBuffer: ArrayBuffer): string {
    const b64 = this._bufToB64(spkiBuffer);
    const lines = b64.match(/.{1,64}/g)?.join('\n') ?? b64;
    return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
  }

  private _pemToSpki(pem: string): ArrayBuffer {
    const b64 = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\n|\r/g, '');
    return this._b64ToBuffer(b64);
  }
}

// Singleton — one session per browser tab
export const securityService = new SecurityService();
