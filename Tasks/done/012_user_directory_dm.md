# 012: Список пользователей и создание личных сообщений

## Цель

Добавить в Sidebar раздел «Пользователи» — список всех зарегистрированных пользователей сервера. По клику на пользователя — открыть существующий DM-диалог (если есть) или создать новый. Повторный клик по тому же пользователю не создаёт дублей, а переводит в уже существующий чат.

## Контекст

Сейчас в Sidebar есть «Каналы» и «Личные сообщения». Но чтобы написать кому-то, нужно уже иметь DM-комнату (созданную через seed-скрипт или другим клиентом). Нет способа начать диалог с нуля — пользователь даже не видит кто ещё зарегистрирован на сервере.

### Целевой UI

```
┌────────────────────────┐
│ Uplink            [→]  │
│ [Поиск...]             │
│                        │
│ КАНАЛЫ                 │
│   # general            │
│   # backend            │
│   # frontend           │
│                        │
│ ЛИЧНЫЕ СООБЩЕНИЯ       │
│   ● Alice Иванова      │
│   ● Bob Петров         │
│                        │
│ ПОЛЬЗОВАТЕЛИ           │  ← новая секция
│   👤 Alice Иванова     │
│   👤 Bob Петров        │
│   👤 Charlie Сидоров   │
│   👤 Diana Козлова     │
│   👤 Eve Смирнова      │
└────────────────────────┘
```

Клик по пользователю в секции «Пользователи»:
- Если DM с ним уже есть → перейти в этот чат
- Если DM нет → создать DM-комнату, пригласить, установить `m.direct`, перейти в новый чат

Текущий пользователь (ты сам) НЕ отображается в списке.

## Зависимости

- Задача 009 (Починка веб) — **выполнена** ✅
- Веб-приложение работает, Sidebar рендерится

## Текущие файлы (для ориентации)

```
web/src/
├── matrix/
│   ├── MatrixService.ts      # singleton, методы login/send/getClient и т.д.
│   └── RoomsManager.ts       # getGroupedRooms(), getDisplayName()
├── hooks/
│   ├── useMatrix.ts           # connectionState, login, logout
│   ├── useRooms.ts            # channels, directs, refresh
│   └── useMessages.ts         # messages, sendMessage, loadMore
├── components/
│   ├── ChatLayout.tsx         # sidebar + main area, activeRoomId state
│   ├── Sidebar.tsx            # каналы, DM, поиск
│   └── ...
└── styles/
    └── chat.css               # все стили чата
```

---

## ЧАСТЬ 1: Методы в MatrixService

### ШАГ 1.1. Добавить метод поиска пользователей

Файл: `E:\Uplink\web\src\matrix\MatrixService.ts`

Добавить метод в класс `MatrixService`:

```typescript
    /**
     * Получить список пользователей на сервере.
     * Использует User Directory API (поиск по пустой строке вернёт всех).
     * Исключает текущего пользователя из результатов.
     */
    async searchUsers(query: string = ''): Promise<Array<{
        userId: string;
        displayName: string;
        avatarUrl?: string;
    }>> {
        if (!this.client) return [];

        try {
            const response = await this.client.searchUserDirectory({ term: query, limit: 50 });
            const myUserId = this.client.getUserId();

            return (response.results || [])
                .filter((u: any) => u.user_id !== myUserId)
                .map((u: any) => ({
                    userId: u.user_id,
                    displayName: u.display_name || u.user_id.split(':')[0].substring(1),
                    avatarUrl: u.avatar_url,
                }));
        } catch (err) {
            console.error('Ошибка поиска пользователей:', err);
            return [];
        }
    }
```

### ШАГ 1.2. Добавить метод поиска существующего DM

```typescript
    /**
     * Найти существующую DM-комнату с пользователем.
     * Проверяет account data m.direct и membership.
     * Возвращает roomId или null если DM нет.
     */
    findExistingDM(userId: string): string | null {
        if (!this.client) return null;

        // 1. Проверить m.direct account data
        const directMap = this.client.getAccountData('m.direct')?.getContent() || {};
        const dmRoomIds: string[] = directMap[userId] || [];

        // 2. Найти комнату, в которой оба участника joined
        for (const roomId of dmRoomIds) {
            const room = this.client.getRoom(roomId);
            if (!room) continue;
            if (room.getMyMembership() !== 'join') continue;

            // Проверить что второй участник тоже в комнате (join или invite)
            const member = room.getMember(userId);
            if (member && (member.membership === 'join' || member.membership === 'invite')) {
                return roomId;
            }
        }

        return null;
    }
```

### ШАГ 1.3. Добавить метод создания DM

```typescript
    /**
     * Создать DM-комнату с пользователем или вернуть существующую.
     * 1. Ищет существующий DM (findExistingDM)
     * 2. Если не найден — создаёт новую комнату, инвайтит пользователя
     * 3. Обновляет m.direct account data
     * 4. Возвращает roomId
     */
    async getOrCreateDM(userId: string): Promise<string> {
        if (!this.client) throw new Error('Клиент не инициализирован');

        // 1. Проверить существующий DM
        const existingRoomId = this.findExistingDM(userId);
        if (existingRoomId) {
            return existingRoomId;
        }

        // 2. Создать новую DM-комнату
        const response = await this.client.createRoom({
            is_direct: true,
            invite: [userId],
            preset: sdk.Preset.PrivateChat,
            initial_state: [],  // без шифрования для PoC
        });

        const newRoomId = response.room_id;

        // 3. Обновить m.direct account data
        const myUserId = this.client.getUserId()!;
        const directMap = this.client.getAccountData('m.direct')?.getContent() || {};
        if (!directMap[userId]) {
            directMap[userId] = [];
        }
        if (!directMap[userId].includes(newRoomId)) {
            directMap[userId].push(newRoomId);
        }
        await this.client.setAccountData('m.direct', directMap);

        // 4. Дождаться появления комнаты в sync
        // (client.startClient уже слушает sync, комната появится автоматически)

        return newRoomId;
    }
```

**ВАЖНО:** Все три метода добавляются в существующий класс `MatrixService`, перед методом `disconnect()`. Не создавать новый файл — расширить существующий singleton.

---

## ЧАСТЬ 2: React Hook

### ШАГ 2.1. Создать src/hooks/useUsers.ts

Файл: `E:\Uplink\web\src\hooks\useUsers.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { matrixService } from '../matrix/MatrixService';

export interface UserInfo {
    userId: string;
    displayName: string;
    avatarUrl?: string;
}

/**
 * Hook для получения списка пользователей сервера.
 * Загружает список при подключении и предоставляет функцию обновления.
 */
export function useUsers() {
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [loading, setLoading] = useState(false);

    const loadUsers = useCallback(async () => {
        if (!matrixService.isConnected) return;
        setLoading(true);
        try {
            const result = await matrixService.searchUsers('');
            setUsers(result);
        } catch (err) {
            console.error('Ошибка загрузки пользователей:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    /**
     * Открыть или создать DM с пользователем.
     * Возвращает roomId для навигации.
     */
    const openDM = useCallback(async (userId: string): Promise<string> => {
        return matrixService.getOrCreateDM(userId);
    }, []);

    return { users, loading, loadUsers, openDM };
}
```

---

## ЧАСТЬ 3: Обновить Sidebar

### ШАГ 3.1. Обновить props Sidebar

Файл: `E:\Uplink\web\src\components\Sidebar.tsx`

Полностью заменить содержимое:

```tsx
import React, { useState } from 'react';
import { RoomInfo } from '../matrix/RoomsManager';
import { UserInfo } from '../hooks/useUsers';
import { Avatar } from './Avatar';

interface SidebarProps {
    channels: RoomInfo[];
    directs: RoomInfo[];
    users: UserInfo[];
    usersLoading: boolean;
    activeRoomId: string | null;
    onSelectRoom: (roomId: string) => void;
    onOpenDM: (userId: string) => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    channels, directs, users, usersLoading,
    activeRoomId, onSelectRoom, onOpenDM, onLogout,
}) => {
    const [filter, setFilter] = useState('');

    const filterRooms = (rooms: RoomInfo[]) => {
        if (!filter) return rooms;
        const q = filter.toLowerCase();
        return rooms.filter(r => r.name.toLowerCase().includes(q));
    };

    const filterUsers = (list: UserInfo[]) => {
        if (!filter) return list;
        const q = filter.toLowerCase();
        return list.filter(u =>
            u.displayName.toLowerCase().includes(q) ||
            u.userId.toLowerCase().includes(q)
        );
    };

    const filteredChannels = filterRooms(channels);
    const filteredDirects = filterRooms(directs);
    const filteredUsers = filterUsers(users);

    return (
        <>
            <div className="chat-sidebar__header">
                <span className="chat-sidebar__title">Uplink</span>
                <button className="chat-sidebar__logout" onClick={onLogout} title="Выйти">
                    &#x2192;
                </button>
            </div>

            <div className="chat-sidebar__search">
                <input
                    className="chat-sidebar__search-input"
                    type="text"
                    placeholder="Поиск..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
            </div>

            <div className="chat-sidebar__rooms">
                {filteredChannels.length > 0 && (
                    <div className="chat-sidebar__section">
                        <div className="chat-sidebar__section-title">Каналы</div>
                        {filteredChannels.map(room => (
                            <RoomItem
                                key={room.id}
                                room={room}
                                active={room.id === activeRoomId}
                                onClick={() => onSelectRoom(room.id)}
                            />
                        ))}
                    </div>
                )}

                {filteredDirects.length > 0 && (
                    <div className="chat-sidebar__section">
                        <div className="chat-sidebar__section-title">Личные сообщения</div>
                        {filteredDirects.map(room => (
                            <RoomItem
                                key={room.id}
                                room={room}
                                active={room.id === activeRoomId}
                                onClick={() => onSelectRoom(room.id)}
                            />
                        ))}
                    </div>
                )}

                <div className="chat-sidebar__section">
                    <div className="chat-sidebar__section-title">
                        Пользователи{usersLoading ? ' ...' : ` (${filteredUsers.length})`}
                    </div>
                    {filteredUsers.map(user => (
                        <UserItem
                            key={user.userId}
                            user={user}
                            onClick={() => onOpenDM(user.userId)}
                        />
                    ))}
                    {!usersLoading && filteredUsers.length === 0 && (
                        <div className="chat-sidebar__empty">Нет пользователей</div>
                    )}
                </div>
            </div>
        </>
    );
};

/** Элемент комнаты (канал или DM) — без изменений */
const RoomItem: React.FC<{ room: RoomInfo; active: boolean; onClick: () => void }> = ({
    room, active, onClick,
}) => {
    return (
        <div
            className={`sidebar-room-item ${active ? 'sidebar-room-item--active' : ''}`}
            onClick={onClick}
        >
            <span className="sidebar-room-item__icon">
                {room.type === 'channel' ? '#' : (
                    <span className={`presence-dot presence-dot--${room.peerPresence || 'offline'}`} />
                )}
            </span>
            <span className="sidebar-room-item__name">{room.name}</span>
            {room.unreadCount > 0 && (
                <span className="sidebar-room-item__badge">{room.unreadCount}</span>
            )}
        </div>
    );
};

/** Элемент пользователя — новый компонент */
const UserItem: React.FC<{ user: { userId: string; displayName: string }; onClick: () => void }> = ({
    user, onClick,
}) => {
    return (
        <div className="sidebar-room-item sidebar-user-item" onClick={onClick}>
            <span className="sidebar-room-item__icon">
                <Avatar name={user.displayName} size={20} />
            </span>
            <span className="sidebar-room-item__name">{user.displayName}</span>
        </div>
    );
};
```

---

## ЧАСТЬ 4: Обновить ChatLayout — подключить useUsers

### ШАГ 4.1. Обновить ChatLayout.tsx

Файл: `E:\Uplink\web\src\components\ChatLayout.tsx`

Добавить `useUsers`, обработчик `onOpenDM`, и передать новые props в `Sidebar`.

Полностью заменить содержимое:

```tsx
import React, { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useMessages } from '../hooks/useMessages';
import { useUsers } from '../hooks/useUsers';
import { Sidebar } from './Sidebar';
import { RoomHeader } from './RoomHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import '../styles/chat.css';

interface ChatLayoutProps {
    onLogout: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ onLogout }) => {
    const { channels, directs, refresh } = useRooms();
    const { users, loading: usersLoading } = useUsers();
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
    const { messages, sendMessage, loadMore } = useMessages(activeRoomId);

    const allRooms = [...channels, ...directs];
    const activeRoom = allRooms.find(r => r.id === activeRoomId) || null;

    const handleSelectRoom = (roomId: string) => {
        setActiveRoomId(roomId);
        setMobileView('chat');
    };

    const handleBack = () => {
        setMobileView('sidebar');
    };

    /**
     * Клик по пользователю в секции «Пользователи»:
     * - найти или создать DM-комнату
     * - обновить список комнат (чтобы новый DM появился в «Личные сообщения»)
     * - перейти в эту комнату
     */
    const handleOpenDM = async (userId: string) => {
        try {
            const { openDM } = await import('../hooks/useUsers');
            // Не используем динамический import — используем matrixService напрямую
        } catch {}

        // Используем matrixService напрямую для простоты
        const { matrixService } = await import('../matrix/MatrixService');
        try {
            const roomId = await matrixService.getOrCreateDM(userId);
            refresh();  // обновить список комнат в sidebar
            setActiveRoomId(roomId);
            setMobileView('chat');
        } catch (err) {
            console.error('Ошибка открытия DM:', err);
        }
    };

    return (
        <div className="chat-layout">
            <div className={`chat-sidebar ${mobileView === 'chat' ? 'chat-sidebar--hidden' : ''}`}>
                <Sidebar
                    channels={channels}
                    directs={directs}
                    users={users}
                    usersLoading={usersLoading}
                    activeRoomId={activeRoomId}
                    onSelectRoom={handleSelectRoom}
                    onOpenDM={handleOpenDM}
                    onLogout={onLogout}
                />
            </div>

            <div className="chat-main">
                {activeRoom ? (
                    <>
                        <RoomHeader room={activeRoom} onBack={handleBack} />
                        <MessageList messages={messages} onLoadMore={loadMore} />
                        <MessageInput
                            onSend={sendMessage}
                            roomName={activeRoom.name}
                        />
                    </>
                ) : (
                    <div className="chat-main__empty">
                        Выберите канал или чат
                    </div>
                )}
            </div>
        </div>
    );
};
```

**ВАЖНО:** Обработчик `handleOpenDM` использует динамический import `matrixService` чтобы не усложнять hook. Если агент хочет — может вынести `openDM` в `useUsers` hook и вызывать через него. Оба варианта рабочие. Лучший вариант — **упростить** `handleOpenDM`:

```tsx
    const handleOpenDM = async (userId: string) => {
        try {
            const roomId = await matrixService.getOrCreateDM(userId);
            refresh();
            setActiveRoomId(roomId);
            setMobileView('chat');
        } catch (err) {
            console.error('Ошибка открытия DM:', err);
        }
    };
```

Для этого добавить import вверху файла:

```tsx
import { matrixService } from '../matrix/MatrixService';
```

---

## ЧАСТЬ 5: Стили

### ШАГ 5.1. Добавить стили в chat.css

Файл: `E:\Uplink\web\src\styles\chat.css`

Добавить после стилей `.sidebar-room-item__badge`:

```css
/* === User item in sidebar === */
.sidebar-user-item {
    cursor: pointer;
}

.sidebar-user-item:hover {
    background: var(--uplink-sidebar-hover);
}

.sidebar-user-item .avatar {
    width: 20px;
    height: 20px;
    font-size: 10px;
}

.chat-sidebar__empty {
    padding: 4px 12px;
    font-size: 12px;
    color: var(--uplink-text-muted);
}
```

---

## ЧАСТЬ 6: Включить User Directory на Synapse

### ШАГ 6.1. Проверить homeserver.yaml

Файл: `E:\Uplink\docker\synapse\homeserver.yaml`

Synapse User Directory API включён по умолчанию. Однако по умолчанию он ищет только пользователей, с которыми ты делишь комнату. Для PoC нужно чтобы **все** пользователи были видны.

Добавить в конец `homeserver.yaml`:

```yaml
# User Directory: показывать всех пользователей сервера (не только тех, с кем есть общие комнаты)
user_directory:
  enabled: true
  search_all_users: true
  prefer_local_users: true
```

### ШАГ 6.2. Перезапустить Synapse

Локально:

```bash
cd E:\Uplink\docker
docker compose restart synapse
```

На сервере (после деплоя):

```bash
cd ~/projects/uplink/docker
docker compose restart synapse
```

---

## ЧАСТЬ 7: Проверка

### ШАГ 7.1. DEV-режим (localhost:5173)

1. `cd E:\Uplink\web && npm run dev`
2. Открыть http://localhost:5173
3. Залогиниться как `@alice:uplink.local` / `test123`
4. В Sidebar появилась секция **«Пользователи»** с: Bob, Charlie, Diana, Eve (Alice — это ты, себя не показываем)
5. Кликнуть по **Charlie Сидоров** (с ним нет DM)
6. Создаётся новая DM-комната, открывается пустой чат с Charlie
7. Написать сообщение — отправляется
8. Вернуться в Sidebar — в секции «Личные сообщения» появился Charlie
9. Кликнуть по **Charlie** снова в секции «Пользователи» — НЕ создаётся новый DM, открывается существующий
10. Кликнуть по **Bob Петров** (с ним уже есть DM из seed) — открывается существующий чат

### ШАГ 7.2. Поиск

1. Ввести «bob» в поисковую строку
2. В каналах, DM и пользователях отфильтровано — остался только Bob
3. Очистить поиск — все вернулись

### ШАГ 7.3. Второе устройство

1. Открыть вторую вкладку, залогиниться как `@charlie:uplink.local`
2. Charlie видит в «Личных сообщениях» новый DM с Alice (тот что создан в шаге 6)
3. Charlie пишет ответ — Alice видит в real-time

---

## Критерии приёмки

- [ ] MatrixService: метод `searchUsers()` — возвращает список пользователей сервера
- [ ] MatrixService: метод `findExistingDM(userId)` — находит существующий DM
- [ ] MatrixService: метод `getOrCreateDM(userId)` — находит или создаёт DM
- [ ] Sidebar: секция «Пользователи» отображает всех пользователей (кроме себя)
- [ ] Клик по пользователю без DM → создаётся новый DM, открывается чат
- [ ] Клик по пользователю с существующим DM → открывается существующий чат (дубль НЕ создаётся)
- [ ] Новый DM появляется в секции «Личные сообщения» после создания
- [ ] Поиск в Sidebar фильтрует каналы, DM и пользователей одновременно
- [ ] Текущий пользователь не показан в списке пользователей
- [ ] `homeserver.yaml`: `search_all_users: true`
- [ ] Работает в DEV (5173) и PROD (5174)

## Коммит

```
[web] Список пользователей, создание DM по клику

- MatrixService: searchUsers, findExistingDM, getOrCreateDM
- useUsers hook
- Sidebar: секция «Пользователи» с поиском
- ChatLayout: обработчик onOpenDM
- homeserver.yaml: user_directory.search_all_users: true
```
