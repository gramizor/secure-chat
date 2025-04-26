const encoder = new TextEncoder()
const decoder = new TextDecoder()

const generateKeyMaterial = async (password: string) => {
    const enc = encoder.encode(password)
    return await crypto.subtle.importKey('raw', enc, { name: 'PBKDF2' }, false, ['deriveKey'])
}

const deriveKey = async (password: string, salt: Uint8Array) => {
    const keyMaterial = await generateKeyMaterial(password)
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100_000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )
}

export const encrypt = async (text: string, password: string): Promise<string> => {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const salt = crypto.getRandomValues(new Uint8Array(16))

    const key = await deriveKey(password, salt)
    const encodedText = encoder.encode(text)
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedText
    )

    const combined = new Uint8Array([...salt, ...iv, ...new Uint8Array(ciphertext)])
    return btoa(String.fromCharCode(...combined))
}

export const decrypt = async (encrypted: string, password: string): Promise<string> => {
    const data = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0))
    const salt = data.slice(0, 16)
    const iv = data.slice(16, 28)
    const ciphertext = data.slice(28)

    const key = await deriveKey(password, salt)
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    )

    return decoder.decode(decrypted)
}
