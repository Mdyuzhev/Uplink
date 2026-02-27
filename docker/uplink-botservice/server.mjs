/**
 * uplink-botservice — микросервис ботов Uplink.
 *
 * Application Service для Matrix Synapse.
 * Управляет виртуальными бот-пользователями (@bot_*:uplink.local).
 * Обрабатывает slash-команды и webhook-и от внешних сервисов.
 *
 * Порт: 7891
 */

import express from 'express';
import { BOT_DEFINITIONS, getBotsForRoom, enableBotInRoom, disableBotInRoom, getAllBotCommands } from './registry.mjs';
import { ensureBotUser, inviteBotToRoom } from './matrixClient.mjs';
import { handleMatrixEvent } from './eventHandler.mjs';

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
    // Верификация токена от Synapse
    const token = req.query.access_token;
    if (token !== HS_TOKEN) {
        return res.status(403).json({ errcode: 'M_FORBIDDEN' });
    }

    const txnId = req.params.txnId;

    // Идемпотентность — пропускать дубли
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

// Synapse спрашивает, существует ли пользователь из нашего namespace
app.get('/users/:userId', (req, res) => {
    const userId = req.params.userId;
    if (userId.startsWith('@bot_')) {
        return res.json({});
    }
    res.status(404).json({ errcode: 'M_NOT_FOUND' });
});

// Synapse спрашивает про алиасы комнат
app.get('/rooms/:roomAlias', (_req, res) => {
    res.status(404).json({ errcode: 'M_NOT_FOUND' });
});

// ═══════════════════════════════════
// Webhook endpoints
// (внешние сервисы отправляют сюда)
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
// Admin API — управление ботами
// (вызывает Uplink UI)
// ═══════════════════════════════════

// Список ботов (с состоянием для конкретной комнаты)
app.get('/api/bots', (req, res) => {
    const roomId = req.query.roomId;
    if (roomId) {
        res.json(getBotsForRoom(roomId));
    } else {
        // Все боты без привязки к комнате
        res.json(Object.entries(BOT_DEFINITIONS).map(([id, bot]) => ({
            id,
            displayName: bot.displayName,
            description: bot.description,
            commands: bot.commands,
        })));
    }
});

// Все команды (для автокомплита на фронте)
app.get('/api/commands', (_req, res) => {
    res.json(getAllBotCommands());
});

// Включить бота в комнате
app.post('/api/bots/:botId/enable', async (req, res) => {
    const { botId } = req.params;
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });
    if (!BOT_DEFINITIONS[botId]) return res.status(404).json({ error: 'Bot not found' });

    try {
        // Пригласить бота в комнату Matrix
        await inviteBotToRoom(BOT_DEFINITIONS[botId].localpart, roomId);
        enableBotInRoom(botId, roomId);
        res.json({ ok: true });
    } catch (err) {
        console.error(`Ошибка включения бота ${botId}:`, err);
        res.status(500).json({ error: err.message });
    }
});

// Отключить бота из комнаты
app.post('/api/bots/:botId/disable', (req, res) => {
    const { botId } = req.params;
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    disableBotInRoom(botId, roomId);
    res.json({ ok: true });
});

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'uplink-botservice' });
});

// ═══════════════════════════════════
// Инициализация
// ═══════════════════════════════════

async function init() {
    // Зарегистрировать бот-пользователей в Synapse
    console.log('Регистрация бот-пользователей...');
    for (const [id, bot] of Object.entries(BOT_DEFINITIONS)) {
        try {
            await ensureBotUser(bot.localpart, bot.displayName);
        } catch (err) {
            console.warn(`Не удалось зарегистрировать ${id}:`, err.message);
        }
    }
    console.log('Боты зарегистрированы.');

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Bot Service на порту ${PORT}`);
    });
}

init().catch(err => {
    console.error('Ошибка запуска bot service:', err);
    process.exit(1);
});
