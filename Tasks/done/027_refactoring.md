# 027 — Рефакторинг: декомпозиция MatrixService, CSS и крупных компонентов

## Контекст

Проект дорос до точки, где два файла стали узким местом разработки: `MatrixService.ts` (44 КБ, 1083 строки) и `chat.css` (50 КБ, 2306 строк). Добавление любой новой фичи (боты, треды, реакции) раздувает их дальше. Несколько компонентов тоже приближаются к порогу — `ChatLayout.tsx` (13 КБ, 9 useState), `ProfileModal.tsx` (10.8 КБ), `Sidebar.tsx` (9.7 КБ), `MessageBubble.tsx` (9.7 КБ).

Рефакторинг не меняет функциональность. Цель — разбить монолиты на модули с чёткой ответственностью, чтобы каждый файл отвечал за одну вещь и легко модифицировался отдельно.

**Правило:** рефакторинг проводится атомарными коммитами. Каждый шаг — полностью рабочий проект. Никаких "big bang" переписываний.


## Проблема 1: MatrixService.ts (44 КБ, 1083 строки)

### Текущая ситуация

Один класс `MatrixService` содержит **всё**:

```
MatrixService.ts (1083 строки)
├── Auth (login, restoreSession, logout, disconnect)          ~80 строк
├── Client init (initClient, initCrypto, configureCryptoTrust) ~120 строк
├── Event bus (5 listener sets, emit methods)                  ~40 строк
├── Auto-invite (acceptPendingInvites, autoAcceptInvite)       ~45 строк
├── Messages (sendMessage, loadMoreMessages)                   ~30 строк
├── Reply (sendReply)                                          ~25 строк
├── Reactions (sendReaction, removeReaction, getReactionsForTimeline) ~50 строк
├── Pins (pinMessage, unpinMessage, getPinnedEventIds)         ~45 строк
├── Threads (sendThreadMessage, getThreadSummary, getThreadMessages) ~70 строк
├── Typing (sendTyping, onTyping listener)                     ~10 строк
├── Read markers (markRoomAsRead)                              ~25 строк
├── User search (searchUsers)                                  ~90 строк
├── DM management (getOrCreateDM, findInviteFrom, updateDirectMap) ~80 строк
├── Profiles (mxcToHttp, getUserAvatarUrl, fetchMyAvatarUrl, setDisplayName, setAvatar) ~60 строк
├── Media (getMediaDownloadUrl, sendFile, getImageDimensions)  ~50 строк
├── Spaces (createSpace, createRoomInSpace, inviteAllUsersToRoom, isSpace) ~100 строк
├── Admin API (listServerUsers, createUser, setUserAdmin, deactivateUser, changePassword) ~80 строк
└── Utilities (getServerDomain, getLastEventTs, setConnectionState) ~20 строк
```

### Целевая структура

```
web/src/matrix/
├── MatrixService.ts          — ядро: auth, client init, crypto, event bus, getClient()
├── MessageService.ts         — sendMessage, sendReply, loadMoreMessages, markRoomAsRead
├── ReactionService.ts        — sendReaction, removeReaction, getReactionsForTimeline
├── ThreadService.ts          — sendThreadMessage, getThreadSummary, getThreadMessages, onThreadUpdate
├── PinService.ts             — pinMessage, unpinMessage, getPinnedEventIds
├── RoomService.ts            — createSpace, createRoomInSpace, getOrCreateDM, updateDirectMap, isSpace, inviteAllUsersToRoom
├── UserService.ts            — searchUsers, profiles (avatar, displayName), typing
├── MediaService.ts           — mxcToHttp, getMediaDownloadUrl, sendFile, getImageDimensions
├── AdminService.ts           — listServerUsers, createUser, setUserAdmin, deactivateUser, changePassword
├── RoomsManager.ts           — (уже отдельный, без изменений)
└── MessageFormatter.ts       — (уже отдельный, без изменений)
```

### Паттерн: сервисы-модули с доступом к клиенту

Каждый модуль получает MatrixClient через callback от MatrixService. Не создаёт своих клиентов, не хранит токены — только бизнес-логика своей области.

```typescript
// web/src/matrix/MessageService.ts
import * as sdk from 'matrix-js-sdk';

/**
 * Сервис сообщений — отправка, ответы, загрузка истории, прочитанные.
 * Получает клиент через getClient(), не владеет подключением.
 */
export class MessageService {
    constructor(private getClient: () => sdk.MatrixClient) {}

    async sendMessage(roomId: string, body: string): Promise<void> {
        await this.getClient().sendEvent(roomId, 'm.room.message' as any, {
            msgtype: 'm.text',
            body,
        });
    }

    async sendReply(roomId: string, replyToEventId: string, body: string): Promise<void> {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        const replyEvent = room?.findEventById(replyToEventId);
        const originalBody = replyEvent?.getContent()?.body || '';
        const originalSender = replyEvent?.getSender() || '';

        const fallbackBody = `> <${originalSender}> ${originalBody}\n\n${body}`;

        await client.sendEvent(roomId, 'm.room.message' as any, {
            msgtype: 'm.text',
            body: fallbackBody,
            format: 'org.matrix.custom.html',
            formatted_body: `<mx-reply><blockquote><a href="https://matrix.to/#/${roomId}/${replyToEventId}">In reply to</a> <a href="https://matrix.to/#/${originalSender}">${originalSender}</a><br>${originalBody}</blockquote></mx-reply>${body}`,
            'm.relates_to': {
                'm.in_reply_to': { event_id: replyToEventId },
            },
        });
    }

    async loadMoreMessages(roomId: string, limit: number = 30): Promise<boolean> {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return false;
        const timeline = room.getLiveTimeline();
        return client.paginateEventTimeline(timeline, { backwards: true, limit });
    }

    async markRoomAsRead(roomId: string): Promise<void> {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return;
        const timeline = room.getLiveTimeline();
        const events = timeline.getEvents();
        if (events.length === 0) return;
        const lastEvent = events[events.length - 1];
        try {
            await client.sendReadReceipt(lastEvent);
            await client.setRoomReadMarkers(roomId, lastEvent.getId()!);
        } catch (err) {
            console.warn('Ошибка markRoomAsRead:', err);
        }
    }
}
```

MatrixService создаёт модули при конструкции и делегирует:

```typescript
// web/src/matrix/MatrixService.ts (после рефакторинга — ядро ~300 строк)
import { MessageService } from './MessageService';
import { ReactionService } from './ReactionService';
import { ThreadService } from './ThreadService';
import { PinService } from './PinService';
import { RoomService } from './RoomService';
import { UserService } from './UserService';
import { MediaService } from './MediaService';
import { AdminService } from './AdminService';

export class MatrixService {
    private client: sdk.MatrixClient | null = null;

    // Модули — доступны снаружи через matrixService.messages.sendMessage(...)
    readonly messages: MessageService;
    readonly reactions: ReactionService;
    readonly threads: ThreadService;
    readonly pins: PinService;
    readonly rooms: RoomService;
    readonly users: UserService;
    readonly media: MediaService;
    readonly admin: AdminService;

    constructor() {
        const getClient = () => this.requireClient();
        this.messages = new MessageService(getClient);
        this.reactions = new ReactionService(getClient);
        this.threads = new ThreadService(getClient);
        this.pins = new PinService(getClient);
        this.rooms = new RoomService(getClient);
        this.users = new UserService(getClient);
        this.media = new MediaService(getClient);
        this.admin = new AdminService(getClient);
    }

    // Event bus — остаётся здесь, это ядро
    // Auth — login, restoreSession, logout, disconnect
    // Client init — initClient, initCrypto, configureCryptoTrust
    // Event subscriptions — onConnectionChange, onRoomsUpdated, onNewMessage, onTyping
    // Auto-invite — acceptPendingInvites, autoAcceptInvite
    // Всё остальное — делегировано модулям
}
```

### Миграция вызовов

До рефакторинга: `matrixService.sendReaction(roomId, eventId, emoji)`
После: `matrixService.reactions.sendReaction(roomId, eventId, emoji)`

Для плавного перехода — на первом этапе оставить старые методы как proxy:
```typescript
/** @deprecated Используй matrixService.reactions.sendReaction() */
async sendReaction(roomId: string, eventId: string, emoji: string): Promise<string> {
    return this.reactions.sendReaction(roomId, eventId, emoji);
}
```

Удалить deprecated-обёртки отдельным коммитом после обновления всех вызовов.

### Порядок вынесения модулей

Каждый шаг — отдельный коммит, проект собирается и работает:

1. **AdminService** — максимально изолирован, используется только в `AdminPanel.tsx`. Безопасно вынести первым.
2. **MediaService** — mxcToHttp, sendFile, getImageDimensions. Используется в MessageBubble и MessageInput.
3. **PinService** — три метода, используется в MessageBubble и ChatLayout.
4. **ReactionService** — три метода, используется в MessageBubble и useMessages.
5. **ThreadService** — четыре метода + listener, используется в ThreadPanel, useThread, ChatLayout.
6. **UserService** — searchUsers, profiles, typing. Используется в Sidebar, ProfileModal, useUsers.
7. **RoomService** — spaces, DM, invites. Используется в Sidebar, ChatLayout, CreateSpaceModal.
8. **MessageService** — send, reply, loadMore, markAsRead. Используется повсюду — вынести последним.
9. **Удаление deprecated-обёрток** — финальный коммит.


## Проблема 2: chat.css (50 КБ, 2306 строк)

### Текущая ситуация

Все стили приложения в одном файле. Секции:

```
chat.css (2306 строк)
├── SIDEBAR                   строки 7-328     (~320 строк)
├── ROOM HEADER               строки 350-567   (~220 строк)
├── MESSAGE LIST              строки 568-618   (~50 строк)
├── MESSAGE BUBBLE            строки 619-881   (~260 строк)
├── CODE SNIPPET              строки 882-942   (~60 строк)
├── MESSAGE INPUT             строки 943-1136  (~190 строк)
├── IMAGE/FILE MESSAGE        строки 1137-1218 (~80 строк)
├── AVATAR                    строки 1219-1244 (~25 строк)
├── CALL BAR                  строки 1255-1365 (~110 строк)
├── VIDEO GRID                строки 1366-1419 (~55 строк)
├── CALL OVERLAYS             строки 1420-1500 (~80 строк)
├── PROFILE MODAL             строки 1501-1709 (~210 строк)
├── ADMIN PANEL               строки 1730-1996 (~260 строк)
├── TYPING INDICATOR          строки 1997-2025 (~30 строк)
├── ACTION BAR / REACTIONS    строки 2026-2043 (~20 строк)
├── THREAD PANEL              строки 2044-2240 (~200 строк)
├── THREAD INDICATOR          строки 2240-2306 (~65 строк)
```

### Целевая структура

```
web/src/styles/
├── variables.css              — CSS custom properties (уже есть, без изменений)
├── global.css                 — базовые стили (уже есть, без изменений)
├── chat-layout.css            — .chat-layout, .chat-sidebar, .chat-main, responsive
├── sidebar.css                — .sidebar, room-list, spaces, DM-секция
├── room-header.css            — .room-header, кнопки, информация
├── messages.css               — .message-list, .message-bubble, action-bar, reactions
├── message-input.css          — .message-input, reply-preview, command-suggestions
├── media.css                  — image-message, file-message, code-snippet
├── calls.css                  — .call-bar, .video-grid, call overlays
├── profile.css                — .profile-modal
├── admin.css                  — .admin-panel, .admin-btn
├── threads.css                — .thread-panel, .thread-indicator
├── typing.css                 — .typing-indicator
└── login.css                  — (уже отдельный, без изменений)
```

### Подключение

В `main.tsx` — импортировать все CSS:

```typescript
import './styles/variables.css';
import './styles/global.css';
import './styles/chat-layout.css';
import './styles/sidebar.css';
import './styles/room-header.css';
import './styles/messages.css';
import './styles/message-input.css';
import './styles/media.css';
import './styles/calls.css';
import './styles/profile.css';
import './styles/admin.css';
import './styles/threads.css';
import './styles/typing.css';
import './styles/login.css';
```

Vite соберёт всё в один бандл при сборке — никакого penalty для пользователя.

### Порядок разбиения

Каждый шаг — вырезать секцию из chat.css, создать новый файл, добавить import, проверить:

1. **admin.css** — изолирован, модалка AdminPanel.
2. **profile.css** — изолирован, модалка ProfileModal.
3. **calls.css** — call-bar, video-grid, overlays.
4. **threads.css** — thread-panel, thread-indicator.
5. **typing.css** — маленький файл, быстро.
6. **media.css** — image-message, file-message, code-snippet.
7. **sidebar.css** — sidebar, room-list.
8. **room-header.css** — room-header.
9. **message-input.css** — message-input, reply-preview.
10. **messages.css** — message-list, message-bubble, action-bar, reactions.
11. **chat-layout.css** — остатки: .chat-layout, .chat-main, responsive breakpoints.
12. **Удалить chat.css** — финальный коммит.


## Проблема 3: ChatLayout.tsx (13 КБ, 9 useState, 321 строка)

### Решение: кастомный хук useChatState

Вынести state-управление в хук. ChatLayout останется "тонким" рендер-компонентом:

```typescript
// web/src/hooks/useChatState.ts (новый)

export interface ReplyToInfo {
    eventId: string;
    sender: string;
    body: string;
}

export function useChatState() {
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
    const [showProfile, setShowProfile] = useState(false);
    const [showCreateSpace, setShowCreateSpace] = useState(false);
    const [createRoomForSpace, setCreateRoomForSpace] = useState<{ id: string; name: string } | null>(null);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [replyTo, setReplyTo] = useState<ReplyToInfo | null>(null);
    const [scrollToEventId, setScrollToEventId] = useState<string | null>(null);
    const [activeThread, setActiveThread] = useState<{ roomId: string; threadRootId: string } | null>(null);

    useEffect(() => {
        setReplyTo(null);
        setActiveThread(null);
        setScrollToEventId(null);
    }, [activeRoomId]);

    const handleSelectRoom = useCallback((roomId: string) => {
        setActiveRoomId(roomId);
        setMobileView('chat');
        matrixService.messages.markRoomAsRead(roomId).catch(() => {});
    }, []);

    const handleOpenThread = useCallback((threadRootId: string) => {
        if (activeRoomId) {
            setActiveThread({ roomId: activeRoomId, threadRootId });
        }
    }, [activeRoomId]);

    const handleReply = useCallback((msg: { eventId: string; sender: string; body: string }) => {
        setReplyTo({
            eventId: msg.eventId,
            sender: msg.sender,
            body: msg.body.length > 100 ? msg.body.substring(0, 100) + '...' : msg.body,
        });
    }, []);

    return {
        activeRoomId, setActiveRoomId,
        mobileView, setMobileView,
        showProfile, setShowProfile,
        showCreateSpace, setShowCreateSpace,
        createRoomForSpace, setCreateRoomForSpace,
        showAdminPanel, setShowAdminPanel,
        replyTo, setReplyTo,
        scrollToEventId, setScrollToEventId,
        activeThread, setActiveThread,
        handleSelectRoom, handleOpenThread, handleReply,
    };
}
```


## Проблема 4: Крупные компоненты

### ProfileModal.tsx (10.8 КБ) → profile/

```
web/src/components/profile/
├── ProfileModal.tsx          — контейнер, переключает вкладки
├── ProfileView.tsx           — аватар, имя, userId (режим просмотра)
├── ProfileEdit.tsx           — редактирование имени и аватара
└── PasswordChange.tsx        — форма смены пароля
```

### Sidebar.tsx (9.7 КБ) → sidebar/

```
web/src/components/sidebar/
├── Sidebar.tsx               — контейнер
├── SidebarHeader.tsx         — логотип, кнопки (профиль, создать, админ)
├── SpaceList.tsx             — список пространств с раскрытием
├── RoomList.tsx              — каналы внутри space
└── DirectMessageList.tsx     — DM-секция
```

### MessageBubble.tsx (9.7 КБ) → message/

```
web/src/components/message/
├── MessageBubble.tsx         — контейнер, определяет тип
├── MessageHeader.tsx         — аватар, имя, время, бот-бейдж
├── MessageBody.tsx           — текст с markdown, или image, или file
├── ReplyQuote.tsx            — блок цитаты (если reply)
├── ReactionBar.tsx           — чипсы реакций
├── ActionBar.tsx             — hover-кнопки (реакция, ответ, тред, закрепить)
└── ThreadIndicator.tsx       — "💬 3 ответа" под корневым сообщением
```


## Проблема 5: Утилиты

```
web/src/utils/
├── markdown.ts               — (уже есть)
├── formatters.ts             — formatTime, formatDate, formatFileSize, pluralReplies
├── constants.ts              — QUICK_EMOJIS, STORAGE_KEYS, MAX_FILE_SIZE
└── media.ts                  — getImageDimensions, isImageFile, isVideoFile
```


## Общий порядок реализации

Фаза 1: MatrixService (7 коммитов)
1. Вынести AdminService
2. Вынести MediaService
3. Вынести PinService
4. Вынести ReactionService
5. Вынести ThreadService
6. Вынести UserService + RoomService
7. Вынести MessageService, удалить deprecated-обёртки

Фаза 2: CSS (3 коммита)
8. Вынести admin.css, profile.css, calls.css
9. Вынести threads.css, typing.css, media.css, sidebar.css
10. Вынести messages.css, message-input.css, room-header.css, chat-layout.css. Удалить chat.css

Фаза 3: Компоненты (3 коммита)
11. ChatLayout → useChatState хук
12. ProfileModal → profile/ подпапка с подкомпонентами
13. MessageBubble → message/ подпапка, Sidebar → sidebar/ подпапка

Фаза 4: Утилиты (1 коммит)
14. Консолидация utils/ — formatters.ts, constants.ts, media.ts


## Метрики успеха

| Файл | До | После |
|------|------|-------|
| MatrixService.ts | 1083 строки | ~300 строк (ядро) |
| chat.css | 2306 строк | удалён, 12 файлов по 30-260 строк |
| ChatLayout.tsx | 321 строка, 9 useState | ~150 строк, 0 useState (хук) |
| MessageBubble.tsx | 9.7 КБ | ~3 КБ контейнер + подкомпоненты |
| Sidebar.tsx | 9.7 КБ | ~3 КБ контейнер + подкомпоненты |
| ProfileModal.tsx | 10.8 КБ | ~3 КБ контейнер + подкомпоненты |


## Коммиты

```
[refactor] Вынести AdminService из MatrixService
[refactor] Вынести MediaService из MatrixService
[refactor] Вынести PinService, ReactionService из MatrixService
[refactor] Вынести ThreadService, UserService, RoomService из MatrixService
[refactor] Вынести MessageService, удалить deprecated-обёртки
[refactor] Разбить chat.css на модульные файлы (admin, profile, calls, threads)
[refactor] Разбить chat.css — оставшиеся секции, удалить chat.css
[refactor] ChatLayout: вынести state в useChatState хук
[refactor] ProfileModal → profile/ подкомпоненты
[refactor] MessageBubble → message/ подкомпоненты, Sidebar → sidebar/ подкомпоненты
[refactor] Консолидация utils/ (formatters, constants, media)
```
