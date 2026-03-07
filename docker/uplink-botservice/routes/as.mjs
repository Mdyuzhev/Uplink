/**
 * Application Service endpoints
 * Synapse пушит Matrix-события сюда.
 */

import { Router } from 'express';
import logger from '../logger.mjs';
import { handleMatrixEvent } from '../eventHandler.mjs';

const router = Router();

const HS_TOKEN = process.env.HS_TOKEN;

// Кэш обработанных транзакций (Synapse может ретраить)
const processedTxns = new Set();
const MAX_TXNS = 10000;

router.put('/transactions/:txnId', (req, res) => {
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
    if (events.length > 0) {
        logger.info({ txnId, count: events.length }, 'AS transaction received');
    }
    for (const event of events) {
        handleMatrixEvent(event).catch(err => {
            logger.error({ err }, 'Ошибка обработки события');
        });
    }

    res.json({});
});

router.get('/users/:userId', (req, res) => {
    const userId = req.params.userId;
    if (userId.startsWith('@bot_')) {
        return res.json({});
    }
    res.status(404).json({ errcode: 'M_NOT_FOUND' });
});

router.get('/rooms/:roomAlias', (_req, res) => {
    res.status(404).json({ errcode: 'M_NOT_FOUND' });
});

export default router;
