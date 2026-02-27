/**
 * Абстракция над хранилищем.
 *
 * В браузере/Tauri — localStorage (синхронный).
 * В VS Code WebView — мост через postMessage (асинхронный).
 *
 * При инициализации загружаем все ключи из моста в in-memory кеш,
 * после чего get работает синхронно.
 */

interface StorageBridge {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

declare global {
    interface Window {
        __VSCODE__?: boolean;
        __UPLINK_STORAGE_BRIDGE__?: StorageBridge;
    }
}

const isVSCode = typeof window !== 'undefined' && !!window.__VSCODE__;
const cache = new Map<string, string | null>();

export function storageGet(key: string): string | null {
    if (isVSCode) {
        return cache.get(key) ?? null;
    }
    return localStorage.getItem(key);
}

export function storageSet(key: string, value: string): void {
    if (isVSCode) {
        cache.set(key, value);
        window.__UPLINK_STORAGE_BRIDGE__?.setItem(key, value);
        return;
    }
    localStorage.setItem(key, value);
}

export function storageRemove(key: string): void {
    if (isVSCode) {
        cache.delete(key);
        window.__UPLINK_STORAGE_BRIDGE__?.removeItem(key);
        return;
    }
    localStorage.removeItem(key);
}

/**
 * Инициализация — загрузить токены из extension host в кеш.
 * Вызывается в App.tsx перед restoreSession().
 */
export async function initStorage(): Promise<void> {
    if (!isVSCode) return;

    const keys = [
        'uplink_homeserver',
        'uplink_user_id',
        'uplink_access_token',
        'uplink_device_id',
    ];

    for (const key of keys) {
        const value = await window.__UPLINK_STORAGE_BRIDGE__!.getItem(key);
        if (value !== null) {
            cache.set(key, value);
        }
    }
}
