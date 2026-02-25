import http from 'node:http';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || '';
const REPO_PATH = '/repo';
const COMPOSE_FILE = '/repo/docker/docker-compose.yml';

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

/** Выполнить деплой: git pull → docker compose up --build -d */
function deploy() {
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

        // docker compose up --build -d (пересобрать только uplink и livekit-token)
        const composeResult = execSync(
            `docker compose -f ${COMPOSE_FILE} up --build -d uplink livekit-token`,
            { cwd: REPO_PATH, encoding: 'utf-8', timeout: 300_000 }
        );
        console.log('docker compose:', composeResult.trim());

        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        console.log(`Деплой завершён за ${elapsed}s`);
        return { ok: true, elapsed };
    } catch (err) {
        console.error('Ошибка деплоя:', err.message);
        return { ok: false, error: err.message };
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

            // Деплой в фоне
            setTimeout(() => deploy(), 100);
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
