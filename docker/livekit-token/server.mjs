/**
 * Микросервис генерации LiveKit токенов.
 *
 * POST /token
 * Body: { "userId": "@alice:uplink.local", "roomName": "general" }
 * Response: { "token": "eyJ..." }
 *
 * Секреты берутся из переменных окружения.
 * CORS разрешён для localhost (PoC).
 */

import http from 'node:http';
import { AccessToken } from 'livekit-server-sdk';

const PORT = 7890;
const API_KEY = process.env.LIVEKIT_API_KEY || 'uplink-api-key';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'uplink-api-secret-change-me-in-prod';

// TURN server (coturn) для relay медиа через NAT/firewall
const TURN_HOST = process.env.TURN_HOST || '';
const TURN_PORT = process.env.TURN_PORT || '3478';
const TURN_USER = process.env.TURN_USER || 'uplink';
const TURN_PASS = process.env.TURN_PASS || 'uplink-turn-pass';

/**
 * Генерация токена с правами на подключение к комнате,
 * публикацию аудио и подписку на треки других участников.
 */
function generateToken(userId, roomName) {
    const token = new AccessToken(API_KEY, API_SECRET, {
        identity: userId,
        name: userId.split(':')[0].replace('@', ''),
        ttl: '6h',
    });
    token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
    });
    return token.toJwt();
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        return;
    }

    if (req.method === 'POST' && req.url === '/token') {
        try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());

            const { userId, roomName } = body;
            if (!userId || !roomName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'userId и roomName обязательны' }));
                return;
            }

            const token = await generateToken(userId, roomName);

            // Если TURN_HOST задан — отдаём TURN-серверы для relay
            const turnServers = TURN_HOST ? [
                {
                    urls: `turn:${TURN_HOST}:${TURN_PORT}?transport=udp`,
                    username: TURN_USER,
                    credential: TURN_PASS,
                },
                {
                    urls: `turn:${TURN_HOST}:${TURN_PORT}?transport=tcp`,
                    username: TURN_USER,
                    credential: TURN_PASS,
                },
            ] : [];

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ token, turnServers }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`LiveKit Token Service listening on :${PORT}`);
});
