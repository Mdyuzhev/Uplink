/**
 * uplink-botservice — микросервис ботов Uplink.
 *
 * Application Service для Matrix Synapse.
 * Управляет виртуальными бот-пользователями (@bot_*:uplink.local).
 * Обрабатывает slash-команды, webhook-и, кастомных ботов (SDK/webhook).
 *
 * Порт: 7891
 */

import http from 'node:http';
import express from 'express';
import { BOT_DEFINITIONS, getBotsForRoom, enableBotInRoom, disableBotInRoom, getAllBotCommands } from './registry.mjs';
import { ensureBotUser, inviteBotToRoom, isRoomEncrypted } from './matrixClient.mjs';
import { handleMatrixEvent } from './eventHandler.mjs';
import {
    createCustomBot, getCustomBot, getCustomBotsByOwner, getAllCustomBots,
    updateCustomBot, deleteCustomBot, regenerateToken,
    addBotToRoom, removeBotFromRoom, getCustomBotCommands,
} from './customBots.mjs';
import { initBotGateway } from './botGateway.mjs';
import { checkRateLimit } from './rateLimiter.mjs';

const app = express();
app.use(express.json({ limit: '5mb' }));

const HS_TOKEN = process.env.HS_TOKEN;
const PORT = 7891;

// Кэш обработанных транзакций (Synapse может ретраить)
const processedTxns = new Set();
const MAX_TXNS = 10000;

// ═══════════════════════════════════
// Application Service endpoints
// (Synapse пушит события сюда)
// ═══════════════════════════════════

app.put('/transactions/:txnId', (req, res) => {
    const token = req.query.access_token;
    if (token !== HS_TOKEN) {
        return res.status(403).json({ errcode: 'M_FORBIDDEN' });
    }

    const txnId = req.params.txnId;

    if (processedTxns.has(txnId)) {
        return res.json({});
    }
    processedTxns.add(txnId);
    if (processedTxns.size > MAX_TXNS) {
        const first = processedTxns.values().next().value;
        processedTxns.delete(first);
    }

    const events = req.body.events || [];
    for (const event of events) {
        handleMatrixEvent(event).catch(err => {
            console.error('Ошибка обработки события:', err);
        });
    }

    res.json({});
});

app.get('/users/:userId', (req, res) => {
    const userId = req.params.userId;
    if (userId.startsWith('@bot_')) {
        return res.json({});
    }
    res.status(404).json({ errcode: 'M_NOT_FOUND' });
});

app.get('/rooms/:roomAlias', (_req, res) => {
    res.status(404).json({ errcode: 'M_NOT_FOUND' });
});

// ═══════════════════════════════════
// Webhook endpoints (внешние сервисы)
// ═══════════════════════════════════

app.post('/hooks/:integrationId', async (req, res) => {
    const integrationId = req.params.integrationId;
    try {
        const handler = await import(`./handlers/${integrationId}.mjs`);
        if (handler.handleWebhook) {
            await handler.handleWebhook(req.headers, req.body);
        }
        res.json({ ok: true });
    } catch (err) {
        console.error(`Webhook ${integrationId} ошибка:`, err);
        res.status(500).json({ error: 'Internal error' });
    }
});

// ═══════════════════════════════════
// Admin API — встроенные боты
// ═══════════════════════════════════

app.get('/api/bots', (req, res) => {
    const roomId = req.query.roomId;
    if (roomId) {
        res.json(getBotsForRoom(roomId));
    } else {
        res.json(Object.entries(BOT_DEFINITIONS).map(([id, bot]) => ({
            id,
            displayName: bot.displayName,
            description: bot.description,
            commands: bot.commands,
        })));
    }
});

app.get('/api/commands', (_req, res) => {
    // Встроенные + кастомные команды
    const builtin = getAllBotCommands();
    const custom = getCustomBotCommands();
    res.json([...builtin, ...custom]);
});

app.post('/api/bots/:botId/enable', async (req, res) => {
    const { botId } = req.params;
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });
    if (!BOT_DEFINITIONS[botId]) return res.status(404).json({ error: 'Bot not found' });

    try {
        const encrypted = await isRoomEncrypted(roomId);

        await inviteBotToRoom(BOT_DEFINITIONS[botId].localpart, roomId);
        enableBotInRoom(botId, roomId);

        res.json({
            ok: true,
            warning: encrypted
                ? 'Комната зашифрована (E2E). Боты не могут читать зашифрованные сообщения. Создайте незашифрованный канал для работы с ботами.'
                : null,
        });
    } catch (err) {
        console.error(`Ошибка включения бота ${botId}:`, err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bots/:botId/disable', (req, res) => {
    const { botId } = req.params;
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    disableBotInRoom(botId, roomId);
    res.json({ ok: true });
});

// ═══════════════════════════════════
// Custom Bots API — пользовательские боты
// ═══════════════════════════════════

// Создать бота
app.post('/api/custom-bots', async (req, res) => {
    const { name, description, mode, webhookUrl, commands, owner } = req.body;
    if (!name || !mode || !owner) {
        return res.status(400).json({ error: 'name, mode и owner обязательны' });
    }
    if (mode !== 'sdk' && mode !== 'webhook') {
        return res.status(400).json({ error: 'mode: sdk или webhook' });
    }
    if (mode === 'webhook' && !webhookUrl) {
        return res.status(400).json({ error: 'webhookUrl обязателен для webhook-режима' });
    }

    try {
        const { bot, token } = await createCustomBot({ name, description, mode, webhookUrl, commands, owner });
        // Токен показывается один раз
        res.json({
            bot: sanitizeBot(bot),
            token,
            webhookSecret: bot.webhookSecret,
        });
    } catch (err) {
        console.error('Ошибка создания бота:', err);
        res.status(500).json({ error: err.message });
    }
});

// Список кастомных ботов
app.get('/api/custom-bots', (req, res) => {
    const owner = req.query.owner;
    const bots = owner ? getCustomBotsByOwner(owner) : getAllCustomBots();
    res.json(bots.map(sanitizeBot));
});

// Получить одного бота
app.get('/api/custom-bots/:botId', (req, res) => {
    const bot = getCustomBot(req.params.botId);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json(sanitizeBot(bot));
});

// Обновить бота
app.patch('/api/custom-bots/:botId', (req, res) => {
    const bot = updateCustomBot(req.params.botId, req.body);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json(sanitizeBot(bot));
});

// Удалить бота
app.delete('/api/custom-bots/:botId', (req, res) => {
    const ok = deleteCustomBot(req.params.botId);
    if (!ok) return res.status(404).json({ error: 'Bot not found' });
    res.json({ ok: true });
});

// Перевыпустить токен
app.post('/api/custom-bots/:botId/regenerate-token', (req, res) => {
    const token = regenerateToken(req.params.botId);
    if (!token) return res.status(404).json({ error: 'Bot not found' });
    res.json({ token });
});

// Привязать бота к комнате
app.post('/api/custom-bots/:botId/rooms', async (req, res) => {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    try {
        await addBotToRoom(req.params.botId, roomId);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Отвязать бота от комнаты
app.delete('/api/custom-bots/:botId/rooms', (req, res) => {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    removeBotFromRoom(req.params.botId, roomId);
    res.json({ ok: true });
});

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'uplink-botservice' });
});

// ═══════════════════════════════════
// Утилиты
// ═══════════════════════════════════

/** Убрать чувствительные поля из ответа */
function sanitizeBot(bot) {
    const { tokenHash, webhookSecret, ...safe } = bot;
    return safe;
}

// ═══════════════════════════════════
// Инициализация
// ═══════════════════════════════════

async function init() {
    // Зарегистрировать встроенных бот-пользователей
    console.log('Регистрация бот-пользователей...');
    for (const [id, bot] of Object.entries(BOT_DEFINITIONS)) {
        try {
            await ensureBotUser(bot.localpart, bot.displayName);
        } catch (err) {
            console.warn(`Не удалось зарегистрировать ${id}:`, err.message);
        }
    }
    console.log('Боты зарегистрированы.');

    // HTTP-сервер (Express) + WebSocket gateway на одном порту
    const server = http.createServer(app);
    initBotGateway(server);

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Bot Service на порту ${PORT}`);
    });
}

init().catch(err => {
    console.error('Ошибка запуска bot service:', err);
    process.exit(1);
});
