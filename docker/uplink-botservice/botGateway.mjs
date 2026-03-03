/**
 * Bot Gateway — WebSocket сервер для SDK-ботов.
 * Протокол: JSON over WebSocket.
 *
 * SDK-бот подключается к wss://uplink/bot-ws/:token
 * Получает события из комнат, отправляет действия.
 */

import logger from './logger.mjs';
import { WebSocketServer } from 'ws';
import { getCustomBotByToken, botHasAccessToRoom, setBotStatus } from './customBots.mjs';
import { sendBotMessage, sendBotReaction } from './matrixClient.mjs';

/** Активные подключения: botId → Set<ws> */
const connections = new Map();

/** Очередь пропущенных событий при реконнекте (botId → event[]) */
const missedEvents = new Map();
const MAX_MISSED = 100;

const HEARTBEAT_INTERVAL = 30000;

let wss = null;

/**
 * Инициализировать WebSocket gateway на HTTP-сервере.
 * @param {import('http').Server} server
 * @returns {void}
 */
export function initBotGateway(server) {
    wss = new WebSocketServer({ noServer: true });

    // Обработка upgrade запросов (вызывается из server.mjs)
    server.on('upgrade', async (req, socket, head) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const match = url.pathname.match(/^\/bot-ws\/(.+)$/);
            if (!match) {
                socket.destroy();
                return;
            }

            const token = match[1];
            const bot = await getCustomBotByToken(token);
            if (!bot) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            if (bot.mode !== 'sdk') {
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req, bot);
            });
        } catch (err) {
            logger.error({ err }, 'Ошибка WebSocket upgrade');
            socket.destroy();
        }
    });

    wss.on('connection', (ws, _req, bot) => {
        logger.info({ botId: bot.id, botName: bot.name }, 'SDK-бот подключён');

        // Регистрация подключения
        if (!connections.has(bot.id)) {
            connections.set(bot.id, new Set());
        }
        connections.get(bot.id).add(ws);
        setBotStatus(bot.id, 'online').catch(() => {});

        // Отправить пропущенные события
        const missed = missedEvents.get(bot.id) || [];
        if (missed.length > 0) {
            for (const event of missed) {
                safeSend(ws, { type: 'event', event });
            }
            missedEvents.delete(bot.id);
        }

        // Heartbeat
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });

        // Обработка сообщений от бота
        ws.on('message', async (data) => {
            try {
                const msg = JSON.parse(data.toString());
                await handleBotAction(bot, msg, ws);
            } catch (err) {
                safeSend(ws, {
                    type: 'error',
                    error: `Ошибка обработки: ${err.message}`,
                });
            }
        });

        ws.on('close', () => {
            connections.get(bot.id)?.delete(ws);
            if (!connections.get(bot.id)?.size) {
                connections.delete(bot.id);
                setBotStatus(bot.id, 'offline').catch(() => {});
            }
            logger.info({ botId: bot.id }, 'SDK-бот отключён');
        });

        ws.on('error', (err) => {
            logger.error({ err, botId: bot.id }, 'WebSocket ошибка бота');
        });

        // Приветствие
        safeSend(ws, {
            type: 'connected',
            bot_id: bot.id,
            rooms: bot.rooms,
        });
    });

    // Heartbeat interval
    setInterval(() => {
        if (!wss) return;
        for (const ws of wss.clients) {
            if (!ws.isAlive) {
                ws.terminate();
                continue;
            }
            ws.isAlive = false;
            ws.ping();
        }
    }, HEARTBEAT_INTERVAL);

    logger.info('Bot Gateway (WebSocket) запущен');
}

/**
 * Обработка действий от SDK-бота.
 */
async function handleBotAction(bot, msg, ws) {
    if (msg.type !== 'action') return;

    const actionId = msg.action_id || `act_${Date.now()}`;

    switch (msg.action) {
        case 'send_message': {
            const roomId = msg.room_id;
            if (!roomId || !msg.body) {
                safeSend(ws, { type: 'error', action_id: actionId, error: 'room_id и body обязательны' });
                return;
            }
            if (!(await botHasAccessToRoom(bot.id, roomId))) {
                safeSend(ws, { type: 'error', action_id: actionId, error: 'Нет доступа к комнате' });
                return;
            }
            const eventId = await sendBotMessage(bot.localpart, roomId, msg.body, msg.formatted_body);
            safeSend(ws, { type: 'ack', action_id: actionId, event_id: eventId });
            break;
        }
        case 'react': {
            const roomId = msg.room_id;
            if (!roomId || !msg.event_id || !msg.emoji) {
                safeSend(ws, { type: 'error', action_id: actionId, error: 'room_id, event_id и emoji обязательны' });
                return;
            }
            if (!(await botHasAccessToRoom(bot.id, roomId))) {
                safeSend(ws, { type: 'error', action_id: actionId, error: 'Нет доступа к комнате' });
                return;
            }
            await sendBotReaction(bot.localpart, roomId, msg.event_id, msg.emoji);
            safeSend(ws, { type: 'ack', action_id: actionId });
            break;
        }
        default:
            safeSend(ws, { type: 'error', action_id: actionId, error: `Неизвестное действие: ${msg.action}` });
    }
}

/**
 * Отправить событие SDK-ботам, подключённым и привязанным к комнате.
 * @param {import('./types.mjs').MatrixEvent & { type: string, command?: string, args?: string[] }} event
 * @returns {Promise<void>}
 */
export async function pushEventToSdkBots(event) {
    const allBots = [...connections.entries()];

    for (const [botId, wsSet] of allBots) {
        // Проверить привязку к комнате
        if (!(await botHasAccessToRoom(botId, event.room_id))) continue;

        const payload = { type: 'event', event };

        if (wsSet.size > 0) {
            for (const ws of wsSet) {
                safeSend(ws, payload);
            }
        } else {
            // Бот offline — сохранить в очередь
            if (!missedEvents.has(botId)) {
                missedEvents.set(botId, []);
            }
            const queue = missedEvents.get(botId);
            queue.push(event);
            if (queue.length > MAX_MISSED) queue.shift();
        }
    }
}

/**
 * Проверить, есть ли подключённые SDK-боты для указанной комнаты.
 * @param {string} roomId
 * @returns {Promise<boolean>}
 */
export async function hasConnectedSdkBots(roomId) {
    for (const [botId, wsSet] of connections) {
        if (wsSet.size > 0 && (await botHasAccessToRoom(botId, roomId))) {
            return true;
        }
    }
    return false;
}

function safeSend(ws, data) {
    try {
        if (ws.readyState === 1) { // OPEN
            ws.send(JSON.stringify(data));
        }
    } catch (err) {
        logger.error({ err }, 'Ошибка отправки WebSocket');
    }
}
