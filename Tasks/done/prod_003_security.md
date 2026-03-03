# Задача prod_003: Фаза 1 — Безопасность

## Контекст

Фаза 0 завершена: инфраструктура пересобрана с `uplink.wh-lab.ru`, TLS через Let's Encrypt, CI работает. Следующий блок — безопасность. Без него нельзя давать доступ даже малой команде.

Основная проблема: все `/api/*` эндпоинты botservice открыты — любой может создавать/удалять ботов, включать/отключать их в комнатах, получать токены. Webhook-и от GitHub не проверяют подпись. GIF proxy без rate limit.

### Текущее состояние botservice (server.mjs, ~300 строк)

**Эндпоинты без авторизации:**
- `GET /api/bots` — список ботов
- `GET /api/commands` — все команды
- `POST /api/bots/:botId/enable` — включить бота в комнате
- `POST /api/bots/:botId/disable` — отключить бота
- `POST /api/custom-bots` — создать кастомного бота
- `GET /api/custom-bots` — список кастомных ботов
- `GET /api/custom-bots/:botId` — получить бота
- `PATCH /api/custom-bots/:botId` — обновить бота
- `DELETE /api/custom-bots/:botId` — удалить бота
- `POST /api/custom-bots/:botId/regenerate-token` — перевыпустить токен
- `POST /api/custom-bots/:botId/rooms` — привязать к комнате
- `DELETE /api/custom-bots/:botId/rooms` — отвязать от комнаты
- `GET /api/debug/rooms/:roomId` — диагностика
- `GET /api/gif/search` — GIF-поиск
- `GET /api/gif/trending` — GIF-тренды

**Эндпоинты с авторизацией (AS token через query param):**
- `PUT /transactions/:txnId` — Synapse AS push (проверяет HS_TOKEN)

**Webhook-и (без проверки подписи):**
- `POST /hooks/:integrationId` — GitHub, alerts, CI, и т.д.

**WebSocket (проверяет bot token):**
- `/bot-ws/:token` — SDK-боты (проверяет getCustomBotByToken)

### Что уже сделано
- Rate limiting Synapse: production limits в homeserver.yaml (prod_001)
- Bot rate limiter: `rateLimiter.mjs` — лимит на кастомных ботов (30 msg/min, 5 react/min)
- Webhook forwarder: исходящие вебхуки подписываются HMAC-SHA256 (webhookForwarder.mjs)
- Bot Gateway: WebSocket проверяет token при handshake (botGateway.mjs)


## Шаг 1. Auth middleware для Bot API

Создать файл: `docker/uplink-botservice/middleware/auth.mjs`

Middleware проверяет Matrix access token из заголовка `Authorization: Bearer <token>`. Валидация через Synapse API.

```javascript
/**
 * Auth middleware — проверка Matrix access token.
 * Кеш на 5 минут (избежать нагрузки на Synapse при каждом запросе).
 */

const HOMESERVER_URL = process.env.HOMESERVER_URL || 'http://synapse:8008';

// Кеш: token → { userId, expiresAt }
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут
const MAX_CACHE_SIZE = 1000;

/**
 * Проверить Matrix access token через Synapse whoami API.
 * @returns {string|null} userId или null если невалидный
 */
async function validateToken(token) {
    // Проверить кеш
    const cached = tokenCache.get(token);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.userId;
    }

    try {
        const resp = await fetch(`${HOMESERVER_URL}/_matrix/client/v3/account/whoami`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!resp.ok) return null;

        const data = await resp.json();
        const userId = data.user_id;

        // Сохранить в кеш
        if (tokenCache.size >= MAX_CACHE_SIZE) {
            // Удалить самую старую запись
            const oldest = tokenCache.keys().next().value;
            tokenCache.delete(oldest);
        }
        tokenCache.set(token, { userId, expiresAt: Date.now() + CACHE_TTL });

        return userId;
    } catch (err) {
        console.error('[auth] Ошибка валидации токена:', err.message);
        return null;
    }
}

/**
 * Express middleware: требует валидный Matrix access token.
 * Добавляет req.userId если успешно.
 */
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            errcode: 'M_MISSING_TOKEN',
            error: 'Требуется авторизация: Authorization: Bearer <matrix_access_token>',
        });
    }

    const token = authHeader.slice(7);

    validateToken(token).then(userId => {
        if (!userId) {
            return res.status(401).json({
                errcode: 'M_UNKNOWN_TOKEN',
                error: 'Невалидный или просроченный токен',
            });
        }
        req.userId = userId;
        next();
    }).catch(err => {
        console.error('[auth] Middleware ошибка:', err);
        res.status(500).json({ error: 'Ошибка авторизации' });
    });
}

/**
 * Очистить кеш (для тестов).
 */
export function clearAuthCache() {
    tokenCache.clear();
}
```

### Применить middleware в server.mjs

Импортировать и применить ко всем `/api/*` эндпоинтам КРОМЕ:
- `GET /api/commands` — нужен фронтенду для автокомплита слеш-команд (фронтенд отправляет Matrix token)
- `GET /api/gif/*` — GIF proxy (отдельный rate limit, см. шаг 3)
- `/hooks/*` — webhook-и от внешних сервисов (отдельная верификация, см. шаг 2)
- `/transactions/*` — Synapse AS push (уже проверяет HS_TOKEN)
- `/health` — healthcheck (должен быть публичным)

**Как применить:** НЕ через `app.use('/api', requireAuth)` глобально — это сломает GIF-прокси и commands. Вместо этого добавить `requireAuth` как middleware к конкретным роутам:

```javascript
import { requireAuth } from './middleware/auth.mjs';

// Встроенные боты — требуют авторизацию
app.get('/api/bots', requireAuth, (req, res) => { ... });
app.post('/api/bots/:botId/enable', requireAuth, async (req, res) => { ... });
app.post('/api/bots/:botId/disable', requireAuth, (req, res) => { ... });

// Commands — тоже с авторизацией (фронтенд шлёт Matrix token)
app.get('/api/commands', requireAuth, (_req, res) => { ... });

// Custom bots — все эндпоинты с авторизацией
app.post('/api/custom-bots', requireAuth, async (req, res) => { ... });
app.get('/api/custom-bots', requireAuth, (req, res) => { ... });
// ... и т.д. для всех /api/custom-bots/* эндпоинтов

// Debug — только с авторизацией
app.get('/api/debug/rooms/:roomId', requireAuth, async (req, res) => { ... });
```

### Обновить фронтенд: передавать Matrix token

Фронтенд обращается к bot API через config.botApiUrl. Нужно добавить `Authorization` header с Matrix access token.

Файлы для проверки:
- `web/src/components/BotSettings.tsx` — вызовы к `/api/bots`, `/api/custom-bots`
- `web/src/components/BotCreateModal.tsx` — создание ботов
- `web/src/components/BotManagePanel.tsx` — управление ботами
- `web/src/components/RoomHeader.tsx` — может вызывать bot API
- `web/src/components/MessageInput.tsx` — автокомплит команд (`/api/commands`)
- `web/src/components/StickerGifPanel.tsx` — GIF-поиск (`/api/gif/*`)
- `web/src/bots/CommandRegistry.ts` — загрузка команд

**Паттерн:** MatrixService хранит access token после логина. Нужен метод `matrixService.getAccessToken()` или утилита для создания auth headers:

```typescript
// web/src/utils/api.ts (новый файл)
import { matrixService } from '../matrix/MatrixService';

/** Создать headers с авторизацией для bot API */
export function authHeaders(): Record<string, string> {
    const token = matrixService.getAccessToken();
    return token
        ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

/** fetch с авторизацией */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
        ...options,
        headers: { ...authHeaders(), ...options.headers },
    });
}
```

Далее заменить все `fetch(config.botApiUrl + ...)` на `fetchWithAuth(config.botApiUrl + ...)` в компонентах.

**MatrixService.getAccessToken():** проверить что такой метод есть. Если нет — добавить (client.getAccessToken() из matrix-js-sdk).

**GIF-прокси (`/api/gif/*`):** тоже обернуть в `fetchWithAuth` — это не критично для безопасности (GIF search), но единообразно. Или оставить без auth и добавить rate limit (шаг 3).


## Шаг 2. Webhook signature verification

Файл: `docker/uplink-botservice/middleware/webhookAuth.mjs`

```javascript
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
```

### Применить в server.mjs

```javascript
import { verifyWebhook } from './middleware/webhookAuth.mjs';

app.post('/hooks/:integrationId', verifyWebhook, async (req, res) => {
    // ... существующий код ...
});
```

### Добавить переменные в .env

В `docker/.env.example` добавить:
```env
# Webhook secrets (опционально — без них верификация пропускается)
GITHUB_WEBHOOK_SECRET=
GITLAB_WEBHOOK_TOKEN=
ALERTMANAGER_TOKEN=
```

В `docker/docker-compose.production.yml` добавить env-переменные в botservice:
```yaml
  uplink-botservice:
    environment:
      # ... существующие ...
      GITHUB_WEBHOOK_SECRET: ${GITHUB_WEBHOOK_SECRET:-}
      GITLAB_WEBHOOK_TOKEN: ${GITLAB_WEBHOOK_TOKEN:-}
      ALERTMANAGER_TOKEN: ${ALERTMANAGER_TOKEN:-}
```

То же в `docker/docker-compose.yml` (dev).

**ВАЖНО:** `GITHUB_WEBHOOK_SECRET` для webhook'а GitHub-репозитория (events: push, workflow_run). Это НЕ то же самое что `WEBHOOK_SECRET` из deploy-webhook. Нужно настроить отдельный secret в GitHub repository settings → Webhooks.


## Шаг 3. Rate limiting на nginx

Файл: `web/nginx.conf`

Добавить rate limiting зоны в начало файла (до блока `server`):

```nginx
# Rate limiting зоны
limit_req_zone $binary_remote_addr zone=matrix_api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=bot_api:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=gif_api:10m rate=2r/s;
limit_req_zone $binary_remote_addr zone=webhook:10m rate=5r/s;
```

**Проблема:** nginx.conf внутри web-контейнера. `limit_req_zone` должна быть в контексте `http`, а не `server`. Но наш nginx.conf — это server block, включаемый в дефолтный nginx.conf.

**Решение:** создать отдельный файл `web/nginx-limits.conf`:
```nginx
# Rate limiting зоны (включается в http {} контекст)
limit_req_zone $binary_remote_addr zone=matrix_api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=bot_api:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=gif_api:10m rate=2r/s;
limit_req_zone $binary_remote_addr zone=webhook:10m rate=5r/s;
```

В `web/Dockerfile` добавить:
```dockerfile
COPY nginx-limits.conf /etc/nginx/conf.d/limits.conf
```

Или проще — вставить `limit_req_zone` директивы в начало server block через Vite-хак: в nginx 1.19+ `limit_req_zone` в `server` контексте не работает. Правильный путь:

**Самое простое решение:** добавить в Dockerfile копирование custom `nginx.conf` на уровне `http` блока:

```dockerfile
# В Dockerfile (web/Dockerfile) — заменить дефолтный nginx.conf
COPY nginx-http.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

Создать `web/nginx-http.conf`:
```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    # Rate limiting зоны
    limit_req_zone $binary_remote_addr zone=matrix_api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=bot_api:10m rate=5r/s;
    limit_req_zone $binary_remote_addr zone=gif_api:10m rate=2r/s;
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=5r/s;

    # Формат лога
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    include /etc/nginx/conf.d/*.conf;
}
```

Затем в `web/nginx.conf` добавить `limit_req` к соответствующим location:

```nginx
    location /_matrix/ {
        limit_req zone=matrix_api burst=20 nodelay;
        # ... существующий proxy_pass ...
    }

    location /bot-api/ {
        limit_req zone=bot_api burst=10 nodelay;
        # ... существующий proxy_pass ...
    }

    location /gif-api/ {
        limit_req zone=gif_api burst=5 nodelay;
        # ... существующий proxy_pass ...
    }

    location /hooks/ {
        limit_req zone=webhook burst=10 nodelay;
        # ... существующий proxy_pass ...
    }
```

**Не лимитировать:**
- `/_matrix/media/` — загрузка/скачивание файлов (много запросов при скролле)
- `/livekit-token/` — генерация токенов звонков (единичные запросы)
- `/bot-ws/` — WebSocket (один connection, не HTTP)
- `/` — статика SPA

Если нужно отдельно обрабатывать media: разделить `/_matrix/` на два location:
```nginx
    # Matrix media — без rate limit
    location /_matrix/media/ {
        set $synapse http://synapse:8008;
        proxy_pass $synapse;
        # ... headers ...
        client_max_body_size 50m;
    }

    # Matrix API — с rate limit
    location /_matrix/ {
        limit_req zone=matrix_api burst=20 nodelay;
        set $synapse http://synapse:8008;
        proxy_pass $synapse;
        # ... headers ...
        client_max_body_size 50m;
    }
```

**Порядок важен:** nginx выбирает самый длинный совпадающий prefix. `/_matrix/media/` длиннее `/_matrix/` — запросы к media пойдут в первый блок.


## Шаг 4. Input validation

### 4.1. Max payload size

В server.mjs уже есть `app.use(express.json({ limit: '5mb' }))`. Это ОК для общего лимита. Добавить более строгий лимит для webhook:

```javascript
// Перед webhook route
const webhookJsonParser = express.json({ limit: '1mb' });

app.post('/hooks/:integrationId', webhookJsonParser, verifyWebhook, async (req, res) => {
    // ...
});
```

### 4.2. Command argument sanitization

В `eventHandler.mjs` — команды парсятся из body текста:
```javascript
const parts = body.split(/\s+/);
const commandRoot = parts[0].toLowerCase();
```

Текст приходит из Matrix — уже валидирован Synapse (длина ограничена max event size). Но для безопасности добавить:

```javascript
// В начале handleMatrixEvent, после проверки body
if (body.length > 10000) {
    console.warn(`[event] Слишком длинное сообщение (${body.length} chars) от ${event.sender}`);
    return;
}
```

### 4.3. Custom bot webhook response validation

В `webhookForwarder.mjs` → `executeActions()` — уже есть switch по action.type с ограничениями. Добавить:

```javascript
async function executeActions(bot, actions) {
    // Лимит действий на один ответ
    if (!Array.isArray(actions)) return;
    const safeActions = actions.slice(0, 10); // макс 10 действий
    
    for (const action of safeActions) {
        // Валидация тела сообщения
        if (action.type === 'message' && action.body) {
            if (typeof action.body !== 'string' || action.body.length > 10000) {
                console.warn(`Бот ${bot.id}: слишком длинное сообщение (${action.body?.length})`);
                continue;
            }
        }
        // ... существующий switch ...
    }
}
```

### 4.4. Slash-команды — лимит длины

В `eventHandler.mjs` → `routeCommand()`:
```javascript
// Лимит аргументов
if (parts.length > 50) {
    console.warn(`[command] Слишком много аргументов (${parts.length}) от ${sender}`);
    return;
}
```


## Шаг 5. Обновить Dockerfile botservice (если нужно)

Проверить что `docker/uplink-botservice/Dockerfile` копирует новую директорию `middleware/`:

```dockerfile
COPY middleware/ ./middleware/
```

Или если используется `COPY . .` — middleware подхватится автоматически.


## Тестирование

### Auth middleware
```bash
# Без токена — 401
curl -sf http://localhost:7891/api/bots
# {"errcode":"M_MISSING_TOKEN","error":"..."}

# С невалидным токеном — 401
curl -sf -H "Authorization: Bearer invalid" http://localhost:7891/api/bots
# {"errcode":"M_UNKNOWN_TOKEN","error":"..."}

# С валидным Matrix токеном — 200
TOKEN=$(curl -sf -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"admin","password":"UplinkAdmin2026!"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

curl -sf -H "Authorization: Bearer $TOKEN" http://localhost:7891/api/bots
# [список ботов]

# Health — без авторизации
curl -sf http://localhost:7891/health
# {"status":"ok"}
```

### Webhook signature
```bash
# Без подписи (если GITHUB_WEBHOOK_SECRET настроен) — 403
curl -sf -X POST http://localhost:7891/hooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{}'
# {"error":"Missing signature"}
```

### Rate limiting
```bash
# Отправить 20+ запросов подряд — после burst получить 429
for i in $(seq 1 25); do
  curl -sf -o /dev/null -w "%{http_code} " http://localhost:5174/gif-api/trending
done
# ... 200 200 200 200 200 429 429 429 ...
```

### Фронтенд
- Залогиниться в Uplink
- Открыть настройки бота → список ботов загружается
- Создать кастомного бота → работает
- Открыть панель GIF → гифки ищутся
- Автокомплит слеш-команд → работает
- Разлогиниться → при попытке открыть /api/bots напрямую — 401

### Build
```bash
cd web && npx tsc --noEmit && npm run build
```


## Модифицируемые файлы

| Файл | Действие |
|------|----------|
| `docker/uplink-botservice/middleware/auth.mjs` | **Создать** — auth middleware |
| `docker/uplink-botservice/middleware/webhookAuth.mjs` | **Создать** — webhook signature verification |
| `docker/uplink-botservice/server.mjs` | Применить requireAuth и verifyWebhook |
| `docker/uplink-botservice/eventHandler.mjs` | Input validation (max length, max args) |
| `docker/uplink-botservice/webhookForwarder.mjs` | Validation (max actions, max body length) |
| `web/src/utils/api.ts` | **Создать** — fetchWithAuth утилита |
| `web/src/matrix/MatrixService.ts` | Добавить getAccessToken() если нет |
| `web/src/components/BotSettings.tsx` | Заменить fetch на fetchWithAuth |
| `web/src/components/BotCreateModal.tsx` | Заменить fetch на fetchWithAuth |
| `web/src/components/BotManagePanel.tsx` | Заменить fetch на fetchWithAuth |
| `web/src/components/MessageInput.tsx` | Заменить fetch /api/commands на fetchWithAuth |
| `web/src/components/StickerGifPanel.tsx` | Заменить fetch /gif-api/ на fetchWithAuth (или оставить без) |
| `web/src/components/RoomHeader.tsx` | Проверить вызовы bot API |
| `web/src/bots/CommandRegistry.ts` | Заменить fetch на fetchWithAuth |
| `web/nginx.conf` | Добавить limit_req к location-ам |
| `web/nginx-http.conf` | **Создать** — http-блок с limit_req_zone |
| `web/Dockerfile` | Добавить COPY nginx-http.conf |
| `docker/docker-compose.production.yml` | Добавить env для webhook secrets |
| `docker/docker-compose.yml` | Добавить env для webhook secrets |
| `docker/.env.example` | Добавить webhook secret переменные |


## Чего НЕ делать

- НЕ добавлять авторизацию к `/health` — нужен для Docker healthcheck
- НЕ добавлять авторизацию к `/transactions/*` — уже проверяет HS_TOKEN
- НЕ добавлять авторизацию к `/hooks/*` — внешние сервисы не имеют Matrix token
- НЕ менять WebSocket auth в botGateway.mjs — уже работает через bot token
- НЕ ставить rate limit на WebSocket и media
- НЕ трогать Synapse rate limiting — уже настроен в prod_001


## После завершения

Обновить `.claude/CLAUDE.md`:
- Таблица фаз: Фаза 1 → ✅
- Архитектура: добавить что bot API теперь требует Matrix auth
- Журнал изменений: добавить запись
