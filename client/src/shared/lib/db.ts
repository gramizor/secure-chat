// Открытие IndexedDB для хранения истории чатов
export async function openChatDatabase(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('chatHistory', 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('connections')) {
                db.createObjectStore('connections', { keyPath: 'uuid' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Failed to open database');
    });
}

// Сохранение чата в IndexedDB
export async function saveConnectionHistory(uuid: string, chatName: string) {
    const db = await openChatDatabase();
    const transaction = db.transaction('connections', 'readwrite');
    const store = transaction.objectStore('connections');
    const existing = await new Promise<any>(res => {
        const req = store.get(uuid);
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(undefined);
    });

    if (!existing) {
        store.put({ uuid, chatName });
    }
}

// Получение списка чатов из IndexedDB
export async function getConnectionHistory(): Promise<{ uuid: string, chatName: string }[]> {
    const db = await openChatDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('connections', 'readonly');
        const store = transaction.objectStore('connections');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function connectionExists(uuid: string): Promise<boolean> {
    const db = await openChatDatabase();
    return new Promise((resolve) => {
        const tx = db.transaction('connections', 'readonly');
        const store = tx.objectStore('connections');
        const req = store.get(uuid);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
    });
}