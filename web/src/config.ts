/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Три окружения:
 * 1. Браузер (prod)    — URL из window.location.origin (nginx проксирует)
 * 2. Браузер (dev)     — прямые URL на localhost-порты
 * 3. Tauri / VSCode    — URL из сохранённого homeserver или настройки
 */

import { storageGet } from './utils/storage';

// --- Определение окружения ---

declare global {
    interface Window {
        __TAURI_INTERNALS__?: unknown;
        __VSCODE__?: boolean;
        __UPLINK_SERVER_URL__?: string; // VSCode передаёт из настроек
    }
}

export const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
export const isVSCode = typeof window !== 'undefined' && !!window.__VSCODE__;
export const isEmbedded = isTauri || isVSCode;

const port = typeof window !== 'undefined' ? window.location.port : '';
const isDev = port === '5173';
const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

/** URL сервера по умолчанию для десктопа и VSCode */
const DEFAULT_SERVER_URL = 'https://uplink.wh-lab.ru';

/**
 * Получить базовый URL сервера.
 *
 * Приоритет:
 * 1. VSCode настройка (window.__UPLINK_SERVER_URL__)
 * 2. Сохранённый homeserver из storage (после логина)
 * 3. DEFAULT_SERVER_URL (для embedded)
 * 4. window.location.origin (для браузера)
 */
function getServerBaseUrl(): string {
    if (isDev) {
        return `http://${host}:8008`;
    }

    if (isEmbedded) {
        // VSCode может передать URL из настроек
        if (window.__UPLINK_SERVER_URL__) {
            return window.__UPLINK_SERVER_URL__.replace(/\/+$/, '');
        }
        // Сохранённый URL после логина
        const stored = storageGet('uplink_homeserver');
        if (stored) {
            return stored.replace(/\/+$/, '');
        }
        return DEFAULT_SERVER_URL;
    }

    // Браузер — через nginx proxy
    return window.location.origin;
}

/** Тип конфигурации */
export interface UplinkConfig {
    matrixHomeserver: string;
    livekitUrl: string;
    tokenServiceUrl: string;
    botApiUrl: string;
    botWsUrl: string;
    gifApiUrl: string;
}

/**
 * Конфигурация — пересчитывается при каждом вызове.
 * После логина URL подтянется из storage.
 */
export function getConfig(): UplinkConfig {
    const base = getServerBaseUrl();

    return {
        /** Matrix homeserver (Synapse) */
        matrixHomeserver: base,

        /** LiveKit Cloud — единый URL для всех клиентов */
        livekitUrl: 'wss://uplink-3ism3la4.livekit.cloud',

        /** Сервис генерации LiveKit-токенов */
        tokenServiceUrl: isDev
            ? `http://${host}:7890`
            : `${base}/livekit-token`,

        /** Bot Service admin API */
        botApiUrl: isDev
            ? `http://${host}:7891/api`
            : `${base}/bot-api`,

        /** Bot WebSocket gateway */
        botWsUrl: isDev
            ? `ws://${host}:7891/bot-ws`
            : `${base.replace(/^http/, 'ws')}/bot-ws`,

        /** GIF proxy */
        gifApiUrl: isDev
            ? `http://${host}:7891/api/gif`
            : `${base}/gif-api`,
    };
}

/**
 * Обратная совместимость — Proxy делегирует в getConfig().
 * Весь существующий код (config.matrixHomeserver) продолжает работать.
 */
export const config = new Proxy({} as UplinkConfig, {
    get(_target, prop: string) {
        return getConfig()[prop as keyof UplinkConfig];
    },
});
