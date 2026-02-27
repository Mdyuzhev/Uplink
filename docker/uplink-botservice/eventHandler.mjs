/**
 * Обработка Matrix-событий от Synapse через AS API.
 * Маршрутизация slash-команд к нужным ботам.
 */

import { BOT_DEFINITIONS, getBotRoomBindings } from './registry.mjs';
import { sendBotMessage } from './matrixClient.mjs';

/**
 * Обработка одного Matrix-события.
 */
export async function handleMatrixEvent(event) {
    // Игнорировать события от наших ботов (избежать циклов)
    if (event.sender?.startsWith('@bot_')) return;

    // Только m.room.message
    if (event.type !== 'm.room.message') return;

    const body = event.content?.body;
    if (!body || typeof body !== 'string') return;

    const roomId = event.room_id;

    // Slash-команда?
    if (body.startsWith('/')) {
        await routeCommand(roomId, event.sender, body, event.event_id);
    }
}

/**
 * Маршрутизация slash-команды к хендлеру бота.
 */
async function routeCommand(roomId, sender, body, eventId) {
    const parts = body.split(/\s+/);
    const commandRoot = parts[0].toLowerCase();
    const subCommand = parts[1]?.toLowerCase();
    const args = parts.slice(2);

    // Найти бота по корню команды
    const botEntry = Object.entries(BOT_DEFINITIONS).find(([_id, bot]) =>
        bot.commands.some(cmd =>
            cmd.command.split(' ')[0].toLowerCase() === commandRoot
        )
    );

    if (!botEntry) {
        await sendBotMessage('bot_helper', roomId,
            `Неизвестная команда \`${commandRoot}\`. Введите \`/help\` для списка команд.`
        );
        return;
    }

    const [botId, botDef] = botEntry;

    // Проверить что бот активирован в этой комнате (helper всегда доступен)
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

    // Делегировать обработку хендлеру
    try {
        const handler = await import(`./handlers/${botId}.mjs`);
        await handler.handleCommand({ roomId, sender, subCommand, args, eventId, body });
    } catch (err) {
        console.error(`Ошибка команды ${botId}:`, err);
        await sendBotMessage(
            botDef.localpart,
            roomId,
            `Ошибка выполнения команды: ${err.message}`
        );
    }
}
