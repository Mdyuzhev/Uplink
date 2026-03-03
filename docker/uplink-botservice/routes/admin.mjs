/**
 * Admin API — встроенные боты (CRUD + команды).
 */

import { Router } from 'express';
import logger from '../logger.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import { BOT_DEFINITIONS, getBotsForRoom, enableBotInRoom, disableBotInRoom, getAllBotCommands } from '../registry.mjs';
import { joinBotToRoom, isBotInRoom, isRoomEncrypted } from '../matrixClient.mjs';
import { getCustomBotCommands } from '../customBots.mjs';

const router = Router();

router.get('/bots', requireAuth, async (req, res) => {
    const roomId = req.query.roomId;
    if (roomId) {
        res.json(await getBotsForRoom(roomId));
    } else {
        res.json(Object.entries(BOT_DEFINITIONS).map(([id, bot]) => ({
            id,
            displayName: bot.displayName,
            description: bot.description,
            commands: bot.commands,
        })));
    }
});

router.get('/commands', requireAuth, async (_req, res) => {
    const builtin = getAllBotCommands();
    const custom = await getCustomBotCommands();
    res.json([...builtin, ...custom]);
});

router.post('/bots/:botId/enable', requireAuth, async (req, res) => {
    const { botId } = req.params;
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });
    if (!BOT_DEFINITIONS[botId]) return res.status(404).json({ error: 'Bot not found' });

    try {
        const encrypted = await isRoomEncrypted(roomId);
        await joinBotToRoom(BOT_DEFINITIONS[botId].localpart, roomId);
        const inRoom = await isBotInRoom(BOT_DEFINITIONS[botId].localpart, roomId);
        if (!inRoom) {
            return res.status(500).json({
                error: 'Не удалось присоединить бота к комнате. Попробуйте пригласить бота вручную.'
            });
        }
        await enableBotInRoom(botId, roomId);
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

router.post('/bots/:botId/disable', requireAuth, async (req, res) => {
    const { botId } = req.params;
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });
    await disableBotInRoom(botId, roomId);
    res.json({ ok: true });
});

export default router;
