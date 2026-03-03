# Uplink — Карта проекта

История разработки, завершённые задачи и эволюция архитектуры.


## Хронология задач

### Фаза 1: Фундамент (001–011)

001: Docker-инфраструктура (Synapse + Postgres + Redis)
002: VS Code extension scaffold (заброшен, код остался в src/)
003: Matrix-клиент с авторизацией
004: Чат UI в стиле Slack
005: Аудиозвонки через LiveKit (self-hosted, потом заменён на Cloud)
006: Тестовые пользователи и сообщения
007: Веб-приложение — переход на React SPA (web/)
008: E2E шифрование (crypto-wasm, убран SharedArrayBuffer check)
009: Dev и prod режимы (config.ts, nginx proxy)
010: Деплой на homelab (docker-compose, deploy.sh)
011: Cloudflare Tunnel (внешний доступ без белого IP)

### Фаза 2: Коммуникации (012–017)

012: Справочник пользователей и создание DM
013: Звонки в DM (интеграция LiveKit + Matrix сигнализация)
014: Входящие звонки, сигнализация через custom events, TURN
015: Профили пользователей (аватары, display name, пароль)
016: Медиа-сообщения (картинки, файлы, mxc:// → HTTP)
017: Миграция на LiveKit Cloud + видеозвонки (удалены self-hosted livekit и coturn)

### Фаза 3: UI и UX (018–019)

018: UI редизайн (Slack/Discord стиль, тёмная тема, CSS variables)
019: Tauri десктоп (системный трей, уведомления, автозапуск; блокер — Windows SDK)

### Фаза 4: Администрирование (020–022)

020: Админка: управление каналами, комнатами, пространствами
021: GitHub webhook автодеплой (deploy-webhook контейнер)
022: Админка: управление пользователями (Synapse admin API)

### Фаза 5: Чат-фичи (023–024)

023: Реакции, ответы (reply с цитатой), markdown-рендер, typing indicator, закреплённые сообщения, action-bar на сообщениях
024: Треды (боковая панель, фильтрация timeline, индикатор "N ответов", useThread хук)

### Фаза 6: Боты (025–026)

025: Боты: Application Service, uplink-botservice, slash-команды, GitHub/CI/Alerts хендлеры, BotSettings UI
026: Bot SDK: кастомные боты (webhook + WebSocket), NPM-пакет @uplink/bot-sdk, UI управления (BotCreateModal, BotManagePanel)

### Фаза 7: Рефакторинг и платформы (027–029)

027: Рефакторинг: декомпозиция MatrixService → 10 сервисов (MessageService, RoomService, MediaService, ReactionService, PinService, ThreadService, UserService, AdminService, RoomsManager, MessageFormatter), модульный CSS (13 файлов), useChatState хук
028: VS Code Extension: WebView SPA, storage bridge (SecretStorage/globalState вместо localStorage), CSP для WASM/WebSocket, dev/prod workflow
029: VS Code нативная интеграция: уведомления (3 уровня), Activity Bar badge, status bar, отправка кода/файлов из редактора, keybindings

### Фаза 8: Полировка и кроссплатформа (030–032)

030: Tauri Desktop финализация — авто-обновление (tauri-plugin-updater), deep links (uplink://), контекстное меню трея, глобальные горячие клавиши, badge на macOS dock, GitHub Actions CI
031: Мобильная адаптация — PWA-качество в мобильном браузере: safe-area, touch-friendly action-bar, адаптивные модалки, фикс iOS zoom на input, responsive sidebar/chat/thread
032: SVG-иконки — замена всех emoji и HTML-символов в UI на lucide-react SVG-иконки, единый визуальный стиль

### Фаза 9: Шифрование и контент (033–034)

033: Управление шифрованием — тогл E2E при создании комнат/пространств, кнопка 🔓/🔒 в RoomHeader (необратимо), настройка шифрования DM в ProfileModal, фикс бот-команд в незашифрованных каналах
034: Стикерпаки и GIF — комната-каталог #sticker-packs:uplink.local, паки через Matrix state events, Lottie-стикеры (lottie-react), Tenor API через прокси botservice, StickerGifPanel, CreateStickerPackModal, StickerPackManager, LottieSticker

### Фаза 10: Продакшн (036–037)

036: Фиксы ботов и стикеров — исправление бот-ответов в незашифрованных каналах, фикс панели стикеров/GIF
037: Production deploy — Yandex Cloud VM (93.77.189.225), docker-compose.production.yml, host nginx + TLS (Let's Encrypt), домен uplink.wh-lab.ru, admin.wh-lab.ru, DNS через REG.RU
037a: Реконфигурация домена — переход с tosters.ru на wh-lab.ru subdomain, обновление TLS-сертификатов, фикс мобильного WebRTC (HTTPS обязателен для камеры/микрофона)


## В backlog

035: Голосовые сообщения и видео-кружочки — MediaRecorder + Web Audio API (waveform), m.audio с org.matrix.msc3245.voice, видео-кружочки как m.video с dev.uplink.video_note, лимит 30 сек, Safari fallback (mp4 вместо ogg/webm)


## На горизонте (не оформлены в задачи)

- 023/024 расширение: эмодзи-пикер полный, форматированная вставка, drag-and-drop файлов
- Уведомления push (Web Push через Synapse pusher или Unified Push)
- Поиск по сообщениям (Synapse search API)
- Marketplace/каталог ботов
- Интерактивные элементы в сообщениях ботов (кнопки, формы)
- Federation (связь с другими Matrix-серверами)


## Эволюция архитектуры

**SPA вместо VS Code native.** Изначально (задача 002) проект задумывался как нативное VS Code extension с отдельным MatrixService в extension host и TreeData-провайдерами. После задачи 007 стало понятно, что мессенджер — слишком сложный UI для VS Code views. Всё переехало в React SPA. С задачи 028 SPA встраивается обратно в VS Code через WebView panel — лучшее из обоих миров. Старый scaffold (E:\Uplink\src\) сохранён как артефакт.

**Звонки: от self-hosted к Cloud.** Self-hosted LiveKit (005) → self-hosted + TURN coturn (014) → LiveKit Cloud (017). Каждая миграция упрощала инфраструктуру. Сейчас единственный внешний сервис — wss://uplink-3ism3la4.livekit.cloud.

**MatrixService: от монолита к фасаду.** Монолит (003) вырос до 44KB. Задача 027 декомпозировала его в фасад с 10 специализированными сервисами. MatrixService остаётся точкой входа, но делегирует в MessageService, RoomService, MediaService и т.д.

**CSS: от одного файла к модульной системе.** Один chat.css (50KB) → 15 модульных файлов (027, 034). Переменные в variables.css, каждый компонентный слой в своём файле.

**Деплой: от ручного к автоматическому, от homelab к cloud.** Ручной ssh + deploy.sh (010) → GitHub webhook автодеплой (021) → Yandex Cloud production (037). Homelab остаётся pre-prod средой.

**Шифрование: от принудительного к конфигурируемому.** E2E по умолчанию для всех комнат (008) → тогл при создании комнаты + необратимое включение для существующих (033). Боты работают только в незашифрованных каналах.

**Боты: от встроенных к платформе.** Встроенные боты через AS (025) → Bot SDK для кастомных ботов (026). Два режима: npm-пакет с WebSocket и webhook с HTTP callback.
