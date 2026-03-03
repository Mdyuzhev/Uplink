/**
 * Верификация подписей входящих webhook-ов.
 * Каждый провайдер подписывает по-своему.
 */

import crypto from 'node:crypto';

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
            console.warn('[webhook] GitHub webhook secret не настроен, пропускаем проверку');
            return next();
        }
        const signature = req.headers['x-hub-signature-256'];
        if (!signature) {
            console.warn(`[webhook] GitHub webhook без подписи от ${req.ip}`);
            return res.status(403).json({ error: 'Missing signature' });
        }
        const expected = 'sha256=' + crypto
            .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
            .update(JSON.stringify(req.body))
            .digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
            console.warn(`[webhook] Невалидная GitHub подпись от ${req.ip}`);
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
            console.warn(`[webhook] Невалидный GitLab токен от ${req.ip}`);
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
            console.warn(`[webhook] Невалидный Alertmanager токен от ${req.ip}`);
            return res.status(403).json({ error: 'Invalid token' });
        }
        return next();
    }

    // CI webhook (GitHub Actions deploy event)
    if (req.headers['x-deploy-event'] === 'deploy') {
        // Deploy-webhook внутренний — приходит из docker network
        return next();
    }

    // Неизвестный провайдер — пропускаем (логируем)
    console.warn(`[webhook] Неизвестный webhook провайдер: ${integrationId} от ${req.ip}`);
    next();
}
