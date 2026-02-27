/**
 * Простое key-value хранилище на JSON-файле.
 * Для первого этапа достаточно — при росте заменить на SQLite/PostgreSQL.
 */

import fs from 'node:fs';
import path from 'node:path';

const STORAGE_PATH = process.env.STORAGE_PATH || '/app/data/storage.json';

let cache = {};

function loadFromDisk() {
    try {
        if (fs.existsSync(STORAGE_PATH)) {
            cache = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
        }
    } catch (err) {
        console.error('Ошибка чтения storage:', err);
        cache = {};
    }
}

function saveToDisk() {
    try {
        fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
        fs.writeFileSync(STORAGE_PATH, JSON.stringify(cache, null, 2));
    } catch (err) {
        console.error('Ошибка записи storage:', err);
    }
}

// Загрузить при старте
loadFromDisk();

export function getStorage(key) {
    return cache[key] ?? null;
}

export function setStorage(key, value) {
    cache[key] = value;
    saveToDisk();
}

export function deleteStorage(key) {
    delete cache[key];
    saveToDisk();
}

export function getAllStorageKeys() {
    return Object.keys(cache);
}
