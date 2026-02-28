/**
 * Реестр и управление кастомными ботами.
 * CRUD операции, генерация токенов, создание Matrix-пользователей.
 */

import crypto from 'node:crypto';
import { getStorage, setStorage } from './storage.mjs';
import { ensureBotUser, joinBotToRoom } from './matrixClient.mjs';

const SERVER_NAME = process.env.SERVER_NAME || 'uplink.local';
const CUSTOM_BOTS_KEY = 'custom_bots';

/**
 * Все кастомные боты. Формат: { [botId]: CustomBotDef }
 */
function getCustomBots() {
    return getStorage(CUSTOM_BOTS_KEY) || {};
}

function saveCustomBots(bots) {
    setStorage(CUSTOM_BOTS_KEY, bots);
}

/**
 * Генерация токена бота (32 байта hex).
 */
function generateToken() {
    return 'bot_' + crypto.randomBytes(32).toString('hex');
}

/**
 * Генерация уникального botId.
 */
function generateBotId() {
    return 'custom_' + crypto.randomBytes(8).toString('hex');
}

/**
 * Создать кастомного бота.
 * @returns {{ bot, token }} — данные бота и токен (показывается один раз)
 */
export async function createCustomBot({ name, description, mode, webhookUrl, commands, owner }) {
    const botId = generateBotId();
    const token = generateToken();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const localpart = `bot_${botId}`;
    const userId = `@${localpart}:${SERVER_NAME}`;

    // Зарегистрировать Matrix-пользователя
    await ensureBotUser(localpart, name);

    const bot = {
        id: botId,
        name,
        description: description || '',
        mode, // 'sdk' | 'webhook'
        webhookUrl: mode === 'webhook' ? webhookUrl : null,
        webhookSecret: mode === 'webhook' ? crypto.randomBytes(32).toString('hex') : null,
        commands: commands || [],
        rooms: [],
        owner,
        userId,
        localpart,
        tokenHash,
        status: 'offline',
        created: Date.now(),
        lastSeen: null,
    };

    const bots = getCustomBots();
    bots[botId] = bot;
    saveCustomBots(bots);

    return { bot, token };
}

/**
 * Получить бота по ID.
 */
export function getCustomBot(botId) {
    const bots = getCustomBots();
    return bots[botId] || null;
}

/**
 * Получить бота по токену (через hash).
 */
export function getCustomBotByToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const bots = getCustomBots();
    return Object.values(bots).find(b => b.tokenHash === tokenHash) || null;
}

/**
 * Список ботов пользователя.
 */
export function getCustomBotsByOwner(owner) {
    const bots = getCustomBots();
    return Object.values(bots).filter(b => b.owner === owner);
}

/**
 * Список всех кастомных ботов.
 */
export function getAllCustomBots() {
    return Object.values(getCustomBots());
}

/**
 * Обновить бота.
 */
export function updateCustomBot(botId, updates) {
    const bots = getCustomBots();
    if (!bots[botId]) return null;

    const allowed = ['name', 'description', 'webhookUrl', 'commands'];
    for (const key of allowed) {
        if (updates[key] !== undefined) {
            bots[botId][key] = updates[key];
        }
    }

    // Обновить displayName в Matrix, если имя изменилось
    if (updates.name) {
        ensureBotUser(bots[botId].localpart, updates.name).catch(() => {});
    }

    saveCustomBots(bots);
    return bots[botId];
}

/**
 * Удалить бота.
 */
export function deleteCustomBot(botId) {
    const bots = getCustomBots();
    if (!bots[botId]) return false;
    delete bots[botId];
    saveCustomBots(bots);
    return true;
}

/**
 * Перевыпустить токен.
 * @returns {string} новый токен (показать один раз)
 */
export function regenerateToken(botId) {
    const bots = getCustomBots();
    if (!bots[botId]) return null;

    const token = generateToken();
    bots[botId].tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    saveCustomBots(bots);
    return token;
}

/**
 * Привязать бота к комнате.
 */
export async function addBotToRoom(botId, roomId) {
    const bots = getCustomBots();
    if (!bots[botId]) throw new Error('Bot not found');

    if (!bots[botId].rooms.includes(roomId)) {
        // Пригласить Matrix-пользователя бота в комнату
        await joinBotToRoom(bots[botId].localpart, roomId);
        bots[botId].rooms.push(roomId);
        saveCustomBots(bots);
    }
}

/**
 * Отвязать бота от комнаты.
 */
export function removeBotFromRoom(botId, roomId) {
    const bots = getCustomBots();
    if (!bots[botId]) return;
    bots[botId].rooms = bots[botId].rooms.filter(r => r !== roomId);
    saveCustomBots(bots);
}

/**
 * Обновить статус бота (online/offline).
 */
export function setBotStatus(botId, status) {
    const bots = getCustomBots();
    if (!bots[botId]) return;
    bots[botId].status = status;
    if (status === 'online') bots[botId].lastSeen = Date.now();
    saveCustomBots(bots);
}

/**
 * Проверить, что бот имеет доступ к комнате.
 */
export function botHasAccessToRoom(botId, roomId) {
    const bots = getCustomBots();
    if (!bots[botId]) return false;
    return bots[botId].rooms.includes(roomId);
}

/**
 * Все команды кастомных ботов (для event router).
 */
export function getCustomBotCommands() {
    const bots = getCustomBots();
    const result = [];
    for (const bot of Object.values(bots)) {
        for (const cmd of bot.commands) {
            result.push({
                command: cmd.command,
                description: cmd.description || '',
                botId: bot.id,
                botName: bot.name,
                isCustom: true,
            });
        }
    }
    return result;
}

/**
 * Найти кастомного бота по команде.
 */
export function findCustomBotByCommand(commandRoot) {
    const bots = getCustomBots();
    for (const bot of Object.values(bots)) {
        const match = bot.commands.some(cmd =>
            cmd.command.toLowerCase() === commandRoot.toLowerCase()
        );
        if (match) return bot;
    }
    return null;
}
