# 026 — Bot SDK: платформа для создания пользовательских ботов (НАБРОСОК)

## Идея

Дать разработчикам возможность писать своих ботов для Uplink без доступа к серверу и без знания Matrix-протокола. Два режима работы: npm-пакет `@uplink/bot-sdk` для полноценных ботов на Node.js, и webhook-режим для лёгких интеграций (получил HTTP → ответил JSON → бот написал в чат).

**Зависимость:** задача 025 (инфраструктура ботов, Application Service, botservice).

> **Примечание (после 027):** После рефакторинга 027 структура фронтенда изменилась: MatrixService декомпозирован на модули (`matrixService.messages.*`, `matrixService.rooms.*` и т.д.), CSS разбит на модульные файлы (нет единого `chat.css`), весь state ChatLayout вынесен в хук `hooks/useChatState.ts`, Sidebar/MessageBubble/ProfileModal декомпозированы на подкомпоненты. Серверная часть (botservice) не затронута.


## Два режима ботов

### Режим 1: SDK (npm-пакет)

Разработчик ставит `npm install @uplink/bot-sdk`, пишет бота на Node.js, запускает у себя. SDK подключается к Uplink через WebSocket/long-poll и получает события в реальном времени. Бот работает как отдельный процесс — может быть на любом сервере.

```javascript
// Пример: весь бот в 15 строк
import { UplinkBot } from '@uplink/bot-sdk';

const bot = new UplinkBot({
    url: 'https://uplink.example.com',
    token: 'bot_xxxxxxxxxxxx', // получен при регистрации через UI
});

bot.onCommand('/weather', async (ctx) => {
    const city = ctx.args[0] || 'Москва';
    const weather = await fetchWeather(city);
    await ctx.reply(`🌤 ${city}: ${weather.temp}°C, ${weather.description}`);
});

bot.onMessage(async (ctx) => {
    // Вызывается на каждое сообщение (не команду) в комнатах где бот активен
    if (ctx.body.includes('привет')) {
        await ctx.react('👋');
    }
});

bot.start();
```

### Режим 2: Webhook (HTTP callback)

Для простых интеграций без постоянного процесса. Разработчик указывает URL — botservice шлёт туда POST с событиями, ждёт JSON-ответ с действиями. Можно хостить на Cloudflare Workers, Vercel, даже Google Apps Script.

```
Uplink botservice → POST https://my-server.com/bot-hook
                     Body: { event: "command", command: "/deploy", args: ["prod"], room: "!abc:uplink.local", sender: "@user:uplink.local" }

                  ← 200 OK
                     Body: { actions: [{ type: "message", body: "🚀 Деплой на prod запущен..." }] }
```


## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    Uplink Web UI                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Настройки → Боты → "Создать бота"                 │  │
│  │  Имя: Deploy Bot                                  │  │
│  │  Режим: ○ SDK  ○ Webhook                         │  │
│  │  Webhook URL: https://...                         │  │
│  │  Каналы: [#dev] [#ops]                           │  │
│  │  Команды: /deploy, /rollback                     │  │
│  │  → Токен: bot_xxxxxxxxxxxx (показать один раз)   │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ POST /bot-api/bots/register
                         ▼
┌─────────────────────────────────────────────────────────┐
│              uplink-botservice (расширение 025)          │
│                                                          │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │ Bot Gateway      │  │ Custom Bot Registry         │  │
│  │                  │  │                             │  │
│  │ SDK-боты:        │  │ bot_xxxx → {                │  │
│  │  WebSocket       │  │   name: "Deploy Bot",      │  │
│  │  endpoint        │  │   mode: "webhook",         │  │
│  │  /bot-ws/:token  │  │   url: "https://...",      │  │
│  │                  │  │   rooms: ["!abc:..."],     │  │
│  │ Webhook-боты:    │  │   commands: ["/deploy"],   │  │
│  │  HTTP POST       │  │   owner: "@user:...",      │  │
│  │  forward         │  │   created: 1708900000      │  │
│  └──────────────────┘  │ }                           │  │
│                         └─────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Event Router (расширение из 025)                  │   │
│  │                                                    │   │
│  │ m.room.message → slash-команда?                   │   │
│  │   → встроенный бот (github, ci, alerts) → handler │   │
│  │   → кастомный бот (SDK) → WebSocket push          │   │
│  │   → кастомный бот (webhook) → HTTP POST forward   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                    │                        │
         WebSocket  │                        │ HTTP POST
                    ▼                        ▼
          ┌──────────────┐         ┌──────────────────┐
          │  SDK-бот     │         │  Webhook-бот     │
          │  (Node.js)   │         │  (любой сервер)  │
          │  у разраба   │         │  Vercel/CF/etc   │
          └──────────────┘         └──────────────────┘
```


## Компоненты

### 1. Bot Registration API (расширение botservice)

Эндпоинты для регистрации и управления кастомными ботами:

```
POST   /bot-api/custom-bots              — создать бота (→ токен + userId)
GET    /bot-api/custom-bots              — список моих ботов
PATCH  /bot-api/custom-bots/:botId       — обновить (имя, webhook URL, команды)
DELETE /bot-api/custom-bots/:botId       — удалить бота
POST   /bot-api/custom-bots/:botId/rooms — привязать к комнате
DELETE /bot-api/custom-bots/:botId/rooms — отвязать от комнаты
POST   /bot-api/custom-bots/:botId/regenerate-token — перевыпустить токен
```

При создании бота:
- Генерируется уникальный `bot_token` (crypto.randomBytes, 32 hex)
- Создаётся виртуальный Matrix-пользователь `@bot_custom_<id>:uplink.local` через AS API
- Устанавливается displayName и аватар
- Токен показывается один раз (как GitHub PAT)

### 2. Bot Gateway — подключение SDK-ботов

WebSocket endpoint: `wss://uplink.example.com/bot-ws/:token`

Протокол (JSON over WebSocket):

```javascript
// Сервер → Бот: событие
{
    "type": "event",
    "event": {
        "type": "command",        // или "message", "reaction", "room_join", "room_leave"
        "room_id": "!abc:uplink.local",
        "sender": "@user:uplink.local",
        "sender_name": "Вася",
        "command": "/deploy",     // только для type: "command"
        "args": ["prod"],
        "body": "/deploy prod",
        "event_id": "$xxx",
        "ts": 1708900000000
    }
}

// Бот → Сервер: действие
{
    "type": "action",
    "action": "send_message",    // или "react", "send_image", "update_status"
    "room_id": "!abc:uplink.local",
    "body": "🚀 Деплой запущен",
    "reply_to": "$xxx"           // опционально — ответить на конкретное сообщение
}

// Сервер → Бот: подтверждение
{
    "type": "ack",
    "action_id": "...",
    "event_id": "$new_event_id"
}
```

Reconnect, heartbeat (ping/pong каждые 30 сек), очередь пропущенных событий при реконнекте.

### 3. Webhook Forwarding

Для webhook-ботов botservice сам делает HTTP POST на указанный URL:

```javascript
// Формат запроса от botservice → webhook URL
POST https://developer-server.com/my-bot
Headers:
    Content-Type: application/json
    X-Uplink-Bot-Id: bot_custom_abc
    X-Uplink-Signature: sha256=xxxx  // HMAC подпись для верификации
Body:
{
    "event_type": "command",
    "command": "/deploy",
    "args": ["prod"],
    "room_id": "!abc:uplink.local",
    "sender": "@user:uplink.local",
    "sender_name": "Вася",
    "event_id": "$xxx",
    "ts": 1708900000000
}

// Формат ответа: массив действий
200 OK
{
    "actions": [
        { "type": "message", "body": "🚀 Деплой запущен..." },
        { "type": "react", "event_id": "$xxx", "emoji": "✅" },
        { "type": "message", "body": "Лог: https://ci.example.com/123", "delay_ms": 5000 }
    ]
}
```

Таймаут на ответ — 10 секунд. Retry — 1 раз через 3 сек. Если webhook мёртв — пометить бота как offline, уведомить владельца.

### 4. NPM-пакет @uplink/bot-sdk

```
packages/
  bot-sdk/
    src/
      UplinkBot.ts          — главный класс, подключение, event loop
      BotContext.ts          — контекст события (ctx.reply, ctx.react, ctx.room)
      WebSocketTransport.ts  — WS-подключение с reconnect
      types.ts               — типы событий и действий
    package.json
    README.md
    examples/
      echo-bot.mjs           — минимальный пример
      weather-bot.mjs         — бот с внешним API
      ci-bot.mjs              — webhook-стиль через SDK
```

Ключевые классы:

```typescript
// UplinkBot — точка входа
class UplinkBot {
    constructor(config: { url: string; token: string });
    
    onCommand(command: string, handler: (ctx: BotContext) => Promise<void>): void;
    onMessage(handler: (ctx: BotContext) => Promise<void>): void;
    onReaction(handler: (ctx: ReactionContext) => Promise<void>): void;
    onRoomJoin(handler: (ctx: RoomContext) => Promise<void>): void;
    
    start(): Promise<void>;   // подключиться и слушать
    stop(): Promise<void>;    // отключиться
}

// BotContext — передаётся в каждый хендлер
class BotContext {
    readonly roomId: string;
    readonly sender: string;
    readonly senderName: string;
    readonly body: string;
    readonly command?: string;
    readonly args: string[];
    readonly eventId: string;
    readonly ts: number;

    async reply(text: string): Promise<string>;              // ответить в комнату
    async replyThread(text: string): Promise<string>;        // ответить в тред (если есть)
    async react(emoji: string): Promise<void>;               // реакция на исходное сообщение
    async sendMessage(roomId: string, text: string): Promise<string>; // в другую комнату
    async sendImage(roomId: string, url: string, caption?: string): Promise<string>;
}
```

### 5. UI — регистрация и управление ботами

Расширение BotSettings из задачи 025. Новый таб/секция "Мои боты".

> **Примечание (после 027):** State панели ботов (`showBotSettings`) живёт в `hooks/useChatState.ts`, не в ChatLayout напрямую. Стили BotCreateModal и BotManagePanel добавлять в `styles/bots.css` (создан в задаче 025), НЕ в `chat.css`.

```
┌─────────────────────────────────────────┐
│ Боты                                     │
│ ┌─────────┐ ┌──────────────┐            │
│ │Встроенные│ │ Мои боты ✚   │            │
│ └─────────┘ └──────────────┘            │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ 🤖 Deploy Bot           [онлайн] ✏️  │ │
│ │    Режим: Webhook                    │ │
│ │    Каналы: #dev, #ops               │ │
│ │    Команды: /deploy, /rollback      │ │
│ │    Создан: 26 фев 2026              │ │
│ ├──────────────────────────────────────┤ │
│ │ 🤖 Standup Bot          [офлайн] ✏️  │ │
│ │    Режим: SDK                        │ │
│ │    Каналы: #general                 │ │
│ │    Команды: /standup, /skip         │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [+ Создать бота]                        │
└─────────────────────────────────────────┘
```

Форма создания бота:
- Имя бота (→ displayName)
- Описание
- Аватар (опционально, загрузка файла)
- Режим: SDK или Webhook
- Webhook URL (для webhook-режима)
- Команды: список slash-команд с описаниями (динамическое добавление)
- Каналы: мультиселект из доступных комнат

После создания — модалка с токеном (показывается один раз) + инструкция по подключению.


## Безопасность

**Аутентификация.** Каждый бот получает уникальный токен. Для SDK — токен в конструкторе, для webhook — HMAC-подпись в заголовке `X-Uplink-Signature`. Токен можно перевыпустить из UI.

**Авторизация.** Бот может действовать только в комнатах, к которым привязан. Попытка отправить сообщение в другую комнату → ошибка. Привязка к комнатам управляется через UI владельцем бота.

**Rate limiting.** Каждый кастомный бот лимитирован: 30 сообщений/мин, 5 реакций/мин. Встроенные боты (github, ci, alerts) лимитируются отдельно. Превышение → 429 + предупреждение владельцу.

**Изоляция.** Кастомные боты не видят сообщения из комнат, к которым не привязаны. Event router фильтрует события перед отправкой.

**Webhook валидация.** При регистрации webhook-бота — verification challenge (GET с challenge token, бот должен вернуть его в ответе). Аналогично Slack URL verification.


## Что НЕ входит в первую версию

- Интерактивные элементы (кнопки, формы в сообщениях) — слишком тяжело, нужен кастомный рендер
- Marketplace/каталог ботов — не нужен для self-hosted
- OAuth для ботов — токена достаточно
- Scheduled messages / cron — можно добавить позже
- Файловый upload через SDK — только текст и ссылки на картинки


## Порядок реализации

1. **Bot Registration API** — CRUD эндпоинты, генерация токенов, создание Matrix-пользователей
2. **Webhook forwarding** — POST на URL бота, парсинг ответа, выполнение действий
3. **WebSocket gateway** — endpoint /bot-ws/:token, протокол событий и действий
4. **NPM-пакет @uplink/bot-sdk** — UplinkBot, BotContext, WebSocketTransport
5. **UI: создание и управление ботами** — форма, список, статус online/offline
6. **Безопасность** — rate limiting, HMAC подписи, webhook verification
7. **Примеры и документация** — 3 примера бота, README с quickstart


## Файлы

> **Обновлено после рефакторинга 027.** CSS разбит на модули, state вынесен в useChatState.

Новые:
- `packages/bot-sdk/` — npm-пакет (src/, examples/, package.json, README.md)
- `docker/uplink-botservice/customBots.mjs` — регистрация и управление кастомными ботами
- `docker/uplink-botservice/botGateway.mjs` — WebSocket gateway для SDK-ботов
- `docker/uplink-botservice/webhookForwarder.mjs` — HTTP forward для webhook-ботов
- `web/src/components/BotCreateModal.tsx` — модалка создания бота
- `web/src/components/BotManagePanel.tsx` — панель управления своими ботами

Изменённые:
- `docker/uplink-botservice/server.mjs` — новые эндпоинты /bot-api/custom-bots/*, /bot-ws/:token
- `docker/uplink-botservice/eventHandler.mjs` — роутинг событий к кастомным ботам
- `docker/uplink-botservice/registry.mjs` — хранение кастомных ботов
- `web/src/components/BotSettings.tsx` — таб "Мои боты"
- `web/src/hooks/useChatState.ts` — state для панели управления кастомными ботами
- `web/src/styles/bots.css` — стили BotCreateModal, BotManagePanel
- `web/nginx.conf` — проксирование /bot-ws/ (WebSocket upgrade)


## Коммит

```
[bots] Bot SDK: регистрация кастомных ботов, webhook forwarding, WebSocket gateway
[bots] NPM-пакет @uplink/bot-sdk с примерами
[bots] UI: создание и управление кастомными ботами
[bots] Безопасность: rate limiting, HMAC, webhook verification
```
