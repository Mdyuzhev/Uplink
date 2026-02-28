/**
 * Обработка Matrix-событий от Synapse через AS API.
 * Маршрутизация slash-команд к встроенным и кастомным ботам.
 * Пересылка событий к SDK- и webhook-ботам.
 */

import { BOT_DEFINITIONS, getBotRoomBindings } from './registry.mjs';
import { sendBotMessage } from './matrixClient.mjs';
import { findCustomBotByCommand, getAllCustomBots, botHasAccessToRoom } from './customBots.mjs';
import { forwardToWebhook } from './webhookForwarder.mjs';
import { pushEventToSdkBots } from './botGateway.mjs';
import { checkRateLimit } from './rateLimiter.mjs';

/**
 * Обработка одного Matrix-события.
 */
export async function handleMatrixEvent(event) {
    // Игнорировать события от наших ботов (избежать циклов)
    if (event.sender?.startsWith('@bot_')) return;

    // Зашифрованные сообщения — боты не могут их прочитать
    if (event.type === 'm.room.encrypted') {
        console.warn(`[botservice] Зашифрованное сообщение в ${event.room_id} от ${event.sender} — боты не читают E2E`);
        return;
    }

    // Только m.room.message
    if (event.type !== 'm.room.message') return;

    const body = event.content?.body;
    if (!body || typeof body !== 'string') return;

    const roomId = event.room_id;

    // Slash-команда → роутинг к конкретному боту
    if (body.startsWith('/')) {
        await routeCommand(roomId, event.sender, body, event.event_id);
    }

    // Пересылка ВСЕХ сообщений кастомным ботам (не только команд)
    await forwardToCustomBots(roomId, event);
}

/**
 * Маршрутизация slash-команды к хендлеру бота.
 */
async function routeCommand(roomId, sender, body, eventId) {
    const parts = body.split(/\s+/);
    const commandRoot = parts[0].toLowerCase();

    // 1. Сначала ищем среди встроенных ботов
    const botEntry = Object.entries(BOT_DEFINITIONS).find(([_id, bot]) =>
        bot.commands.some(cmd =>
            cmd.command.split(' ')[0].toLowerCase() === commandRoot
        )
    );

    if (botEntry) {
        const [botId, botDef] = botEntry;

        if (botId !== 'helper') {
            const bindings = getBotRoomBindings();
            const roomBots = bindings[roomId] || [];
            if (!roomBots.includes(botId)) {
                await sendBotMessage('bot_helper', roomId,
                    `Бот **${botDef.displayName}** не активирован в этом канале. Подключите его в настройках.`
                );
                return;
            }
        }

        // Определить: команда одно- или двухсловная
        const matchingCmd = botDef.commands.find(cmd =>
            cmd.command.split(' ')[0].toLowerCase() === commandRoot
        );
        const isMultiWord = matchingCmd && matchingCmd.command.trim().includes(' ');

        let subCommand, args;
        if (isMultiWord) {
            // "/github subscribe owner/repo" → sub="subscribe", args=["owner/repo"]
            subCommand = parts[1]?.toLowerCase();
            args = parts.slice(2);
        } else {
            // "/remind 30m текст" → sub=undefined, args=["30m", "текст"]
            subCommand = undefined;
            args = parts.slice(1);
        }

        try {
            const handler = await import(`./handlers/${botId}.mjs`);
            await handler.handleCommand({ roomId, sender, subCommand, args, eventId, body });
        } catch (err) {
            console.error(`Ошибка команды ${botId}:`, err);
            await sendBotMessage(botDef.localpart, roomId, `Ошибка выполнения команды: ${err.message}`);
        }
        return;
    }

    // 2. Ищем среди кастомных ботов
    const customBot = findCustomBotByCommand(commandRoot);
    if (customBot) {
        if (!botHasAccessToRoom(customBot.id, roomId)) {
            await sendBotMessage('bot_helper', roomId,
                `Бот **${customBot.name}** не привязан к этому каналу.`
            );
        }
        // Команда будет доставлена через forwardToCustomBots
        return;
    }

    // 3. Неизвестная команда
    await sendBotMessage('bot_helper', roomId,
        `Неизвестная команда \`${commandRoot}\`. Введите \`/help\` для списка команд.`
    );
}

/**
 * Пересылка события всем кастомным ботам, привязанным к этой комнате.
 */
async function forwardToCustomBots(roomId, event) {
    const body = event.content?.body || '';
    const isCommand = body.startsWith('/');

    const parts = body.split(/\s+/);
    const eventPayload = {
        type: isCommand ? 'command' : 'message',
        room_id: roomId,
        sender: event.sender,
        sender_name: event.content?.displayname || event.sender,
        body,
        event_id: event.event_id,
        ts: event.origin_server_ts || Date.now(),
    };

    if (isCommand) {
        eventPayload.command = parts[0].toLowerCase();
        eventPayload.args = parts.slice(1);
    }

    // SDK-боты — WebSocket push
    pushEventToSdkBots(eventPayload);

    // Webhook-боты — HTTP POST
    const allCustom = getAllCustomBots();
    for (const bot of allCustom) {
        if (bot.mode !== 'webhook') continue;
        if (!botHasAccessToRoom(bot.id, roomId)) continue;

        // Для команд — пересылать только если бот обрабатывает эту команду
        if (isCommand && bot.commands.length > 0) {
            const match = bot.commands.some(c =>
                c.command.toLowerCase() === eventPayload.command
            );
            if (!match) continue;
        }

        if (!checkRateLimit(bot.id, 'message')) {
            console.warn(`Rate limit для webhook-бота ${bot.id}`);
            continue;
        }

        forwardToWebhook(bot, eventPayload).catch(err => {
            console.error(`Webhook forward ошибка для ${bot.id}:`, err.message);
        });
    }
}
