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
    if (isVSCode && window.__UPLINK_STORAGE_BRIDGE__) {
        return cache.get(key) ?? null;
    }
    try {
        return localStorage.getItem(key);
    } catch {
        return cache.get(key) ?? null;
    }
}

export function storageSet(key: string, value: string): void {
    if (isVSCode && window.__UPLINK_STORAGE_BRIDGE__) {
        cache.set(key, value);
        window.__UPLINK_STORAGE_BRIDGE__.setItem(key, value);
        return;
    }
    try {
        localStorage.setItem(key, value);
    } catch {
        cache.set(key, value);
    }
}

export function storageRemove(key: string): void {
    if (isVSCode && window.__UPLINK_STORAGE_BRIDGE__) {
        cache.delete(key);
        window.__UPLINK_STORAGE_BRIDGE__.removeItem(key);
        return;
    }
    try {
        localStorage.removeItem(key);
    } catch {
        cache.delete(key);
    }
}

/**
 * Инициализация — загрузить токены из extension host в кеш.
 * Вызывается в App.tsx перед restoreSession().
 */
export async function initStorage(): Promise<void> {
    if (!isVSCode) return;
    if (!window.__UPLINK_STORAGE_BRIDGE__) {
        console.warn('[storage] VSCode bridge not available, falling back to localStorage');
        return;
    }

    const keys = [
        'uplink_homeserver',
        'uplink_user_id',
        'uplink_access_token',
        'uplink_device_id',
        'uplink_dm_encrypted',
    ];

    for (const key of keys) {
        try {
            const value = await withTimeout(
                window.__UPLINK_STORAGE_BRIDGE__!.getItem(key),
                3000,
            );
            if (value !== null) {
                cache.set(key, value);
            }
        } catch {
            console.warn(`[storage] Timeout loading key: ${key}`);
        }
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), ms),
        ),
    ]);
}
