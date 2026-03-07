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
import { initStorage, checkHealth as checkStorageHealth, closeStorage } from './postgresStorage.mjs';
import { BOT_DEFINITIONS, getBotRoomBindings } from './registry.mjs';
import { ensureBotUser, joinBotToRoom, isBotInRoom } from './matrixClient.mjs';
import { initBotGateway } from './botGateway.mjs';
import { scheduleDigest } from './digest.mjs';
import { requestId } from './middleware/requestId.mjs';

// Routes
import asRoutes from './routes/as.mjs';
import adminRoutes from './routes/admin.mjs';
import customBotRoutes from './routes/customBots.mjs';
import webhookRoutes from './routes/webhooks.mjs';
import gifRoutes from './routes/gif.mjs';
import debugRoutes from './routes/debug.mjs';

const PORT = 7891;

const app = express();
app.use(requestId);
app.use(express.json({ limit: '5mb' }));

// Монтирование роутов
app.use('/', asRoutes);
app.use('/api', adminRoutes);
app.use('/api', customBotRoutes);
app.use('/hooks', webhookRoutes);
app.use('/api/gif', gifRoutes);
app.use('/api/debug', debugRoutes);

// Health check — deep
app.get('/health', async (_req, res) => {
    const checks = {};

    checks.storage = (await checkStorageHealth()) ? 'ok' : 'error';

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
// Инициализация
// ═══════════════════════════════════

async function init() {
    // Инициализировать PostgreSQL storage
    await initStorage();

    logger.info('Регистрация бот-пользователей...');
    for (const [id, bot] of Object.entries(BOT_DEFINITIONS)) {
        try {
            await ensureBotUser(bot.localpart, bot.displayName);
        } catch (err) {
            logger.warn({ err, botId: id }, 'Не удалось зарегистрировать бота');
        }
    }
    logger.info('Боты зарегистрированы.');

    const bindings = await getBotRoomBindings();
    const roomsWithBindings = new Set(Object.keys(bindings));

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

    // bot_helper нужен в каждой комнате где есть боты — отвечает на /help и ошибки
    const helperBot = BOT_DEFINITIONS['helper'];
    for (const roomId of roomsWithBindings) {
        try {
            const inRoom = await isBotInRoom(helperBot.localpart, roomId);
            if (!inRoom) {
                logger.info({ roomId }, 'Присоединяю bot_helper...');
                await joinBotToRoom(helperBot.localpart, roomId);
            }
        } catch (err) {
            logger.warn({ err, roomId }, 'Не удалось присоединить bot_helper');
        }
    }

    logger.info('Боты присоединены к комнатам.');

    // Гарантировать что bot_ci в комнате для CI-уведомлений (CI_NOTIFY_ROOM_ID)
    const CI_NOTIFY_ROOM_ID = process.env.CI_NOTIFY_ROOM_ID || '';
    if (CI_NOTIFY_ROOM_ID) {
        try {
            const inCiRoom = await isBotInRoom('bot_ci', CI_NOTIFY_ROOM_ID);
            if (!inCiRoom) {
                logger.info({ roomId: CI_NOTIFY_ROOM_ID }, 'Присоединяю bot_ci к CI_NOTIFY_ROOM_ID...');
                await joinBotToRoom('bot_ci', CI_NOTIFY_ROOM_ID);
            }
        } catch (err) {
            logger.warn({ err, roomId: CI_NOTIFY_ROOM_ID }, 'Не удалось присоединить bot_ci к CI_NOTIFY_ROOM_ID');
        }
    }

    // Гарантировать что bot_wh_ci в комнате для WarehouseHub CI-уведомлений
    const WH_CI_NOTIFY_ROOM_ID = process.env.WH_CI_NOTIFY_ROOM_ID || '';
    if (WH_CI_NOTIFY_ROOM_ID) {
        try {
            const inRoom = await isBotInRoom('bot_wh_ci', WH_CI_NOTIFY_ROOM_ID);
            if (!inRoom) {
                logger.info({ roomId: WH_CI_NOTIFY_ROOM_ID }, 'Присоединяю bot_wh_ci к WH_CI_NOTIFY_ROOM_ID...');
                await joinBotToRoom('bot_wh_ci', WH_CI_NOTIFY_ROOM_ID);
            }
        } catch (err) {
            logger.warn({ err, roomId: WH_CI_NOTIFY_ROOM_ID }, 'Не удалось присоединить bot_wh_ci');
        }
    }

    const server = http.createServer(app);
    initBotGateway(server);
    scheduleDigest();

    server.listen(PORT, '0.0.0.0', () => {
        logger.info({ port: PORT }, 'Bot Service запущен');
    });
}

process.on('SIGTERM', async () => {
    logger.info('SIGTERM получен, завершаю...');
    await closeStorage();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT получен, завершаю...');
    await closeStorage();
    process.exit(0);
});

init().catch(err => {
    logger.error({ err }, 'Ошибка запуска bot service');
    process.exit(1);
});
