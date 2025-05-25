import { v4 as uuidNew } from 'uuid';

export function getOrGenerateUUID(): string {
    let uuid = localStorage.getItem('uuid');
    if (!uuid) {
        uuid = uuidNew(); // 👈 важно: вызвать функцию
        localStorage.setItem('uuid', uuid); // 👈 сохраняется строка
    }
    return uuid;
}
