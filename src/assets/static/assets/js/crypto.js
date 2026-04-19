/**
 * Cryptographic Utility Library (Hardened)
 * File: assets/js/crypto.js
 * AES-GCM 256-bit Encryption
 */
const CryptoUtils = {
    // Generate a key from a password/shared secret using PBKDF2
    // Added: Per-channel salt derivation for increased entropy
    async deriveKey(password, channelId) {
        const enc = new TextEncoder();
        
        // Derive a unique salt for this channel if ID is provided
        // Use a static base salt + channel ID to ensure determinism for the same channel
        const baseSalt = "QEKMS_CORE_SALT_v1";
        const salt = enc.encode(channelId ? `${baseSalt}_${channelId}` : baseSalt);

        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false, // Extractable = false for better security
            ["encrypt", "decrypt"]
        );
    },

    // Encrypt plaintext
    async encrypt(text, key) {
        if (!key) throw new Error("Encryption failed: Missing key");
        
        const enc = new TextEncoder();
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            enc.encode(text)
        );

        // Return IV + Ciphertext encoded as Base64 for transport
        const payload = {
            iv: this.bufferToBase64(iv),
            data: this.bufferToBase64(encrypted)
        };

        return JSON.stringify(payload);
    },

    // Decrypt ciphertext
    async decrypt(payloadJson, key) {
        if (!key) return "[ENCRYPTION ERROR: NO KEY]";
        
        try {
            const payload = JSON.parse(payloadJson);
            const iv = this.base64ToBuffer(payload.iv);
            const data = this.base64ToBuffer(payload.data);

            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: new Uint8Array(iv)
                },
                key,
                data
            );

            const dec = new TextDecoder();
            return dec.decode(decrypted);
        } catch (e) {
            console.error("Decryption failed:", e);
            return "[DECRYPTION ERROR: PAYLOAD TAMPERED OR WRONG KEY]";
        }
    },

    // Utils for ArrayBuffer <-> Base64
    bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    base64ToBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
};

// Export to window
window.CryptoUtils = CryptoUtils;
