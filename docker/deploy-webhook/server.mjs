import http from 'node:http';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || '';
const REPO_PATH = '/repo';
const COMPOSE_FILE = '/repo/docker/docker-compose.yml';
const BOTSERVICE_URL = 'http://uplink-botservice:7891';

/**
 * Проверка подписи GitHub Webhook (HMAC-SHA256).
 * Если WEBHOOK_SECRET не задан — пропускаем проверку (для первичной настройки).
 */
function verifySignature(payload, signature) {
    if (!SECRET) return true;
    if (!signature) return false;
    const expected = 'sha256=' + crypto
        .createHmac('sha256', SECRET)
        .update(payload)
        .digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
    );
}

/**
 * Получить информацию о последнем коммите.
 */
function getLastCommitInfo() {
    try {
        const log = execSync('git log -1 --format="%h|%s|%an"', {
            cwd: REPO_PATH, encoding: 'utf-8',
        }).trim();
        const [hash, message, author] = log.split('|');
        return { hash, message, author };
    } catch {
        return { hash: '???', message: 'unknown', author: 'unknown' };
    }
}

/**
 * Уведомить botservice о результате деплоя.
 */
async function notifyDeploy(result, commitInfo, pushPayload) {
    try {
        const payload = {
            event: 'deploy',
            status: result.ok ? 'success' : 'failure',
            elapsed: result.elapsed || null,
            error: result.error || null,
            commit: commitInfo,
            pusher: pushPayload?.pusher?.name || pushPayload?.sender?.login || null,
            compare_url: pushPayload?.compare || null,
            timestamp: new Date().toISOString(),
        };

        const resp = await fetch(`${BOTSERVICE_URL}/hooks/ci`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-deploy-event': 'deploy',
            },
            body: JSON.stringify(payload),
        });
        console.log(`Уведомление botservice: ${resp.status}`);
    } catch (err) {
        console.warn('Не удалось уведомить botservice:', err.message);
    }
}

/** Выполнить деплой: git pull → docker compose up --build -d */
async function deploy(pushPayload) {
    const started = Date.now();
    console.log(`[${new Date().toISOString()}] Начинаю деплой...`);

    try {
        // Разрешить работу с repo другого владельца
        execSync('git config --global --add safe.directory /repo', { encoding: 'utf-8' });

        // Убедиться что remote github настроен
        try {
            execSync('git remote add github https://github.com/Mdyuzhev/Uplink.git', {
                cwd: REPO_PATH, encoding: 'utf-8',
            });
        } catch { /* уже существует */ }

        // git pull с GitHub
        const pullResult = execSync('git pull github main', {
            cwd: REPO_PATH,
            encoding: 'utf-8',
            timeout: 60_000,
        });
        console.log('git pull:', pullResult.trim());

        // docker compose up --build --no-deps -d (только uplink и livekit-token, не трогать synapse/postgres/redis)
        // --no-deps критичен: без него compose пересоздаёт synapse с невалидными volume путями
        // (контейнерный путь /repo/docker/synapse не существует на хосте)
        const composeResult = execSync(
            `docker compose -f ${COMPOSE_FILE} up --build --no-deps -d uplink livekit-token uplink-botservice`,
            { cwd: REPO_PATH, encoding: 'utf-8', timeout: 300_000 }
        );
        console.log('docker compose:', composeResult.trim());

        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        console.log(`Деплой завершён за ${elapsed}s`);

        const result = { ok: true, elapsed };
        const commitInfo = getLastCommitInfo();
        await notifyDeploy(result, commitInfo, pushPayload);
        return result;
    } catch (err) {
        console.error('Ошибка деплоя:', err.message);
        const result = { ok: false, error: err.message };
        const commitInfo = getLastCommitInfo();
        await notifyDeploy(result, commitInfo, pushPayload);
        return result;
    }
}

// HTTP-сервер
const server = http.createServer((req, res) => {
    // Health check
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

    // Webhook endpoint
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            // Проверить подпись
            const signature = req.headers['x-hub-signature-256'];
            if (!verifySignature(body, signature)) {
                console.warn('Невалидная подпись webhook');
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            // Проверить что это push в main
            try {
                const payload = JSON.parse(body);
                if (payload.ref && payload.ref !== 'refs/heads/main') {
                    console.log(`Пропуск: push в ${payload.ref}, не main`);
                    res.writeHead(200);
                    res.end('Skipped: not main');
                    return;
                }
            } catch {
                // Не JSON — деплоим всё равно (ручной trigger)
            }

            // Ответить сразу (GitHub ждёт макс 10 сек)
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'deploying' }));

            // Деплой в фоне (передаём payload для уведомлений)
            let pushPayload = null;
            try { pushPayload = JSON.parse(body); } catch {}
            setTimeout(() => deploy(pushPayload), 100);
        });
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`Deploy webhook слушает :${PORT}`);
    console.log(`Secret: ${SECRET ? 'настроен' : 'НЕ настроен (любой POST будет принят)'}`);
});
