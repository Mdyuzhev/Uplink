# 021 — GitHub Webhook: автоматический деплой по git push

## Цель

После `git push origin main` сервер автоматически подхватывает изменения и пересобирает контейнеры. SSH не нужен — GitHub отправляет POST-запрос на сервер, webhook-сервис делает `git pull` и `docker compose up --build -d`.

Агенту достаточно выполнить `git push origin main` — деплой произойдёт автоматически через 10–15 секунд.

## Архитектура

```
git push → GitHub → POST /api/deploy-webhook → nginx (uplink) → deploy-webhook:9000
                                                                      │
                                                          git pull + docker compose up --build -d
                                                          (через docker.sock)
```

Сервис `deploy-webhook`:
- Легковесный Node.js HTTP-сервер (один файл, ~80 строк)
- Проверяет подпись GitHub (HMAC-SHA256) — защита от чужих запросов
- Выполняет `git pull` + `docker compose up --build -d` через примонтированные docker.sock и репозиторий
- Docker CLI установлен внутри контейнера для управления compose

## Шаг 1. Создать webhook-сервис

### 1.1. Директория

Создать `docker/deploy-webhook/` с тремя файлами.

### 1.2. server.mjs

Файл: `docker/deploy-webhook/server.mjs`

```javascript
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
        // git pull
        const pullResult = execSync('git pull origin main', {
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
```

### 1.3. Dockerfile

Файл: `docker/deploy-webhook/Dockerfile`

```dockerfile
FROM node:20-alpine

# Установить docker CLI и docker compose plugin (для управления контейнерами)
RUN apk add --no-cache docker-cli docker-cli-compose git

WORKDIR /app
COPY server.mjs .

EXPOSE 9000

CMD ["node", "server.mjs"]
```

### 1.4. .dockerignore

Файл: `docker/deploy-webhook/.dockerignore`

```
node_modules
```


## Шаг 2. Обновить docker-compose.yml

Файл: `docker/docker-compose.yml`

Добавить сервис `deploy-webhook` после `uplink`:

```yaml
  deploy-webhook:
    build:
      context: ./deploy-webhook
      dockerfile: Dockerfile
    container_name: uplink-deploy-webhook
    restart: unless-stopped
    environment:
      WEBHOOK_SECRET: ${WEBHOOK_SECRET:-}
    volumes:
      # Docker socket — для выполнения docker compose
      - /var/run/docker.sock:/var/run/docker.sock
      # Репозиторий — для git pull
      - /home/flomaster/projects/uplink:/repo
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:9000/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
```

**Важно:** путь `/home/flomaster/projects/uplink` — абсолютный путь на сервере. Docker volume mount требует абсолютный путь, `~` не работает.


## Шаг 3. Обновить nginx.conf

Файл: `web/nginx.conf`

Добавить location для проксирования webhook (перед SPA fallback `location /`):

```nginx
    # Deploy webhook (GitHub → автодеплой)
    location /api/deploy-webhook/ {
        proxy_pass http://deploy-webhook:9000/;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $host;
        # GitHub может слать большие payload-ы
        client_max_body_size 10m;
    }
```

Порядок location-ов в итоговом nginx.conf:
1. `/api/deploy-webhook/` → deploy-webhook:9000
2. `/livekit-token/` → livekit-token:7890
3. `/_matrix/` → synapse:8008
4. `/assets/` → статика с кэшем
5. `= /index.html` → без кэша
6. `/` → SPA fallback


## Шаг 4. Добавить WEBHOOK_SECRET в .env

Файл: `docker/.env`

Добавить строку:

```env
# GitHub Webhook secret (должен совпадать с настройкой в GitHub)
WEBHOOK_SECRET=uplink-deploy-secret-2024
```

Секрет может быть любым. Главное — тот же самый указать в настройках GitHub webhook.


## Шаг 5. Задеплоить (вручную, один раз)

Этот деплой нужно выполнить вручную — после него все следующие будут автоматическими.

```bash
ssh flomaster@flomasterserver
cd ~/projects/uplink
git pull
cd docker
docker compose up --build -d
```

Проверить что webhook работает:
```bash
curl -s http://localhost:5174/api/deploy-webhook/health
# Должен вернуть: {"status":"ok"}
```


## Шаг 6. Настроить GitHub Webhook

В репозитории GitHub → Settings → Webhooks → Add webhook:

- **Payload URL:** `https://<cloudflare-tunnel-url>/api/deploy-webhook/webhook`
- **Content type:** `application/json`
- **Secret:** `uplink-deploy-secret-2024` (тот же что в .env)
- **Events:** Just the push event
- **Active:** ✓

Если Cloudflare Tunnel URL меняется (quick tunnel) — нужно обновлять. Для постоянного URL использовать named tunnel в Cloudflare dashboard.


## Шаг 7. Обновить скрипты и документацию

### 7.1. deploy-remote.sh

Файл: `scripts/deploy-remote.sh`

Обновить — добавить альтернативу через webhook:

```bash
# ── Деплой на сервере ──
# Вариант 1: через webhook (если настроен)
if [[ "$1" == "--webhook" ]]; then
    WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:5174/api/deploy-webhook/webhook}"
    echo "=== Deploy через webhook ==="
    curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"ref":"refs/heads/main"}' 2>&1
    echo ""
    echo "Деплой запущен. Проверь логи: docker logs uplink-deploy-webhook"
    exit 0
fi
```

### 7.2. CLAUDE.md

Обновить секцию "Деплой":

```markdown
## Деплой

**Автоматический (после настройки webhook):**
Просто `git push origin main` — GitHub отправит webhook, сервер сам подхватит через 10–15 секунд.

**Для агента (Claude Code):**
```bash
git push origin main   # достаточно — webhook сделает остальное
```

**Ручной (fallback):**
```bash
bash scripts/deploy-remote.sh          # через sshpass
bash scripts/deploy-remote.sh --push   # git push + деплой через sshpass
```
```

### 7.3. commands/push.md

Обновить шаг деплоя:

```
8. Деплой: если webhook настроен — происходит автоматически после push.
   Fallback: `bash scripts/deploy-remote.sh`
```


## Проверка работоспособности

1. `curl http://localhost:5174/api/deploy-webhook/health` → `{"status":"ok"}`
2. Сделать `git push origin main` → через 10–15 сек контейнеры пересобраны
3. `docker logs uplink-deploy-webhook` → видно "Начинаю деплой...", "Деплой завершён за Xs"
4. Невалидная подпись → 403 Forbidden в логах
5. Push в не-main ветку → "Пропуск" в логах


## Файлы

Новые:
- `docker/deploy-webhook/server.mjs`
- `docker/deploy-webhook/Dockerfile`
- `docker/deploy-webhook/.dockerignore`

Изменённые:
- `docker/docker-compose.yml` — добавить сервис deploy-webhook
- `docker/.env` — добавить WEBHOOK_SECRET
- `web/nginx.conf` — добавить location /api/deploy-webhook/
- `scripts/deploy-remote.sh` — добавить --webhook вариант
- `.claude/CLAUDE.md` — обновить секцию деплоя
- `.claude/commands/push.md` — обновить шаг деплоя
- `.claude/commands/infra.md` — обновить deploy

## Коммит

```
[infra] GitHub Webhook: автодеплой по git push

- deploy-webhook: Node.js сервис, проверяет HMAC-SHA256, делает git pull + docker compose up
- docker-compose: новый сервис deploy-webhook с docker.sock и mounted repo
- nginx: проксирование /api/deploy-webhook/ → deploy-webhook:9000
- Документация обновлена
```

## После коммита

Этот деплой выполняется ВРУЧНУЮ (последний раз):
```bash
ssh flomaster@flomasterserver "cd ~/projects/uplink && git pull && cd docker && docker compose up --build -d"
```

Потом — настроить GitHub Webhook в Settings → Webhooks.
Все последующие `git push` будут деплоиться автоматически.
