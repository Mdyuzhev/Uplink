# 022 — Админ-панель: управление пользователями

## Цель

Рядом с надписью **Uplink** в header sidebar добавить иконку шестерёнки (⚙), видимую только админу. По клику — открывается модалка «Управление пользователями» с тремя функциями:

1. **Добавить пользователя** — создать нового пользователя на сервере
2. **Дать/снять права админа** — переключить серверную роль admin
3. **Заблокировать пользователя** — деактивировать аккаунт

Все операции через Synapse Admin API (требуют серверного админа).

## Synapse Admin API — эндпоинты

Все запросы требуют авторизацию текущего пользователя (access_token) и серверную роль admin.

### Список пользователей
```
GET /_synapse/admin/v2/users?from=0&limit=100&guests=false
→ { users: [{ name, displayname, admin, deactivated, ... }] }
```

### Создать пользователя
```
PUT /_synapse/admin/v2/users/@username:uplink.local
Body: { password: "...", displayname: "...", admin: false }
→ 201 Created
```
Если пользователь уже существует — обновит данные (200 OK).

### Изменить роль админа
```
PUT /_synapse/admin/v2/users/@username:uplink.local
Body: { admin: true/false }
→ 200 OK
```

### Деактивировать (заблокировать)
```
POST /_synapse/admin/v1/deactivate/@username:uplink.local
Body: { erase: false }
→ 200 OK
```
**Деактивация необратима** в стандартном Synapse. Предупреждать пользователя.


## Шаг 1. MatrixService — методы Admin API

Файл: `web/src/matrix/MatrixService.ts`

Добавить методы в класс MatrixService. Все используют `this.client.http.authedRequest` с `prefix: ''` (чтобы не добавлялся /_matrix/client).

### 1.1. Список пользователей сервера

```typescript
export interface SynapseUser {
    userId: string;
    displayName: string;
    isAdmin: boolean;
    deactivated: boolean;
    avatarUrl?: string;
}

async listServerUsers(): Promise<SynapseUser[]> {
    if (!this.client) return [];
    try {
        const resp = await this.client.http.authedRequest(
            sdk.Method.Get,
            '/_synapse/admin/v2/users',
            { from: '0', limit: '200', guests: 'false' },
            undefined,
            { prefix: '' }
        );
        return ((resp as any).users || []).map((u: any) => ({
            userId: u.name,
            displayName: u.displayname || u.name.split(':')[0].substring(1),
            isAdmin: u.admin === 1 || u.admin === true,
            deactivated: u.deactivated === 1 || u.deactivated === true,
            avatarUrl: this.mxcToHttp(u.avatar_url, 36) || undefined,
        }));
    } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
        throw new Error('Нет доступа к Admin API. Вы серверный админ?');
    }
}
```

### 1.2. Создать пользователя

```typescript
async createUser(username: string, password: string, displayName?: string): Promise<void> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    const domain = this.getServerDomain();
    const userId = `@${username}:${domain}`;
    await this.client.http.authedRequest(
        sdk.Method.Put,
        `/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
        undefined,
        {
            password,
            displayname: displayName || username,
            admin: false,
        },
        { prefix: '' }
    );
}
```

### 1.3. Изменить роль админа

```typescript
async setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    await this.client.http.authedRequest(
        sdk.Method.Put,
        `/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
        undefined,
        { admin: isAdmin },
        { prefix: '' }
    );
}
```

### 1.4. Деактивировать пользователя

```typescript
async deactivateUser(userId: string): Promise<void> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    await this.client.http.authedRequest(
        sdk.Method.Post,
        `/_synapse/admin/v1/deactivate/${encodeURIComponent(userId)}`,
        undefined,
        { erase: false },
        { prefix: '' }
    );
}
```

**Заметка к getServerDomain():** метод уже есть в MatrixService (private). Он парсит домен из userId текущего пользователя. Новые методы его используют.


## Шаг 2. AdminPanel — компонент модалки

Файл: `web/src/components/AdminPanel.tsx` (новый файл)

### 2.1. Структура

Модалка с тремя вкладками/секциями (внутри одного скролла, без табов — проще):

1. **Добавить пользователя** — форма: логин, отображаемое имя, пароль. Кнопка «Создать».
2. **Пользователи** — таблица/список всех пользователей с действиями:
   - Бейдж «Админ» если admin
   - Бейдж «Заблокирован» если deactivated
   - Кнопка переключения админа (toggle)
   - Кнопка блокировки (с подтверждением)

### 2.2. Пропсы

```typescript
interface AdminPanelProps {
    onClose: () => void;
}
```

### 2.3. Логика компонента

```typescript
export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    // === Список пользователей ===
    const [users, setUsers] = useState<SynapseUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState('');

    // === Создание пользователя ===
    const [newUsername, setNewUsername] = useState('');
    const [newDisplayName, setNewDisplayName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    // === Подтверждение блокировки ===
    const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

    const loadUsers = async () => {
        setUsersLoading(true);
        setUsersError('');
        try {
            const list = await matrixService.listServerUsers();
            setUsers(list);
        } catch (err) {
            setUsersError((err as Error).message);
        } finally {
            setUsersLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    const handleCreateUser = async () => { ... };
    const handleToggleAdmin = async (userId: string, currentAdmin: boolean) => { ... };
    const handleDeactivate = async (userId: string) => { ... };
};
```

### 2.4. Рендер

Использовать те же CSS-классы что ProfileModal (`.profile-modal-overlay`, `.profile-modal`, `.profile-modal__header`, `.profile-modal__section`, `.profile-modal__input`, `.profile-modal__btn`, `.profile-modal__label`, `.profile-modal__error`).

Дополнительно — новые классы для списка пользователей (добавить в chat.css):

```tsx
return (
    <div className="profile-modal-overlay" onClick={onClose}>
        <div className="profile-modal admin-panel" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="profile-modal__header">
                <span className="profile-modal__title">Управление пользователями</span>
                <button className="profile-modal__close" onClick={onClose}>✕</button>
            </div>

            {/* === Создание пользователя === */}
            <div className="profile-modal__section">
                <label className="profile-modal__label">Новый пользователь</label>
                <input
                    className="profile-modal__input"
                    placeholder="Логин (латиница)"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                />
                <input
                    className="profile-modal__input"
                    placeholder="Отображаемое имя"
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                />
                <input
                    className="profile-modal__input"
                    type="password"
                    placeholder="Пароль"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                />
                {createError && <div className="profile-modal__error">{createError}</div>}
                {createSuccess && <div className="admin-panel__success">{createSuccess}</div>}
                <button
                    className="profile-modal__btn profile-modal__btn--primary"
                    onClick={handleCreateUser}
                    disabled={creating || !newUsername.trim() || !newPassword.trim()}
                >
                    {creating ? 'Создание...' : 'Создать пользователя'}
                </button>
            </div>

            <div className="profile-modal__divider" />

            {/* === Список пользователей === */}
            <div className="profile-modal__section">
                <label className="profile-modal__label">Пользователи на сервере</label>
                {usersLoading && <div className="admin-panel__loading">Загрузка...</div>}
                {usersError && <div className="profile-modal__error">{usersError}</div>}
                <div className="admin-panel__user-list">
                    {users.map(user => (
                        <AdminUserRow
                            key={user.userId}
                            user={user}
                            currentUserId={matrixService.getUserId()}
                            onToggleAdmin={() => handleToggleAdmin(user.userId, user.isAdmin)}
                            onDeactivate={() => setConfirmDeactivate(user.userId)}
                        />
                    ))}
                </div>
            </div>

            {/* === Диалог подтверждения блокировки === */}
            {confirmDeactivate && (
                <div className="admin-panel__confirm-overlay">
                    <div className="admin-panel__confirm">
                        <p>Заблокировать <strong>{confirmDeactivate}</strong>?</p>
                        <p className="admin-panel__confirm-warning">
                            Это действие необратимо. Пользователь не сможет войти.
                        </p>
                        <div className="admin-panel__confirm-actions">
                            <button
                                className="profile-modal__btn profile-modal__btn--danger"
                                onClick={() => handleDeactivate(confirmDeactivate)}
                            >
                                Заблокировать
                            </button>
                            <button
                                className="profile-modal__btn"
                                onClick={() => setConfirmDeactivate(null)}
                                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--uplink-text-secondary)' }}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
);
```

### 2.5. Компонент AdminUserRow

Внутри AdminPanel.tsx (или отдельный, по вкусу):

```tsx
const AdminUserRow: React.FC<{
    user: SynapseUser;
    currentUserId: string;
    onToggleAdmin: () => void;
    onDeactivate: () => void;
}> = ({ user, currentUserId, onToggleAdmin, onDeactivate }) => {
    const isSelf = user.userId === currentUserId;

    return (
        <div className={`admin-panel__user ${user.deactivated ? 'admin-panel__user--deactivated' : ''}`}>
            <div className="admin-panel__user-info">
                <Avatar name={user.displayName} size={28} imageUrl={user.avatarUrl} />
                <div className="admin-panel__user-details">
                    <span className="admin-panel__user-name">{user.displayName}</span>
                    <span className="admin-panel__user-id">{user.userId}</span>
                </div>
                {user.isAdmin && <span className="admin-panel__badge admin-panel__badge--admin">Админ</span>}
                {user.deactivated && <span className="admin-panel__badge admin-panel__badge--blocked">Заблокирован</span>}
            </div>
            {!isSelf && !user.deactivated && (
                <div className="admin-panel__user-actions">
                    <button
                        className="admin-panel__action-btn"
                        onClick={onToggleAdmin}
                        title={user.isAdmin ? 'Снять админа' : 'Дать админа'}
                    >
                        {user.isAdmin ? '👤' : '🛡️'}
                    </button>
                    <button
                        className="admin-panel__action-btn admin-panel__action-btn--danger"
                        onClick={onDeactivate}
                        title="Заблокировать"
                    >
                        🚫
                    </button>
                </div>
            )}
        </div>
    );
};
```

**Важно:** нельзя снять админа или заблокировать самого себя (`isSelf` проверка). Для заблокированных пользователей кнопки действий не показываем.


## Шаг 3. Sidebar — кнопка шестерёнки

Файл: `web/src/components/Sidebar.tsx`

### 3.1. Добавить пропсы

```typescript
interface SidebarProps {
    // ... существующие пропсы ...
    isAdmin: boolean;
    onAdminPanel: () => void;  // NEW
}
```

### 3.2. Кнопка в header

Добавить шестерёнку между `<span className="chat-sidebar__title">Uplink</span>` и `<div className="chat-sidebar__header-actions">`:

```tsx
<div className="chat-sidebar__header">
    <span className="chat-sidebar__title">Uplink</span>
    {isAdmin && (
        <button
            className="chat-sidebar__admin-btn"
            onClick={onAdminPanel}
            title="Управление пользователями"
        >
            ⚙
        </button>
    )}
    <div className="chat-sidebar__header-actions">
        {/* ... Flomaster, → ... */}
    </div>
</div>
```

Шестерёнка видна только если `isAdmin === true`.


## Шаг 4. ChatLayout — интеграция

Файл: `web/src/components/ChatLayout.tsx`

### 4.1. Импорт

```typescript
import { AdminPanel } from './AdminPanel';
```

### 4.2. Состояние

```typescript
const [showAdminPanel, setShowAdminPanel] = useState(false);
```

### 4.3. Передать в Sidebar

```tsx
<Sidebar
    // ... существующие пропсы ...
    isAdmin={isAdmin}
    onAdminPanel={() => setShowAdminPanel(true)}
/>
```

### 4.4. Рендер модалки

После ProfileModal:

```tsx
{showAdminPanel && (
    <AdminPanel onClose={() => setShowAdminPanel(false)} />
)}
```


## Шаг 5. CSS-стили

Файл: `web/src/styles/chat.css`

```css
/* ═══════════════════════════════════
   ADMIN BUTTON (sidebar header)
   ═══════════════════════════════════ */
.chat-sidebar__admin-btn {
    background: none;
    border: none;
    color: var(--uplink-text-faint);
    font-size: 16px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: var(--uplink-radius-sm);
    transition: color 0.15s, background 0.15s;
    line-height: 1;
}

.chat-sidebar__admin-btn:hover {
    color: var(--uplink-text-primary);
    background: rgba(255, 255, 255, 0.08);
}

/* ═══════════════════════════════════
   ADMIN PANEL (модалка)
   ═══════════════════════════════════ */
.admin-panel {
    width: 480px;
    max-height: 85vh;
}

.admin-panel__success {
    color: var(--uplink-success);
    font-size: 13px;
    margin-top: 6px;
    margin-bottom: 6px;
}

.admin-panel__loading {
    color: var(--uplink-text-muted);
    font-size: 13px;
    padding: 8px 0;
}

/* Список пользователей */
.admin-panel__user-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 300px;
    overflow-y: auto;
}

.admin-panel__user {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-radius: var(--uplink-radius-sm);
    transition: background 0.1s;
}

.admin-panel__user:hover {
    background: rgba(255, 255, 255, 0.04);
}

.admin-panel__user--deactivated {
    opacity: 0.4;
}

.admin-panel__user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
}

.admin-panel__user-details {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.admin-panel__user-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--uplink-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.admin-panel__user-id {
    font-size: 11px;
    color: var(--uplink-text-faint);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Бейджи */
.admin-panel__badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 8px;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.admin-panel__badge--admin {
    background: rgba(88, 101, 242, 0.2);
    color: var(--uplink-accent);
}

.admin-panel__badge--blocked {
    background: rgba(218, 55, 60, 0.2);
    color: var(--uplink-danger);
}

/* Кнопки действий */
.admin-panel__user-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;
}

.admin-panel__user:hover .admin-panel__user-actions {
    opacity: 1;
}

.admin-panel__action-btn {
    background: rgba(255, 255, 255, 0.06);
    border: none;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--uplink-radius-sm);
    transition: background 0.15s;
}

.admin-panel__action-btn:hover {
    background: rgba(255, 255, 255, 0.12);
}

.admin-panel__action-btn--danger:hover {
    background: rgba(218, 55, 60, 0.2);
}

/* Подтверждение блокировки */
.admin-panel__confirm-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--uplink-radius-lg);
    z-index: 10;
}

.admin-panel__confirm {
    background: var(--uplink-bg-secondary);
    padding: 20px 24px;
    border-radius: var(--uplink-radius-md);
    text-align: center;
    max-width: 300px;
}

.admin-panel__confirm p {
    color: var(--uplink-text-primary);
    font-size: 14px;
    margin: 0 0 8px;
}

.admin-panel__confirm-warning {
    color: var(--uplink-danger) !important;
    font-size: 12px !important;
    margin-bottom: 16px !important;
}

.admin-panel__confirm-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
}

.admin-panel__confirm-actions .profile-modal__btn {
    width: auto;
    padding: 8px 20px;
}
```


## Проверка работоспособности

1. Залогиниться как @Misha:uplink.local (админ) — шестерёнка ⚙ видна рядом с "Uplink".
2. Залогиниться как обычный пользователь — шестерёнки нет.
3. Открыть админ-панель → список пользователей загружается.
4. Создать нового пользователя → он появляется в списке.
5. Новый пользователь может залогиниться с указанным паролем.
6. Дать пользователю админа → бейдж "Админ" появляется, пользователь видит шестерёнку после релогина.
7. Снять админа → бейдж пропадает.
8. Заблокировать → подтверждение → бейдж "Заблокирован", пользователь не может войти.
9. Нельзя заблокировать или снять админа с самого себя.


## Зависимости

Задача зависит от того, что @Misha:uplink.local уже является серверным админом Synapse (см. задачу 020, секция "Предварительные условия"). Метод `checkIsAdmin()` из задачи 020 переиспользуется для показа/скрытия шестерёнки. Если 020 ещё не реализована — нужно добавить `checkIsAdmin()` в рамках этой задачи.


## Файлы

Новые:
- `web/src/components/AdminPanel.tsx`

Изменённые:
- `web/src/matrix/MatrixService.ts` — методы listServerUsers, createUser, setUserAdmin, deactivateUser + интерфейс SynapseUser
- `web/src/components/Sidebar.tsx` — пропс onAdminPanel, кнопка ⚙
- `web/src/components/ChatLayout.tsx` — состояние showAdminPanel, рендер AdminPanel
- `web/src/styles/chat.css` — стили админ-кнопки и админ-панели


## Коммит

```
[chat] Админ-панель: создание пользователей, управление ролями, блокировка

- AdminPanel: модалка с формой создания и списком пользователей
- MatrixService: listServerUsers, createUser, setUserAdmin, deactivateUser через Synapse Admin API
- Sidebar: шестерёнка ⚙ для админа рядом с Uplink
- Подтверждение блокировки (необратимое действие)
- Защита: нельзя заблокировать/снять админа с себя
```
