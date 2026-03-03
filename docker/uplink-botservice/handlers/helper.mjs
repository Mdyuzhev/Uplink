/**
 * Helper Bot — системные утилиты, /help.
 */

import { sendBotMessage } from '../matrixClient.mjs';
import { getAllBotCommands, getBotRoomBindings } from '../registry.mjs';
import logger from '../logger.mjs';

const BOT = 'bot_helper';

export async function handleCommand({ roomId, sender, subCommand, args, body }) {
    const fullCommand = body.trim().toLowerCase();

    if (fullCommand === '/help' || fullCommand.startsWith('/help')) {
        return handleHelp(roomId, args);
    }

    if (fullCommand.startsWith('/poll')) {
        return handlePoll(roomId, sender, body);
    }

    if (fullCommand.startsWith('/remind')) {
        return handleRemind(roomId, sender, args);
    }

    await sendBotMessage(BOT, roomId,
        'Неизвестная команда. Введите `/help` для списка.'
    );
}

async function handleHelp(roomId, args) {
    const commands = getAllBotCommands();
    const bindings = getBotRoomBindings();
    const roomBots = bindings[roomId] || [];

    let text = '**Доступные команды:**\n\n';

    // Группировка по ботам
    const grouped = {};
    for (const cmd of commands) {
        // Показываем helper всегда + ботов, активных в комнате
        if (cmd.botId !== 'helper' && !roomBots.includes(cmd.botId)) continue;
        if (!grouped[cmd.botName]) grouped[cmd.botName] = [];
        grouped[cmd.botName].push(cmd);
    }

    for (const [botName, cmds] of Object.entries(grouped)) {
        text += `**${botName}:**\n`;
        for (const cmd of cmds) {
            text += `  \`${cmd.command}\` — ${cmd.description}\n`;
        }
        text += '\n';
    }

    // Неактивированные боты
    const inactiveBots = commands
        .filter(c => c.botId !== 'helper' && !roomBots.includes(c.botId))
        .map(c => c.botName);
    const uniqueInactive = [...new Set(inactiveBots)];
    if (uniqueInactive.length > 0) {
        text += `_Неактивные боты: ${uniqueInactive.join(', ')}. Подключите через настройки канала._`;
    }

    await sendBotMessage(BOT, roomId, text);
}

async function handlePoll(roomId, sender, body) {
    // Парсинг: /poll "Вопрос" "Вариант 1" "Вариант 2" ...
    const matches = body.match(/"([^"]+)"/g);
    if (!matches || matches.length < 3) {
        await sendBotMessage(BOT, roomId,
            'Формат: `/poll "Вопрос" "Вариант 1" "Вариант 2"`'
        );
        return;
    }

    const question = matches[0].replace(/"/g, '');
    const options = matches.slice(1).map(m => m.replace(/"/g, ''));
    const emojis = ['1\uFE0F\u20E3', '2\uFE0F\u20E3', '3\uFE0F\u20E3', '4\uFE0F\u20E3', '5\uFE0F\u20E3', '6\uFE0F\u20E3', '7\uFE0F\u20E3', '8\uFE0F\u20E3', '9\uFE0F\u20E3'];

    let text = `**Голосование:** ${question}\n\n`;
    options.forEach((opt, i) => {
        text += `${emojis[i] || `${i + 1}.`} ${opt}\n`;
    });
    text += '\n_Голосуйте реакциями!_';

    await sendBotMessage(BOT, roomId, text);
}

async function handleRemind(roomId, sender, args) {
    if (args.length < 2) {
        await sendBotMessage(BOT, roomId,
            'Формат: `/remind 30m текст напоминания`'
        );
        return;
    }

    const timeStr = args[0];
    const message = args.slice(1).join(' ');

    // Парсинг времени: 30m, 1h, 2d
    const match = timeStr.match(/^(\d+)(m|h|d)$/);
    if (!match) {
        await sendBotMessage(BOT, roomId,
            'Неверный формат времени. Примеры: `5m`, `1h`, `2d`'
        );
        return;
    }

    const amount = parseInt(match[1]);
    const unit = match[2];
    const ms = unit === 'm' ? amount * 60000 : unit === 'h' ? amount * 3600000 : amount * 86400000;

    if (ms > 7 * 86400000) {
        await sendBotMessage(BOT, roomId, 'Максимум — 7 дней.');
        return;
    }

    const senderName = sender.split(':')[0].replace('@', '');
    await sendBotMessage(BOT, roomId,
        `Напоминание установлено: **${message}** через ${timeStr} для @${senderName}`
    );

    // Таймер (в памяти — при перезапуске теряется, для PoC достаточно)
    setTimeout(async () => {
        try {
            await sendBotMessage(BOT, roomId,
                `**Напоминание** для ${sender}: ${message}`
            );
        } catch (err) {
            logger.error({ err }, 'Ошибка напоминания');
        }
    }, ms);
}
