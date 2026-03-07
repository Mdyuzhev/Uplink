# Задача 045 — Space Switcher + роли в Space

## Цель

Два независимых улучшения, которые реализуются вместе потому что затрагивают одни и те же файлы.

**Часть A — Space Switcher.** Узкая панель (~64px) слева от сайдбара с иконками Space-ов. По клику на иконку сайдбар переключается и показывает только каналы этого Space. Дизайн вдохновлён скриншотом Discord-подобного мессенджера, но без эмоджи — SVG-иконки.

**Часть B — Роли в Space.** Три уровня доступа: глобальный администратор (всё), администратор Space (управление участниками и ботами своего Space), участник (только чтение/запись в каналах). Хранятся через Matrix power levels в самой Space-комнате.

---

## Итоговая раскладка

```
[SpaceSwitcher 64px] [Sidebar 240px] [chat-main flex:1]
```

SpaceSwitcher — фиксированная колонка, не скроллится вместе с сайдбаром.

---

## Файлы для чтения перед работой

- `E:\Uplink\web\src\components\ChatLayout.tsx`
- `E:\Uplink\web\src\components\Sidebar.tsx`
- `E:\Uplink\web\src\components\sidebar\SpaceItem.tsx`
- `E:\Uplink\web\src\matrix\RoomsManager.ts` — типы SpaceInfo, RoomInfo
- `E:\Uplink\web\src\contexts\ChatContext.tsx` — сюда добавляется activeSpaceId
- `E:\Uplink\web\src\styles\sidebar.css`
- `E:\Uplink\web\src\styles\chat.css`
- `E:\Uplink\web\src\styles\variables.css` — CSS custom properties

---

## Часть A: Space Switcher

### A1. Новый компонент `E:\Uplink\web\src\components\SpaceSwitcher.tsx`

Компонент принимает список Space-ов, активный Space, и колбэки.
Рендерит вертикальную колонку с иконками.

```typescript
interface SpaceSwitcherProps {
    spaces: SpaceInfo[];
    activeSpaceId: string | null;
    currentUserId: string;
    isGlobalAdmin: boolean;
    onSelectSpace: (spaceId: string) => void;
    onSelectDMs: () => void;         // специальный режим — только DM
    onCreateSpace: () => void;       // только для globalAdmin
    isDMsActive: boolean;
}
```

**Структура колонки сверху вниз:**

1. Логотип Uplink или иконка "домой" — кликабельна, открывает первый Space или DMs
2. Разделитель (тонкая горизонтальная линия, `rgba(255,255,255,0.06)`)
3. Список иконок Space-ов (скроллится если не помещается)
4. Разделитель
5. Иконка "Личные сообщения" (DM) — всегда
6. Если globalAdmin — иконка "+" (создать Space) внизу

**Иконка одного Space** — компонент `SpaceIcon`:

Аватар генерируется из названия: берём первые буквы каждого слова (до 2х), например "WarehouseHub" → "WH", "РАЗРАБОТКА" → "Р". Фон — детерминированный цвет из палитры по хешу названия (5–6 цветов: синий, зелёный, фиолетовый, оранжевый, розовый).

Активный Space: форма меняется с круга на скруглённый прямоугольник (CSS `border-radius` анимируется), слева появляется вертикальная полоска акцентного цвета (`--uplink-accent`). Это стандартный Discord-паттерн.

```tsx
const SpaceIcon: React.FC<{
    space: SpaceInfo;
    active: boolean;
    hasUnread: boolean;
    onClick: () => void;
}> = ({ space, active, hasUnread, onClick }) => {
    // Аббревиатура из первых букв слов
    const abbr = space.name
        .split(/[\s_-]+/)
        .map(w => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2);

    // Детерминированный цвет по названию
    const colors = ['#5865f2','#3ba55d','#9b59b6','#e67e22','#e91e63'];
    const colorIndex = space.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

    return (
        <div className="space-switcher__item-wrapper">
            {/* Боковая полоска активного Space */}
            <div className={`space-switcher__indicator ${active ? 'space-switcher__indicator--active' : hasUnread ? 'space-switcher__indicator--unread' : ''}`} />

            <div
                className={`space-switcher__icon ${active ? 'space-switcher__icon--active' : ''}`}
                style={{ background: colors[colorIndex] }}
                onClick={onClick}
                title={space.name}
            >
                {abbr}
            </div>
        </div>
    );
};
```

**SVG-иконки** для DM и кнопки создания — не эмоджи, а Lucide React иконки
(уже есть в проекте): `MessageCircle` для DM, `Plus` для создания.
Оборачивать в такой же `div.space-switcher__icon` но с другим фоном
(`rgba(255,255,255,0.06)` в нейтральном состоянии, `--uplink-accent` при активности).

### A2. ChatContext — `activeSpaceId`

В `E:\Uplink\web\src\contexts\ChatContext.tsx` добавить:

```typescript
// Состояние активного Space
const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
const [isDMsMode, setIsDMsMode] = useState(false);

// Инициализация: выбрать первый Space при загрузке
useEffect(() => {
    if (spaces.length > 0 && !activeSpaceId) {
        setActiveSpaceId(spaces[0].id);
        // Запомнить в localStorage для восстановления при перезагрузке
        localStorage.setItem('uplink_last_space', spaces[0].id);
    }
}, [spaces]);

// При выборе Space — автоматически открыть первую комнату
const handleSelectSpace = useCallback((spaceId: string) => {
    setActiveSpaceId(spaceId);
    setIsDMsMode(false);
    localStorage.setItem('uplink_last_space', spaceId);

    const space = spaces.find(s => s.id === spaceId);
    if (space?.rooms[0]) {
        handleSelectRoom(space.rooms[0].id);
    }
}, [spaces, handleSelectRoom]);
```

Добавить `activeSpaceId`, `isDMsMode`, `handleSelectSpace`, `setIsDMsMode` в контекст.

### A3. `ChatLayout.tsx` — добавить SpaceSwitcher

```tsx
<div className="chat-layout">
    {/* Новая колонка — Space Switcher */}
    <SpaceSwitcher
        spaces={chat.spaces}
        activeSpaceId={chat.activeSpaceId}
        isGlobalAdmin={chat.isAdmin}
        currentUserId={matrixService.getUserId()}
        onSelectSpace={chat.handleSelectSpace}
        onSelectDMs={() => chat.setIsDMsMode(true)}
        onCreateSpace={() => chat.setShowCreateSpace(true)}
        isDMsActive={chat.isDMsMode}
    />

    {/* Существующий сайдбар */}
    <div className={`chat-sidebar ...`}>
        <Sidebar
            // ... + новые пропсы:
            activeSpaceId={chat.activeSpaceId}
            isDMsMode={chat.isDMsMode}
        />
    </div>

    {/* chat-main без изменений */}
</div>
```

### A4. `Sidebar.tsx` — фильтрация по activeSpaceId

Добавить пропсы `activeSpaceId: string | null` и `isDMsMode: boolean`.

Логика отображения:

```typescript
// Показываем Space-раздел только активного Space
const activeSpace = spaces.find(s => s.id === activeSpaceId);

// В режиме DM — только directs и users
if (isDMsMode) {
    // показать только DM и Users, скрыть Spaces и каналы
}
```

Заголовок сайдбара меняется: вместо «Uplink» показывать название активного Space
(`activeSpace?.name || 'Uplink'`). Это как в Discord — вверху написано «RTK IT»
когда ты в этом сервере.

### A5. Стили `E:\Uplink\web\src\styles\sidebar.css` — добавить в конец

```css
/* ═══════════════════════════════════
   SPACE SWITCHER
   ═══════════════════════════════════ */
.space-switcher {
    width: 64px;
    min-width: 64px;
    background: var(--uplink-bg-quaternary, #1a1b1e);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    gap: 4px;
    overflow-y: auto;
    overflow-x: hidden;
}

/* Скроллбар скрыт, но работает */
.space-switcher::-webkit-scrollbar { display: none; }

.space-switcher__logo {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: var(--uplink-accent);
    color: #fff;
    font-size: 18px;
    font-weight: 800;
    cursor: pointer;
    transition: border-radius 0.2s;
    flex-shrink: 0;
    margin-bottom: 4px;
}

.space-switcher__logo:hover {
    border-radius: 12px;
}

.space-switcher__divider {
    width: 32px;
    height: 2px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 1px;
    margin: 4px 0;
    flex-shrink: 0;
}

.space-switcher__list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 100%;
}

/* Обёртка с боковым индикатором */
.space-switcher__item-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    justify-content: center;
}

.space-switcher__indicator {
    position: absolute;
    left: 0;
    width: 4px;
    border-radius: 0 4px 4px 0;
    background: transparent;
    transition: height 0.2s, background 0.2s;
    height: 0;
}

.space-switcher__indicator--unread {
    background: var(--uplink-text-primary);
    height: 8px;
}

.space-switcher__indicator--active {
    background: var(--uplink-text-primary);
    height: 40px;
}

/* Иконка Space */
.space-switcher__icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;       /* Круг в нейтральном состоянии */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    user-select: none;
    transition: border-radius 0.2s, transform 0.1s, filter 0.15s;
    flex-shrink: 0;
    letter-spacing: -0.5px;
}

.space-switcher__icon:hover {
    border-radius: 16px;      /* Квадрат при hover */
    filter: brightness(1.1);
}

/* Активный Space — уже квадратный */
.space-switcher__icon--active {
    border-radius: 16px;
}

/* Иконки-действия (DM, создать) */
.space-switcher__action {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.06);
    color: var(--uplink-text-muted);
    cursor: pointer;
    transition: border-radius 0.2s, background 0.2s, color 0.2s;
    flex-shrink: 0;
    border: none;
}

.space-switcher__action:hover,
.space-switcher__action--active {
    border-radius: 16px;
    background: var(--uplink-accent);
    color: #fff;
}

/* Кнопка "+" — зелёный */
.space-switcher__action--create:hover {
    background: #3ba55d;
    color: #fff;
}

.space-switcher__spacer {
    flex: 1;
}
```

---

## Часть B: Роли в Space

### B1. Концепция хранения

Matrix Space-комната уже имеет встроенную систему power levels через стандартное
state event `m.room.power_levels`. Значения:

```
100 = global admin (Synapse admin)
75  = space admin (может управлять участниками и ботами Space)
0   = member (обычный участник)
```

Функции для работы с ролями добавить в `MatrixService` или новый `SpaceService.ts`.

### B2. Новый `E:\Uplink\web\src\matrix\SpaceService.ts`

```typescript
export type SpaceRole = 'global_admin' | 'space_admin' | 'member';

export interface SpaceMember {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    role: SpaceRole;
    powerLevel: number;
}

export class SpaceService {
    constructor(private client: sdk.MatrixClient) {}

    /**
     * Получить роль текущего пользователя в Space.
     */
    getMyRoleInSpace(spaceId: string): SpaceRole {
        const userId = this.client.getUserId()!;
        const room = this.client.getRoom(spaceId);
        if (!room) return 'member';

        const plEvent = room.currentState.getStateEvents('m.room.power_levels', '');
        const users: Record<string, number> = plEvent?.getContent()?.users || {};
        const level = users[userId] ?? 0;

        // Synapse admin → считаем global_admin
        if (level >= 100) return 'global_admin';
        if (level >= 75) return 'space_admin';
        return 'member';
    }

    /**
     * Получить всех участников Space с их ролями.
     */
    getSpaceMembers(spaceId: string): SpaceMember[] {
        const room = this.client.getRoom(spaceId);
        if (!room) return [];

        const plEvent = room.currentState.getStateEvents('m.room.power_levels', '');
        const users: Record<string, number> = plEvent?.getContent()?.users || {};

        return room.getJoinedMembers().map(member => {
            const level = users[member.userId] ?? 0;
            let role: SpaceRole = 'member';
            if (level >= 100) role = 'global_admin';
            else if (level >= 75) role = 'space_admin';

            return {
                userId: member.userId,
                displayName: member.name || member.userId,
                avatarUrl: member.getAvatarUrl(this.client.baseUrl, 32, 32, 'crop', false) || undefined,
                role,
                powerLevel: level,
            };
        });
    }

    /**
     * Назначить роль участнику (только space_admin или global_admin может).
     */
    async setMemberRole(spaceId: string, targetUserId: string, role: 'space_admin' | 'member'): Promise<void> {
        const powerLevel = role === 'space_admin' ? 75 : 0;
        const room = this.client.getRoom(spaceId);
        if (!room) throw new Error('Space не найден');

        const plEvent = room.currentState.getStateEvents('m.room.power_levels', '');
        const content = { ...(plEvent?.getContent() || {}) };
        content.users = { ...(content.users || {}) };
        content.users[targetUserId] = powerLevel;

        await this.client.sendStateEvent(spaceId, 'm.room.power_levels', content, '');
    }

    /**
     * Пригласить участника в Space и все его дочерние комнаты.
     */
    async inviteMemberToSpace(spaceId: string, userId: string): Promise<void> {
        // Пригласить в сам Space
        await this.client.invite(spaceId, userId);

        // Пригласить в каждую дочернюю комнату
        const room = this.client.getRoom(spaceId);
        if (!room) return;

        const childEvents = room.currentState.getStateEvents('m.space.child');
        for (const ev of childEvents) {
            if (Object.keys(ev.getContent()).length === 0) continue;
            const childRoomId = ev.getStateKey();
            if (!childRoomId) continue;
            try {
                await this.client.invite(childRoomId, userId);
            } catch {
                // Пользователь уже в комнате или нет доступа — игнорируем
            }
        }
    }

    /**
     * Исключить участника из Space и всех его комнат.
     */
    async kickMemberFromSpace(spaceId: string, userId: string): Promise<void> {
        const room = this.client.getRoom(spaceId);
        if (!room) return;

        const childEvents = room.currentState.getStateEvents('m.space.child');
        for (const ev of childEvents) {
            if (Object.keys(ev.getContent()).length === 0) continue;
            const childRoomId = ev.getStateKey();
            if (!childRoomId) continue;
            try {
                await this.client.kick(childRoomId, userId);
            } catch { /* ignore */ }
        }

        await this.client.kick(spaceId, userId);
    }
}
```

### B3. Расширить `RoomsManager.ts` — добавить `myRole` в SpaceInfo

```typescript
export interface SpaceInfo {
    id: string;
    name: string;
    topic?: string;
    rooms: RoomInfo[];
    myRole: SpaceRole;   // <- новое поле
}
```

В `getGroupedRooms` для каждого Space вычислять `myRole` через `SpaceService.getMyRoleInSpace(spaceId)`.

### B4. `RoomSettingsModal` — добавить вкладку «Участники»

Прочитать `E:\Uplink\web\src\components\sidebar\RoomSettingsModal.tsx` перед правкой.

Если `isSpace === true` — добавить вкладку **«Участники»** (рядом с «Информация» и «Боты»).

Вкладка «Участники» показывает:
- Список участников Space с ролевыми бейджами («Администратор», «Участник»)
- Если текущий пользователь — `space_admin` или `global_admin`:
  - Кнопка «Пригласить» (input для userId + кнопка send)
  - У каждого участника: кнопка повышения/понижения роли, кнопка исключения
  - Себя исключать нельзя, понизить global_admin нельзя

Ролевые бейджи CSS:

```css
.space-member__badge--global-admin { background: rgba(240,71,71,0.15); color: #f04747; }
.space-member__badge--space-admin  { background: rgba(88,101,242,0.15); color: #5865f2; }
.space-member__badge--member       { background: rgba(255,255,255,0.06); color: var(--uplink-text-faint); }
```

### B5. Фильтрация ботов по Space

В `BotSettings.tsx` — если текущий пользователь только `member` (не `space_admin` и не `global_admin`):
- Скрыть переключатели ботов (показывать только чтение — включён/выключен)
- Скрыть вкладку «Мои боты» (создание кастомных ботов)

Для этого добавить проп `spaceRole: SpaceRole` в `BotSettings` и пробрасывать через `ChatLayout`.

В `SpaceItem.tsx` — кнопку шестерёнки настроек показывать только если `space.myRole !== 'member'`.

---

## Порядок реализации

Реализовывать строго в таком порядке — каждый шаг рабочий сам по себе:

1. `SpaceService.ts` — новый сервис, ничего не ломает
2. Расширить `SpaceInfo` типом `myRole` — мелкая правка типов
3. `SpaceSwitcher.tsx` + стили — новый компонент, пока не подключён
4. `ChatContext` — добавить `activeSpaceId`, `handleSelectSpace`, `isDMsMode`
5. `ChatLayout` — подключить SpaceSwitcher, обновить Sidebar пропсы
6. `Sidebar.tsx` — фильтрация по `activeSpaceId`
7. `RoomSettingsModal` — вкладка «Участники»
8. `BotSettings` — скрытие для `member`

---

## Часть C: Раздел «Треды»

### Концепция

Треды сейчас открываются только изнутри комнаты — нужно кликнуть на сводку треда в конкретном сообщении. Нет единого места где пользователь видит *все* свои активные треды. Добавляем специальный режим сайдбара «Треды» — аналог вкладки «Threads» в Slack.

Пользователь видит список всех тредов во всех комнатах где он участвует, отсортированных по времени последнего ответа. Клик на тред — переходит в комнату и открывает `ThreadPanel` для этого треда.

### C1. Новый сервис `E:\Uplink\web\src\matrix\ThreadIndexService.ts`

Oтвечает за сбор всех тредов пользователя по всем комнатам. `ThreadService` уже умеет работать с одним тредом в одной комнате — нужен агрегатор поверх него.

```typescript
export interface ThreadPreview {
    threadRootId: string;       // eventId корневого сообщения
    roomId: string;
    roomName: string;
    rootBody: string;           // текст корневого сообщения (до 120 символов)
    rootSender: string;
    lastReplyBody: string;
    lastReplySender: string;
    lastReplyTs: number;
    replyCount: number;
    participated: boolean;       // текущий пользователь отвечал в треде
    hasUnread: boolean;          // есть непрочитанные ответы
}

export class ThreadIndexService {
    constructor(
        private getClient: () => sdk.MatrixClient,
        private getDisplayName: (userId: string) => string,
    ) {}

    /**
     * Собрать все треды пользователя из всех joined-комнат.
     * Возвращает только треды где пользователь участвовал (отправил хотя бы один ответ)
     * или является автором корневого сообщения.
     * Сортировка: по lastReplyTs DESC.
     */
    getAllMyThreads(): ThreadPreview[] {
        const client = this.getClient();
        const myUserId = client.getUserId()!;
        const result: ThreadPreview[] = [];

        for (const room of client.getRooms()) {
            if (room.getMyMembership() !== 'join') continue;

            for (const thread of room.getThreads()) {
                const rootEvent = thread.rootEvent;
                if (!rootEvent) continue;

                // Проверяем участие: автор корня или отвечал
                const iAmRoot = rootEvent.getSender() === myUserId;
                const iReplied = thread.events.some(e => e.getSender() === myUserId);
                if (!iAmRoot && !iReplied) continue;

                const lastEvent = thread.replyToEvent;
                const lastTs = lastEvent?.getTs() ?? rootEvent.getTs();

                result.push({
                    threadRootId: thread.id,
                    roomId: room.roomId,
                    roomName: room.name || 'Без названия',
                    rootBody: (rootEvent.getContent()?.body || '').slice(0, 120),
                    rootSender: this.getDisplayName(rootEvent.getSender()!),
                    lastReplyBody: (lastEvent?.getContent()?.body || '').slice(0, 80),
                    lastReplySender: lastEvent ? this.getDisplayName(lastEvent.getSender()!) : '',
                    lastReplyTs: lastTs,
                    replyCount: thread.length,
                    participated: iReplied,
                    hasUnread: false, // TODO: сравнить с read receipt треда
                });
            }
        }

        return result.sort((a, b) => b.lastReplyTs - a.lastReplyTs);
    }
}
```

Добавить `ThreadIndexService` в `MatrixService.ts` как `this.threadIndex`.

### C2. Новый хук `E:\Uplink\web\src\hooks\useAllThreads.ts`

```typescript
export function useAllThreads() {
    const [threads, setThreads] = useState<ThreadPreview[]>([]);

    const refresh = useCallback(() => {
        setThreads(matrixService.threadIndex.getAllMyThreads());
    }, []);

    useEffect(() => {
        refresh();
        // Обновлять при любом обновлении треда или новом сообщении
        const u1 = matrixService.onThreadUpdate(() => refresh());
        const u2 = matrixService.onNewMessage(() => refresh());
        return () => { u1(); u2(); };
    }, [refresh]);

    return { threads, refresh };
}
```

### C3. Новый компонент `E:\Uplink\web\src\components\ThreadsPanel.tsx`

Отдельный компонент — список всех тредов пользователя. Не путать с `ThreadPanel.tsx` — тот показывает *содержимое* одного треда. Этот показывает *список* тредов для навигации.

```typescript
interface ThreadsPanelProps {
    onOpenThread: (roomId: string, threadRootId: string) => void;
}
```

Структура одного элемента списка:

```
[иконка комнаты #] [название комнаты]          [время последнего ответа]
[rootSender]: текст корневого сообщения...
[аватар] lastReplySender: текст последнего ответа...  [N ответов]
```

Активный тред (тот что открыт в `ThreadPanel`) — выделяется фоном. Тред с непрочитанными — жирный заголовок и цветная точка.

### C4. Добавить `threadIndex` в `MatrixService` + экспортировать

Прочитать `E:\Uplink\web\src\matrix\MatrixService.ts` перед правкой. В конструкторе добавить:

```typescript
this.threadIndex = new ThreadIndexService(getClient, (userId) => this.users.getDisplayName(userId));
```

### C5. Подключить в `SpaceSwitcher` — иконка «Треды»

Между иконками Spaces и иконкой DM добавить иконку тредов. Использовать `MessageSquare` из Lucide. При клике — `onSelectThreads()`. Если есть непрочитанные треды — маленькая красная точка поверх иконки (как notification badge).

### C6. `ChatLayout` — новый режим `threadsMode`

В `useChatState` добавить `isThreadsMode: boolean` и `setThreadsMode`.

Когда `isThreadsMode === true` — вместо `Sidebar` показывать `ThreadsPanel`. `ThreadPanel` при этом открывается в правой панели как обычно, но при выборе треда из списка автоматически переключает активную комнату через `handleSelectRoom` и открывает `ThreadPanel`.

```typescript
// В ChatLayout, вместо обычного сайдбара:
{chat.isThreadsMode ? (
    <ThreadsPanel
        onOpenThread={(roomId, threadRootId) => {
            chat.handleSelectRoom(roomId);
            chat.setActiveThread({ roomId, threadRootId });
            chat.setIsThreadsMode(false); // вернуться к обычному сайдбару после выбора
        }}
    />
) : (
    <Sidebar ... />
)}
```

### C7. Стили — добавить в `E:\Uplink\web\src\styles\thread.css`

```css
/* ═══════════════════════════════════
   THREADS PANEL (список всех тредов)
   ═══════════════════════════════════ */
.threads-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.threads-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 16px;
    font-weight: 700;
    color: var(--uplink-text-primary);
    flex-shrink: 0;
}

.threads-panel__list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
}

.threads-panel__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--uplink-text-faint);
    font-size: 14px;
    flex-direction: column;
    gap: 8px;
}

.threads-panel__item {
    padding: 10px 16px;
    cursor: pointer;
    border-radius: var(--uplink-radius-sm);
    margin: 1px 8px;
    transition: background 0.1s;
    border-left: 3px solid transparent;
}

.threads-panel__item:hover {
    background: rgba(255, 255, 255, 0.04);
}

.threads-panel__item--active {
    background: rgba(255, 255, 255, 0.07);
    border-left-color: var(--uplink-accent);
}

.threads-panel__item--unread .threads-panel__root-text {
    font-weight: 600;
    color: var(--uplink-text-primary);
}

.threads-panel__room {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--uplink-text-faint);
    margin-bottom: 4px;
}

.threads-panel__root-text {
    font-size: 13px;
    color: var(--uplink-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
}

.threads-panel__last-reply {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--uplink-text-faint);
}

.threads-panel__reply-text {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.threads-panel__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 2px;
    font-size: 11px;
    color: var(--uplink-text-faint);
}

.threads-panel__count {
    background: rgba(255,255,255,0.08);
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 600;
}
```

### C8. Порядок реализации Части C

Реализовывать после Части A (SpaceSwitcher уже должен быть готов — иконка тредов встраивается в него). Шаги: `ThreadIndexService.ts` → добавить в `MatrixService` → хук `useAllThreads` → компонент `ThreadsPanel` → подключить в `SpaceSwitcher` иконку → режим `isThreadsMode` в `useChatState` → обновить `ChatLayout`.

---

## Обновлённый порядок реализации всей задачи

К предыдущему порядку добавляются шаги C:

1. `SpaceService.ts` — новый сервис, ничего не ломает
2. Расширить `SpaceInfo` типом `myRole`
3. `ThreadIndexService.ts` — новый сервис агрегации тредов
4. `SpaceSwitcher.tsx` + стили
5. `ChatContext / useChatState` — `activeSpaceId`, `isDMsMode`, `isThreadsMode`
6. `ChatLayout` — подключить SpaceSwitcher, режимы sidebar
7. `Sidebar.tsx` — фильтрация по `activeSpaceId`
8. `ThreadsPanel.tsx` + стили
9. `RoomSettingsModal` — вкладка «Участники»
10. `BotSettings` — скрытие для `member`

---

## Проверка

**Space Switcher:** Переключение между РАЗРАБОТКА и WAREHOUSE — сайдбар мгновенно показывает только каналы выбранного Space, заголовок сайдбара меняется на название Space, активная иконка становится квадратной с боковой полоской. — сайдбар мгновенно показывает только каналы выбранного Space, заголовок сайдбара меняется на название Space, активная иконка становится квадратной с боковой полоской.

**Роли:** Войти как обычный пользователь (не admin) — шестерёнка настроек Space не видна. Войти как space_admin — шестерёнка видна, вкладка «Участники» показывает список с кнопками управления, но кнопка «Понизить» заблокирована для global_admin.

**Автовыбор:** При перезагрузке страницы — восстанавливается последний выбранный Space из localStorage.
