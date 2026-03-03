# Перепись кодовой базы Uplink

Дата: 2026-03-01
Общая статистика: ~180 файлов, ~18 400 строк кода (без node_modules/dist/.git/target/src/)

---

## Фронтенд (web/src/)

### Общая статистика
- Компоненты: 31 файл (.tsx), 4 537 строк
- Подкомпоненты (message/, profile/, sidebar/): 7 файлов, 281 строка
- Хуки: 11 файлов, 840 строк
- Сервисный слой (matrix/): 11 файлов, 1 635 строк
- LiveKit (livekit/): 2 файла, 665 строк
- Сервисы (services/): 4 файла, 621 строка
- Боты (bots/): 1 файл, 73 строки
- Утилиты (utils/): 3 файла, 210 строк
- Точки входа (App, main, config): 3 файла, 169 строк
- CSS: 16 файлов, 5 423 строки, ~771 правило
- **Итого фронтенд: 93 файла, ~14 454 строки**

---

### components/

#### ChatLayout.tsx
- Строк: 297
- Пропсы: `onLogout: () => void`
- Хуки: useChatState, useLiveKit, useCallSignaling, useViewportResize, useVSCodeBridge, useState(1), useEffect(4), useCallback(3)
- Сервисы: callSignalingService.startListening/stopListening/cancelOrHangup, matrixService
- Импорты: Sidebar, RoomHeader, MessageList, MessageInput, CallBar, VideoGrid, ProfileModal, IncomingCallOverlay, OutgoingCallOverlay, CreateSpaceModal, CreateRoomModal, AdminPanel, ThreadPanel, BotSettings
- Ответственность: главный layout — sidebar + messages + thread panel + call overlays

#### MessageInput.tsx
- Строк: 399
- Пропсы: `onSend, onSendReply?, onSendFile, roomId?, roomName?, replyTo?, onCancelReply?, pendingText?, onPendingTextConsumed?`
- Хуки: useState(7), useRef(3), useCallback(1), useEffect(5)
- Сервисы: matrixService.users.sendTyping, matrixService.messages.sendGif, matrixService.media.sendVoiceMessage/sendVideoNote, commandRegistry.search/load
- Импорты: StickerGifPanel, CreateStickerPackModal, VoiceRecordBar, VideoNoteRecordOverlay, matrixService, commandRegistry, stickerService
- Ответственность: ввод сообщений — slash-команды, файлы, стикеры/GIF, голосовые/видео, reply, typing

#### StickerGifPanel.tsx
- Строк: 337
- Пропсы: `roomId, onClose, onSendGif, onSendSticker, onOpenCreatePack?, onOpenPackManager?`
- Хуки: useState(5), useRef(2), useEffect(5), useCallback(1)
- Сервисы: gifService.trending/search, stickerService.getEnabledPacks/getRecent/getAllPacks/recordUsage, matrixService.media.mxcToHttp/mxcToHttpDownload
- Ответственность: панель GIF/стикеров — поиск, trending, паки, recent

#### MessageBubble.tsx
- Строк: 286
- Пропсы: `message, showAuthor, reactions?, isPinned?, threadSummary?, onReply?, onReact?, onRemoveReaction?, onPin?, onOpenThread?, onScrollToMessage?`
- Хуки: useState(2), useRef(1), useCallback(3)
- Сервисы: нет (чистый рендеринг)
- Импорты: Avatar, CodeSnippet, LottieSticker, VoiceMessage, VideoNote, renderMarkdown, formatters
- Ответственность: сообщение — текст/медиа/код/стикер/голос/видео/файл; реакции; reply; тред

#### BotCreateModal.tsx
- Строк: 254
- Пропсы: `currentUserId, onCreated, onClose`
- Хуки: useState(7)
- Сервисы: fetch(botApiUrl/custom-bots) POST
- Ответственность: форма создания бота — SDK/webhook, команды, токен

#### AdminPanel.tsx
- Строк: 226
- Пропсы: `onClose: () => void`
- Хуки: useState(6), useEffect(2)
- Сервисы: matrixService.admin.listServerUsers/createUser/setUserAdmin/deactivateUser
- Ответственность: админ-панель — список/создание/блокировка пользователей

#### RoomHeader.tsx
- Строк: 212
- Пропсы: `room, onBack?, callState, activeCallRoomName, onJoinCall, onLeaveCall, pinnedMessages?, onScrollToMessage?, onUnpin?, showBotSettings?, onToggleBotSettings?`
- Хуки: useState(2), useRef(1), useEffect(2)
- Сервисы: matrixService.rooms.enableEncryption
- Ответственность: шапка комнаты — заголовок, пины, боты, шифрование, звонок

#### CreateStickerPackModal.tsx
- Строк: 194
- Пропсы: `onClose, onCreated`
- Хуки: useState(4), useRef(1)
- Сервисы: stickerService.uploadSticker/createPack
- Ответственность: создание стикерпака — загрузка, превью

#### Sidebar.tsx
- Строк: 179
- Пропсы: `spaces, channels, directs, users, usersLoading, activeRoomId, userName, isAdmin, onSelectRoom, onOpenDM, onProfileClick, onLogout, onCreateSpace, onCreateRoom, onAdminPanel`
- Хуки: useState(1)
- Ответственность: сайдбар — пространства, каналы, DM, пользователи, поиск

#### VideoNoteRecordOverlay.tsx
- Строк: 170
- Пропсы: `onSend, onCancel`
- Хуки: useState(3), useRef(2), useEffect(3)
- Сервисы: videoNoteRecorder.getPreviewStream/start/stop/cancel/releaseStream
- Ответственность: запись видео-кружочка — превью → запись → ревью (30 сек)

#### BotManagePanel.tsx
- Строк: 150
- Пропсы: `currentUserId, onCreateBot`
- Хуки: useState(3), useEffect(1)
- Сервисы: fetch(botApiUrl/custom-bots) GET/DELETE/regenerate-token
- Ответственность: список кастомных ботов — удаление, перевыпуск токена

#### BotSettings.tsx
- Строк: 146
- Пропсы: `roomId, currentUserId, onClose`
- Хуки: useState(3), useEffect(1)
- Сервисы: fetch(botApiUrl/bots) GET/POST enable/disable
- Ответственность: включение/отключение ботов в комнате

#### MessageList.tsx
- Строк: 141
- Пропсы: `messages, reactions?, pinnedIds?, threadSummaries?, typingUsers?, scrollToEventId?, onScrollComplete?, onLoadMore, onReply?, onReact?, onRemoveReaction?, onPin?, onOpenThread?`
- Хуки: useRef(2), useCallback(2), useEffect(2)
- Ответственность: лента сообщений — разделители дней, автоскролл, lazy load, typing

#### ThreadPanel.tsx
- Строк: 128
- Пропсы: `roomId, threadRootId, onClose`
- Хуки: useThread(), useState(2), useRef(1), useEffect(2)
- Ответственность: боковая панель треда — корневое сообщение, ответы, отправка

#### VoiceRecordBar.tsx
- Строк: 116
- Пропсы: `onSend, onCancel`
- Хуки: useState(4), useEffect(1)
- Сервисы: voiceRecorder.start/stop/cancel
- Ответственность: запись голосового — waveform, отмена/отправка (30 сек)

#### VoiceMessage.tsx
- Строк: 110
- Пропсы: `fileUrl, duration, waveform?`
- Хуки: useState(4), useRef(1), useEffect(1)
- Ответственность: плеер голосового — play/pause, скорость, waveform, длительность

#### VideoNote.tsx
- Строк: 105
- Пропсы: `fileUrl, thumbnailUrl?, duration`
- Хуки: useState(3), useRef(2), useEffect(2)
- Ответственность: плеер видео-кружочка — кольцевой прогресс, авто-loop

#### LoginScreen.tsx
- Строк: 100
- Пропсы: `onLogin, error`
- Хуки: useState(4)
- Ответственность: форма логина — homeserver, userId, пароль

#### CreateRoomModal.tsx
- Строк: 93
- Пропсы: `spaceId, spaceName, onClose, onCreated`
- Хуки: useState(4)
- Сервисы: matrixService.rooms.createRoomInSpace
- Ответственность: создание комнаты в пространстве — название, описание, E2E тогл

#### CreateSpaceModal.tsx
- Строк: 91
- Пропсы: `spaceId, onClose, onCreated`
- Хуки: useState(4)
- Сервисы: matrixService.rooms.createSpace
- Ответственность: создание пространства — название, описание, E2E тогл

#### VideoGrid.tsx
- Строк: 82
- Пропсы: `participants: CallParticipant[]`
- Хуки: useState(1), useEffect(1)
- Сервисы: livekitService.onVideoTrack
- Ответственность: видеосетка звонка — тайл на участника

#### ProfileModal.tsx
- Строк: 78
- Пропсы: `onClose, onLogout`
- Хуки: useState(1), useEffect(1)
- Сервисы: matrixService.users.getMyDisplayName, storageGet/storageSet
- Ответственность: профиль — аватар, имя, пароль, DM-шифрование тогл

#### CallBar.tsx
- Строк: 70
- Пропсы: `roomName, participants, isMuted, isCameraOn, duration, onToggleMute, onToggleCamera, onLeave`
- Хуки: нет
- Ответственность: панель звонка — длительность, участники, mic/camera/leave

#### LottieSticker.tsx
- Строк: 62
- Пропсы: `url, width?, height?, loop?, className?`
- Хуки: useState(1), useRef(1), useEffect(2)
- Сервисы: fetch(url) для загрузки JSON
- Ответственность: Lottie-анимация — ленивая загрузка, visibility tracking

#### Avatar.tsx
- Строк: 49
- Пропсы: `name, size?, online?, imageUrl?, userId?`
- Ответственность: аватар с инициалами/изображением, online-точка, бот-индикатор

#### CodeSnippet.tsx
- Строк: 42
- Пропсы: `body, codeContext?`
- Хуки: useState(1)
- Ответственность: блок кода с кнопкой копирования

#### IncomingCallOverlay.tsx
- Строк: 42
- Пропсы: `callInfo, onAccept, onReject`
- Ответственность: оверлей входящего звонка — принять/отклонить

#### OutgoingCallOverlay.tsx
- Строк: 42
- Пропсы: `calleeName, signalState, onCancel`
- Ответственность: оверлей исходящего звонка — статус, отмена

---

### components/message/

#### formatters.ts — 29 строк
- Экспорты: formatTime, formatFileSize, getSenderColor, pluralReplies
- Ответственность: форматирование времени, размера, цвет автора, склонение

#### types.ts — 11 строк
- Экспорты: ReactionInfo, ThreadSummaryInfo (интерфейсы)
- Ответственность: типы для реакций и тредов

---

### components/profile/

#### AvatarSection.tsx — 71 строка
- Пропсы: `displayName: string`
- Хуки: useState(2), useRef(1), useEffect(1)
- Сервисы: matrixService.users.getMyAvatarUrl/fetchMyAvatarUrl/setAvatar, resizeImage
- Ответственность: загрузка аватара — resize 512px/1MB, upload

#### NameSection.tsx — 53 строки
- Пропсы: `initialName: string`
- Хуки: useState(4)
- Сервисы: matrixService.users.setDisplayName
- Ответственность: редактирование display name

#### PasswordSection.tsx — 55 строк
- Хуки: useState(4)
- Сервисы: matrixService.admin.changePassword
- Ответственность: смена пароля — old/new, 6+ символов

#### resizeImage.ts — 36 строк
- Экспорты: resizeImage (функция)
- Ответственность: resize изображения — max 512×512, 1MB, JPEG 0.85

---

### components/sidebar/

#### SpaceItem.tsx — 39 строк
- Пропсы: `space, activeRoomId, isAdmin, onSelectRoom, onCreateRoom`
- Хуки: useState(1)
- Ответственность: пространство — коллапсибл, вложенные комнаты, +кнопка

#### RoomItem.tsx — 26 строк
- Пропсы: `room, active, onClick, indent?`
- Ответственность: элемент комнаты — иконка, имя, непрочитанный badge

#### UserItem.tsx — 16 строк
- Пропсы: `user, onClick`
- Ответственность: элемент пользователя — аватар, имя

---

### Точки входа

#### App.tsx — 40 строк
- Хуки: useMatrix(), useState(1), useEffect(1)
- Ответственность: корневой компонент — auth state → Login или ChatLayout

#### main.tsx — 11 строк
- Ответственность: React DOM mount, импорт стилей

#### config.ts — 118 строк
- Экспорты: getConfig (функция), config (proxy-объект)
- Импорты: storageGet из utils/storage
- Ответственность: конфигурация — baseUrl (dev/prod/embedded), URL сервисов

---

### hooks/

#### useChatState.ts — 120 строк
- Экспорты: useChatState
- Импорты: useRooms, useMessages, useUsers, useNotifications, matrixService, storageGet, ParsedMessage, ReplyToInfo
- Ответственность: агрегированное состояние чата — комнаты, сообщения, треды, модалки, reply, send/pin

#### useMessages.ts — 175 строк
- Экспорты: useMessages
- Импорты: matrixService, parseEvent, ParsedMessage, ReactionInfo, ThreadSummaryInfo
- Ответственность: таймлайн комнаты — реакции, пины, треды, отправка

#### useNotifications.ts — 123 строк
- Экспорты: useNotifications, showNotification
- Импорты: matrixService
- Ответственность: push-уведомления (Tauri/browser), определение окружения

#### useLiveKit.ts — 82 строки
- Экспорты: useLiveKit
- Импорты: livekitService, CallState, CallParticipant, matrixService
- Ответственность: состояние звонка — участники, длительность, mute/camera

#### useVSCodeBridge.ts — 76 строк
- Экспорты: useVSCodeBridge, base64ToFile
- Импорты: callSignalingService
- Ответственность: VS Code postMessage мост — навигация, сниппеты, файлы, звонки

#### useThread.ts — 55 строк
- Экспорты: useThread
- Импорты: matrixService, parseEvent, ParsedMessage
- Ответственность: сообщения треда, отправка в тред

#### useMatrix.ts — 51 строка
- Экспорты: useMatrix
- Импорты: matrixService, ConnectionState
- Ответственность: подключение — login, logout, восстановление сессии

#### useCallSignaling.ts — 49 строк
- Экспорты: useCallSignaling
- Импорты: callSignalingService, CallSignalState, CallInfo
- Ответственность: состояние сигнализации звонков — start, accept, reject, cancel

#### useUsers.ts — 47 строк
- Экспорты: useUsers, UserInfo
- Импорты: matrixService
- Ответственность: список пользователей — admin API / directory search fallback

#### useRooms.ts — 37 строк
- Экспорты: useRooms
- Импорты: matrixService, getGroupedRooms, RoomInfo, SpaceInfo
- Ответственность: список пространств, каналов, DM

#### useViewportResize.ts — 25 строк
- Экспорты: useViewportResize
- Ответственность: virtualViewport tracking на iOS (CSS --vh)

---

### matrix/ (сервисный слой)

#### MatrixService.ts — 384 строки
- Экспорты: MatrixService (singleton), ConnectionState
- Импорты: AdminService, MediaService, MessageService, PinService, ReactionService, ThreadService, UserService, RoomService, storageGet/Set/Remove
- Ответственность: фасад Matrix-клиента — login, logout, 8 под-сервисов, слушатели событий

#### RoomService.ts — 276 строк
- Экспорты: RoomService
- Ответственность: создание Space/room, invite, DM, accept/reject invite

#### MessageFormatter.ts — 212 строк
- Экспорты: parseEvent, ParsedMessage
- Ответственность: парсинг Matrix-событий в типизированные сообщения (text, image, file, sticker, GIF, voice, video-note)

#### RoomsManager.ts — 143 строки
- Экспорты: RoomInfo, SpaceInfo, getGroupedRooms
- Ответственность: группировка комнат — spaces, channels, directs

#### MediaService.ts — 140 строк
- Экспорты: MediaService
- Импорты: VoiceRecording, VideoNoteRecording
- Ответственность: mxc→HTTP URL, upload файлов, отправка файлов/голосовых/видео-кружочков

#### AdminService.ts — 113 строк
- Экспорты: AdminService, SynapseUser
- Ответственность: Synapse Admin API — список/создание пользователей, роли, деактивация

#### UserService.ts — 103 строки
- Экспорты: UserService
- Ответственность: поиск, display name, аватар, presence, профиль

#### MessageService.ts — 90 строк
- Экспорты: MessageService
- Импорты: GifResult
- Ответственность: отправка текста/reply, загрузка истории, mark read, отправка GIF

#### ThreadService.ts — 74 строки
- Экспорты: ThreadService
- Ответственность: отправка в тред, summary (количество ответов), сообщения треда

#### ReactionService.ts — 54 строки
- Экспорты: ReactionService
- Ответственность: отправка/удаление реакций, агрегация по eventId

#### PinService.ts — 46 строк
- Экспорты: PinService
- Ответственность: pin/unpin сообщений, получение списка pinned

---

### livekit/

#### CallSignalingService.ts — 337 строк
- Экспорты: CallSignalingService (singleton), CallSignalState, CallInfo, CallDirection, generateCallId
- Импорты: matrixService
- Ответственность: сигнализация звонков через Matrix custom events (com.uplink.call.*), таймаут 30 сек

#### LiveKitService.ts — 328 строк
- Экспорты: LiveKitService, CallState, CallParticipant
- Импорты: livekit-client, config
- Ответственность: join/leave звонка, mute/camera, участники, таймер длительности, видеотреки

---

### services/

#### StickerService.ts — 234 строки
- Экспорты: StickerService, Sticker, StickerPack, StickerInfo
- Импорты: matrixService
- Ответственность: стикерпаки — каталог, загрузка, предпочтения, recent

#### VoiceRecorder.ts — 178 строк
- Экспорты: VoiceRecorder, VoiceRecording, RecorderState
- Ответственность: MediaRecorder + Web Audio API для waveform, 30 сек лимит

#### VideoNoteRecorder.ts — 145 строк
- Экспорты: VideoNoteRecorder, VideoNoteRecording
- Ответственность: getUserMedia (фронтальная камера), 30 сек, thumbnail

#### GifService.ts — 64 строки
- Экспорты: GifService, GifResult
- Импорты: config
- Ответственность: GIPHY API через прокси botservice — search, trending

---

### bots/

#### CommandRegistry.ts — 73 строки
- Экспорты: CommandRegistry, BotCommand
- Импорты: getConfig
- Ответственность: загрузка команд ботов, поиск по префиксу

---

### utils/

#### deepLink.ts — 76 строк
- Экспорты: initDeepLinkHandler
- Ответственность: deep link handler (Tauri only) — навигация, звонок, сервер

#### storage.ts — 73 строки
- Экспорты: storageGet, storageSet, storageRemove, initStorage
- Ответственность: абстракция хранилища — localStorage / VS Code postMessage bridge

#### markdown.ts — 61 строка
- Экспорты: renderMarkdown
- Ответственность: Markdown → HTML (bold, italic, code, blockquote, links)

---

### CSS (styles/)

| Файл | Строк | Правил | Медиа-запросы |
|------|-------|--------|---------------|
| mobile.css | 812 | ~164 | 5: 768px, 360px, 1024px, landscape, standalone |
| messages.css | 710 | ~52 | — |
| bots.css | 659 | ~96 | — |
| stickers.css | 568 | ~72 | 1: 768px |
| voice-video.css | 465 | ~68 | 1: 768px |
| sidebar.css | 322 | ~25 | — |
| call.css | 260 | ~24 | — |
| message-input.css | 254 | ~42 | — |
| thread.css | 248 | ~24 | 1: 1024px/769px |
| room-header.css | 245 | ~18 | — |
| profile.css | 209 | ~32 | — |
| admin.css | 203 | ~35 | — |
| chat.css | 202 | ~6 | 1: 768px |
| login.css | 130 | ~26 | 1: 480px |
| global.css | 70 | ~10 | — |
| variables.css | 66 | 47 vars | — |
| **Итого** | **5 423** | **~771** | **11** |

CSS-переменные (47 шт, --uplink-*):
- Цвета: bg-primary/secondary/tertiary/floating, text-primary/secondary/muted/faint, accent/hover, success, danger, warning
- UI: interactive-normal/hover/active, sidebar-active/hover, input-bg, code-bg, border, message-hover, scrollbar/thumb, shadow/elevated
- Размеры: radius-sm/md/lg, sidebar-width, avatar-size
- Шрифты: font (system), font-mono

---

## Бот-сервис (docker/uplink-botservice/)

### Общая статистика: 13 файлов, 2 190 строк

#### server.mjs — 404 строки
- Точка входа Express + WebSocket
- 20+ HTTP-эндпоинтов: AS API (PUT /transactions, GET /users, /rooms), Webhook (POST /hooks/:id), Bot CRUD (/api/custom-bots/*), GIF proxy (/api/gif/*), Debug, Health
- Импорты: все файлы сервиса

#### matrixClient.mjs — 240 строк
- Экспорты: ensureBotUser, sendBotMessage, joinBotToRoom, isBotInRoom, isRoomEncrypted, sendBotReaction
- Matrix API для ботов через AS-маршрутизацию

#### customBots.mjs — 234 строки
- Экспорты: createCustomBot, getCustomBot, getCustomBotByToken, getCustomBotsByOwner, getAllCustomBots, updateCustomBot, deleteCustomBot, regenerateToken, addBotToRoom, removeBotFromRoom, setBotStatus, botHasAccessToRoom, getCustomBotCommands, findCustomBotByCommand
- CRUD кастомных ботов, хранилище в storage.json

#### botGateway.mjs — 221 строка
- Экспорты: initBotGateway, pushEventToSdkBots, hasConnectedSdkBots
- WebSocket сервер для SDK-ботов на /bot-ws/:token, очередь (max 100)

#### eventHandler.mjs — 169 строк
- Экспорты: handleMatrixEvent
- Маршрутизация: slash-команды → handlers, сообщения → webhook/SDK боты

#### webhookForwarder.mjs — 164 строки
- Экспорты: forwardToWebhook, verifyWebhookUrl
- HTTP POST к webhook-ботам с HMAC-SHA256, retry, timeout 10 сек

#### registry.mjs — 121 строка
- Экспорты: BOT_DEFINITIONS, getBotRoomBindings, setBotRoomBindings, enableBotInRoom, disableBotInRoom, getBotsForRoom, getAllBotCommands
- Конфигурация встроенных ботов (github, ci, alerts, helper)

#### handlers/ci.mjs — 140 строк
- Экспорты: handleCommand, handleWebhook
- CI/CD бот: /ci status, /ci trigger, GitHub Actions / GitLab CI

#### handlers/helper.mjs — 133 строки
- Экспорты: handleCommand
- /help, /poll "Вопрос" "Вариант", /remind 30m текст

#### handlers/github.mjs — 130 строк
- Экспорты: handleCommand, handleWebhook
- /github subscribe/unsubscribe/list, GitHub webhook events

#### handlers/alerts.mjs — 127 строк
- Экспорты: handleCommand, handleWebhook
- /alerts mute/status, Grafana/Alertmanager/Uptime Kuma

#### rateLimiter.mjs — 55 строк
- Экспорты: checkRateLimit, getRemainingLimit
- Скользящее окно 60 сек: 30 msg/min, 5 react/min

#### storage.mjs — 52 строки
- Экспорты: getStorage, setStorage, deleteStorage, getAllStorageKeys
- JSON файл-хранилище /app/data/storage.json с кешем в памяти

---

## VS Code extension (vscode/src/)

### Общая статистика: 6 файлов, 577 строк

#### UplinkPanel.ts — 220 строк
- Экспорты: createViewProvider, createOrShow, postToWebview
- WebView контейнер: dev (iframe :5173) / prod (dist с CSP + nonce)

#### bridge.ts — 107 строк
- Экспорты: setWebviewViewRef, handleWebViewMessage
- PostMessage мост: storage-get/set/remove, notification, unread-count, connection-state, call-state, pick-file

#### commands.ts — 87 строк
- Экспорты: registerCommands
- uplink.sendSnippet (выделенный код), uplink.sendFile (file picker), uplink.startCall

#### notifications.ts — 60 строк
- Экспорты: handleNotification
- 3 уровня: call (modal), mention (warning), message (info)

#### statusBar.ts — 55 строк
- Экспорты: setStatusBarItem, updateConnectionStatus, setCallState
- Status Bar: connected/connecting/offline, elapsed time при звонке

#### extension.ts — 48 строк
- Экспорты: activate, deactivate
- Регистрация WebView, команд, Status Bar

---

## Bot SDK (packages/bot-sdk/)

### Общая статистика: 7 файлов, 438 строк

#### src/UplinkBot.mjs — 121 строка
- Экспорты: UplinkBot
- Главный класс: onCommand, onMessage, onReaction, start, stop

#### src/WebSocketTransport.mjs — 131 строка
- Экспорты: WebSocketTransport
- WebSocket с автореконнектом (backoff 1→30 сек), ack-очередь

#### src/BotContext.mjs — 63 строки
- Экспорты: BotContext
- Контекст события: reply, react, sendMessage

#### src/types.mjs — 31 строка
- JSDoc typedef: BotConfig, BotEvent, BotAction

#### src/index.mjs — 2 строки
- Реэкспорт: UplinkBot, BotContext

#### examples/ci-bot.mjs — 58 строк
- Пример CI-бота: /deploy, /status

#### examples/echo-bot.mjs — 32 строки
- Пример echo-бота: /echo, /ping

---

## Инфраструктура

### Docker

#### docker-compose.yml — 146 строк
7 сервисов (pre-prod, homelab):

| Сервис | Образ | Порт | Назначение |
|--------|-------|------|------------|
| postgres | postgres:15 | 5433:5432 | БД Synapse |
| redis | redis:7 | 6379 | Кеш Synapse |
| synapse | matrixdotorg/synapse | 8008 | Matrix homeserver |
| synapse-admin | awesometechnologies/synapse-admin | 8080 | Админ-UI |
| livekit-token | ./livekit-token (build) | 7890 | JWT-генерация LiveKit |
| uplink-web | ../web (build) | 5174:80 | React SPA + nginx |
| uplink-botservice | ./uplink-botservice (build) | 7891 | Bot API + WebSocket |
| deploy-webhook | ./deploy-webhook (build) | 9000 | Автодеплой |

#### docker-compose.production.yml — 153 строки
- Отличия: все порты на 127.0.0.1, synapse-data bind mount, /home/ubuntu/projects/uplink

#### .env — 19 строк
- Переменные: POSTGRES_DB/USER/PASSWORD, SYNAPSE_SERVER_NAME, LIVEKIT_API_KEY/SECRET, WEBHOOK_SECRET, BOT_AS_TOKEN/HS_TOKEN, GIPHY_API_KEY

#### synapse/homeserver.yaml — 92 строки
- server_name: uplink.local, psycopg2→postgres, Redis, 50M upload, registration disabled, appservice-bots.yaml

#### synapse/appservice-bots.yaml — 14 строк
- id: uplink-bots, url: http://uplink-botservice:7891, regex: @bot_.*:uplink\.local

#### livekit-token/server.mjs — 90 строк
- POST /token → JWT (userId, roomName, 6h TTL), GET /health

#### deploy-webhook/server.mjs — 188 строк
- POST /webhook → HMAC verify → git pull → docker compose up --build --no-deps, notify CI bot

### nginx (web/nginx.conf) — 155 строк

| Location | Target |
|----------|--------|
| / | SPA fallback (index.html) |
| /assets/ | 1y cache |
| /_matrix/ | synapse:8008 (50M upload) |
| /livekit-token/ | livekit-token:7890 |
| /bot-api/ | uplink-botservice:7891/api/ |
| /gif-api/ | uplink-botservice:7891/api/gif/ |
| /bot-ws/ | WebSocket → botservice (86400s) |
| /hooks/ | uplink-botservice:7891/hooks/ (5M) |
| /api/deploy-webhook/ | deploy-webhook:9000 |

### web/Dockerfile — 13 строк
- Stage 1: node:20-alpine → npm install → copy WASM → npm run build
- Stage 2: nginx:alpine → dist/ → nginx.conf → port 80

### web/vite.config.ts — 41 строка
- Plugins: wasm, topLevelAwait, react
- Server: :5173, host 0.0.0.0
- Build: sourcemap, esnext, manual chunks (matrix-sdk, livekit, react-vendor)
- optimizeDeps.exclude: @matrix-org/matrix-sdk-crypto-wasm

---

### CI/CD и скрипты

#### .github/workflows/build-desktop.yml — 93 строки
- Триггер: push tags (v*), manual
- Matrix: Windows, macOS (aarch64), Linux
- Шаги: checkout → Node 20 → Rust → npm install → tauri build → Release

#### .github/workflows/deploy-production.yml — 19 строк
- Триггер: push main, manual
- SSH → ubuntu@93.77.189.225 → ./deploy-prod.sh

#### deploy.sh — 49 строк
- Homelab: git pull → docker compose up --build → chown 991:991 → healthcheck

#### deploy-prod.sh — 46 строк
- Production: git pull → docker compose -f production.yml up --build → healthcheck → prune

#### scripts/seed-test-data.mjs — 315 строк
- Заполнение тестовыми комнатами и сообщениями

#### scripts/rebuild-all.ps1 — 143 строки
- Полная пересборка (Windows)

#### scripts/deploy.ps1 — 25 строк
- Windows deploy wrapper

#### scripts/deploy-remote.sh — 65 строк
- Удалённый деплой через SSH

#### scripts/create-users.sh — 51 строка
- Batch создание пользователей через shared_secret

#### scripts/create-users.ps1 — 46 строк
- PowerShell версия

#### scripts/create-user.sh — 42 строки
- Создание одного пользователя

---

### Tauri (web/src-tauri/)

#### tauri.conf.json — 70 строк
- Окно: 1200×800, min 800×600, centered
- CSP: null (для WebSocket)
- Bundle: все таргеты, иконки
- Plugins: deep-link (uplink://)

#### Cargo.toml — 24 строки
- Dependencies: tauri, tauri-plugin-notification/deep-link/global-shortcut, serde

#### src/lib.rs — 116 строк
- Tauri setup: plugins, dev URL / embedded assets

#### src/main.rs — 5 строк
- Entry point, вызов lib::run()

---

### Конфиги корня

| Файл | Строк | Назначение |
|------|-------|------------|
| package.json (root) | 150 | Workspace config, legacy VS Code extension |
| .eslintrc.json | 20 | ESLint конфиг |
| tsconfig.json (root) | 27 | TS конфиг (root) |
| tsconfig.webview.json | — | TS для webview (legacy) |
| webpack.config.js | 70 | Webpack (legacy VS Code ext) |
| .gitignore | — | Исключения (node_modules, dist, target, .env, *.vsix) |
| README.md | 160 | Описание проекта |
| PROJECT_MAP.md | 105 | История разработки |
| .claude/CLAUDE.md | — | Инструкции для AI |
| docs/setup.md | 61 | Инструкция по установке |

---

### VS Code workspace

| Файл | Назначение |
|------|------------|
| .vscode/launch.json | Конфигурации запуска |
| .vscodeignore (root) | Исключения для vsce (legacy) |
| vscode/.vscodeignore | Исключения для vsce (новый ext) |
| vscode/esbuild.config.mjs | esbuild конфиг для extension |
| vscode/tsconfig.json | TS конфиг для extension |
| vscode/package.json | Extension manifest + dependencies |

---

### Задачи (Tasks/)

#### backlog/ — 1 файл
| Файл | Размер |
|------|--------|
| refactoring_audit.md | 8.9 KB |

#### done/ — 38 файлов
| Файл | Размер |
|------|--------|
| 001_docker_infrastructure.md | 6.5 KB |
| 002_vscode_extension_scaffold.md | 19.3 KB |
| 003_matrix_client_auth.md | 60.9 KB |
| 004_chat_webview_slack_ui.md | 23.3 KB |
| 005_livekit_audio_calls.md | 41.0 KB |
| 006_test_users_and_messages.md | 22.2 KB |
| 007_web_app_chat.md | 45.2 KB |
| 008_fix_e2e_encryption.md | 8.1 KB |
| 009_fix_web_dev_and_prod.md | 12.1 KB |
| 010_deploy_homelab.md | 17.1 KB |
| 011_cloudflare_tunnel.md | 13.4 KB |
| 011_tailscale_https.md | 9.4 KB |
| 012_user_directory_dm.md | 24.6 KB |
| 013_calls_in_dm.md | 5.8 KB |
| 014_calls_cloud_turn.md | 12.0 KB |
| 014_calls_through_tunnel.md | 9.2 KB |
| 014_fix_calls_signal_close.md | 8.8 KB |
| 014_incoming_calls.md | 29.4 KB |
| 015_user_profile.md | 28.8 KB |
| 016_media_messages.md | 25.0 KB |
| 017_livekit_cloud_video.md | 18.7 KB |
| 018_ui_redesign.md | 19.0 KB |
| 019_tauri_desktop_app.md | 24.6 KB |
| 020_admin_channels_rooms.md | 30.5 KB |
| 021_github_webhook_autodeploy.md | 12.7 KB |
| 022_admin_panel_users.md | 23.2 KB |
| 023_chat_features.md | 24.4 KB |
| 024_threads.md | 29.7 KB |
| 025_bots.md | 52.4 KB |
| 026_bot_sdk.md | 20.5 KB |
| 027_desktop_vscode_cloud.md | 20.8 KB |
| 027_refactoring.md | 22.1 KB |
| 028_vscode_extension.md | 32.3 KB |
| 029_vscode_native_integration.md | 18.9 KB |
| 030_tauri_desktop_finalize.md | 24.2 KB |
| 031_mobile_adaptation.md | 16.9 KB |
| 032_svg_icons.md | 10.1 KB |
| 033_fix_bots_e2e_args.md | 26.3 KB |
| 034_stickers_gif.md | 49.5 KB |
| 035_voice_video_notes.md | 62.5 KB |
| 036_fix_bots_stickers.md | 22.8 KB |
| 037_yandex_cloud_production.md | 9.3 KB |
| 037a_reconfigure_domain.md | 6.8 KB |

---

### Медиа и артефакты

| Файл | Назначение |
|------|------------|
| media/uplink-icon.svg | Иконка проекта |
| web/public/uplink-icon.svg | Иконка для PWA |
| web/public/manifest.json | PWA манифест |
| vscode/resources/icon.svg | Иконка расширения |

---

### Legacy / артефакты сборки (НЕ в git, но существуют)

- `dist/` — старые артефакты legacy VS Code extension (chat.js, extension.js + sourcemaps)
- `out/` — скомпилированные .js/.d.ts из legacy TypeScript (context, extension, matrix, providers, webview, test)
- `uplink-0.1.4.vsix` — собранный пакет legacy расширения
- `vscode/out/extension.js` — собранный новый VS Code extension
- `vscode/uplink-0.1.0.vsix` — собранный пакет нового расширения
- `web/dist-vscode/` — сборка SPA для VS Code
- `releases/` — каталог релизов

**Пропущено**: `E:\Uplink\src\` — заброшенный VS Code extension scaffold (задача 002), НЕ анализируется.

---

## Граф зависимостей (кто кого импортирует)

### Ядро (matrix/)

```
MatrixService ← useMatrix, useChatState, useMessages, useLiveKit, useNotifications,
                 useRooms, useThread, useUsers, config, ChatLayout, ProfileModal,
                 RoomHeader, CreateRoomModal, CreateSpaceModal, AdminPanel,
                 AvatarSection, NameSection, PasswordSection, MessageInput,
                 StickerGifPanel, StickerService, CallSignalingService

MessageFormatter (parseEvent) ← useMessages, useThread

RoomsManager (getGroupedRooms) ← useRooms
```

### Сервисы

```
LiveKitService ← useLiveKit, VideoGrid
CallSignalingService ← useCallSignaling, useVSCodeBridge, ChatLayout
VoiceRecorder ← VoiceRecordBar, MediaService
VideoNoteRecorder ← VideoNoteRecordOverlay, MediaService
StickerService ← StickerGifPanel, MessageInput, CreateStickerPackModal
GifService ← StickerGifPanel
CommandRegistry ← MessageInput
```

### Хуки

```
useChatState ← ChatLayout (агрегирует useRooms, useMessages, useUsers, useNotifications)
useLiveKit ← ChatLayout
useCallSignaling ← ChatLayout
useThread ← ThreadPanel
useVSCodeBridge ← ChatLayout
useViewportResize ← ChatLayout
useMatrix ← App
```

### Компоненты

```
ChatLayout ← App
  ├── Sidebar ← SpaceItem, RoomItem, UserItem
  ├── RoomHeader
  ├── MessageList ← MessageBubble ← Avatar, CodeSnippet, LottieSticker, VoiceMessage, VideoNote
  ├── MessageInput ← StickerGifPanel, VoiceRecordBar, VideoNoteRecordOverlay, CreateStickerPackModal
  ├── ThreadPanel
  ├── CallBar, VideoGrid
  ├── ProfileModal ← AvatarSection, NameSection, PasswordSection
  ├── IncomingCallOverlay, OutgoingCallOverlay
  ├── CreateSpaceModal, CreateRoomModal
  ├── AdminPanel
  └── BotSettings ← BotManagePanel, BotCreateModal
```

---

## Потенциальные проблемы (заметки)

### Файлы-гиганты
- **mobile.css (812 строк)** — самый большой CSS, 5 breakpoints, 164 правила. Потенциально стоит декомпозировать.
- **messages.css (710 строк)** — много правил для одного файла.
- **bots.css (659 строк)** — много стилей для бот-панелей.
- **server.mjs botservice (404 строки)** — 20+ эндпоинтов в одном файле, можно разнести по роутерам.
- **MessageInput.tsx (399 строк)** — много ответственностей (slash, sticker, voice, video, reply, typing).
- **MatrixService.ts (384 строк)** — фасад, но всё ещё большой.

### Props drilling
- ChatLayout получает state из useChatState и передаёт через 5+ уровней вложенности. Потенциально стоит рассмотреть Context.

### Legacy-артефакты
- `dist/`, `out/` — остатки от старого VS Code extension build. Можно удалить и добавить в .gitignore.
- `package.json` (root), `webpack.config.js`, `tsconfig.json` (root), `tsconfig.webview.json` — конфиги для legacy extension.
- `.vscodeignore` (root) — для старого расширения.

### Дублирование
- `scripts/create-users.sh` и `scripts/create-users.ps1` — одно и то же на разных языках.
- `deploy.sh` и `scripts/deploy-remote.sh` — похожая логика.

### Отсутствие тестов
- Нет unit/integration тестов для web/ (React, hooks, services).
- Тесты в `test/suite/` — для legacy VS Code extension, не актуальны.

### CSS без scoping
- Все стили глобальные (нет CSS Modules, не styled-components). Риск коллизий селекторов при росте.

### Безопасность
- botservice fetch API без аутентификации (только check по owner в custom-bots).
- GIPHY API key на сервере, но endpoint /api/gif/* открыт без auth.

### Зависимость от singleton
- MatrixService, LiveKitService, CallSignalingService — синглтоны с глобальным состоянием. Усложняет тестирование.
