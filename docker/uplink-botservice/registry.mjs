/**
 * Реестр ботов. Определения и привязки к комнатам.
 */

import { getStorage, setStorage } from './storage.mjs';

const SERVER_NAME = process.env.SERVER_NAME || 'uplink.local';

export const BOT_DEFINITIONS = {
    github: {
        userId: `@bot_github:${SERVER_NAME}`,
        localpart: 'bot_github',
        displayName: 'GitHub Bot',
        description: 'Уведомления о push, PR, issues из GitHub',
        commands: [
            { command: '/github subscribe', description: 'Подписаться на репозиторий', usage: '/github subscribe owner/repo' },
            { command: '/github unsubscribe', description: 'Отписаться от репозитория', usage: '/github unsubscribe owner/repo' },
            { command: '/github list', description: 'Список подписок в канале', usage: '/github list' },
        ],
    },
    ci: {
        userId: `@bot_ci:${SERVER_NAME}`,
        localpart: 'bot_ci',
        displayName: 'CI/CD Bot',
        description: 'Статусы сборок и деплоев',
        commands: [
            { command: '/ci status', description: 'Статус последней сборки', usage: '/ci status [pipeline]' },
            { command: '/ci trigger', description: 'Запустить пайплайн', usage: '/ci trigger [pipeline]' },
        ],
    },
    alerts: {
        userId: `@bot_alerts:${SERVER_NAME}`,
        localpart: 'bot_alerts',
        displayName: 'Alert Bot',
        description: 'Алерты из систем мониторинга (Grafana, Prometheus, Uptime Kuma)',
        commands: [
            { command: '/alerts mute', description: 'Заглушить алерты на время', usage: '/alerts mute 30m' },
            { command: '/alerts status', description: 'Текущие активные алерты', usage: '/alerts status' },
        ],
    },
    helper: {
        userId: `@bot_helper:${SERVER_NAME}`,
        localpart: 'bot_helper',
        displayName: 'Uplink Helper',
        description: 'Системный бот — помощь, информация, утилиты',
        commands: [
            { command: '/help', description: 'Список доступных команд', usage: '/help [бот]' },
            { command: '/poll', description: 'Создать голосование', usage: '/poll "Вопрос" "Вариант 1" "Вариант 2"' },
            { command: '/remind', description: 'Напоминание', usage: '/remind 30m проверить деплой' },
        ],
    },
};

const BINDINGS_KEY = 'bot_room_bindings';

/**
 * Получить привязки ботов к комнатам.
 * Формат: { "!roomId:server": ["github", "ci"] }
 */
export function getBotRoomBindings() {
    return getStorage(BINDINGS_KEY) || {};
}

export function setBotRoomBindings(bindings) {
    setStorage(BINDINGS_KEY, bindings);
}

/**
 * Включить бота в комнате.
 */
export function enableBotInRoom(botId, roomId) {
    const bindings = getBotRoomBindings();
    if (!bindings[roomId]) bindings[roomId] = [];
    if (!bindings[roomId].includes(botId)) {
        bindings[roomId].push(botId);
    }
    setBotRoomBindings(bindings);
}

/**
 * Отключить бота из комнаты.
 */
export function disableBotInRoom(botId, roomId) {
    const bindings = getBotRoomBindings();
    if (!bindings[roomId]) return;
    bindings[roomId] = bindings[roomId].filter(id => id !== botId);
    if (bindings[roomId].length === 0) delete bindings[roomId];
    setBotRoomBindings(bindings);
}

/**
 * Список ботов для API — с информацией о привязке к комнате.
 */
export function getBotsForRoom(roomId) {
    const bindings = getBotRoomBindings();
    const roomBots = bindings[roomId] || [];
    return Object.entries(BOT_DEFINITIONS).map(([id, bot]) => ({
        id,
        displayName: bot.displayName,
        description: bot.description,
        commands: bot.commands,
        enabledInRoom: roomBots.includes(id),
    }));
}

/**
 * Все команды всех ботов (для /help и фронтенда).
 */
export function getAllBotCommands() {
    const result = [];
    for (const [id, bot] of Object.entries(BOT_DEFINITIONS)) {
        for (const cmd of bot.commands) {
            result.push({
                ...cmd,
                botId: id,
                botName: bot.displayName,
            });
        }
    }
    return result;
}
