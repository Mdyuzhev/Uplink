/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Все URL-ы вычисляются из window.location.hostname:
 *   localhost      → все сервисы на localhost
 *   192.168.1.50   → все сервисы на 192.168.1.50
 *   flomasterserver → все сервисы на flomasterserver
 *
 * Prod-режим (nginx на 5174):
 *   nginx проксирует /_matrix/ и /livekit-token/ внутрь Docker-сети.
 *   LiveKit WebSocket идёт напрямую (WebRTC нельзя проксировать).
 *
 * Dev-режим (Vite на 5173):
 *   Браузер подключается к сервисам напрямую по портам.
 */
const host = window.location.hostname;
const isDev = window.location.port === '5173';

export const config = {
    /** Matrix homeserver (Synapse) */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /** LiveKit Server (WebSocket для WebRTC) */
    livekitUrl: `ws://${host}:7880`,

    /** Сервис генерации LiveKit-токенов */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
