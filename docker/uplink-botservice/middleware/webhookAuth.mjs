/**
 * Верификация подписей входящих webhook-ов.
 * Каждый провайдер подписывает по-своему.
 */

import crypto from 'node:crypto';
import logger from '../logger.mjs';

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';
const GITLAB_WEBHOOK_TOKEN = process.env.GITLAB_WEBHOOK_TOKEN || '';
const ALERTMANAGER_TOKEN = process.env.ALERTMANAGER_TOKEN || '';

/**
 * Middleware для верификации webhook подписей.
 * Определяет провайдер по заголовкам и проверяет подпись.
 */
export function verifyWebhook(req, res, next) {
    const integrationId = req.params.integrationId;

    // GitHub — HMAC-SHA256
    if (req.headers['x-github-event']) {
        if (!GITHUB_WEBHOOK_SECRET) {
            logger.warn('[webhook] GitHub webhook secret не настроен, пропускаем проверку');
            return next();
        }
        const signature = req.headers['x-hub-signature-256'];
        if (!signature) {
            logger.warn({ ip: req.ip }, '[webhook] GitHub webhook без подписи');
            return res.status(403).json({ error: 'Missing signature' });
        }
        const expected = 'sha256=' + crypto
            .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
            .update(JSON.stringify(req.body))
            .digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
            logger.warn({ ip: req.ip }, '[webhook] Невалидная GitHub подпись');
            return res.status(403).json({ error: 'Invalid signature' });
        }
        return next();
    }

    // GitLab — статический токен
    if (req.headers['x-gitlab-event']) {
        if (!GITLAB_WEBHOOK_TOKEN) {
            return next(); // Не настроено — пропускаем
        }
        if (req.headers['x-gitlab-token'] !== GITLAB_WEBHOOK_TOKEN) {
            logger.warn({ ip: req.ip }, '[webhook] Невалидный GitLab токен');
            return res.status(403).json({ error: 'Invalid token' });
        }
        return next();
    }

    // Alertmanager / Grafana — Bearer token
    if (integrationId === 'alerts') {
        if (!ALERTMANAGER_TOKEN) {
            return next(); // Не настроено — пропускаем
        }
        const auth = req.headers.authorization;
        if (!auth || auth !== `Bearer ${ALERTMANAGER_TOKEN}`) {
            logger.warn({ ip: req.ip }, '[webhook] Невалидный Alertmanager токен');
            return res.status(403).json({ error: 'Invalid token' });
        }
        return next();
    }

    // CI webhook (deploy-prod.sh, GitHub Actions — все x-deploy-event типы)
    if (req.headers['x-deploy-event']) {
        return next();
    }

    // Неизвестный провайдер — пропускаем (логируем)
    logger.warn({ integrationId, ip: req.ip }, '[webhook] Неизвестный webhook провайдер');
    next();
}
