/**
 * PostgreSQL-хранилище для botservice.
 * Drop-in замена storage.mjs (JSON-файл).
 *
 * Схема: одна таблица kv_store (key TEXT PRIMARY KEY, value JSONB).
 * Простая KV-модель — достаточна для текущих объёмов.
 * При необходимости — нормализовать в отдельные таблицы.
 */

import pg from 'pg';
import logger from './logger.mjs';

const { Pool } = pg;

let pool = null;

/** Инициализация пула и схемы с retry при недоступности postgres */
export async function initStorage() {
    const connectionString = process.env.DATABASE_URL ||
        `postgresql://${process.env.POSTGRES_USER || 'synapse'}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST || 'postgres'}:5432/${process.env.POSTGRES_DB || 'synapse'}`;

    pool = new Pool({
        connectionString,
        max: 5,                // botservice не генерирует много конкурентных запросов
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });

    // Retry подключения: postgres может стартовать позже botservice
    const MAX_RETRIES = 10;
    const RETRY_DELAY_MS = 3000;
    let client = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            client = await pool.connect();
            break;
        } catch (err) {
            if (attempt >= MAX_RETRIES) throw err;
            logger.warn({ attempt, err: err.message }, `PostgreSQL недоступен, retry через ${RETRY_DELAY_MS}ms...`);
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
    }

    try {
        // Создать схему и таблицу
        await client.query(`CREATE SCHEMA IF NOT EXISTS bots`);
        await client.query(`
            CREATE TABLE IF NOT EXISTS bots.kv_store (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL DEFAULT '{}',
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_kv_key_prefix
            ON bots.kv_store (key text_pattern_ops)
        `);
        logger.info('PostgreSQL storage инициализирован');
    } finally {
        client.release();
    }
}

export async function getStorage(key) {
    if (!pool) return null;
    try {
        const { rows } = await pool.query(
            'SELECT value FROM bots.kv_store WHERE key = $1',
            [key]
        );
        return rows.length > 0 ? rows[0].value : null;
    } catch (err) {
        logger.error({ err, key }, 'Ошибка чтения из PostgreSQL');
        return null;
    }
}

export async function setStorage(key, value) {
    if (!pool) return;
    try {
        await pool.query(
            `INSERT INTO bots.kv_store (key, value, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, JSON.stringify(value)]
        );
    } catch (err) {
        logger.error({ err, key }, 'Ошибка записи в PostgreSQL');
    }
}

export async function deleteStorage(key) {
    if (!pool) return;
    try {
        await pool.query('DELETE FROM bots.kv_store WHERE key = $1', [key]);
    } catch (err) {
        logger.error({ err, key }, 'Ошибка удаления из PostgreSQL');
    }
}

export async function getAllStorageKeys() {
    if (!pool) return [];
    try {
        const { rows } = await pool.query('SELECT key FROM bots.kv_store');
        return rows.map(r => r.key);
    } catch (err) {
        logger.error({ err }, 'Ошибка получения ключей из PostgreSQL');
        return [];
    }
}

/** Проверка работоспособности (для health endpoint) */
export async function checkHealth() {
    if (!pool) return false;
    try {
        await pool.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}

/** Закрыть пул (graceful shutdown) */
export async function closeStorage() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
