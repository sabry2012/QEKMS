/**
 * SecurityService.ts
 * Production-grade Zero Trust Cryptographic Layer
 * Handles Session Handshake (ECDH), Key Wrapping (AES-KW), 
 * Message Confidentiality (AES-GCM), and Integrity (HMAC-SHA256).
 */

class SecurityService {
  private userWrappingKey: CryptoKey | null = null;
  public clientPublicKeyPem: string | null = null;
  // channelId -> { encryptionKey, signingKey, version }
  private channelKeys: Map<string, { enc: CryptoKey; sig: CryptoKey; version: number }> = new Map();
  private sessionInitialized = false;

  async establishSession(serverPublicKeyPemB64: string): Promise<string> {
    if (this.sessionInitialized) {
        return btoa(this.clientPublicKeyPem!);
    }
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true, // Allow export to send public key to backend
        ["deriveKey"]
      );

      const exportedRaw = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      // Format as PEM for the backend
      this.clientPublicKeyPem = this.arrayBufferToPem(exportedRaw);
      
      const serverKeyData = this.pemToArrayBuffer(atob(serverPublicKeyPemB64));
      const serverPubKey = await window.crypto.subtle.importKey(
        "spki",
        serverKeyData,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
      );

      this.userWrappingKey = await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: serverPubKey },
        keyPair.privateKey,
        { name: "AES-KW", length: 256 },
        false,
        ["wrapKey", "unwrapKey"]
      );
      
      this.sessionInitialized = true;

      // Return base64 of the PEM string as expected by the backend
      return btoa(this.clientPublicKeyPem);
    } catch (error) {
      console.error("Session establishment failed:", error);
      throw error;
    }
  }

  async loadChannelKey(channelId: string, version: number, wrappedKeyB64: string): Promise<void> {
    const key = `${channelId}-${version}`;
    if (this.channelKeys.has(key)) return;
    if (!this.userWrappingKey) throw new Error("Session not established");

    const wrappedBuffer = this.base64ToArrayBuffer(wrappedKeyB64);

    const cmk = await window.crypto.subtle.unwrapKey(
      "raw",
      wrappedBuffer,
      this.userWrappingKey,
      { name: "AES-KW" },
      { name: "HMAC", hash: "SHA-256" },
      true,
      ["deriveKey"]
    );
    
    const rawCmk = await window.crypto.subtle.exportKey("raw", cmk);

    const encKey = await window.crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: new TextEncoder().encode("enc") },
      await this.importRawKey(rawCmk, "HKDF"),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );

    const sigKey = await window.crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: new TextEncoder().encode("sig") },
      await this.importRawKey(rawCmk, "HKDF"),
      { name: "HMAC", hash: "SHA-256", length: 256 },
      false,
      ["sign", "verify"]
    );

    this.channelKeys.set(key, { enc: encKey, sig: sigKey, version });
  }

  async prepareOutgoing(text: string, channelId: string, version: number) {
    const key = `${channelId}-${version}`;
    const keySet = this.channelKeys.get(key);
    if (!keySet) throw new Error(`Channel keys not loaded for ${channelId} (v${version})`);

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const nonce = this.arrayBufferToBase64(window.crypto.getRandomValues(new Uint8Array(16)).buffer);
    const timestamp = Date.now();

    try {
      const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        keySet.enc,
        data
      );

      const ciphertext = this.arrayBufferToBase64(ciphertextBuffer);
      const ivB64 = this.arrayBufferToBase64(iv.buffer);
      const fullCiphertext = ciphertext + ":" + ivB64;

      const signedData = encoder.encode(fullCiphertext + nonce + timestamp);
      const signatureBuffer = await window.crypto.subtle.sign(
        { name: "HMAC" },
        keySet.sig,
        signedData
      );

      return {
        ciphertext: fullCiphertext,
        nonce,
        timestamp,
        signature: this.arrayBufferToBase64(signatureBuffer),
        key_version: version
      };
    } catch (err: any) {
      throw new Error(`Encryption failure: ${err.message || 'Cipher error'}`);
    }
  }

  async processIncoming(payload: any, channelId: string): Promise<string> {
    const { ciphertext, nonce, timestamp, signature, key_version } = payload;
    const key = `${channelId}-${key_version || 1}`;
    const keySet = this.channelKeys.get(key);
    
    if (!keySet) {
      throw new Error(`Decryption failed: Keys not loaded for ${channelId} v${key_version}`);
    }

    try {
      const parts = ciphertext.split(":");
      if (parts.length !== 2) throw new Error("Malformed ciphertext payload");
      
      const [actualCipher, ivB64] = parts;
      const iv = this.base64ToArrayBuffer(ivB64);
      const sig = this.base64ToArrayBuffer(signature);
      
      const encoder = new TextEncoder();
      const signedData = encoder.encode(ciphertext + nonce + timestamp);
      
      const isValid = await window.crypto.subtle.verify(
        { name: "HMAC" },
        keySet.sig,
        sig,
        signedData
      );

      if (!isValid) throw new Error("Integrity Failure: Signature mismatch");

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        keySet.enc,
        this.base64ToArrayBuffer(actualCipher)
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (err: any) {
      console.error("Decryption pipeline failure:", err);
      throw new Error(`Decryption failed: ${err.message || 'Integrity or key error'}`);
    }
  }

  // --- HELPERS ---

  private async importRawKey(raw: ArrayBuffer, name: string): Promise<CryptoKey> {
    return window.crypto.subtle.importKey("raw", raw, { name }, false, ["deriveKey"]);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  private arrayBufferToPem(buffer: ArrayBuffer): string {
    const b64 = this.arrayBufferToBase64(buffer);
    return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g)?.join("\n")}\n-----END PUBLIC KEY-----`;
  }

  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n|\r/g, "");
    return this.base64ToArrayBuffer(b64);
  }

  public getEncodedClientPublicKey(): string {
    if (!this.clientPublicKeyPem) throw new Error("Public key not generated");
    return btoa(this.clientPublicKeyPem);
  }

  public hasKey(channelId: string, version: number): boolean {
    return this.channelKeys.has(`${channelId}-${version}`);
  }
}

export const securityService = new SecurityService();
