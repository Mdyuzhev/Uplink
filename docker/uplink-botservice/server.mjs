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
import logger from './logger.mjs';
import { BOT_DEFINITIONS, getBotsForRoom, enableBotInRoom, disableBotInRoom, getAllBotCommands, getBotRoomBindings } from './registry.mjs';
import { ensureBotUser, joinBotToRoom, isBotInRoom, isRoomEncrypted } from './matrixClient.mjs';
import { handleMatrixEvent } from './eventHandler.mjs';
import {
    createCustomBot, getCustomBot, getCustomBotsByOwner, getAllCustomBots,
    updateCustomBot, deleteCustomBot, regenerateToken,
    addBotToRoom, removeBotFromRoom, getCustomBotCommands,
} from './customBots.mjs';
import { initBotGateway } from './botGateway.mjs';
import { checkRateLimit } from './rateLimiter.mjs';
import { requireAuth } from './middleware/auth.mjs';
import { verifyWebhook } from './middleware/webhookAuth.mjs';
import { requestId } from './middleware/requestId.mjs';

const app = express();
app.use(requestId);
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
            logger.error({ err }, 'Ошибка обработки события');
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

app.post('/hooks/:integrationId', verifyWebhook, async (req, res) => {
    const integrationId = req.params.integrationId;
    try {
        const handler = await import(`./handlers/${integrationId}.mjs`);
        if (handler.handleWebhook) {
            await handler.handleWebhook(req.headers, req.body);
        }
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err, integrationId }, 'Webhook ошибка');
        res.status(500).json({ error: 'Internal error' });
    }
});

// ═══════════════════════════════════
// Admin API — встроенные боты
// ═══════════════════════════════════

app.get('/api/bots', requireAuth, (req, res) => {
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

app.get('/api/commands', requireAuth, (_req, res) => {
    // Встроенные + кастомные команды
    const builtin = getAllBotCommands();
    const custom = getCustomBotCommands();
    res.json([...builtin, ...custom]);
});

app.post('/api/bots/:botId/enable', requireAuth, async (req, res) => {
    const { botId } = req.params;
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });
    if (!BOT_DEFINITIONS[botId]) return res.status(404).json({ error: 'Bot not found' });

    try {
        const encrypted = await isRoomEncrypted(roomId);

        // Присоединить бота к комнате (множественные стратегии)
        await joinBotToRoom(BOT_DEFINITIONS[botId].localpart, roomId);

        // Проверить что бот действительно в комнате
        const inRoom = await isBotInRoom(BOT_DEFINITIONS[botId].localpart, roomId);
        if (!inRoom) {
            return res.status(500).json({
                error: 'Не удалось присоединить бота к комнате. Попробуйте пригласить бота вручную.'
            });
        }

        enableBotInRoom(botId, roomId);

        res.json({
            ok: true,
            warning: encrypted
                ? 'Комната зашифрована (E2E). Боты не могут читать зашифрованные сообщения. Создайте незашифрованный канал для работы с ботами.'
                : null,
        });
    } catch (err) {
        logger.error({ err, botId }, 'Ошибка включения бота');
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bots/:botId/disable', requireAuth, (req, res) => {
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
app.post('/api/custom-bots', requireAuth, async (req, res) => {
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
        logger.error({ err }, 'Ошибка создания бота');
        res.status(500).json({ error: err.message });
    }
});

// Список кастомных ботов
app.get('/api/custom-bots', requireAuth, (req, res) => {
    const owner = req.query.owner;
    const bots = owner ? getCustomBotsByOwner(owner) : getAllCustomBots();
    res.json(bots.map(sanitizeBot));
});

// Получить одного бота
app.get('/api/custom-bots/:botId', requireAuth, (req, res) => {
    const bot = getCustomBot(req.params.botId);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json(sanitizeBot(bot));
});

// Обновить бота
app.patch('/api/custom-bots/:botId', requireAuth, (req, res) => {
    const bot = updateCustomBot(req.params.botId, req.body);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json(sanitizeBot(bot));
});

// Удалить бота
app.delete('/api/custom-bots/:botId', requireAuth, (req, res) => {
    const ok = deleteCustomBot(req.params.botId);
    if (!ok) return res.status(404).json({ error: 'Bot not found' });
    res.json({ ok: true });
});

// Перевыпустить токен
app.post('/api/custom-bots/:botId/regenerate-token', requireAuth, (req, res) => {
    const token = regenerateToken(req.params.botId);
    if (!token) return res.status(404).json({ error: 'Bot not found' });
    res.json({ token });
});

// Привязать бота к комнате
app.post('/api/custom-bots/:botId/rooms', requireAuth, async (req, res) => {
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
app.delete('/api/custom-bots/:botId/rooms', requireAuth, (req, res) => {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });

    removeBotFromRoom(req.params.botId, roomId);
    res.json({ ok: true });
});

// ═══════════════════════════════════
// GIF proxy — GIPHY API (API ключ не утекает на клиент)
// Tenor sunset 30.06.2026, перешли на GIPHY
// ═══════════════════════════════════

const GIPHY_KEY = process.env.GIPHY_API_KEY;
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

/** Преобразовать GIPHY response в формат, ожидаемый клиентом */
function mapGiphyResults(data) {
    const results = (data.data || []).map(g => ({
        id: g.id,
        title: g.title || '',
        media_formats: {
            gif: {
                url: g.images?.original?.url || '',
                dims: [
                    parseInt(g.images?.original?.width) || 300,
                    parseInt(g.images?.original?.height) || 200,
                ],
            },
            tinygif: {
                url: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url || '',
                dims: [
                    parseInt(g.images?.fixed_width_small?.width) || 200,
                    parseInt(g.images?.fixed_width_small?.height) || 150,
                ],
            },
        },
    }));
    const offset = data.pagination?.offset || 0;
    const count = data.pagination?.count || 0;
    const next = (offset + count) < (data.pagination?.total_count || 0)
        ? String(offset + count) : '';
    return { results, next };
}

app.get('/api/gif/search', async (req, res) => {
    if (!GIPHY_KEY) return res.status(503).json({ error: 'GIPHY API не настроен (GIPHY_API_KEY)' });
    const { q, limit = 20, pos } = req.query;
    if (!q) return res.status(400).json({ error: 'q required' });
    try {
        const offset = pos ? `&offset=${pos}` : '';
        const url = `${GIPHY_BASE}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g${offset}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json(data);
        res.json(mapGiphyResults(data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/gif/trending', async (req, res) => {
    if (!GIPHY_KEY) return res.status(503).json({ error: 'GIPHY API не настроен (GIPHY_API_KEY)' });
    const { limit = 20, pos } = req.query;
    try {
        const offset = pos ? `&offset=${pos}` : '';
        const url = `${GIPHY_BASE}/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=g${offset}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json(data);
        res.json(mapGiphyResults(data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Диагностический эндпоинт — статус ботов в комнате
app.get('/api/debug/rooms/:roomId', requireAuth, async (req, res) => {
    const { roomId } = req.params;
    const bindings = getBotRoomBindings();
    const roomBots = bindings[roomId] || [];

    const status = {};
    const allBotIds = new Set(['helper', ...roomBots]);
    for (const botId of allBotIds) {
        const bot = BOT_DEFINITIONS[botId];
        if (!bot) continue;
        status[botId] = {
            enabled: botId === 'helper' || roomBots.includes(botId),
            inRoom: await isBotInRoom(bot.localpart, roomId),
            userId: bot.userId,
        };
    }

    const encrypted = await isRoomEncrypted(roomId);
    res.json({ roomId, encrypted, bots: status });
});

// Health check — deep
app.get('/health', async (_req, res) => {
    const checks = {};

    try {
        const { getStorage } = await import('./storage.mjs');
        getStorage('_healthcheck');
        checks.storage = 'ok';
    } catch {
        checks.storage = 'error';
    }

    try {
        const resp = await fetch(`${process.env.HOMESERVER_URL || 'http://synapse:8008'}/_matrix/client/versions`, {
            signal: AbortSignal.timeout(3000),
        });
        checks.synapse = resp.ok ? 'ok' : 'error';
    } catch {
        checks.synapse = 'unreachable';
    }

    const healthy = Object.values(checks).every(v => v === 'ok');
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        service: 'uplink-botservice',
        checks,
        uptime: Math.floor(process.uptime()),
    });
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
    logger.info('Регистрация бот-пользователей...');
    for (const [id, bot] of Object.entries(BOT_DEFINITIONS)) {
        try {
            await ensureBotUser(bot.localpart, bot.displayName);
        } catch (err) {
            logger.warn({ err, botId: id }, 'Не удалось зарегистрировать бота');
        }
    }
    logger.info('Боты зарегистрированы.');

    const bindings = getBotRoomBindings();
    for (const [roomId, botIds] of Object.entries(bindings)) {
        for (const botId of botIds) {
            const bot = BOT_DEFINITIONS[botId];
            if (!bot) continue;
            try {
                const inRoom = await isBotInRoom(bot.localpart, roomId);
                if (!inRoom) {
                    logger.info({ botId, roomId }, 'Бот не в комнате, присоединяю...');
                    await joinBotToRoom(bot.localpart, roomId);
                }
            } catch (err) {
                logger.warn({ err, botId, roomId }, 'Не удалось присоединить бота к комнате');
            }
        }
    }
    logger.info('Боты присоединены к комнатам.');

    const server = http.createServer(app);
    initBotGateway(server);

    server.listen(PORT, '0.0.0.0', () => {
        logger.info({ port: PORT }, 'Bot Service запущен');
    });
}

init().catch(err => {
    logger.error({ err }, 'Ошибка запуска bot service');
    process.exit(1);
});
