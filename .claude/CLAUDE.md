# Uplink — контекст для агента

## Проект

Uplink — корпоративный self-hosted мессенджер на базе Matrix Protocol. Каждая компания-клиент разворачивает свой инстанс на своём сервере, со своим доменом и полным контролем над данными. Альтернатива Slack/Discord для организаций с требованиями к безопасности и data sovereignty.

Текущий хостинг (uplink.wh-lab.ru) — демо-стенд для показа продукта. Homelab-сервер — staging/dev.

**Разработчик:** Flomaster — опытный инженер с коммерческим бэкграундом в мессенджерах, видеосвязи и AI. Не объясняй базовые вещи, пиши код сразу, обсуждай архитектуру на уровне senior+. UI и комментарии — на русском, переменные и типы — на английском.


## Текущая фаза: Production Readiness

MVP завершён (37 задач). Сейчас идёт стабилизация и подготовка к продакшену по плану `Tasks/backlog/production_readiness.md`. Задачи именуются `prod_NNN_<название>.md`.

### Фазы плана

| # | Фаза | Статус |
|---|-------|--------|
| 0 | Чистый старт инфраструктуры (federation-ready) | ✅ |
| 0.5 | Деплой на сервер + CI | ✅ |
| 1 | Безопасность | ✅ |
| 2 | Мониторинг и observability | ✅ |
| 3 | Рефакторинг кода | ✅ |
| 4 | Масштабирование (worker-архитектура) | ✅ |
| 5 | Качество кода (тесты, strict TS, lint) | ✅ |
| 6 | Федерация | ✅ |
| 7 | Продуктизация (параметризация, setup wizard, docs) | ⬜ |


## Архитектура

### Frontend (web/)
- React 18 + TypeScript + Vite 5
- matrix-js-sdk v31, matrix-sdk-crypto-wasm v17+ (E2EE Megolm)
- livekit-client v2 (аудио/видеозвонки)
- CSS без фреймворков — variables.css + модульные файлы
- Tauri v2 — десктопная обёртка (src-tauri/)
- Единый SPA для браузера, десктопа и VS Code extension

### Backend (docker/)
- **Synapse** — Matrix homeserver. server_name: `uplink.wh-lab.ru` (демо) / клиентский домен (продакшен)
- **PostgreSQL 15** — хранилище Synapse
- **Redis 7** — кеш Synapse, в будущем backbone для worker'ов (Redis Streams)
- **uplink-botservice** (Node.js/Express) — Application Service, webhook receiver, slash-команды, GIF proxy. Bot API `/api/*` требует Matrix access token (Bearer). Логирование: pino (JSON). Storage: PostgreSQL (schema `bots.kv_store`, JSONB)
- **livekit-token** (Node.js) — генерация LiveKit JWT
- **deploy-webhook** — автодеплой по GitHub push
- **nginx** (внутри web-контейнера) — SPA + reverse proxy ко всем backend-сервисам. `/grafana/` → Grafana, `/api/status` → health
- **LiveKit Cloud** (wss://uplink-3ism3la4.livekit.cloud) — медиасервер звонков
- **Prometheus** — метрики (Synapse, node, PostgreSQL, botservice, livekit-token). Порт 9090
- **Grafana** — дашборды. Доступ: https://uplink.wh-lab.ru/grafana/
- **Alertmanager** — алерты → webhook → botservice → #ops
- **node-exporter** — системные метрики CPU/RAM/disk
- **postgres-exporter** — метрики PostgreSQL

### Инфраструктура
- **Production:** Yandex Cloud VM (ubuntu@93.77.189.225, 2 vCPU, 4 GB RAM, Ubuntu 24.04)
  - TLS: Let's Encrypt через certbot (Cloudflare Tunnel убран)
  - Host nginx (443) → Docker контейнеры (127.0.0.1)
  - Compose: `docker/docker-compose.production.yml`
  - Деплой: `git push main` → GitHub Actions → SSH → `deploy-prod.sh`
- **Staging/Dev:** homelab (ssh flomaster@flomasterserver, пароль Misha2021@1@)
  - Для тестирования, в т.ч. federation testing (второй Synapse)
- **CI/CD:** GitHub Actions — deploy-production.yml (авто по push в main), build-desktop.yml (Build & Release: 4 платформы Tauri + VS Code extension, триггер по тегу v*)


## Структура репозитория

```
E:\Uplink\
├── web/                    — React SPA (фронтенд)
│   ├── src/
│   │   ├── components/     — React-компоненты (31 файл)
│   │   ├── contexts/       — React Contexts (ChatContext, CallContext)
│   │   ├── hooks/          — хуки-обёртки над сервисами (14 файлов)
│   │   ├── matrix/         — Matrix сервисный слой (11 файлов, декомпозирован)
│   │   ├── livekit/        — LiveKitService, CallSignalingService
│   │   ├── services/       — GIF, стикеры, voice/video recorder
│   │   ├── bots/           — CommandRegistry (slash-команды)
│   │   ├── styles/         — 15 CSS-файлов + README.md (стратегия)
│   │   └── config.ts       — URL-ы сервисов (dev/prod auto)
│   ├── src-tauri/          — Tauri v2 конфиг
│   ├── nginx.conf          — reverse proxy внутри контейнера
│   └── Dockerfile
├── docker/                 — серверная инфраструктура
│   ├── docker-compose.yml              — dev
│   ├── docker-compose.production.yml   — production
│   ├── .env                            — секреты (НЕ в git)
│   ├── synapse/            — homeserver.yaml, appservice-bots.yaml
│   ├── uplink-botservice/  — Express app, handlers, postgresStorage, routes/
│   ├── postgres/           — postgresql.conf (тюнинг)
│   ├── livekit-token/      — JWT-генератор
│   └── deploy-webhook/     — автодеплой
├── scripts/                — clean-start.sh, setup-tls.sh, deploy, backup-db.sh, backup-media.sh
├── docs/                   — disaster-recovery.md
├── Tasks/
│   ├── backlog/            — текущие задачи (prod_NNN_*.md)
│   └── done/               — завершённые (001-037 MVP + prod_*)
├── .github/workflows/      — CI/CD
└── .claude/                — контекст агента
```


## Ключевые технические решения

1. **E2EE:** matrix-sdk-crypto-wasm v17+ НЕ требует SharedArrayBuffer. Проверка убрана из initCrypto(). Вернуть = сломать мобильные.
2. **LiveKit Cloud**, НЕ self-hosted. TURN/STUN встроены. Контейнеры livekit/coturn удалены.
3. **Сигнализация звонков** через Matrix custom events (com.uplink.call.*). Фильтрация по `liveEvent === true`.
4. **Боты через AS** — не поддерживают E2E. Бот-каналы создавать незашифрованными.
5. **Масштабирование** — через Synapse worker'ы (Redis Streams), НЕ через Kafka/RabbitMQ. Три профиля: S (<500), M (500-5000), L (5000-50000).
6. **Федерация** — межкорпоративная связь (@ivan:company-a.com ↔ @petr:company-b.com), НЕ масштабирование внутри компании.


## Модель деплоя

```
Разработка → git push main → GitHub Actions → SSH на prod → deploy-prod.sh
                                                              ├── git pull
                                                              ├── docker compose up --build -d
                                                              └── healthcheck всех сервисов
```

**SSH на сервер — только для аварий.** Штатный деплой — через CI (git push). Для экстренных правок на production использовать команду `/emergency`.


## Учётные данные

### LiveKit Cloud
- URL: `wss://uplink-3ism3la4.livekit.cloud`
- API Key: `APIXUKnGCb2vUQZ`
- API Secret: `hMkeeXl3pjOZKrpUCJa5OAy0wsrlYkGllb1bcQHeZDjA`

### Серверы
- **Production:** `ssh ubuntu@93.77.189.225` (ключ ed25519, через GitHub Actions)
- **Homelab:** `ssh flomaster@flomasterserver` (пароль: `Misha2021@1@`)
  - SSH из агента: через `python -c "import paramiko; ..."` (голый ssh ломается из-за кириллицы в HOME)

### Synapse
- Registration secret: `8mk8UFyM8syoW75ul5nruQxztAFFbaxagYQQ3AfE7wk=`
- DB: synapse / synapse / ZuifNEN8YwAEPvymbBOhYNGT5O-3hduB
- AS token: `157e2974361695922c937f0f2f328e73229a2984741fe962ec30dcf8dfec68b6`
- HS token: `dd77805f1f2d8ac2ffe4438e337d02af1237ee40595c9b9f7410e5d546a7551a`

### Production users
- admin / UplinkAdmin2026! (создаётся clean-start.sh)

### Grafana
- URL: https://uplink.wh-lab.ru/grafana/
- admin / UplinkGrafana2026


## Паттерны кода

- **Сервисы** — синглтоны с событийной моделью (Set<Listener>, subscribe/unsubscribe)
- **Хуки** — обёртки над сервисами, useEffect для подписки, cleanup для отписки
- **State** — нет Redux/Zustand. React хуки + сервисы + React Context (ChatContext, CallContext)
- **Стили** — CSS custom properties в variables.css. Без CSS-in-JS, Tailwind, UI-библиотек. Новые компоненты — CSS Modules (`*.module.css`). Стратегия: `web/src/styles/README.md`
- **Типизация** — строгий TypeScript. Интерфейсы для данных, union types для состояний
- **Тесты** — Vitest v2. `npm test` (27 тестов: renderMarkdown 16 + parseEvent 11)
- **Lint** — ESLint (web/.eslintrc.json): react-hooks/rules-of-hooks, exhaustive-deps, no-explicit-any. `npm run lint` (max-warnings 100)
- **Format** — Prettier (web/.prettierrc): singleQuote, tabWidth 4, printWidth 120. `npm run format`
- **CI гейт** — deploy-production.yml: job `check` (tsc + lint + test + build) → job `deploy`
- **Botservice типы** — JSDoc в types.mjs, jsconfig.json с checkJs:true

### Коммиты
Префиксы: `[prod]` production readiness, `[chat]` UI, `[matrix]` Matrix, `[livekit]` звонки, `[infra]` Docker/серверы, `[fix]` баг, `[refactor]` рефакторинг, `[style]` стили, `[docs]` документация, `[test]` тесты

Формат: `[prefix] Краткое описание на русском`


## Workflow выполнения задач

### 1. Взять задачу
Читай файл из `Tasks/backlog/`. Задачи prod-фазы: `prod_NNN_<название>.md`.

### 2. Выполнить
Следуй шагам в задаче. Если нужна информация — спрашивай коротко.

### 3. Протестировать
- TypeScript: `cd web && npx tsc --noEmit`
- Тесты: `cd web && npm test`
- Lint: `cd web && npm run lint`
- Build: `cd web && npm run build`
- Docker (если менялась инфра): `cd docker && docker compose up -d && docker compose ps`

### 4. Закоммитить и запушить
```bash
git add -A
git commit -m "[prod] описание"
git push origin main
```
CI задеплоит автоматически.

### 5. Обновить .claude/CLAUDE.md
**ОБЯЗАТЕЛЬНО после каждой задачи:**
- Обновить таблицу фаз (статус ⬜ → ✅)
- Обновить секцию «Учётные данные» если менялись креды/токены
- Обновить секцию «Архитектура» если менялась инфраструктура
- Добавить запись в «Журнал изменений» внизу

### 6. Переместить задачу
```bash
mv Tasks/backlog/prod_NNN_*.md Tasks/done/
```

## Известные грабли

- **WASM:** .wasm файлы копируются в public/ при Docker-сборке (Dockerfile: cp)
- **vite.config.ts:** vite-plugin-wasm + vite-plugin-top-level-await обязательны
- **Synapse media_store:** после docker compose up нужен chown 991:991
- **config.ts:** dev/prod определяется по порту (5173 = dev)
- **CSP в Tauri:** null (для WebSocket)
- **nginx:** resolver 127.0.0.11 + set $var для runtime upstream resolve
- **Регистрация:** отключена, пользователей через synapse-admin или shared_secret
- **Safari:** не поддерживает audio/ogg и video/webm — fallback на mp4
- **SSH из агента:** НЕ голый ssh — использовать python + paramiko
- **server_name:** НЕИЗМЕНЯЕМ после первого запуска Synapse
- **postgresql.conf custom:** ОБЯЗАТЕЛЬНО добавлять `listen_addresses = '*'` — иначе postgres не слушает Docker-сеть и botservice не может подключиться (ECONNREFUSED)
- **Botservice retry:** postgresStorage.mjs делает 10 попыток подключения с интервалом 3s — нормально если postgres стартует медленнее
- **ESLint web/**: `.gitignore` корня содержит `test/` — директории `src/test/` в git не попадают. Setup-файл vitest → `src/vitest.setup.ts`
- **npm workspaces**: есть root `package.json` с workspaces. При npm install в web/ возможны конфликты. Использовать `--legacy-peer-deps`


## Журнал изменений

| Дата | Задача | Что сделано |
|------|--------|-------------|
| 2026-03-01 | — | Создан план production_readiness.md (8 фаз) |
| 2026-03-01 | — | Создана задача prod_001_clean_infrastructure.md |
| 2026-03-01 | prod_001 | Чистый старт: server_name→uplink.wh-lab.ru, новые секреты, rate limits, federation well-known, resource limits, logging, network isolation, clean-start.sh, setup-tls.sh, deploy-prod.sh hardening, Cloudflare убран, .env из git убран |
| 2026-03-03 | prod_002 | Деплой на Yandex Cloud: clean-start.sh, TLS (certbot, cert до 2026-05-29), HTTPS ✓, well-known ✓, CI настроен (PROD_HOST + PROD_SSH_KEY), deploy-prod.sh: git fetch+reset вместо pull |
| 2026-03-03 | prod_002.1 | Фавикон (SVG/PNG, новый дизайн indigo+white), CI-канал #ci в пространстве Разработка, нотификации успех/фейл в deploy workflow |
| 2026-03-03 | prod_003 | Безопасность: auth middleware (Matrix token), webhook signature verification, nginx rate limiting, input validation, fetchWithAuth на фронтенде |
| 2026-03-03 | prod_004 | Мониторинг: pino logging в botservice, requestId middleware, deep health endpoints, Synapse metrics, Prometheus+Grafana+Alertmanager+node-exporter+postgres-exporter, nginx /grafana/ + /api/status, alert-rules, dashboard |
| 2026-03-03 | prod_005 | Рефакторинг: React Context (ChatContext, CallContext), MessageInput декомпозиция (useSlashCommands, useTypingIndicator, useFileUpload), botservice routes/ (6 файлов, server.mjs ~100 строк), CSS Modules стратегия + VoiceRecordBar.module.css |
| 2026-03-03 | prod_006 | Масштабирование: botservice storage JSON→PostgreSQL (schema bots.kv_store), весь API async/await, migrate-json-to-pg.mjs, postgresql.conf тюнинг, backup-db.sh + backup-media.sh, disaster-recovery.md |
| 2026-03-03 | prod_006 post | Фикс postgresql.conf listen_addresses='*', retry в postgresStorage (10 попыток), cron бэкапы настроен на prod (03:00 db, 04:00 media) |
| 2026-03-03 | prod_007 | Качество кода: Vitest (27 тестов), ESLint react-hooks, Prettier, CI check job, botservice JSDoc+jsconfig |
| 2026-03-03 | prod_008 | Федерация: whitelist matrix.org+mozilla.org, eventHandler фильтр по SERVER_NAME, docs/federation.md, disaster-recovery signing key |
| 2026-03-04 | prod_009 | Очистка: удалены мёртвые конфиги (tsconfig/eslintrc корневые), переписан docs/setup.md, PROJECT_MAP.md+README.md актуализированы, botservice fallback→localhost, deploy.sh safeguard |
| 2026-03-04 | prod_010 | Релиз v1.0.0: версии синхронизированы, VS Code extension фикс (webview-dist), CI переработан (4 платформы + VS Code + published release), старые релизы/теги удалены |
| 2026-03-04 | prod_011 | Механика и визуал звонков: remote hangup fix, callSounds (Web Audio API), push-уведомления, IncomingCallOverlay/OutgoingCallOverlay → toast, CallBar центрированные контролы, connecting индикатор, мобильная адаптация |
| 2026-03-04 | prod_010_fix | CI build fix: vscode/LICENSE (MIT), убран --skip-license, macOS Intel (macos-13) в матрицу, @vscode/vsce из deps |
| 2026-03-07 | task_038 | Модальное окно настроек канала/комнаты: RoomSettingsModal (3 вкладки: инфо/участники/боты), шестерёнка в сайдбаре, Internal Room ID с копированием, invite/kick, тоггл ботов, опасная зона |
| 2026-03-07 | task_039 | Упоминание участников через @: useMentions хук, автокомплит дропдаун, m.mentions + matrix.to HTML, подсветка входящих упоминаний |
