/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Matrix (Synapse) — на homelab, доступ через nginx.
 * LiveKit — в облаке (LiveKit Cloud), единый URL для всех клиентов.
 * Token Service — на homelab, проксируется через nginx.
 */

const host = window.location.hostname;
const port = window.location.port;
const isDev = port === '5173';

export const config = {
    /** Matrix homeserver (Synapse) */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /**
     * LiveKit Cloud — единый URL для всех клиентов.
     * TURN/STUN встроены, работает через любой NAT.
     */
    livekitUrl: 'wss://uplink-3ism3la4.livekit.cloud',

    /** Сервис генерации LiveKit-токенов (на homelab) */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,

    /** Bot Service admin API */
    botApiUrl: isDev
        ? `http://${host}:7891/api`
        : `${window.location.origin}/bot-api`,

    /** Bot WebSocket gateway (для SDK-ботов) */
    botWsUrl: isDev
        ? `ws://${host}:7891/bot-ws`
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/bot-ws`,

    /** Tenor GIF proxy */
    gifApiUrl: isDev
        ? `http://${host}:7891/api/gif`
        : `${window.location.origin}/gif-api`,
};

export function getConfig() {
    return config;
}
