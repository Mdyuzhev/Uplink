/**
 * Обработка deep links (uplink:// протокол).
 * Использует @tauri-apps/plugin-deep-link JS API.
 * Работает только в Tauri.
 */

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

interface DeepLinkHandlers {
    onNavigateRoom: (roomId: string) => void;
    onStartCall: (roomId: string) => void;
    onSetServer: (serverUrl: string) => void;
}

/** Инициализация обработчика deep links. Возвращает cleanup-функцию */
export async function initDeepLinkHandler(handlers: DeepLinkHandlers): Promise<() => void> {
    if (!isTauri) return () => {};

    try {
        const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');

        // Проверить, был ли запуск через deep link
        const startUrls = await getCurrent();
        if (startUrls) {
            for (const url of startUrls) {
                processDeepLink(url, handlers);
            }
        }

        // Слушать deep links во время работы
        const unlisten = await onOpenUrl((urls: string[]) => {
            for (const url of urls) {
                processDeepLink(url, handlers);
            }
        });

        return unlisten;
    } catch (err) {
        console.warn('Deep link init failed:', err);
        return () => {};
    }
}

function processDeepLink(url: string, handlers: DeepLinkHandlers): void {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'uplink:') return;

        const path = parsed.hostname + parsed.pathname;

        // uplink://room/!abc:uplink.local
        if (path.startsWith('room/')) {
            const roomId = decodeURIComponent(path.slice(5));
            handlers.onNavigateRoom(roomId);
            return;
        }

        // uplink://call/!abc:uplink.local
        if (path.startsWith('call/')) {
            const roomId = decodeURIComponent(path.slice(5));
            handlers.onStartCall(roomId);
            return;
        }

        // uplink://auth?server=https://...
        if (parsed.hostname === 'auth') {
            const server = parsed.searchParams.get('server');
            if (server) handlers.onSetServer(server);
            return;
        }

        console.warn('Неизвестный deep link:', url);
    } catch (err) {
        console.error('Ошибка парсинга deep link:', err);
    }
}
