// secureChannel.ts
export class SecureChannel {
    private keyPair!: CryptoKeyPair;
    private sharedSecret!: CryptoKey;

    static async initNew(): Promise<{ channel: SecureChannel; publicKey: string }> {
        console.log('[CR] SecureChannel.initNew → генерируем ключи');
        const sc = new SecureChannel();
        sc.keyPair = await crypto.subtle.generateKey(
            {name: 'ECDH', namedCurve: 'P-256'},
            true,
            ['deriveKey']
        );
        console.log('[CR] SecureChannel.initNew → ключи сгенерированы');
        const publicKey = await sc.exportPublicKey();
        console.log('[CR] SecureChannel.initNew → экспортированный публичный ключ:', publicKey);
        return {channel: sc, publicKey};
    }

    static async initWithRemoteKey(base64RemoteKey: string): Promise<{ channel: SecureChannel; publicKey: string }> {
        console.log('[CR] SecureChannel.initWithRemoteKey → публичный ключ от собеседника:', base64RemoteKey);
        const sc = new SecureChannel();
        console.log('[CR] SecureChannel.initWithRemoteKey → генерируем свои ключи');
        sc.keyPair = await crypto.subtle.generateKey(
            {name: 'ECDH', namedCurve: 'P-256'},
            true,
            ['deriveKey']
        );
        const remoteKey = await sc.importPublicKey(base64RemoteKey);
        console.log('[CR] SecureChannel.initWithRemoteKey → импортирован удалённый ключ');
        sc.sharedSecret = await sc.deriveSharedSecret(remoteKey);
        console.log('[CR] SecureChannel.initWithRemoteKey → общий секрет установлен');
        const publicKey = await sc.exportPublicKey();
        return {channel: sc, publicKey};
    }

    async setRemotePublicKey(base64: string): Promise<void> {
        console.log('[CR] setRemotePublicKey → импорт ключа:', base64);
        const remoteKey = await this.importPublicKey(base64);
        this.sharedSecret = await this.deriveSharedSecret(remoteKey);
        console.log('[CR] setRemotePublicKey → общий секрет установлен');
    }

    async encryptMessage(plainText: string): Promise<{ cipher: string; iv: string }> {
        console.log('[CR] encryptMessage → шифруем сообщение:', plainText);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plainText);
        const encrypted = await crypto.subtle.encrypt(
            {name: 'AES-GCM', iv},
            this.sharedSecret,
            encoded
        );
        const cipher = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
        const ivBase64 = btoa(String.fromCharCode(...iv));
        console.log('[CR] encryptMessage → готово, cipher:', cipher, 'iv:', ivBase64);
        return {
            cipher,
            iv: ivBase64
        };
    }

    async decryptMessage(cipher: string, ivBase64: string): Promise<string> {
        console.log('[CR] decryptMessage → дешифруем сообщение:', cipher);
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const data = Uint8Array.from(atob(cipher), c => c.charCodeAt(0));
        const decrypted = await crypto.subtle.decrypt(
            {name: 'AES-GCM', iv},
            this.sharedSecret,
            data
        );
        const plain = new TextDecoder().decode(decrypted);
        console.log('[CR] decryptMessage → расшифровано:', plain);
        return plain;
    }

    private async exportPublicKey(): Promise<string> {
        const raw = await crypto.subtle.exportKey('raw', this.keyPair.publicKey);
        return btoa(String.fromCharCode(...new Uint8Array(raw)));
    }

    private async importPublicKey(base64: string): Promise<CryptoKey> {
        const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        return await crypto.subtle.importKey(
            'raw',
            raw,
            {name: 'ECDH', namedCurve: 'P-256'},
            true,
            []
        );
    }

    private async deriveSharedSecret(remoteKey: CryptoKey): Promise<CryptoKey> {
        console.log('[CR] deriveSharedSecret → вычисляем общий секретный ключ');
        return await crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: remoteKey
            },
            this.keyPair.privateKey,
            {name: 'AES-GCM', length: 256},
            false,
            ['encrypt', 'decrypt']
        );
    }
}