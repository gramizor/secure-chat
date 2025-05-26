// secureChannel.ts

export class SecureChannel {
    private ownKeyPair!: CryptoKeyPair;
    private sharedSecretKey!: CryptoKey;

    async generateKeyPair(): Promise<void> {
        this.ownKeyPair = await crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "X25519" // можно заменить на 'P-256', если X25519 не поддерживается
            },
            true,
            ["deriveKey"]
        );
    }

    async exportPublicKey(): Promise<string> {
        const raw = await crypto.subtle.exportKey("raw", this.ownKeyPair.publicKey);
        return btoa(String.fromCharCode(...new Uint8Array(raw)));
    }

    async importRemotePublicKey(base64Key: string): Promise<CryptoKey> {
        const raw = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
        return await crypto.subtle.importKey(
            "raw",
            raw,
            { name: "ECDH", namedCurve: "X25519" },
            true,
            []
        );
    }

    async deriveSharedSecret(remotePublicKey: CryptoKey): Promise<void> {
        this.sharedSecretKey = await crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: remotePublicKey
            },
            this.ownKeyPair.privateKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async encryptMessage(plainText: string): Promise<{ cipher: string; iv: string }> {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plainText);
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            this.sharedSecretKey,
            encoded
        );

        return {
            cipher: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
            iv: btoa(String.fromCharCode(...iv))
        };
    }

    async decryptMessage(cipherText: string, base64Iv: string): Promise<string> {
        const iv = Uint8Array.from(atob(base64Iv), c => c.charCodeAt(0));
        const encrypted = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            this.sharedSecretKey,
            encrypted
        );

        return new TextDecoder().decode(decrypted);
    }
}
