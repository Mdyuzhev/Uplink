# Uplink — Контекстный коммуникатор для разработчиков

## Концепция

Uplink — расширение VS Code, встраивающее мессенджер и звонилку прямо в IDE разработчика.
Модель: контекстная коммуникация. Разработчик обсуждает код не выходя из редактора — сообщения привязаны к файлам, строкам, веткам и задачам.

Ключевой принцип: **коммуникация должна жить там, где живёт код**. Не разработчик идёт в чат, а чат приходит к разработчику с полным контекстом того, над чем он работает.

## Зачем

- Slack, Teams и прочие западные инструменты заблокированы в РФ
- Существующие корпоративные мессенджеры не понимают контекст разработки
- Context switching между IDE и чатом снижает продуктивность на 20-25%
- Code review требует постоянного копирования кусков кода в чат без контекста

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│  VS Code Extension (TypeScript)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Chat Panel  │  │  Call Panel   │  │  Sidebar   │ │
│  │  (WebView)   │  │  (WebView)    │  │  (TreeView)│ │
│  │  React + CSS │  │  WebRTC media │  │  Контакты  │ │
│  └──────┬───────┘  └──────┬───────┘  │  Каналы    │ │
│         │                  │          │  Статусы   │ │
│         │                  │          └────────────┘ │
└─────────┼──────────────────┼────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────┐  ┌──────────────────┐
│  Matrix/Synapse  │  │  LiveKit Server  │
│  (мессенджер)    │  │  (SFU, звонки)   │
│  - чаты/каналы   │  │  - аудио/видео   │
│  - история       │  │  - screen share  │
│  - E2E шифрование│  │  - SFU topology  │
│  - federation    │  │                  │
└─────────────────┘  └──────────────────┘
        │                    │
        ▼                    ▼
┌─────────────────────────────────────┐
│  PostgreSQL (Synapse storage)       │
│  Redis (presence, кэш)             │
└─────────────────────────────────────┘
```

## Текущее состояние

### PoC (🔄 в работе): Минимальный мессенджер + звонилка

| Компонент | Статус | Описание |
|-----------|--------|----------|
| VS Code Extension scaffold | ⬜ | package.json, activation, commands |
| Matrix SDK интеграция | ⬜ | Подключение к Synapse, авторизация |
| Chat WebView | ⬜ | React-панель чата в VS Code |
| Sidebar (контакты/каналы) | ⬜ | TreeView с онлайн-статусами |
| Контекстный шаринг кода | ⬜ | Выделение → отправка с метаданными |
| LiveKit интеграция | ⬜ | Аудиозвонки через SFU |
| Видеозвонки | ⬜ | Видео в WebView panel |

### Будущие волны (не в PoC)

- AI-интеграция (саммари звонков, автосоздание задач)
- Привязка сообщений к Git-веткам и MR
- Интеграция с YouTrack/GitLab
- Screen sharing через VS Code API
- Push-уведомления и offline-сообщения
- On-premise deployment playbook

## Структура проекта

```
Uplink/
├── .claude/
│   ├── CLAUDE.md              # этот файл
│   ├── settings.json          # разрешения
│   └── commands/              # slash-команды
├── src/
│   ├── extension.ts           # точка входа расширения
│   ├── commands/              # VS Code команды
│   │   ├── sendSnippet.ts     # отправить выделенный код
│   │   ├── startCall.ts       # начать звонок
│   │   └── openChat.ts        # открыть чат-панель
│   ├── providers/
│   │   ├── contactsProvider.ts    # TreeView контактов
│   │   └── channelsProvider.ts    # TreeView каналов
│   ├── matrix/
│   │   ├── client.ts          # Matrix SDK обёртка
│   │   ├── auth.ts            # авторизация
│   │   ├── rooms.ts           # управление комнатами
│   │   └── messages.ts        # отправка/получение сообщений
│   ├── livekit/
│   │   ├── client.ts          # LiveKit SDK обёртка
│   │   ├── audioCall.ts       # аудиозвонки
│   │   └── videoCall.ts       # видеозвонки
│   ├── context/
│   │   ├── codeContext.ts     # получение контекста (файл, строка, ветка)
│   │   └── gitContext.ts      # Git-информация
│   ├── webview/
│   │   ├── chat/              # React-приложение чата
│   │   │   ├── App.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── CodeSnippet.tsx
│   │   │   └── index.tsx
│   │   └── call/              # React-приложение звонка
│   │       ├── App.tsx
│   │       ├── Controls.tsx
│   │       └── index.tsx
│   └── utils/
│       ├── config.ts          # настройки подключения
│       └── logger.ts          # логирование
├── test/
│   ├── suite/
│   │   ├── extension.test.ts
│   │   ├── matrix.test.ts
│   │   └── context.test.ts
│   └── runTest.ts
├── media/                     # иконки, стили
│   └── uplink-icon.svg
├── docker/                    # серверная инфраструктура
│   ├── docker-compose.yml     # Synapse + LiveKit + PostgreSQL + Redis
│   ├── synapse/
│   │   └── homeserver.yaml
│   └── livekit/
│       └── livekit.yaml
├── docs/
│   ├── setup.md               # развёртывание серверов
│   ├── dev-guide.md           # для разработчиков расширения
│   └── user-guide.md          # для пользователей
├── Tasks/
│   ├── backlog/               # задачи к выполнению
│   └── done/                  # выполненные задачи
├── package.json
├── tsconfig.json
├── webpack.config.js          # сборка WebView
├── .eslintrc.json
├── .gitignore
├── CHANGELOG.md
└── README.md
```

## Технический стек

### Расширение (клиент)
- **TypeScript** — основной язык
- **VS Code Extension API** — WebView, TreeView, Commands, StatusBar
- **React 18** — UI в WebView-панелях (чат, звонки)
- **matrix-js-sdk** — клиент Matrix протокола
- **livekit-client** — WebRTC через LiveKit
- **webpack** — сборка WebView React-приложений

### Серверная часть (on-premise)
- **Synapse** — Matrix homeserver (Python, PostgreSQL)
- **LiveKit Server** — SFU для аудио/видео (Go, WebRTC)
- **PostgreSQL** — хранение Synapse
- **Redis** — presence, кэш сессий
- **Docker Compose** — оркестрация всего стека
- **Nginx** — reverse proxy, TLS termination

## Принципы

### Расширение
1. Минимальный footprint — не тормозить VS Code
2. Lazy loading — подключение к Matrix/LiveKit только при активации
3. Graceful degradation — если сервер недоступен, показывать состояние, не крашить
4. Контекст-first — каждое сообщение может нести метаданные: файл, строка, ветка, задача

### Серверная часть
1. On-premise only — данные не покидают контур организации
2. Docker Compose для PoC, Kubernetes (K3s) для production
3. Стандартные протоколы (Matrix, WebRTC) — нет vendor lock-in
4. Мониторинг с первого дня — Prometheus metrics

### UX
1. Keyboard-first — горячие клавиши для всех действий
2. Не блокировать рабочий процесс — чат в sidebar, звонок в panel
3. Code snippets с подсветкой синтаксиса и clickable-ссылками на файл:строку
4. Статусы из IDE: "редактирует api/routes.ts", "в дебаге", "тесты запущены"

## Стиль кода

- TypeScript strict mode, ESLint + Prettier
- Комментарии и документация на русском
- Названия переменных/классов/методов на английском
- Тесты: VS Code Extension Test Suite (Mocha)
- Коммиты на русском с префиксом: `[ext]`, `[matrix]`, `[livekit]`, `[webview]`, `[infra]`, `[docs]`, `[test]`, `[fix]`, `[refactor]`

## Формат коммитов

```
[prefix] Краткое описание на русском

- Что сделано
- Какие файлы затронуты
```

## Slash-команды

| Команда | Назначение |
|---------|------------|
| `/start` | Актуализировать контекст, показать статус |
| `/task` | Взять задачу из backlog, выполнить |
| `/push` | Тесты → коммит → push |
| `/status` | Показать состояние проекта |
| `/test` | Запустить тесты |
| `/review` | Ревью кода |
| `/scaffold` | Создать заготовку компонента |
| `/infra` | Управление Docker-инфраструктурой |
| `/refresh_docs` | Обновить документацию |

## Управление задачами

- `Tasks/backlog/` — задачи к выполнению (NNN_name.md, по номеру)
- `Tasks/done/` — выполненные (перемещаются после завершения)

## Конфигурация подключения

Расширение хранит настройки в VS Code settings:

```json
{
  "uplink.matrix.homeserver": "https://matrix.internal.company.ru",
  "uplink.matrix.userId": "@user:company.ru",
  "uplink.livekit.url": "wss://livekit.internal.company.ru",
  "uplink.livekit.apiKey": "",
  "uplink.autoConnect": true,
  "uplink.showStatusBar": true
}
```
