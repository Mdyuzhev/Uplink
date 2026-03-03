/**
 * Одноразовая миграция storage.json → PostgreSQL.
 * Запускать внутри контейнера: node scripts/migrate-json-to-pg.mjs
 */

import fs from 'node:fs';
import { initStorage, setStorage, closeStorage } from '../postgresStorage.mjs';

const STORAGE_PATH = process.env.STORAGE_PATH || '/app/data/storage.json';

async function migrate() {
    if (!fs.existsSync(STORAGE_PATH)) {
        console.log('storage.json не найден, миграция не нужна');
        return;
    }

    const data = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
    const keys = Object.keys(data);
    console.log(`Найдено ${keys.length} ключей для миграции`);

    await initStorage();

    for (const key of keys) {
        await setStorage(key, data[key]);
        console.log(`  Мигрировано: ${key}`);
    }

    console.log('Миграция завершена');
    await closeStorage();
}

migrate().catch(err => { console.error(err); process.exit(1); });
