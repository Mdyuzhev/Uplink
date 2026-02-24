/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Все URL-ы вычисляются из window.location — работает в любом режиме:
 *
 *   localhost:5173                        → Dev (Vite), сервисы напрямую
 *   localhost:5174 / 192.168.1.74:5174    → Prod LAN (nginx)
 *   *.trycloudflare.com                   → Cloudflare Tunnel (HTTPS)
 */

const host = window.location.hostname;
const port = window.location.port;
const isDev = port === '5173';
const isSecure = window.location.protocol === 'https:';

/**
 * Определяем режим доступа:
 * - external: через Cloudflare Tunnel (HTTPS, без порта или 443)
 *   LiveKit через nginx WebSocket proxy: wss://domain/livekit-ws
 * - lan: LAN или localhost (HTTP, порт 5174)
 *   LiveKit напрямую: ws://host:7880
 * - dev: Vite dev server (порт 5173)
 *   LiveKit напрямую: ws://host:7880
 */
const isExternal = isSecure && (port === '' || port === '443');

export const config = {
    /** Matrix homeserver (Synapse) */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /**
     * LiveKit Server (WebSocket).
     * External (Cloudflare): через nginx proxy /livekit-ws
     * LAN/Dev: напрямую на порт 7880
     */
    livekitUrl: isExternal
        ? `wss://${host}/livekit-ws/`
        : `ws://${host}:7880`,

    /** Сервис генерации LiveKit-токенов */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
