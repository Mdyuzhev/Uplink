# Uplink — Self-hosted командный мессенджер

## Концепция

Uplink — self-hosted командный мессенджер на базе Matrix с аудио/видеозвонками через LiveKit Cloud и сквозным шифрованием (E2E). Целевая аудитория — малые команды, которым нужна альтернатива Slack/Discord с полным контролем над данными.

Проект ведёт один разработчик. Код коммерческого уровня, без компромиссов на "это же PoC".

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│  React 18 + TypeScript + Vite                        │
│  Единый SPA: браузер + Tauri v2 десктоп              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ Sidebar  │ │ Messages │ │ CallBar  │ │ Video   │ │
│  │ каналы   │ │ чат      │ │ звонки   │ │ Grid    │ │
│  │ DM       │ │ медиа    │ │ мьют     │ │ 16:9    │ │
│  │ unread   │ │ код      │ │ камера   │ │         │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
└───────┼────────────┼────────────┼─────────────┼──────┘
        │            │            │             │
        ▼            ▼            │             ▼
┌─────────────────────┐    ┌─────┴──────────────────┐
│  Matrix Synapse      │    │  LiveKit Cloud          │
│  - чаты, каналы      │    │  wss://uplink-...cloud  │
│  - E2E (Megolm)      │    │  - аудио/видео          │
│  - media upload      │    │  - TURN/STUN встроены   │
│  - user directory    │    │  - NAT traversal        │
│  - presence          │    │                         │
└─────────┬───────────┘    └─────────────────────────┘
          │
┌─────────┴───────────┐
│  PostgreSQL 15       │
│  Redis 7             │
└─────────────────────┘
```

Доступ извне: Cloudflare Tunnel → nginx → Synapse / token service / SPA.

## Текущее состояние

Проект функционален: чат с E2E шифрованием, аудио/видеозвонки, DM и каналы, медиа-сообщения, push-уведомления, десктоп-обёртка (Tauri v2). 19 задач завершены.

### Реализовано (✅)

- Docker-инфраструктура (Synapse, PostgreSQL, Redis)
- Matrix-клиент, авторизация, sync
- Чат UI в стиле Slack/Discord (тёмная тема)
- E2E шифрование (Megolm через matrix-sdk-crypto-wasm v17+)
- User directory + создание DM
- Аудио/видеозвонки через LiveKit Cloud
- Сигнализация звонков через Matrix custom events
- Входящие/исходящие звонки с оверлеями
- Профиль пользователя
- Медиа-сообщения (картинки, файлы)
- Push-уведомления (Web Notification + Tauri нативные)
- Unread-счётчики
- Деплой на homelab + Cloudflare Tunnel
- Tauri v2 десктоп (код готов, блокер — Windows SDK для локальной сборки)
- GitHub Actions CI для сборки на всех платформах

### На паузе (фокус сейчас на веб + десктоп)

- **VS Code extension** — рабочее расширение, реализовано в задаче 002. Вернёмся к развитию после стабилизации веб-версии. Будет переиспользовать ядро (MatrixService, LiveKitService, CallSignalingService) через WebView-панели.

### Планируется

- **JetBrains plugin** — плагин для IntelliJ/WebStorm/PyCharm. Tool window с JCEF-панелью, переиспользующей веб-версию.
- Контекстная коммуникация в IDE: привязка сообщений к файлам, строкам, веткам, code review без выхода из редактора.

### Блокеры

- Tauri: нужен Windows SDK для локальной сборки (CI работает)

## Структура проекта

```
Uplink/
├── .claude/                    # контекст для Claude Code
│   ├── CLAUDE.md               # этот файл
│   ├── settings.json           # разрешения
│   └── commands/               # slash-команды
├── web/                        # React-фронтенд
│   ├── src/
│   │   ├── App.tsx             # корневой компонент (роутинг login/chat)
│   │   ├── main.tsx            # точка входа React
│   │   ├── config.ts           # URL-ы сервисов (dev/prod авто)
│   │   ├── components/
│   │   │   ├── ChatLayout.tsx          # главный layout
│   │   │   ├── Sidebar.tsx             # каналы, DM, unread
│   │   │   ├── MessageList.tsx         # список сообщений
│   │   │   ├── MessageBubble.tsx       # одно сообщение
│   │   │   ├── MessageInput.tsx        # ввод + отправка файлов
│   │   │   ├── RoomHeader.tsx          # заголовок + кнопка звонка
│   │   │   ├── CallBar.tsx             # панель звонка
│   │   │   ├── VideoGrid.tsx           # CSS grid видеопотоков
│   │   │   ├── IncomingCallOverlay.tsx # входящий звонок
│   │   │   ├── OutgoingCallOverlay.tsx # исходящий звонок
│   │   │   ├── ProfileModal.tsx        # профиль пользователя
│   │   │   ├── LoginScreen.tsx         # экран логина
│   │   │   ├── Avatar.tsx              # аватар с presence
│   │   │   └── CodeSnippet.tsx         # подсветка кода
│   │   ├── hooks/
│   │   │   ├── useMatrix.ts            # подключение к Matrix
│   │   │   ├── useRooms.ts             # список комнат
│   │   │   ├── useMessages.ts          # сообщения, пагинация
│   │   │   ├── useUsers.ts             # user directory
│   │   │   ├── useLiveKit.ts           # состояние звонка
│   │   │   ├── useCallSignaling.ts     # сигнализация
│   │   │   └── useNotifications.ts     # push-уведомления
│   │   ├── matrix/
│   │   │   ├── MatrixService.ts        # singleton, всё Matrix API
│   │   │   ├── RoomsManager.ts         # парсинг комнат, unread
│   │   │   └── MessageFormatter.ts     # форматирование
│   │   ├── livekit/
│   │   │   ├── LiveKitService.ts       # singleton, LiveKit SDK
│   │   │   └── CallSignalingService.ts # state machine звонков
│   │   └── styles/
│   │       ├── variables.css           # CSS custom properties
│   │       ├── global.css              # базовые стили
│   │       ├── chat.css                # стили чата
│   │       └── login.css               # стили логина
│   ├── src-tauri/                      # Tauri v2 десктоп
│   │   ├── tauri.conf.json             # окно, трей, CSP
│   │   ├── Cargo.toml                  # tauri + плагины
│   │   └── src/main.rs, lib.rs         # трей, скрытие при закрытии
│   ├── nginx.conf                      # proxy, SPA fallback, WASM
│   ├── Dockerfile                      # multi-stage: node build → nginx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker/                             # инфраструктура
│   ├── docker-compose.yml              # все сервисы
│   ├── .env                            # креды (НЕ коммитить)
│   ├── synapse/homeserver.yaml         # конфиг Synapse
│   └── livekit-token/server.mjs        # token service (Node.js)
├── Tasks/
│   ├── backlog/                        # задачи к выполнению
│   └── done/                           # выполненные (001-019)
├── deploy.sh                           # деплой-скрипт
└── .github/workflows/
    └── build-desktop.yml               # CI: Tauri на всех платформах
```

## Технический стек

### Фронтенд
- **React 18** + **TypeScript 5.3** + **Vite 5** — SPA
- **matrix-js-sdk ^31.6.1** — Matrix-клиент
- **@matrix-org/matrix-sdk-crypto-wasm ^17.1.0** — E2E (Megolm, Olm)
- **livekit-client ^2.17.2** — аудио/видео
- **CSS custom properties** — стили, никаких UI-фреймворков
- **Tauri v2** — десктоп (системный трей, нативные уведомления, автозапуск)

### Серверная часть
- **Matrix Synapse** — homeserver
- **PostgreSQL 15** — хранение
- **Redis 7** — кэш Synapse
- **LiveKit Cloud** (wss://uplink-3ism3la4.livekit.cloud) — звонки
- **livekit-token** — микросервис генерации JWT (Node.js, порт 7890)
- **Docker Compose** — оркестрация
- **Nginx** — reverse proxy, WASM mime, gzip, SPA fallback
- **Cloudflare Tunnel** — внешний доступ

## Ключевые решения и подводные камни

1. **E2E шифрование:** matrix-sdk-crypto-wasm v17+ НЕ требует SharedArrayBuffer. Проверка убрана из initCrypto(). Если вернуть — сломается на мобильных и через Cloudflare Tunnel.

2. **LiveKit Cloud, НЕ self-hosted.** TURN/STUN встроены. Контейнеры livekit и coturn удалены из docker-compose.

3. **Сигнализация звонков:** Matrix custom events (uplink.call.*), НЕ LiveKit webhooks. Фильтровать только `data.liveEvent === true` — иначе при initial sync старые invite ставят state в ringing-in.

4. **Уведомления:** useNotifications проверяет `__TAURI_INTERNALS__` в window. В Tauri — sendNotification. В браузере — Web Notification API. Не уведомляем о своих сообщениях и о сообщениях в активном чате.

5. **Unread counter:** markRoomAsRead при открытии чата и при получении сообщения в активной комнате.

6. **DM:** getOrCreateDM() создаёт комнату с m.room.encryption state event для E2E.

7. **Медиа:** uploadFile() → mxc:// → m.image/m.file. Скачивание через mxcToHttp(). Nginx проксирует /_matrix/media/.

8. **WASM:** Dockerfile копирует .wasm в public/. Без этого crypto не инициализируется.

## Паттерны кода

**Сервисы** — синглтоны с событийной моделью (`Set<Listener>`, subscribe/unsubscribe). MatrixService, LiveKitService, CallSignalingService экспортируются как единственные экземпляры.

**React-хуки** — обёртки над сервисами. useEffect для подписки, cleanup для отписки. useRef для стабильных ссылок в колбэках.

**State management** — нет Redux/Zustand. Хуки + сервисы. Состояние звонка — state machine в CallSignalingService (idle → ringing-out/ringing-in → accepted → ended).

**Стили** — CSS custom properties в variables.css. Никаких CSS-in-JS, Tailwind, UI-библиотек.

**Типизация** — строгий TypeScript. Интерфейсы: RoomInfo, CallParticipant, CallInfo. Union types: ConnectionState, CallState, CallSignalState.

## Стиль кода

- TypeScript strict mode
- Комментарии и UI-строки на русском
- Переменные, типы, компоненты на английском
- Функциональные компоненты, CSS-классы через variables.css
- Без внешних UI-библиотек

## Конфигурация сервисов

| Сервис | Dev | Prod |
|--------|-----|------|
| Matrix | http://localhost:8008 | window.location.origin (nginx proxy) |
| LiveKit Cloud | wss://uplink-3ism3la4.livekit.cloud | то же |
| Token service | http://localhost:7890 | /livekit-token (nginx proxy) |
| Synapse Admin | http://localhost:8080 | — |
| PostgreSQL | localhost:5432 | внутри Docker network |

## Деплой

**Автоматический (основной способ):** GitHub Webhook (задача 021). После `git push origin main` сервер сам подхватывает изменения через 10-15 секунд. Webhook-сервис (`deploy-webhook`) делает `git pull` + `docker compose up --build -d`.

**Для агента (Claude Code):** достаточно `git push origin main` — деплой произойдёт автоматически.

**Ручной (fallback, если webhook не работает):**
```bash
bash scripts/deploy-remote.sh          # только деплой на сервере через SSH
bash scripts/deploy-remote.sh --push   # git push + деплой через SSH
```

**Проверка webhook:** `curl -s https://<tunnel-url>/api/deploy-webhook/health` → `{"status":"ok"}`

Сервер: flomaster@flomasterserver (~/projects/uplink/). Пароль: Misha2021@1@.

## SSH-доступ (аварийные процедуры)

Из Git Bash на Windows `ssh` с паролем не работает (нет sshpass, HOME с кириллицей). Использовать **Python + paramiko**:

```python
python -c "
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('flomasterserver', username='flomaster', password='Misha2021@1@', timeout=10)
stdin, stdout, stderr = ssh.exec_command('КОМАНДА')
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
"
```

### Частые аварийные команды

| Задача | Команда |
|--------|---------|
| Статус контейнеров | `docker ps --filter name=uplink --format "table {{.Names}}\t{{.Status}}"` |
| Логи контейнера | `docker logs uplink-web --tail 30 2>&1` |
| Перезапуск | `docker restart uplink-web` |
| Запуск упавшего | `cd ~/projects/uplink/docker && docker compose up -d <service> --no-deps` |
| Пересборка одного | `cd ~/projects/uplink/docker && docker compose up -d --build <service> --no-deps` |
| Полный редеплой | `cd ~/projects/uplink/docker && docker compose up -d --build` |
| Sudo | `echo "Misha2021@1@" \| sudo -S <команда>` |

### Известные грабли на сервере

- **nginx "host not found in upstream"** — раньше nginx падал если upstream-контейнер не поднялся. Исправлено: `resolver 127.0.0.11` + proxy_pass через переменные (`set $var`). Nginx резолвит хосты в runtime, при недоступности — 502 на конкретный запрос, а не краш.
- **Порт PostgreSQL** — порт 5432 занят `postgres-stage` (другой проект). В `docker/.env` стоит `POSTGRES_PORT=5433`. Synapse обращается к postgres по Docker network (по имени `postgres`), хост-порт нужен только для внешнего доступа.
- **`--no-deps`** — при запуске одного сервиса использовать `--no-deps`, иначе docker compose может пересоздать postgres/redis и сломать порт-маппинг.
- **Файлы с правами root** — `.env` и некоторые volume-данные принадлежат root. Для редактирования нужен `sudo`.

## Workflow разработки

1. **Локальная разработка:** `npm run dev` в web/ (Vite :5173). Docker-контейнеры запущены.
2. **Коммит:** `git add/commit/push` из E:\Uplink\.
3. **Деплой:** `git push origin main` — webhook автоматически пересоберёт контейнеры.
4. **Tauri dev:** `npm run tauri:dev` (требует Rust + Windows SDK).
5. **Tauri build:** `npm run tauri:build` или через GitHub Actions CI.

## Завершённые задачи (001-019)

001 — Docker-инфраструктура
002 — VS Code extension (рабочее, на паузе — фокус на веб/десктоп)
003 — Matrix-клиент, авторизация
004 — Чат UI в стиле Slack
005 — LiveKit аудио-звонки (self-hosted)
006 — Тестовые пользователи и сообщения
007 — Полноценное веб-приложение (SPA)
008 — E2E шифрование (Megolm)
009 — Фикс dev/prod конфигурации
010 — Деплой на homelab
011 — Cloudflare Tunnel
012 — User directory + DM
013 — Звонки в DM
014 — Входящие звонки, сигнализация, TURN
015 — Профиль пользователя
016 — Медиа-сообщения
017 — Миграция на LiveKit Cloud + видео
018 — UI-редизайн (тёмная тема)
019 — Tauri десктоп-приложение
