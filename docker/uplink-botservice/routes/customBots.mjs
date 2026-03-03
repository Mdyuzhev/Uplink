/**
 * Custom Bots API — пользовательские боты (CRUD + комнаты + токены).
 */

import { Router } from 'express';
import logger from '../logger.mjs';
import { requireAuth } from '../middleware/auth.mjs';
import {
    createCustomBot, getCustomBot, getCustomBotsByOwner, getAllCustomBots,
    updateCustomBot, deleteCustomBot, regenerateToken,
    addBotToRoom, removeBotFromRoom,
} from '../customBots.mjs';

const router = Router();

/** Убрать чувствительные поля из ответа */
function sanitizeBot(bot) {
    const { tokenHash, webhookSecret, ...safe } = bot;
    return safe;
}

router.post('/custom-bots', requireAuth, async (req, res) => {
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
        res.json({ bot: sanitizeBot(bot), token, webhookSecret: bot.webhookSecret });
    } catch (err) {
        logger.error({ err }, 'Ошибка создания бота');
        res.status(500).json({ error: err.message });
    }
});

router.get('/custom-bots', requireAuth, (req, res) => {
    const owner = req.query.owner;
    const bots = owner ? getCustomBotsByOwner(owner) : getAllCustomBots();
    res.json(bots.map(sanitizeBot));
});

router.get('/custom-bots/:botId', requireAuth, (req, res) => {
    const bot = getCustomBot(req.params.botId);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json(sanitizeBot(bot));
});

router.patch('/custom-bots/:botId', requireAuth, (req, res) => {
    const bot = updateCustomBot(req.params.botId, req.body);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json(sanitizeBot(bot));
});

router.delete('/custom-bots/:botId', requireAuth, (req, res) => {
    const ok = deleteCustomBot(req.params.botId);
    if (!ok) return res.status(404).json({ error: 'Bot not found' });
    res.json({ ok: true });
});

router.post('/custom-bots/:botId/regenerate-token', requireAuth, (req, res) => {
    const token = regenerateToken(req.params.botId);
    if (!token) return res.status(404).json({ error: 'Bot not found' });
    res.json({ token });
});

router.post('/custom-bots/:botId/rooms', requireAuth, async (req, res) => {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });
    try {
        await addBotToRoom(req.params.botId, roomId);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/custom-bots/:botId/rooms', requireAuth, (req, res) => {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });
    removeBotFromRoom(req.params.botId, roomId);
    res.json({ ok: true });
});

export default router;
