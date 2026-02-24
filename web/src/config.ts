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
};
