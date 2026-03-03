/**
 * Webhook Forwarder — пересылка событий на URL кастомных webhook-ботов.
 * Получает событие → POST на webhook URL → парсит ответ → выполняет действия.
 */

import crypto from 'node:crypto';
import logger from './logger.mjs';
import { sendBotMessage, sendBotReaction } from './matrixClient.mjs';
import { botHasAccessToRoom, setBotStatus } from './customBots.mjs';

const WEBHOOK_TIMEOUT = 10000; // 10 сек
const RETRY_DELAY = 3000;     // 3 сек
const MAX_RETRIES = 1;

/**
 * Подписать тело запроса HMAC-SHA256.
 */
function signPayload(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return 'sha256=' + hmac.digest('hex');
}

/**
 * Переслать событие на webhook URL бота.
 * @param {object} bot — определение кастомного бота
 * @param {object} event — событие для пересылки
 * @returns {object[]} массив действий из ответа
 */
export async function forwardToWebhook(bot, event) {
    if (!bot.webhookUrl) {
        logger.warn({ botId: bot.id }, 'Webhook-бот без URL');
        return [];
    }

    const payload = {
        event_type: event.type,
        command: event.command || null,
        args: event.args || [],
        body: event.body,
        room_id: event.roomId,
        sender: event.sender,
        sender_name: event.senderName || event.sender,
        event_id: event.eventId,
        ts: event.ts || Date.now(),
    };

    const signature = signPayload(payload, bot.webhookSecret);

    let lastError = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            await new Promise(r => setTimeout(r, RETRY_DELAY));
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

            const resp = await fetch(bot.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Uplink-Bot-Id': bot.id,
                    'X-Uplink-Signature': signature,
                    'User-Agent': 'Uplink-BotService/1.0',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!resp.ok) {
                lastError = new Error(`HTTP ${resp.status}: ${await resp.text()}`);
                continue;
            }

            const data = await resp.json();
            const actions = data.actions || [];

            // Бот ответил — онлайн
            setBotStatus(bot.id, 'online');

            // Выполнить действия из ответа
            await executeActions(bot, actions);
            return actions;

        } catch (err) {
            lastError = err;
        }
    }

    // Все попытки провалились
    logger.error({ botId: bot.id, url: bot.webhookUrl, err: lastError }, 'Webhook-бот недоступен');
    setBotStatus(bot.id, 'offline');
    return [];
}

/**
 * Выполнить массив действий от webhook-бота.
 */
async function executeActions(bot, actions) {
    if (!Array.isArray(actions)) return;
    const safeActions = actions.slice(0, 10); // макс 10 действий
    for (const action of safeActions) {
        try {
            // Задержка между действиями
            if (action.delay_ms && action.delay_ms > 0) {
                const delay = Math.min(action.delay_ms, 30000); // макс 30 сек
                await new Promise(r => setTimeout(r, delay));
            }

            switch (action.type) {
                case 'message': {
                    const roomId = action.room_id || action.roomId;
                    if (!roomId) break;
                    if (!botHasAccessToRoom(bot.id, roomId)) {
                        logger.warn({ botId: bot.id, roomId }, 'Бот нет доступа к комнате');
                        break;
                    }
                    if (typeof action.body !== 'string' || action.body.length > 10000) {
                        logger.warn({ botId: bot.id, length: action.body?.length }, 'Слишком длинное сообщение от бота');
                        break;
                    }
                    await sendBotMessage(bot.localpart, roomId, action.body, action.formatted_body);
                    break;
                }
                case 'react': {
                    const roomId = action.room_id || action.roomId;
                    if (!roomId || !action.event_id || !action.emoji) break;
                    if (!botHasAccessToRoom(bot.id, roomId)) break;
                    await sendBotReaction(bot.localpart, roomId, action.event_id, action.emoji);
                    break;
                }
                default:
                    logger.warn({ botId: bot.id, actionType: action.type }, 'Неизвестное действие от webhook-бота');
            }
        } catch (err) {
            logger.error({ err, botId: bot.id, actionType: action.type }, 'Ошибка выполнения действия');
        }
    }
}

/**
 * Верификация webhook URL (challenge-response).
 * Отправляет GET с challenge, бот должен вернуть его.
 */
export async function verifyWebhookUrl(url) {
    const challenge = crypto.randomBytes(16).toString('hex');

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const resp = await fetch(`${url}?challenge=${challenge}`, {
            method: 'GET',
            headers: { 'User-Agent': 'Uplink-BotService/1.0' },
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!resp.ok) return false;

        const data = await resp.json();
        return data.challenge === challenge;
    } catch {
        return false;
    }
}
