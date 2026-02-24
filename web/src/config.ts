/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Все URL-ы вычисляются из window.location — работает в любом режиме:
 *
 *   localhost:5173         → Dev (Vite), сервисы на localhost по портам
 *   localhost:5174         → Prod (nginx), /_matrix/ проксируется
 *   192.168.1.74:5174      → LAN, /_matrix/ проксируется
 *   flomasterserver...8443 → Tailscale HTTPS, /_matrix/ проксируется
 */

const host = window.location.hostname;
const isDev = window.location.port === '5173';
const isSecure = window.location.protocol === 'https:';

export const config = {
    /**
     * Matrix homeserver (Synapse).
     * Dev: напрямую на порт 8008.
     * Prod/Tailscale: через nginx proxy (/_matrix/ → synapse:8008).
     */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /**
     * LiveKit Server (WebSocket для WebRTC).
     * Всегда напрямую — WebRTC нельзя проксировать через nginx.
     * wss:// для HTTPS (Tailscale), ws:// для HTTP (LAN).
     *
     * ВАЖНО: через Tailscale LiveKit пока НЕ работает —
     * порт 7880 не пробрасывается. Звонки работают только в LAN.
     */
    livekitUrl: isDev
        ? `ws://${host}:7880`
        : `${isSecure ? 'wss' : 'ws'}://${host}:7880`,

    /**
     * Сервис генерации LiveKit-токенов.
     * Dev: напрямую на порт 7890.
     * Prod/Tailscale: через nginx proxy (/livekit-token/ → livekit-token:7890).
     */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
