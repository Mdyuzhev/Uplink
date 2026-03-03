/**
 * Реестр и управление кастомными ботами.
 * CRUD операции, генерация токенов, создание Matrix-пользователей.
 */

import crypto from 'node:crypto';
import { getStorage, setStorage } from './postgresStorage.mjs';
import { ensureBotUser, joinBotToRoom } from './matrixClient.mjs';

const SERVER_NAME = process.env.SERVER_NAME || 'localhost';
const CUSTOM_BOTS_KEY = 'custom_bots';

/**
 * Все кастомные боты. Формат: { [botId]: CustomBotDef }
 */
async function getCustomBots() {
    return (await getStorage(CUSTOM_BOTS_KEY)) || {};
}

async function saveCustomBots(bots) {
    await setStorage(CUSTOM_BOTS_KEY, bots);
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
 * @param {{ name: string, description?: string, mode: 'sdk'|'webhook', webhookUrl?: string, commands?: import('./types.mjs').BotCommandDef[], owner: string }} params
 * @returns {Promise<{ bot: import('./types.mjs').CustomBotDef, token: string }>} данные бота и токен (показывается один раз)
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

    const bots = await getCustomBots();
    bots[botId] = bot;
    await saveCustomBots(bots);

    return { bot, token };
}

/**
 * Получить бота по ID.
 */
export async function getCustomBot(botId) {
    const bots = await getCustomBots();
    return bots[botId] || null;
}

/**
 * Получить бота по токену (через hash).
 */
export async function getCustomBotByToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const bots = await getCustomBots();
    return Object.values(bots).find(b => b.tokenHash === tokenHash) || null;
}

/**
 * Список ботов пользователя.
 */
export async function getCustomBotsByOwner(owner) {
    const bots = await getCustomBots();
    return Object.values(bots).filter(b => b.owner === owner);
}

/**
 * Список всех кастомных ботов.
 */
export async function getAllCustomBots() {
    return Object.values(await getCustomBots());
}

/**
 * Обновить бота.
 */
export async function updateCustomBot(botId, updates) {
    const bots = await getCustomBots();
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

    await saveCustomBots(bots);
    return bots[botId];
}

/**
 * Удалить бота.
 */
export async function deleteCustomBot(botId) {
    const bots = await getCustomBots();
    if (!bots[botId]) return false;
    delete bots[botId];
    await saveCustomBots(bots);
    return true;
}

/**
 * Перевыпустить токен.
 * @returns {string} новый токен (показать один раз)
 */
export async function regenerateToken(botId) {
    const bots = await getCustomBots();
    if (!bots[botId]) return null;

    const token = generateToken();
    bots[botId].tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await saveCustomBots(bots);
    return token;
}

/**
 * Привязать бота к комнате.
 */
export async function addBotToRoom(botId, roomId) {
    const bots = await getCustomBots();
    if (!bots[botId]) throw new Error('Bot not found');

    if (!bots[botId].rooms.includes(roomId)) {
        // Пригласить Matrix-пользователя бота в комнату
        await joinBotToRoom(bots[botId].localpart, roomId);
        bots[botId].rooms.push(roomId);
        await saveCustomBots(bots);
    }
}

/**
 * Отвязать бота от комнаты.
 */
export async function removeBotFromRoom(botId, roomId) {
    const bots = await getCustomBots();
    if (!bots[botId]) return;
    bots[botId].rooms = bots[botId].rooms.filter(r => r !== roomId);
    await saveCustomBots(bots);
}

/**
 * Обновить статус бота (online/offline).
 */
export async function setBotStatus(botId, status) {
    const bots = await getCustomBots();
    if (!bots[botId]) return;
    bots[botId].status = status;
    if (status === 'online') bots[botId].lastSeen = Date.now();
    await saveCustomBots(bots);
}

/**
 * Проверить, что бот имеет доступ к комнате.
 */
export async function botHasAccessToRoom(botId, roomId) {
    const bots = await getCustomBots();
    if (!bots[botId]) return false;
    return bots[botId].rooms.includes(roomId);
}

/**
 * Все команды кастомных ботов (для event router).
 */
export async function getCustomBotCommands() {
    const bots = await getCustomBots();
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
export async function findCustomBotByCommand(commandRoot) {
    const bots = await getCustomBots();
    for (const bot of Object.values(bots)) {
        const match = bot.commands.some(cmd =>
            cmd.command.toLowerCase() === commandRoot.toLowerCase()
        );
        if (match) return bot;
    }
    return null;
}
