/**
 * Реестр ботов. Определения и привязки к комнатам.
 */

import { getStorage, setStorage } from './postgresStorage.mjs';

const SERVER_NAME = process.env.SERVER_NAME || 'localhost';

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
    wh_ci: {
        userId: `@bot_wh_ci:${SERVER_NAME}`,
        localpart: 'bot_wh_ci',
        displayName: 'WarehouseHub CI',
        description: 'CI/CD уведомления и статус WarehouseHub',
        commands: [
            { command: '/wh status',  description: 'Статус серверов',      usage: '/wh status' },
            { command: '/wh pods',    description: 'Сервисы (docker)',      usage: '/wh pods' },
            { command: '/wh metrics', description: 'CPU / RAM',             usage: '/wh metrics' },
            { command: '/wh robot',   description: 'Статус робота',         usage: '/wh robot' },
            { command: '/wh help',    description: 'Список команд WH Bot',  usage: '/wh help' },
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
export async function getBotRoomBindings() {
    return (await getStorage(BINDINGS_KEY)) || {};
}

export async function setBotRoomBindings(bindings) {
    await setStorage(BINDINGS_KEY, bindings);
}

/**
 * Включить бота в комнате.
 */
export async function enableBotInRoom(botId, roomId) {
    const bindings = await getBotRoomBindings();
    if (!bindings[roomId]) bindings[roomId] = [];
    if (!bindings[roomId].includes(botId)) {
        bindings[roomId].push(botId);
    }
    await setBotRoomBindings(bindings);
}

/**
 * Отключить бота из комнаты.
 */
export async function disableBotInRoom(botId, roomId) {
    const bindings = await getBotRoomBindings();
    if (!bindings[roomId]) return;
    bindings[roomId] = bindings[roomId].filter(id => id !== botId);
    if (bindings[roomId].length === 0) delete bindings[roomId];
    await setBotRoomBindings(bindings);
}

/**
 * Список ботов для API — с информацией о привязке к комнате.
 */
export async function getBotsForRoom(roomId) {
    const bindings = await getBotRoomBindings();
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
