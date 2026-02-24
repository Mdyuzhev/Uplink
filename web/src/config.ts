/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Все URL-ы вычисляются из window.location — работает в любом режиме:
 *
 *   localhost:5173                        → Dev (Vite), сервисы напрямую
 *   localhost:5174 / 192.168.1.74:5174    → Prod LAN (nginx)
 *   uplink.yourdomain.com                 → Cloudflare Tunnel (HTTPS)
 *   *.trycloudflare.com                   → Cloudflare Quick Tunnel (HTTPS)
 */

const host = window.location.hostname;
const isDev = window.location.port === '5173';
const isSecure = window.location.protocol === 'https:';

export const config = {
    /**
     * Matrix homeserver (Synapse).
     * Dev: напрямую на порт 8008.
     * Prod/Cloudflare: через nginx proxy (/_matrix/ → synapse:8008).
     */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /**
     * LiveKit Server (WebSocket для WebRTC).
     * Всегда напрямую — WebRTC нельзя проксировать через nginx.
     * wss:// для HTTPS, ws:// для HTTP (LAN).
     *
     * ВАЖНО: через Cloudflare Tunnel LiveKit НЕ работает —
     * WebRTC требует прямое UDP-соединение. Звонки работают только в LAN.
     */
    livekitUrl: isDev
        ? `ws://${host}:7880`
        : `${isSecure ? 'wss' : 'ws'}://${host}:7880`,

    /**
     * Сервис генерации LiveKit-токенов.
     * Dev: напрямую на порт 7890.
     * Prod/Cloudflare: через nginx proxy (/livekit-token/ → livekit-token:7890).
     */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
