# Uplink

Контекстный коммуникатор для разработчиков — мессенджер и звонилка, встроенные прямо в IDE.

Коммуникация живёт там, где живёт код. Не разработчик идёт в чат, а чат приходит к разработчику.

## Зачем

- Slack, Teams и другие западные инструменты заблокированы в РФ
- Существующие корпоративные мессенджеры не понимают контекст разработки
- Переключение между IDE и чатом снижает продуктивность на 20–25%
- Code review требует постоянного копирования кусков кода в чат

## Что умеет

**Мессенджер**
- Каналы и личные сообщения
- E2E-шифрование (Matrix/Synapse)
- Отправка сниппетов кода с подсветкой синтаксиса
- Отправка изображений и файлов
- Счётчик непрочитанных сообщений
- Push-уведомления (нативные + браузерные)

**Звонки**
- Аудио- и видеозвонки через LiveKit (SFU)
- Входящие/исходящие звонки в DM
- TURN relay для NAT traversal

**Профиль**
- Смена имени, аватара, пароля
- Онлайн-статусы

## Платформы

| Платформа | Технология | Статус |
|-----------|-----------|--------|
| VS Code Extension | TypeScript + React WebView | ✅ |
| Web App (PWA) | React + Vite | ✅ |
| Desktop (Windows, macOS, Linux) | Tauri v2 | ✅ |

## Архитектура

```
┌──────────────────────────────────────────────┐
│            Клиенты                           │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ VS Code  │  │ Web App  │  │  Desktop   │ │
│  │Extension │  │(React+   │  │ (Tauri v2) │ │
│  │          │  │ Vite)    │  │            │ │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
└───────┼──────────────┼──────────────┼────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────┐  ┌──────────────────────┐
│ Matrix/      │  │ LiveKit Cloud (SFU)  │
│ Synapse      │  │ - аудио/видео        │
│ - чаты       │  │ - screen share       │
│ - E2E крипто │  │ - WebRTC             │
│ - federation │  └──────────────────────┘
└──────────────┘
```

## Технический стек

**Клиент**
- TypeScript, React 18
- matrix-js-sdk — Matrix-протокол, E2E-шифрование
- livekit-client — WebRTC аудио/видео
- Vite — сборка веб-приложения
- Tauri v2 — нативное десктоп-приложение

**Сервер (on-premise)**
- Synapse — Matrix homeserver
- LiveKit Cloud — SFU для звонков (managed)
- PostgreSQL — хранение
- Redis — presence, кэш
- Prometheus + Grafana — мониторинг
- uplink-botservice — боты, webhooks, slash-команды
- Docker Compose — оркестрация

## Структура проекта

```
├── web/                    # Web App + Desktop
│   ├── src/
│   │   ├── components/     # React-компоненты
│   │   ├── hooks/          # useMatrix, useLiveKit, useMessages...
│   │   ├── matrix/         # MatrixService, RoomsManager
│   │   ├── livekit/        # LiveKitService, CallSignaling
│   │   └── styles/         # CSS
│   └── src-tauri/          # Tauri v2 (Rust, нативные плагины)
│
├── vscode/                 # VS Code Extension (WebView SPA)
├── docker/                 # Серверная инфраструктура (Compose, Synapse, botservice)
├── scripts/                # Деплой, бэкапы, setup
├── docs/                   # Документация (setup, disaster-recovery, federation)
└── .github/workflows/      # CI: деплой + кросс-платформенная сборка
```

## Быстрый старт

### Web App (разработка)

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

### Desktop App (Tauri)

```bash
cd web
npm install
npm run tauri:dev    # dev-режим с hot reload
npm run tauri:build  # release-сборка
```

Требуется: [Rust](https://rustup.rs/), Windows SDK (Windows), Xcode (macOS), webkit2gtk (Linux).

### VS Code Extension

```bash
npm install
npm run build:dev
# F5 в VS Code → запуск Extension Host
```

## Конфигурация

Расширение VS Code:

```json
{
  "uplink.matrix.homeserver": "https://matrix.company.ru",
  "uplink.matrix.userId": "@user:company.ru",
  "uplink.livekit.url": "wss://livekit.company.ru",
  "uplink.autoConnect": true
}
```

Web/Desktop — настройки в `web/src/config.ts`.

## CI/CD

GitHub Actions собирает десктоп-приложение для всех платформ:

- **Windows**: `.exe` (NSIS), `.msi`
- **macOS**: `.dmg` (ARM + Intel)
- **Linux**: `.deb`, `.AppImage`

Сборка запускается по тегу `v*` или вручную через workflow_dispatch.

## Лицензия

Proprietary. © 2025–2026
