/**
 * Debug API — диагностика состояния ботов.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.mjs';
import { BOT_DEFINITIONS, getBotRoomBindings } from '../registry.mjs';
import { isBotInRoom, isRoomEncrypted } from '../matrixClient.mjs';

const router = Router();

router.get('/rooms/:roomId', requireAuth, async (req, res) => {
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

export default router;
