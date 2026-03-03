/**
 * Webhook endpoints — приём событий от внешних сервисов.
 */

import { Router } from 'express';
import logger from '../logger.mjs';
import { verifyWebhook } from '../middleware/webhookAuth.mjs';

const router = Router();

router.post('/:integrationId', verifyWebhook, async (req, res) => {
    const integrationId = req.params.integrationId;
    try {
        const handler = await import(`../handlers/${integrationId}.mjs`);
        if (handler.handleWebhook) {
            await handler.handleWebhook(req.headers, req.body);
        }
        res.json({ ok: true });
    } catch (err) {
        logger.error({ err, integrationId }, 'Webhook ошибка');
        res.status(500).json({ error: 'Internal error' });
    }
});

export default router;
