# 020 — Каналы и комнаты: админ-панель управления

## Цель

Добавить иерархическую структуру: **Канал** (Matrix Space) → **Комнаты** (Rooms внутри Space). Админ (@Misha:uplink.local) может создавать каналы и комнаты в них. Обычные пользователи видят структуру, но не могут создавать.

## Терминология

- **Канал** = Matrix Space (комната с `creation_content.type: "m.space"`). Группирующий контейнер, в нём не пишут сообщения напрямую.
- **Комната** = обычная Matrix Room, привязанная к каналу через state event `m.space.child` в Space и `m.space.parent` в Room.
- **Админ** = серверный администратор Synapse (поле `admin: true` в Synapse Admin API).

## Предварительные условия

Перед написанием кода — сделать @Misha:uplink.local серверным админом Synapse. Это одноразовое действие через Synapse Admin panel (http://localhost:8080) или через прямой запрос к API:

```bash
# Вариант 1: через Synapse Admin panel (порт 8080)
# Залогиниться как @Misha:uplink.local → Users → найти @Misha → поставить галку Server Admin

# Вариант 2: через curl с registration_shared_secret
# Сначала получить nonce:
curl -s http://localhost:8008/_synapse/admin/v1/register | jq .nonce

# Вариант 3: напрямую в PostgreSQL (docker exec)
docker exec -it uplink-postgres-1 psql -U synapse -d synapse -c \
  "UPDATE users SET admin = 1 WHERE name = '@Misha:uplink.local';"
```

После этого проверить:
```bash
# Должен вернуть admin: true
curl -H "Authorization: Bearer <access_token>" \
  http://localhost:8008/_synapse/admin/v1/users/@Misha:uplink.local
```

**Важно:** инструкцию по назначению админа включить в итоговый README или в файл задачи done/, чтобы было задокументировано.


## Шаг 1. MatrixService — методы админа и создания каналов/комнат

Файл: `web/src/matrix/MatrixService.ts`

Добавить следующие методы в класс MatrixService (перед секцией `changePassword`):

### 1.1. Проверка админа

```typescript
/** Проверить, является ли текущий пользователь серверным админом Synapse */
async checkIsAdmin(): Promise<boolean> {
    if (!this.client) return false;
    try {
        const userId = this.client.getUserId()!;
        const resp = await this.client.http.authedRequest(
            sdk.Method.Get,
            `/_synapse/admin/v1/users/${encodeURIComponent(userId)}`,
            undefined, undefined, { prefix: '' }
        );
        return (resp as any)?.admin === true;
    } catch {
        // 403 = не админ, любая другая ошибка = считаем не админ
        return false;
    }
}
```

### 1.2. Создание канала (Space)

```typescript
/**
 * Создать канал (Matrix Space).
 * Space — это комната с типом m.space, в которую вложены обычные комнаты.
 * Все пользователи сервера автоматически приглашаются.
 */
async createSpace(name: string, topic?: string): Promise<string> {
    if (!this.client) throw new Error('Клиент не инициализирован');

    const response = await this.client.createRoom({
        name,
        topic,
        visibility: sdk.Visibility.Private,
        preset: sdk.Preset.PublicChat,  // чтобы все могли зайти
        creation_content: { type: 'm.space' },
        initial_state: [
            {
                type: 'm.room.join_rules',
                state_key: '',
                content: { join_rule: 'public' },  // все на сервере могут вступить
            },
        ],
        power_level_content_override: {
            // Только админ (power level 100) может добавлять дочерние комнаты
            events: { 'm.space.child': 100 },
        },
    } as any);

    // Пригласить всех пользователей сервера
    await this.inviteAllUsersToRoom(response.room_id);

    this.emitRoomsUpdated();
    return response.room_id;
}
```

### 1.3. Создание комнаты в канале

```typescript
/**
 * Создать комнату внутри канала (Space).
 * 1. Создаёт обычную комнату с E2E шифрованием
 * 2. Привязывает к Space через m.space.child (в Space) и m.space.parent (в Room)
 * 3. Приглашает всех пользователей сервера
 */
async createRoomInSpace(spaceId: string, name: string, topic?: string): Promise<string> {
    if (!this.client) throw new Error('Клиент не инициализирован');

    // Создать комнату
    const response = await this.client.createRoom({
        name,
        topic,
        visibility: sdk.Visibility.Private,
        preset: sdk.Preset.PublicChat,
        initial_state: [
            {
                type: 'm.room.encryption',
                state_key: '',
                content: { algorithm: 'm.megolm.v1.aes-sha2' },
            },
            {
                type: 'm.room.join_rules',
                state_key: '',
                content: { join_rule: 'public' },
            },
            // Указать родительский Space
            {
                type: 'm.space.parent',
                state_key: spaceId,
                content: { via: [this.getServerDomain()], canonical: true },
            },
        ],
    } as any);

    const roomId = response.room_id;

    // Привязать комнату к Space через m.space.child
    await this.client.sendStateEvent(spaceId, 'm.space.child' as any, {
        via: [this.getServerDomain()],
    }, roomId);

    // Пригласить всех пользователей сервера
    await this.inviteAllUsersToRoom(roomId);

    this.emitRoomsUpdated();
    return roomId;
}
```

### 1.4. Приглашение всех пользователей (вспомогательный)

```typescript
/**
 * Пригласить всех пользователей сервера в комнату.
 * Используем user directory search по домену сервера.
 */
private async inviteAllUsersToRoom(roomId: string): Promise<void> {
    if (!this.client) return;
    try {
        const users = await this.searchUsers('');
        const myUserId = this.client.getUserId();
        for (const user of users) {
            if (user.userId === myUserId) continue;
            try {
                await this.client.invite(roomId, user.userId);
            } catch {
                // Пользователь уже в комнате или другая ошибка — пропускаем
            }
        }
    } catch (err) {
        console.warn('Не удалось пригласить пользователей:', (err as Error).message);
    }
}
```

### 1.5. Получение дочерних комнат Space

```typescript
/**
 * Получить список ID дочерних комнат Space.
 * Читает state events m.space.child из Space.
 */
getSpaceChildren(spaceId: string): string[] {
    if (!this.client) return [];
    const room = this.client.getRoom(spaceId);
    if (!room) return [];

    const childEvents = room.currentState.getStateEvents('m.space.child');
    return childEvents
        .filter(e => Object.keys(e.getContent()).length > 0) // пустой content = удалённая связь
        .map(e => e.getStateKey()!)
        .filter(Boolean);
}

/**
 * Проверить, является ли комната Space.
 */
isSpace(roomId: string): boolean {
    if (!this.client) return false;
    const room = this.client.getRoom(roomId);
    if (!room) return false;
    const createEvent = room.currentState.getStateEvents('m.room.create', '');
    return createEvent?.getContent()?.type === 'm.space';
}
```


## Шаг 2. RoomsManager — парсинг иерархии Spaces

Файл: `web/src/matrix/RoomsManager.ts`

### 2.1. Новый интерфейс SpaceInfo

Добавить рядом с RoomInfo:

```typescript
export interface SpaceInfo {
    id: string;
    name: string;
    topic?: string;
    rooms: RoomInfo[];   // дочерние комнаты
    collapsed?: boolean; // для UI, сворачивание
}
```

### 2.2. Обновить getGroupedRooms

Возвращаемый тип должен измениться:

```typescript
export function getGroupedRooms(client: sdk.MatrixClient): {
    spaces: SpaceInfo[];       // каналы с вложенными комнатами
    channels: RoomInfo[];      // комнаты без канала (legacy, обратная совместимость)
    directs: RoomInfo[];       // личные сообщения
}
```

Логика парсинга:
1. Собрать все joined-комнаты.
2. Отделить DM (через m.direct).
3. Среди оставшихся найти Spaces (creation_content.type === 'm.space').
4. Для каждого Space — найти дочерние комнаты через m.space.child state events.
5. Комнаты, не привязанные ни к одному Space и не являющиеся DM — попадают в `channels` (обратная совместимость).
6. Spaces сортировать по имени, комнаты внутри Space — тоже по имени.

**Важно:** при подсчёте `unreadCount` для Space — не считать непрочитанные в самом Space (там нет сообщений), но можно суммировать из дочерних комнат, если нужно для бейджа на канале.

Пример обновлённой функции:

```typescript
export function getGroupedRooms(client: sdk.MatrixClient): {
    spaces: SpaceInfo[];
    channels: RoomInfo[];
    directs: RoomInfo[];
} {
    const rooms = client.getRooms().filter(r => r.getMyMembership() === 'join');
    const directMap = client.getAccountData('m.direct')?.getContent() || {};
    const directIds = new Set<string>();
    for (const userId of Object.keys(directMap)) {
        for (const roomId of directMap[userId]) {
            directIds.add(roomId);
        }
    }

    const spaces: SpaceInfo[] = [];
    const channels: RoomInfo[] = [];
    const directs: RoomInfo[] = [];
    const childRoomIds = new Set<string>();  // комнаты, принадлежащие Space

    // Первый проход: найти Spaces и их дочерние комнаты
    for (const room of rooms) {
        const createEvent = room.currentState.getStateEvents('m.room.create', '');
        if (createEvent?.getContent()?.type === 'm.space') {
            const childEvents = room.currentState.getStateEvents('m.space.child');
            const childIds = childEvents
                .filter(e => Object.keys(e.getContent()).length > 0)
                .map(e => e.getStateKey()!)
                .filter(Boolean);

            childIds.forEach(id => childRoomIds.add(id));

            spaces.push({
                id: room.roomId,
                name: room.name || 'Без названия',
                topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
                rooms: [],  // заполним во втором проходе
            });
        }
    }

    // Второй проход: распределить комнаты
    for (const room of rooms) {
        if (directIds.has(room.roomId)) {
            directs.push(buildRoomInfo(client, room, 'direct'));
            continue;
        }

        // Пропускаем сами Spaces — они уже в spaces[]
        const createEvent = room.currentState.getStateEvents('m.room.create', '');
        if (createEvent?.getContent()?.type === 'm.space') continue;

        const info = buildRoomInfo(client, room, 'channel');

        // Найти, к какому Space принадлежит эта комната
        let assigned = false;
        if (childRoomIds.has(room.roomId)) {
            for (const space of spaces) {
                // Проверяем через m.space.child в Space
                const spaceRoom = client.getRoom(space.id);
                if (!spaceRoom) continue;
                const childEvent = spaceRoom.currentState.getStateEvents('m.space.child', room.roomId);
                if (childEvent && Object.keys(childEvent.getContent()).length > 0) {
                    space.rooms.push(info);
                    assigned = true;
                    break;
                }
            }
        }

        if (!assigned) {
            channels.push(info);
        }
    }

    // Сортировка
    spaces.sort((a, b) => a.name.localeCompare(b.name));
    spaces.forEach(s => s.rooms.sort((a, b) => a.name.localeCompare(b.name)));
    channels.sort((a, b) => a.name.localeCompare(b.name));
    directs.sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));

    return { spaces, channels, directs };
}
```

Вынести создание RoomInfo в отдельную функцию `buildRoomInfo(client, room, type)` чтобы не дублировать код.


## Шаг 3. useRooms — обновить хук

Файл: `web/src/hooks/useRooms.ts`

Добавить `spaces` и `isAdmin` в возвращаемые данные:

```typescript
export function useRooms() {
    const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
    const [channels, setChannels] = useState<RoomInfo[]>([]);
    const [directs, setDirects] = useState<RoomInfo[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const refresh = useCallback(() => {
        if (!matrixService.isConnected) return;
        try {
            const client = matrixService.getClient();
            const grouped = getGroupedRooms(client);
            setSpaces(grouped.spaces);
            setChannels(grouped.channels);
            setDirects(grouped.directs);
        } catch { /* ignore */ }
    }, []);

    // Проверка админа — один раз при подключении
    useEffect(() => {
        if (matrixService.isConnected) {
            matrixService.checkIsAdmin().then(setIsAdmin);
        }
    }, []);

    useEffect(() => {
        const unsub1 = matrixService.onRoomsUpdated(refresh);
        const unsub2 = matrixService.onNewMessage(() => refresh());
        refresh();
        return () => { unsub1(); unsub2(); };
    }, [refresh]);

    return { spaces, channels, directs, isAdmin, refresh };
}
```

Не забыть импортировать SpaceInfo.


## Шаг 4. Sidebar — иерархическое отображение

Файл: `web/src/components/Sidebar.tsx`

### 4.1. Обновить пропсы

```typescript
interface SidebarProps {
    spaces: SpaceInfo[];       // NEW: каналы (Spaces) с вложенными комнатами
    channels: RoomInfo[];      // legacy: комнаты без канала
    directs: RoomInfo[];
    users: UserInfo[];
    usersLoading: boolean;
    activeRoomId: string | null;
    userName: string;
    isAdmin: boolean;          // NEW: показывать кнопки создания
    onSelectRoom: (roomId: string) => void;
    onOpenDM: (userId: string) => void;
    onProfileClick: () => void;
    onLogout: () => void;
    onCreateSpace: () => void;         // NEW
    onCreateRoom: (spaceId: string) => void;  // NEW
}
```

### 4.2. Структура отображения

Порядок секций в sidebar:

1. **Каналы** (Spaces) — заголовок "Каналы" с кнопкой "+" (только для админа). Каждый канал — сворачиваемая секция с дочерними комнатами. Рядом с названием канала — кнопка "+" для создания комнаты (только для админа).

2. **Комнаты** (legacy channels) — если есть комнаты не привязанные к каналам, показываем их отдельной секцией "Другие комнаты".

3. **Личные сообщения** — как сейчас.

4. **Пользователи** — как сейчас.

### 4.3. Компонент SpaceItem

Внутри Sidebar.tsx создать компонент для отображения канала:

```tsx
const SpaceItem: React.FC<{
    space: SpaceInfo;
    activeRoomId: string | null;
    isAdmin: boolean;
    onSelectRoom: (roomId: string) => void;
    onCreateRoom: (spaceId: string) => void;
}> = ({ space, activeRoomId, isAdmin, onSelectRoom, onCreateRoom }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="sidebar-space">
            <div className="sidebar-space__header" onClick={() => setCollapsed(!collapsed)}>
                <span className={`sidebar-space__arrow ${collapsed ? 'sidebar-space__arrow--collapsed' : ''}`}>
                    ▾
                </span>
                <span className="sidebar-space__name">{space.name}</span>
                {isAdmin && (
                    <button
                        className="sidebar-space__add-btn"
                        onClick={(e) => { e.stopPropagation(); onCreateRoom(space.id); }}
                        title="Создать комнату"
                    >
                        +
                    </button>
                )}
            </div>
            {!collapsed && space.rooms.map(room => (
                <RoomItem
                    key={room.id}
                    room={room}
                    active={room.id === activeRoomId}
                    onClick={() => onSelectRoom(room.id)}
                    indent={true}
                />
            ))}
            {!collapsed && space.rooms.length === 0 && (
                <div className="sidebar-space__empty">Нет комнат</div>
            )}
        </div>
    );
};
```

### 4.4. RoomItem — добавить indent

Обновить RoomItem: добавить опциональный проп `indent` для отступа комнат внутри канала.

```tsx
const RoomItem: React.FC<{
    room: RoomInfo;
    active: boolean;
    onClick: () => void;
    indent?: boolean;
}> = ({ room, active, onClick, indent }) => {
    return (
        <div
            className={`sidebar-room-item ${active ? 'sidebar-room-item--active' : ''} ${indent ? 'sidebar-room-item--indent' : ''}`}
            onClick={onClick}
        >
            <span className="sidebar-room-item__icon">#</span>
            <span className="sidebar-room-item__name">{room.name}</span>
            {room.unreadCount > 0 && (
                <span className="sidebar-room-item__badge">{room.unreadCount}</span>
            )}
        </div>
    );
};
```


## Шаг 5. Модалки создания

### 5.1. CreateSpaceModal.tsx

Файл: `web/src/components/CreateSpaceModal.tsx`

Модалка создания канала. Поля: название (обязательное), описание (опциональное). Кнопка "Создать". Вызывает `matrixService.createSpace(name, topic)`.

UI — по аналогии с ProfileModal: затемнённый overlay, карточка по центру, поля ввода через CSS-классы `.profile-modal__input`, кнопка `.profile-modal__btn--primary`. Переиспользовать существующие классы модалок, не создавать новые без нужды.

```tsx
import React, { useState } from 'react';
import { matrixService } from '../matrix/MatrixService';

interface CreateSpaceModalProps {
    onClose: () => void;
    onCreated: () => void;
}

export const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({ onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        try {
            await matrixService.createSpace(name.trim(), topic.trim() || undefined);
            onCreated();
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-modal__header">
                    <span className="profile-modal__title">Создать канал</span>
                    <button className="profile-modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="profile-modal__section">
                    <label className="profile-modal__label">Название канала</label>
                    <input
                        className="profile-modal__input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Например: Разработка"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                </div>
                <div className="profile-modal__section">
                    <label className="profile-modal__label">Описание (необязательно)</label>
                    <input
                        className="profile-modal__input"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="О чём этот канал"
                    />
                </div>
                {error && <div className="profile-modal__error">{error}</div>}
                <button
                    className="profile-modal__btn profile-modal__btn--primary"
                    onClick={handleCreate}
                    disabled={loading || !name.trim()}
                >
                    {loading ? 'Создание...' : 'Создать канал'}
                </button>
            </div>
        </div>
    );
};
```

### 5.2. CreateRoomModal.tsx

Файл: `web/src/components/CreateRoomModal.tsx`

Аналогичная модалка, но для комнаты внутри канала. Принимает `spaceId` и `spaceName` (для отображения в заголовке). Вызывает `matrixService.createRoomInSpace(spaceId, name, topic)`.

```tsx
interface CreateRoomModalProps {
    spaceId: string;
    spaceName: string;
    onClose: () => void;
    onCreated: () => void;
}
```

Заголовок: "Создать комнату в {spaceName}". Остальная структура идентична CreateSpaceModal.


## Шаг 6. ChatLayout — интеграция

Файл: `web/src/components/ChatLayout.tsx`

### 6.1. Обновить useRooms

```typescript
const { spaces, channels, directs, isAdmin, refresh } = useRooms();
```

### 6.2. Состояние модалок

```typescript
const [showCreateSpace, setShowCreateSpace] = useState(false);
const [createRoomForSpace, setCreateRoomForSpace] = useState<{ id: string; name: string } | null>(null);
```

### 6.3. Передать в Sidebar

```tsx
<Sidebar
    spaces={spaces}
    channels={channels}
    directs={directs}
    users={users}
    usersLoading={usersLoading}
    activeRoomId={activeRoomId}
    userName={matrixService.getMyDisplayName()}
    isAdmin={isAdmin}
    onSelectRoom={handleSelectRoom}
    onOpenDM={handleOpenDM}
    onProfileClick={() => setShowProfile(true)}
    onLogout={onLogout}
    onCreateSpace={() => setShowCreateSpace(true)}
    onCreateRoom={(spaceId) => {
        const space = spaces.find(s => s.id === spaceId);
        setCreateRoomForSpace({ id: spaceId, name: space?.name || '' });
    }}
/>
```

### 6.4. Рендер модалок

```tsx
{showCreateSpace && (
    <CreateSpaceModal
        onClose={() => setShowCreateSpace(false)}
        onCreated={refresh}
    />
)}

{createRoomForSpace && (
    <CreateRoomModal
        spaceId={createRoomForSpace.id}
        spaceName={createRoomForSpace.name}
        onClose={() => setCreateRoomForSpace(null)}
        onCreated={refresh}
    />
)}
```


## Шаг 7. CSS-стили

Файл: `web/src/styles/chat.css`

Добавить стили для Space-элементов в sidebar:

```css
/* Space (канал) в sidebar */
.sidebar-space {
    padding: 2px 0;
}

.sidebar-space__header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px 6px 12px;
    cursor: pointer;
    user-select: none;
    border-radius: var(--uplink-radius-sm);
    margin: 1px 8px;
    transition: background 0.1s;
}

.sidebar-space__header:hover {
    background: rgba(255, 255, 255, 0.04);
}

.sidebar-space__arrow {
    font-size: 10px;
    color: var(--uplink-text-faint);
    transition: transform 0.15s;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
}

.sidebar-space__arrow--collapsed {
    transform: rotate(-90deg);
}

.sidebar-space__name {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: var(--uplink-text-faint);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sidebar-space__add-btn {
    background: none;
    border: none;
    color: var(--uplink-text-faint);
    font-size: 16px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    border-radius: var(--uplink-radius-sm);
    opacity: 0;
    transition: opacity 0.15s, color 0.15s, background 0.15s;
}

.sidebar-space__header:hover .sidebar-space__add-btn {
    opacity: 1;
}

.sidebar-space__add-btn:hover {
    color: var(--uplink-text-primary);
    background: rgba(255, 255, 255, 0.08);
}

.sidebar-space__empty {
    padding: 4px 20px 4px 44px;
    font-size: 12px;
    color: var(--uplink-text-faint);
    font-style: italic;
}

/* Отступ для комнат внутри канала */
.sidebar-room-item--indent {
    padding-left: 28px;
}

/* Кнопка создания канала в заголовке секции */
.chat-sidebar__section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 12px 4px 20px;
}

.chat-sidebar__section-add-btn {
    background: none;
    border: none;
    color: var(--uplink-text-faint);
    font-size: 16px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    border-radius: var(--uplink-radius-sm);
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
}

.chat-sidebar__section-title-row:hover .chat-sidebar__section-add-btn {
    opacity: 1;
}

.chat-sidebar__section-add-btn:hover {
    color: var(--uplink-text-primary);
}
```


## Шаг 8. Авто-join для новых пользователей

Когда админ создаёт канал или комнату, текущие пользователи получают invite (метод `inviteAllUsersToRoom`). Но для **будущих** пользователей, которых ещё нет на сервере, нужен механизм автоматического вступления. Это решается через `join_rule: public` — любой пользователь на сервере может зайти сам.

Дополнительно: в Sidebar показать кнопку "Обзор каналов" или автоматически подписывать новых пользователей. Это можно отложить на следующую задачу.


## Проверка работоспособности

После реализации проверить:

1. **@Misha:uplink.local** видит кнопки "+" в sidebar для создания каналов и комнат.
2. Другие пользователи видят каналы и комнаты, но **не** видят кнопки "+".
3. Создание канала → появляется в sidebar как сворачиваемая секция.
4. Создание комнаты в канале → появляется вложенной под каналом, можно отправлять сообщения.
5. E2E шифрование работает в созданных комнатах.
6. Unread-счётчики работают на комнатах внутри каналов.
7. Существующие DM и legacy-каналы продолжают работать.
8. Мобильная вёрстка не сломана.


## Файлы, которые нужно изменить

- `web/src/matrix/MatrixService.ts` — новые методы (checkIsAdmin, createSpace, createRoomInSpace, inviteAllUsersToRoom, getSpaceChildren, isSpace)
- `web/src/matrix/RoomsManager.ts` — SpaceInfo интерфейс, обновлённый getGroupedRooms с парсингом Spaces
- `web/src/hooks/useRooms.ts` — возвращает spaces, isAdmin
- `web/src/components/Sidebar.tsx` — SpaceItem, обновлённые пропсы, иерархический рендер
- `web/src/components/ChatLayout.tsx` — интеграция модалок и новых пропсов
- `web/src/components/CreateSpaceModal.tsx` — **новый файл**
- `web/src/components/CreateRoomModal.tsx` — **новый файл**
- `web/src/styles/chat.css` — стили для Spaces в sidebar

## Коммит

```
[chat] Каналы и комнаты: админ может создавать каналы (Spaces) и комнаты в них

- MatrixService: createSpace, createRoomInSpace, checkIsAdmin, inviteAllUsersToRoom
- RoomsManager: парсинг иерархии Spaces → Rooms, интерфейс SpaceInfo
- useRooms: возвращает spaces[], isAdmin
- Sidebar: иерархическое отображение каналов с вложенными комнатами
- CreateSpaceModal, CreateRoomModal: модалки создания
- Стили для sidebar spaces
- @Misha:uplink.local — серверный админ
```
