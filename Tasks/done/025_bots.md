# 025 — Боты: инфраструктура, slash-команды, готовые интеграции

## Контекст

Боты — ключевая фича командного мессенджера. Без них Uplink остаётся изолированным чатом. С ботами он становится центром рабочего процесса: уведомления из GitHub, алерты мониторинга, CI/CD статусы, кастомные команды — всё приходит в каналы.

Matrix поддерживает ботов через **Application Service API** (спека appservice). Это правильный путь — единый сервис управляет пулом виртуальных бот-пользователей, получает все события через HTTP callback, не хранит пароли. Synapse поддерживает AS нативно.

Задача разбита на 4 фазы. Каждая фаза — рабочий деплой, можно катить инкрементально.


## Архитектура

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Uplink Web UI                               │
│  ┌────────────┐  ┌────────────────┐  ┌─────────────────────────┐    │
│  │ /команда   │  │ Бот-сообщения  │  │ Настройки ботов         │    │
│  │ автокомплит│  │ 🤖 индикатор   │  │ (подключить/отключить)  │    │
│  └──────┬─────┘  └───────▲────────┘  └────────────┬────────────┘    │
│         │                │                         │                 │
└─────────┼────────────────┼─────────────────────────┼─────────────────┘
          │                │                         │
          ▼                │                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Matrix Synapse                                  │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  Application Service API                                  │       │
│  │  → events push (HTTP POST /transactions/{txnId})          │       │
│  │  → virtual user management (@bot_*:uplink.local)          │       │
│  └──────────────┬───────────────────────────────────────────┘       │
└─────────────────┼───────────────────────────────────────────────────┘
                  │ HTTP push
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│              uplink-botservice (Node.js)                             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Bot Registry │  │ Command      │  │ Integration Handlers     │  │
│  │              │  │ Router       │  │                          │  │
│  │ github-bot   │  │ /github      │  │ GitHub webhook → msg     │  │
│  │ ci-bot       │  │ /ci          │  │ CI/CD status → msg       │  │
│  │ alert-bot    │  │ /alert       │  │ Monitoring → msg         │  │
│  │ custom-bot   │  │ /help        │  │ Custom handlers          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Webhook Receiver (POST /hooks/:integrationId)                │   │
│  │ Принимает события от GitHub, GitLab, Grafana и т.д.          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Почему Application Service, а не обычные бот-аккаунты

Обычный бот-аккаунт — это Matrix-пользователь с паролем, который подключается через matrix-js-sdk и слушает /sync. Работает, но масштабируется плохо: каждый бот держит свой sync-поток, хранит пароль, потребляет ресурсы.

Application Service — серверный компонент, зарегистрированный в Synapse. Synapse пушит ему события через HTTP, а AS может действовать от имени любого виртуального пользователя из своего namespace. Один процесс — десятки ботов. Нет sync overhead, нет паролей, нет проблем с E2E (AS-события идут в plaintext по дизайну Matrix).

**Важно про E2E:** боты через AS работают без шифрования. Synapse передаёт им plaintext-версию зашифрованных сообщений через AS API. Это стандартное поведение — Element, Matterbridge, все серьёзные мосты работают так же. Если нужен E2E для бота — он должен быть полноценным клиентом с device key, что сильно усложняет. На первом этапе — работаем без E2E для ботов.


## Фаза 1. Bot Service — инфраструктура

### 1.1. Микросервис uplink-botservice

Новый Docker-контейнер. Node.js + Express. Единственная точка для всех ботов.

Файл: `docker/uplink-botservice/server.mjs`

```javascript
import express from 'express';
import { MatrixClient } from 'matrix-bot-sdk'; // легковесный SDK для ботов

const app = express();
app.use(express.json());

const HOMESERVER_URL = process.env.HOMESERVER_URL || 'http://synapse:8008';
const AS_TOKEN = process.env.AS_TOKEN;     // токен Application Service
const HS_TOKEN = process.env.HS_TOKEN;     // токен для верификации запросов от Synapse
const BOT_NAMESPACE = '@bot_';             // namespace виртуальных пользователей

// ═══════════════════════════════════
// Application Service endpoints
// (Synapse пушит сюда события)
// ═══════════════════════════════════

// Synapse отправляет пачки событий сюда
app.put('/transactions/:txnId', (req, res) => {
    // Верификация что запрос от Synapse
    const token = req.query.access_token;
    if (token !== HS_TOKEN) {
        return res.status(403).json({ errcode: 'M_FORBIDDEN' });
    }

    const events = req.body.events || [];
    for (const event of events) {
        handleMatrixEvent(event).catch(err => {
            console.error('Ошибка обработки события:', err);
        });
    }

    res.json({}); // 200 OK — Synapse ждёт быстрый ответ
});

// Synapse спрашивает, существует ли пользователь из нашего namespace
app.get('/users/:userId', (req, res) => {
    const userId = req.params.userId;
    if (userId.startsWith(BOT_NAMESPACE)) {
        return res.json({}); // да, мы управляем этим пользователем
    }
    res.status(404).json({ errcode: 'M_NOT_FOUND' });
});

// Synapse спрашивает про алиасы комнат
app.get('/rooms/:roomAlias', (req, res) => {
    res.status(404).json({ errcode: 'M_NOT_FOUND' }); // мы не создаём комнаты
});

// ═══════════════════════════════════
// Webhook endpoints
// (внешние сервисы отправляют сюда)
// ═══════════════════════════════════

app.post('/hooks/:integrationId', (req, res) => {
    handleWebhook(req.params.integrationId, req.headers, req.body)
        .then(() => res.json({ ok: true }))
        .catch(err => {
            console.error('Ошибка webhook:', err);
            res.status(500).json({ error: 'Internal error' });
        });
});

// ═══════════════════════════════════
// Admin API — управление ботами
// (вызывает Uplink UI)
// ═══════════════════════════════════

app.get('/api/bots', (req, res) => { /* список доступных ботов */ });
app.post('/api/bots/:botId/enable', (req, res) => { /* включить бота в комнате */ });
app.post('/api/bots/:botId/disable', (req, res) => { /* выключить бота из комнаты */ });
app.get('/api/bots/:botId/commands', (req, res) => { /* список команд бота */ });

app.listen(7891, () => console.log('Bot service на порту 7891'));
```

### 1.2. Регистрация Application Service в Synapse

Файл: `docker/synapse/appservice-bots.yaml`

```yaml
# Регистрация Application Service для ботов Uplink
id: uplink-bots
url: "http://uplink-botservice:7891"
as_token: "GENERATE_RANDOM_TOKEN_HERE"
hs_token: "GENERATE_ANOTHER_RANDOM_TOKEN_HERE"
sender_localpart: "botservice"
namespaces:
  users:
    - exclusive: true
      regex: "@bot_.*:uplink\\.local"
  aliases: []
  rooms: []
rate_limited: false
```

Synapse конфиг (добавить в `homeserver.yaml`):
```yaml
app_service_config_files:
  - /data/appservice-bots.yaml
```

Что это даёт: Synapse теперь знает, что все пользователи `@bot_*:uplink.local` принадлежат нашему сервису. Он будет пушить все события из комнат, где есть наши боты, на `http://uplink-botservice:7891/transactions/{txnId}`.

### 1.3. Docker Compose

Добавить в `docker/docker-compose.yml`:

```yaml
  uplink-botservice:
    build:
      context: ./uplink-botservice
      dockerfile: Dockerfile
    container_name: uplink-botservice
    restart: unless-stopped
    ports:
      - "7891:7891"
    environment:
      - HOMESERVER_URL=http://synapse:8008
      - AS_TOKEN=${BOT_AS_TOKEN}
      - HS_TOKEN=${BOT_HS_TOKEN}
      - SERVER_NAME=uplink.local
    depends_on:
      - synapse
    networks:
      - uplink-network
```

Nginx — проксирование admin API и webhook endpoint:
```nginx
# Bot service admin API (для UI)
location /bot-api/ {
    proxy_pass http://uplink-botservice:7891/api/;
}

# Webhook endpoint (для внешних сервисов)
location /hooks/ {
    proxy_pass http://uplink-botservice:7891/hooks/;
}
```

### 1.4. Bot Registry — реестр ботов

Файл: `docker/uplink-botservice/registry.mjs`

```javascript
/**
 * Реестр ботов. Хранит конфигурацию всех ботов и их привязки к комнатам.
 * На первом этапе — JSON-файл с hot-reload.
 * При масштабировании — можно перенести в SQLite/PostgreSQL.
 */

// Структура бота
const BOT_DEFINITIONS = {
    github: {
        userId: '@bot_github:uplink.local',
        displayName: 'GitHub Bot',
        avatarUrl: null, // mxc:// URL, установим при первом запуске
        description: 'Уведомления о push, PR, issues из GitHub',
        commands: [
            { command: '/github subscribe', description: 'Подписаться на репозиторий', usage: '/github subscribe owner/repo' },
            { command: '/github unsubscribe', description: 'Отписаться от репозитория', usage: '/github unsubscribe owner/repo' },
            { command: '/github list', description: 'Список подписок в канале', usage: '/github list' },
        ],
    },
    ci: {
        userId: '@bot_ci:uplink.local',
        displayName: 'CI/CD Bot',
        avatarUrl: null,
        description: 'Статусы сборок и деплоев',
        commands: [
            { command: '/ci status', description: 'Статус последней сборки', usage: '/ci status [pipeline]' },
            { command: '/ci trigger', description: 'Запустить пайплайн', usage: '/ci trigger [pipeline]' },
        ],
    },
    alerts: {
        userId: '@bot_alerts:uplink.local',
        displayName: 'Alert Bot',
        avatarUrl: null,
        description: 'Алерты из систем мониторинга (Grafana, Prometheus, Uptime Kuma)',
        commands: [
            { command: '/alerts mute', description: 'Заглушить алерты на время', usage: '/alerts mute 30m' },
            { command: '/alerts status', description: 'Текущие активные алерты', usage: '/alerts status' },
        ],
    },
    helper: {
        userId: '@bot_helper:uplink.local',
        displayName: 'Uplink Helper',
        avatarUrl: null,
        description: 'Системный бот — помощь, информация, утилиты',
        commands: [
            { command: '/help', description: 'Список доступных команд', usage: '/help [бот]' },
            { command: '/poll', description: 'Создать голосование', usage: '/poll "Вопрос" "Вариант 1" "Вариант 2"' },
            { command: '/remind', description: 'Напоминание', usage: '/remind 30m проверить деплой' },
        ],
    },
};

// Привязки ботов к комнатам (какой бот где активирован)
// Хранится в JSON-файле /data/bot-rooms.json
// Формат: { "!roomId:server": ["github", "ci"] }
```

### 1.5. Регистрация виртуальных пользователей

При старте сервиса — зарегистрировать бот-пользователей через AS API:

```javascript
import fetch from 'node-fetch';

/**
 * Зарегистрировать виртуального пользователя бота в Synapse.
 * AS API позволяет создавать пользователей из своего namespace без пароля.
 */
async function ensureBotUser(localpart, displayName) {
    const userId = `@${localpart}:${process.env.SERVER_NAME}`;

    // Попытка регистрации (идемпотентна — если уже существует, 400 игнорируем)
    try {
        await fetch(`${HOMESERVER_URL}/_matrix/client/v3/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AS_TOKEN}`,
            },
            body: JSON.stringify({
                type: 'm.login.application_service',
                username: localpart,
            }),
        });
    } catch (err) {
        // Пользователь уже существует — нормально
    }

    // Установить display name
    await fetch(`${HOMESERVER_URL}/_matrix/client/v3/profile/${encodeURIComponent(userId)}/displayname`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AS_TOKEN}`,
            'X-Matrix-User-Id': userId, // действуем от имени бота
        },
        body: JSON.stringify({ displayname: displayName }),
    });

    console.log(`Бот ${userId} (${displayName}) зарегистрирован`);
}

// При старте
async function initBots() {
    for (const [id, bot] of Object.entries(BOT_DEFINITIONS)) {
        const localpart = bot.userId.split(':')[0].substring(1); // bot_github
        await ensureBotUser(localpart, bot.displayName);
    }
}
```


## Фаза 2. Slash-команды — UI во фронтенде

### 2.1. Command Registry

Файл: `web/src/bots/CommandRegistry.ts` (новый)

```typescript
/**
 * Реестр slash-команд. Загружается с бот-сервиса при старте.
 * Используется для автокомплита в MessageInput.
 */

export interface BotCommand {
    command: string;       // "/github subscribe"
    description: string;   // "Подписаться на репозиторий"
    usage: string;         // "/github subscribe owner/repo"
    botId: string;         // "github"
    botName: string;       // "GitHub Bot"
}

class CommandRegistry {
    private commands: BotCommand[] = [];
    private loaded = false;

    /**
     * Загрузить команды со всех активных ботов.
     * Вызывается при инициализации приложения.
     */
    async load(): Promise<void> {
        try {
            const resp = await fetch('/bot-api/bots');
            const bots = await resp.json();
            this.commands = [];
            for (const bot of bots) {
                for (const cmd of bot.commands || []) {
                    this.commands.push({
                        ...cmd,
                        botId: bot.id,
                        botName: bot.displayName,
                    });
                }
            }
            this.loaded = true;
        } catch (err) {
            console.warn('Не удалось загрузить команды ботов:', err);
        }
    }

    /**
     * Поиск команд по вводу пользователя.
     * Пользователь набирает "/" → показываем все команды.
     * Набирает "/git" → фильтруем по префиксу.
     */
    search(input: string): BotCommand[] {
        if (!input.startsWith('/')) return [];
        const query = input.toLowerCase();
        return this.commands
            .filter(cmd => cmd.command.toLowerCase().startsWith(query))
            .slice(0, 8); // максимум 8 подсказок
    }

    /**
     * Проверить, является ли сообщение slash-командой.
     * Если да — его нужно обработать на стороне бота, а не как обычное сообщение.
     */
    isCommand(text: string): boolean {
        return text.startsWith('/') && this.commands.some(
            cmd => text.startsWith(cmd.command.split(' ')[0])
        );
    }

    getAll(): BotCommand[] {
        return [...this.commands];
    }
}

export const commandRegistry = new CommandRegistry();
```

### 2.2. MessageInput — автокомплит slash-команд

Обновить: `web/src/components/MessageInput.tsx`

```tsx
// Состояние автокомплита
const [suggestions, setSuggestions] = useState<BotCommand[]>([]);
const [selectedSuggestion, setSelectedSuggestion] = useState(0);

// При изменении текста — искать совпадения
const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    // Автокомплит только если курсор в начале и текст начинается с /
    if (value.startsWith('/') && !value.includes('\n')) {
        const matches = commandRegistry.search(value);
        setSuggestions(matches);
        setSelectedSuggestion(0);
    } else {
        setSuggestions([]);
    }
};

// Навигация по подсказкам: ↑↓ для выбора, Tab/Enter для вставки
const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestion(i => Math.min(i + 1, suggestions.length - 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestion(i => Math.max(i - 1, 0));
            return;
        }
        if (e.key === 'Tab') {
            e.preventDefault();
            const cmd = suggestions[selectedSuggestion];
            setText(cmd.command + ' ');
            setSuggestions([]);
            return;
        }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
};

// UI попапа с подсказками (над textarea)
{suggestions.length > 0 && (
    <div className="command-suggestions">
        {suggestions.map((cmd, i) => (
            <div
                key={cmd.command}
                className={`command-suggestions__item ${i === selectedSuggestion ? 'command-suggestions__item--active' : ''}`}
                onClick={() => {
                    setText(cmd.command + ' ');
                    setSuggestions([]);
                    textareaRef.current?.focus();
                }}
            >
                <span className="command-suggestions__command">{cmd.command}</span>
                <span className="command-suggestions__bot">{cmd.botName}</span>
                <span className="command-suggestions__desc">{cmd.description}</span>
            </div>
        ))}
    </div>
)}
```

### 2.3. CSS — автокомплит

Файл: `web/src/styles/message-input.css` (добавить в конец)

> **Примечание (после 027):** CSS разбит на модульные файлы. Стили автокомплита добавлять в `message-input.css`, НЕ в `chat.css`.

```css
/* ═══════════════════════════════════
   SLASH COMMAND AUTOCOMPLETE
   ═══════════════════════════════════ */
.command-suggestions {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background: var(--uplink-bg-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--uplink-radius-md);
    padding: 4px;
    margin-bottom: 4px;
    max-height: 280px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);
}

.command-suggestions__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--uplink-radius-sm);
    cursor: pointer;
    transition: background 0.1s;
}

.command-suggestions__item:hover,
.command-suggestions__item--active {
    background: rgba(255, 255, 255, 0.06);
}

.command-suggestions__command {
    font-family: var(--uplink-font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--uplink-accent);
    white-space: nowrap;
}

.command-suggestions__bot {
    font-size: 11px;
    color: var(--uplink-text-faint);
    background: rgba(255, 255, 255, 0.04);
    padding: 1px 6px;
    border-radius: 4px;
    white-space: nowrap;
}

.command-suggestions__desc {
    font-size: 13px;
    color: var(--uplink-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
}
```


## Фаза 3. Обработка событий и команд на бот-сервисе

### 3.1. Event Handler — маршрутизация событий

Файл: `docker/uplink-botservice/eventHandler.mjs`

```javascript
import { BOT_DEFINITIONS, getBotRoomBindings } from './registry.mjs';
import { sendBotMessage, sendBotReaction } from './matrixClient.mjs';

/**
 * Обработка Matrix-события, полученного от Synapse через AS API.
 * Synapse пушит ВСЕ события из комнат, где есть наши боты.
 * Фильтруем только m.room.message и проверяем на slash-команды.
 */
export async function handleMatrixEvent(event) {
    // Игнорировать события от наших собственных ботов (избежать циклов)
    if (event.sender?.startsWith('@bot_')) return;

    // Игнорировать не-message события (state events, reactions и т.д.)
    if (event.type !== 'm.room.message') return;

    const body = event.content?.body;
    if (!body || typeof body !== 'string') return;

    const roomId = event.room_id;

    // Проверить, начинается ли с slash-команды
    if (body.startsWith('/')) {
        await routeCommand(roomId, event.sender, body, event.event_id);
        return;
    }

    // Здесь можно добавить обработку mention-ов ботов (@bot_github)
    // или ключевых слов, если нужно
}

/**
 * Маршрутизация slash-команды к нужному боту.
 * /github subscribe owner/repo → github bot → subscribe handler
 */
async function routeCommand(roomId, sender, body, eventId) {
    const parts = body.split(/\s+/);
    const commandRoot = parts[0].toLowerCase(); // "/github"
    const subCommand = parts[1]?.toLowerCase();  // "subscribe"
    const args = parts.slice(2);                 // ["owner/repo"]

    // Найти бота по первому слову команды
    const botEntry = Object.entries(BOT_DEFINITIONS).find(([id, bot]) => {
        return bot.commands.some(cmd =>
            cmd.command.split(' ')[0].toLowerCase() === commandRoot
        );
    });

    if (!botEntry) {
        // Неизвестная команда — helper бот подскажет
        await sendBotMessage(
            'bot_helper',
            roomId,
            `❓ Неизвестная команда \`${commandRoot}\`. Введите \`/help\` для списка команд.`
        );
        return;
    }

    const [botId, botDef] = botEntry;

    // Проверить что бот активирован в этой комнате
    const bindings = getBotRoomBindings();
    const roomBots = bindings[roomId] || [];
    if (!roomBots.includes(botId) && botId !== 'helper') {
        await sendBotMessage(
            'bot_helper',
            roomId,
            `⚠️ Бот **${botDef.displayName}** не активирован в этом канале. Подключите его в настройках.`
        );
        return;
    }

    // Делегировать обработку конкретному хендлеру
    try {
        const handler = await import(`./handlers/${botId}.mjs`);
        await handler.handleCommand({ roomId, sender, subCommand, args, eventId, body });
    } catch (err) {
        console.error(`Ошибка обработки команды ${botId}:`, err);
        await sendBotMessage(
            botDef.userId.split(':')[0].substring(1),
            roomId,
            `❌ Ошибка выполнения команды: ${err.message}`
        );
    }
}
```

### 3.2. Matrix Client — отправка сообщений от имени бота

Файл: `docker/uplink-botservice/matrixClient.mjs`

```javascript
import fetch from 'node-fetch';

const HOMESERVER_URL = process.env.HOMESERVER_URL;
const AS_TOKEN = process.env.AS_TOKEN;
const SERVER_NAME = process.env.SERVER_NAME;

/**
 * Отправить сообщение от имени бота.
 * AS API позволяет действовать от имени любого виртуального пользователя
 * через заголовок user_id или query param.
 */
export async function sendBotMessage(botLocalpart, roomId, body, formatted) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;
    const txnId = `bot_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const content = {
        msgtype: 'm.text',
        body: body,
    };

    // Если есть formatted-версия (HTML), добавить
    if (formatted) {
        content.format = 'org.matrix.custom.html';
        content.formatted_body = formatted;
    }

    // Маркер что это сообщение бота (кастомное поле для UI)
    content['dev.uplink.bot'] = {
        bot_id: botLocalpart.replace('bot_', ''),
        is_bot: true,
    };

    const resp = await fetch(
        `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}?user_id=${encodeURIComponent(userId)}`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AS_TOKEN}`,
            },
            body: JSON.stringify(content),
        }
    );

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Ошибка отправки: ${resp.status} ${err}`);
    }

    return (await resp.json()).event_id;
}

/**
 * Пригласить бота в комнату.
 * Synapse автоматически join-ит AS-пользователей при invite.
 */
export async function inviteBotToRoom(botLocalpart, roomId) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;

    // Invite
    await fetch(`${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AS_TOKEN}`,
        },
        body: JSON.stringify({ user_id: userId }),
    });

    // Auto-join от имени бота
    await fetch(`${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join?user_id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AS_TOKEN}`,
        },
        body: JSON.stringify({}),
    });
}
```

### 3.3. Хендлер GitHub Bot

Файл: `docker/uplink-botservice/handlers/github.mjs`

```javascript
import { sendBotMessage } from '../matrixClient.mjs';
import { getStorage, setStorage } from '../storage.mjs';

const BOT = 'bot_github';

/**
 * Обработка slash-команд GitHub бота.
 */
export async function handleCommand({ roomId, sender, subCommand, args }) {
    switch (subCommand) {
        case 'subscribe':
            return handleSubscribe(roomId, sender, args);
        case 'unsubscribe':
            return handleUnsubscribe(roomId, sender, args);
        case 'list':
            return handleList(roomId);
        default:
            await sendBotMessage(BOT, roomId,
                '**GitHub Bot — команды:**\n' +
                '`/github subscribe owner/repo` — подписаться на репозиторий\n' +
                '`/github unsubscribe owner/repo` — отписаться\n' +
                '`/github list` — список подписок'
            );
    }
}

async function handleSubscribe(roomId, sender, args) {
    const repo = args[0];
    if (!repo || !repo.includes('/')) {
        await sendBotMessage(BOT, roomId,
            '⚠️ Укажите репозиторий в формате `owner/repo`.\nПример: `/github subscribe myteam/backend`'
        );
        return;
    }

    // Сохранить подписку
    const subs = getStorage(`github:${roomId}`) || [];
    if (subs.includes(repo)) {
        await sendBotMessage(BOT, roomId, `Канал уже подписан на **${repo}**.`);
        return;
    }
    subs.push(repo);
    setStorage(`github:${roomId}`, subs);

    await sendBotMessage(BOT, roomId,
        `✅ Подписка на **${repo}** оформлена.\n` +
        `Добавьте webhook в настройках репозитория:\n` +
        `\`\`\`\nURL: ${process.env.PUBLIC_URL || 'https://uplink.example.com'}/hooks/github\nContent type: application/json\nSecret: (настройте в конфиге)\n\`\`\``,
    );
}

async function handleUnsubscribe(roomId, sender, args) {
    const repo = args[0];
    const subs = getStorage(`github:${roomId}`) || [];
    const filtered = subs.filter(r => r !== repo);
    setStorage(`github:${roomId}`, filtered);
    await sendBotMessage(BOT, roomId, `✅ Отписка от **${repo}** выполнена.`);
}

async function handleList(roomId) {
    const subs = getStorage(`github:${roomId}`) || [];
    if (subs.length === 0) {
        await sendBotMessage(BOT, roomId, 'В этом канале нет подписок на репозитории.');
        return;
    }
    await sendBotMessage(BOT, roomId,
        '**Подписки в этом канале:**\n' + subs.map(r => `• ${r}`).join('\n')
    );
}

/**
 * Обработка входящего webhook от GitHub.
 * Вызывается из webhook receiver при POST /hooks/github.
 */
export async function handleWebhook(headers, body) {
    const event = headers['x-github-event'];
    const repo = body.repository?.full_name;
    if (!repo) return;

    // Найти все комнаты, подписанные на этот репозиторий
    const allKeys = getAllStorageKeys().filter(k => k.startsWith('github:'));
    for (const key of allKeys) {
        const roomId = key.replace('github:', '');
        const subs = getStorage(key) || [];
        if (!subs.includes(repo)) continue;

        const message = formatGitHubEvent(event, body);
        if (message) {
            await sendBotMessage(BOT, roomId, message.text, message.html);
        }
    }
}

/**
 * Форматирование GitHub-события в красивое сообщение.
 */
function formatGitHubEvent(event, body) {
    switch (event) {
        case 'push': {
            const branch = body.ref?.replace('refs/heads/', '');
            const commits = body.commits || [];
            const pusher = body.pusher?.name;
            const repo = body.repository?.full_name;
            const text = `🔀 **${pusher}** pushed ${commits.length} commit(s) to \`${branch}\` in **${repo}**\n` +
                commits.slice(0, 5).map(c => `  • \`${c.id.slice(0, 7)}\` ${c.message.split('\n')[0]}`).join('\n');
            return { text };
        }
        case 'pull_request': {
            const pr = body.pull_request;
            const action = body.action;
            const text = `🔃 PR ${action}: **${pr.title}** (#${pr.number}) by ${pr.user.login}\n${pr.html_url}`;
            return { text };
        }
        case 'issues': {
            const issue = body.issue;
            const action = body.action;
            const text = `🐛 Issue ${action}: **${issue.title}** (#${issue.number}) by ${issue.user.login}\n${issue.html_url}`;
            return { text };
        }
        case 'workflow_run': {
            const run = body.workflow_run;
            const status = run.conclusion === 'success' ? '✅' : run.conclusion === 'failure' ? '❌' : '⏳';
            const text = `${status} Workflow **${run.name}**: ${run.conclusion || run.status} (${run.head_branch})\n${run.html_url}`;
            return { text };
        }
        default:
            return null; // неизвестные события не отправляем
    }
}
```


## Фаза 4. Фронтенд — UI для ботов

### 4.1. Индикатор бота в MessageBubble

Обновить: `web/src/components/MessageBubble.tsx`

> **Примечание (после 027):** MessageBubble частично декомпозирован — типы в `components/message/types.ts`, форматтеры в `components/message/formatters.ts`. Бот-бейдж добавляется в MessageBubble.tsx в header сообщения. Если в будущем header вынесется в `message/MessageHeader.tsx` — бейдж уедет туда.

Если сообщение содержит кастомное поле `dev.uplink.bot` или отправитель начинается с `@bot_`, показать бейдж:

```tsx
// Определение что отправитель — бот
const isBot = message.sender.startsWith('@bot_') ||
    message.content?.['dev.uplink.bot']?.is_bot;

// В header сообщения — после имени
{isBot && (
    <span className="message-bubble__bot-badge">БОТ</span>
)}
```

Файл CSS: `web/src/styles/messages.css` (добавить в конец)

```css
.message-bubble__bot-badge {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--uplink-accent);
    background: rgba(88, 101, 242, 0.12);
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: 6px;
    vertical-align: middle;
}
```

### 4.2. BotSettings — панель управления ботами в комнате

Файл: `web/src/components/BotSettings.tsx` (новый)
Файл CSS: `web/src/styles/bots.css` (новый — стили BotSettings, bot-badge, avatar-indicator)

Доступна из RoomHeader (кнопка 🤖 или через меню настроек комнаты). Показывает список ботов, их статус в текущей комнате, возможность включить/выключить.

> **Примечание (после 027):** State `showBotSettings` добавлять в хук `hooks/useChatState.ts` (там живёт весь state ChatLayout), НЕ в ChatLayout.tsx напрямую. Из хука пробросить в ChatLayout → RoomHeader.

```tsx
import React, { useState, useEffect } from 'react';

interface BotInfo {
    id: string;
    displayName: string;
    description: string;
    commands: { command: string; description: string }[];
    enabledInRoom: boolean;
}

interface BotSettingsProps {
    roomId: string;
    onClose: () => void;
}

export const BotSettings: React.FC<BotSettingsProps> = ({ roomId, onClose }) => {
    const [bots, setBots] = useState<BotInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBots();
    }, [roomId]);

    const loadBots = async () => {
        try {
            const resp = await fetch(`/bot-api/bots?roomId=${encodeURIComponent(roomId)}`);
            setBots(await resp.json());
        } catch (err) {
            console.error('Ошибка загрузки ботов:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleBot = async (botId: string, enable: boolean) => {
        const action = enable ? 'enable' : 'disable';
        await fetch(`/bot-api/bots/${botId}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId }),
        });
        loadBots(); // обновить список
    };

    return (
        <div className="bot-settings">
            <div className="bot-settings__header">
                <span className="bot-settings__title">Боты</span>
                <button className="bot-settings__close" onClick={onClose}>✕</button>
            </div>

            <div className="bot-settings__list">
                {bots.map(bot => (
                    <div key={bot.id} className="bot-settings__item">
                        <div className="bot-settings__item-header">
                            <span className="bot-settings__item-name">{bot.displayName}</span>
                            <label className="bot-settings__toggle">
                                <input
                                    type="checkbox"
                                    checked={bot.enabledInRoom}
                                    onChange={e => toggleBot(bot.id, e.target.checked)}
                                />
                                <span className="bot-settings__toggle-slider" />
                            </label>
                        </div>
                        <p className="bot-settings__item-desc">{bot.description}</p>
                        {bot.enabledInRoom && bot.commands.length > 0 && (
                            <div className="bot-settings__commands">
                                {bot.commands.map(cmd => (
                                    <div key={cmd.command} className="bot-settings__command">
                                        <code>{cmd.command}</code>
                                        <span>{cmd.description}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
```

### 4.3. RoomHeader — кнопка управления ботами

Обновить: `web/src/components/RoomHeader.tsx`

> **Примечание (после 027):** `showBotSettings` и `setShowBotSettings` приходят из `useChatState` → ChatLayout → RoomHeader (через props). В RoomHeader только рендер кнопки и вызов колбэка.

```tsx
// В ряд кнопок рядом со звонком
<button
    className="room-header__btn"
    onClick={() => setShowBotSettings(!showBotSettings)}
    title="Боты"
>
    🤖
</button>

// Попап с BotSettings
{showBotSettings && (
    <BotSettings roomId={roomId} onClose={() => setShowBotSettings(false)} />
)}
```

### 4.4. Avatar для ботов

Обновить: `web/src/components/Avatar.tsx`

Если пользователь — бот, на аватаре маленький индикатор-робот в углу:

```tsx
{isBot && (
    <span className="avatar__bot-indicator">🤖</span>
)}
```

Файл CSS: `web/src/styles/messages.css` (или `bots.css`)

```css
.avatar__bot-indicator {
    position: absolute;
    bottom: -2px;
    right: -2px;
    font-size: 10px;
    background: var(--uplink-bg-primary);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}
```

### 4.5. Sidebar — скрытие ботов из user list

> **Примечание (после 027):** Sidebar декомпозирован — подкомпоненты в `components/sidebar/` (RoomItem.tsx, SpaceItem.tsx, UserItem.tsx). Фильтрацию ботов лучше делать в хуке `hooks/useUsers.ts` (чтобы ботов не было в данных), а не в Sidebar.tsx. Если нужна отдельная секция "Боты" — создать `components/sidebar/BotList.tsx`.

Боты не должны отображаться в обычном списке участников комнаты как живые люди. В useUsers — фильтровать `@bot_*`:

```typescript
// hooks/useUsers.ts — при формировании списка пользователей
const humanMembers = members.filter(m => !m.userId.startsWith('@bot_'));
```

Можно показывать ботов отдельной секцией "Боты" под списком участников через `sidebar/BotList.tsx`, если нужно.


## Фаза 5 (опционально). Хендлеры остальных ботов

### Alert Bot — Grafana / Prometheus / Uptime Kuma

Файл: `docker/uplink-botservice/handlers/alerts.mjs`

Webhook endpoint `/hooks/alerts` принимает стандартные форматы алертинга. Grafana и Alertmanager шлют JSON с алертами — парсим и отправляем в привязанные комнаты.

```javascript
export async function handleWebhook(headers, body) {
    // Grafana формат
    if (body.alerts) {
        for (const alert of body.alerts) {
            const status = alert.status === 'firing' ? '🔴' : '🟢';
            const text = `${status} **${alert.labels?.alertname || 'Alert'}** — ${alert.status}\n` +
                `${alert.annotations?.description || alert.annotations?.summary || ''}`;
            await sendToSubscribedRooms('alerts', text);
        }
    }
    // Uptime Kuma формат
    if (body.heartbeat) {
        const status = body.heartbeat.status === 1 ? '🟢 UP' : '🔴 DOWN';
        const text = `${status}: **${body.monitor?.name}** (${body.monitor?.url})`;
        await sendToSubscribedRooms('alerts', text);
    }
}
```

### CI/CD Bot — GitHub Actions / GitLab CI

Файл: `docker/uplink-botservice/handlers/ci.mjs`

Ловит `workflow_run` и `deployment_status` от GitHub, `Pipeline Hook` от GitLab:

```javascript
export async function handleWebhook(headers, body) {
    // GitHub Actions
    if (headers['x-github-event'] === 'workflow_run') {
        const run = body.workflow_run;
        const icon = run.conclusion === 'success' ? '✅' :
                     run.conclusion === 'failure' ? '❌' : '⏳';
        await sendToSubscribedRooms('ci',
            `${icon} **${run.name}** → ${run.conclusion || run.status}\n` +
            `Branch: \`${run.head_branch}\` • ${run.html_url}`
        );
    }
    // GitLab CI
    if (body.object_kind === 'pipeline') {
        const pipeline = body.object_attributes;
        const icon = pipeline.status === 'success' ? '✅' :
                     pipeline.status === 'failed' ? '❌' : '⏳';
        await sendToSubscribedRooms('ci',
            `${icon} Pipeline #${pipeline.id} → ${pipeline.status}\n` +
            `Project: **${body.project?.name}** • Branch: \`${pipeline.ref}\``
        );
    }
}
```

### Helper Bot — системные утилиты

Файл: `docker/uplink-botservice/handlers/helper.mjs`

```javascript
export async function handleCommand({ roomId, sender, subCommand, args, body }) {
    const fullCommand = body.trim().toLowerCase();

    if (fullCommand === '/help') {
        // Показать все доступные команды
        const allCommands = getAllBotCommands(roomId);
        const text = '📋 **Доступные команды:**\n\n' +
            allCommands.map(c => `\`${c.command}\` — ${c.description}`).join('\n');
        await sendBotMessage('bot_helper', roomId, text);
        return;
    }

    if (fullCommand.startsWith('/poll')) {
        return handlePoll(roomId, sender, body);
    }

    if (fullCommand.startsWith('/remind')) {
        return handleRemind(roomId, sender, args);
    }
}
```


## Порядок реализации

1. **uplink-botservice scaffold** — Express-сервер, AS endpoints, Dockerfile, docker-compose.
2. **Synapse конфиг** — appservice-bots.yaml, регистрация в homeserver.yaml.
3. **Bot registry + регистрация пользователей** — при старте создаёт @bot_* аккаунты.
4. **Event handler + command router** — маршрутизация slash-команд к хендлерам.
5. **Helper bot** — /help, базовые команды. Первый работающий бот для теста.
6. **UI: бот-бейдж в MessageBubble** — индикатор 🤖/БОТ рядом с именем.
7. **UI: slash-автокомплит в MessageInput** — подсказки команд при вводе /.
8. **GitHub bot** — /github subscribe, webhook handler, форматирование событий.
9. **CI/CD bot** — handler для GitHub Actions и GitLab CI webhooks.
10. **Alert bot** — handler для Grafana/Alertmanager/Uptime Kuma.
11. **UI: BotSettings панель** — включение/отключение ботов в комнате.
12. **Nginx конфиг** — проксирование /bot-api/ и /hooks/.
13. **Тест E2E** — подключить GitHub webhook к реальному репозиторию, проверить поток.


## Файлы

> **Обновлено после рефакторинга 027.** MatrixService декомпозирован на модули, CSS разбит на файлы, state ChatLayout вынесен в useChatState.

Новые:
- `docker/uplink-botservice/` — весь микросервис (server.mjs, registry.mjs, matrixClient.mjs, eventHandler.mjs, storage.mjs, Dockerfile, package.json)
- `docker/uplink-botservice/handlers/` — github.mjs, ci.mjs, alerts.mjs, helper.mjs
- `docker/synapse/appservice-bots.yaml` — регистрация AS
- `web/src/bots/CommandRegistry.ts` — реестр slash-команд
- `web/src/components/BotSettings.tsx` — панель управления ботами
- `web/src/styles/bots.css` — стили BotSettings, bot-badge, avatar-indicator

Изменённые:
- `docker/docker-compose.yml` — новый сервис uplink-botservice
- `docker/synapse/homeserver.yaml` — app_service_config_files
- `docker/.env` — BOT_AS_TOKEN, BOT_HS_TOKEN
- `web/src/components/MessageBubble.tsx` — бот-бейдж
- `web/src/components/MessageInput.tsx` — slash-автокомплит
- `web/src/components/RoomHeader.tsx` — кнопка 🤖
- `web/src/components/Avatar.tsx` — бот-индикатор
- `web/src/hooks/useChatState.ts` — showBotSettings state
- `web/src/hooks/useUsers.ts` — фильтрация ботов из списка пользователей
- `web/src/styles/messages.css` — стили бот-бейджа
- `web/src/styles/message-input.css` — стили command-suggestions
- `web/nginx.conf` — /bot-api/, /hooks/ проксирование


## Коммиты

```
[bots] Инфраструктура: uplink-botservice, Application Service, регистрация ботов
[bots] Event handler + command router + Helper Bot (/help)
[bots] UI: бот-бейдж в сообщениях, slash-автокомплит, BotSettings панель
[bots] GitHub Bot: slash-команды + webhook handler
[bots] CI/CD Bot + Alert Bot: webhook handlers для GitHub Actions, Grafana, Uptime Kuma
[bots] Nginx проксирование, E2E тест
```


## Важные нюансы

**E2E шифрование и боты.** AS-боты НЕ поддерживают E2E. Synapse передаёт им plaintext через AS API. Это означает, что в зашифрованных комнатах боты не увидят сообщения. Решения: (а) создать отдельные незашифрованные каналы для ботов (рекомендуется — "#dev-ci", "#alerts"), (б) или в будущем реализовать E2E для ботов через полноценный matrix-sdk-crypto. Вариант (а) проще и надёжнее.

**Rate limiting.** В appservice-bots.yaml стоит `rate_limited: false` — Synapse не будет лимитить AS. Но сам бот-сервис должен ставить rate limit на webhook endpoint, чтобы GitHub-flood не положил сервис.

**Storage.** На первом этапе — JSON-файл на диске (volume mount). При росте — SQLite (встроена в Node, zero-dependency) или отдельная таблица в PostgreSQL Synapse.

**Безопасность webhook-ов.** GitHub подписывает payload через HMAC-SHA256. Нужно верифицировать `X-Hub-Signature-256` header. Аналогично для GitLab — проверять `X-Gitlab-Token`.
