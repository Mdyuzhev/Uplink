# 015: Личный кабинет пользователя

## Цель

Добавить кнопку с именем текущего пользователя в шапку Sidebar (справа от «Uplink»). По клику — всплывающее окно (модалка) с тремя функциями:

1. Смена отображаемого имени (display name)
2. Установка аватара (загрузка изображения с диска)
3. Смена пароля

## Целевой UI

### Шапка Sidebar (обновлённая)

```
┌──────────────────────────────┐
│ Uplink        [Nastya] [→]  │
│                              │
```

`[Nastya]` — кнопка с текущим display name. По клику открывается модалка.

### Модалка «Настройки профиля»

```
┌──────────────────────────────────┐
│  Настройки профиля          [✕]  │
│                                  │
│  ┌──────┐                        │
│  │  N   │  ← аватар (кликабельный)
│  └──────┘                        │
│  Нажмите чтобы сменить фото     │
│                                  │
│  Имя                             │
│  ┌──────────────────────┐        │
│  │ Nastya               │        │
│  └──────────────────────┘        │
│  [Сохранить имя]                 │
│                                  │
│  ─────────────────────────       │
│                                  │
│  Сменить пароль                  │
│  ┌──────────────────────┐        │
│  │ Текущий пароль        │        │
│  └──────────────────────┘        │
│  ┌──────────────────────┐        │
│  │ Новый пароль          │        │
│  └──────────────────────┘        │
│  ┌──────────────────────┐        │
│  │ Повторите новый       │        │
│  └──────────────────────┘        │
│  [Сменить пароль]                │
│                                  │
│  ─────────────────────────       │
│                                  │
│  [Выйти из аккаунта]            │
└──────────────────────────────────┘
```

## Зависимости

- Веб-приложение работает, Sidebar рендерится
- Matrix JS SDK поддерживает все нужные API

## Текущие файлы

```
web/src/
├── matrix/
│   └── MatrixService.ts       # getClient(), getUserId(), getDisplayName()
├── components/
│   ├── Sidebar.tsx            # шапка с "Uplink" и кнопкой выхода
│   ├── ChatLayout.tsx         # onLogout, корневой layout
│   └── Avatar.tsx             # компонент аватара (буква + цвет)
└── styles/
    └── chat.css               # все стили
```

---

## ЧАСТЬ 1: Методы в MatrixService

### ШАГ 1.1. Добавить методы профиля

Файл: `E:\Uplink\web\src\matrix\MatrixService.ts`

Добавить в класс `MatrixService` (перед методом `disconnect()`):

```typescript
    // === Профиль пользователя ===

    /**
     * Получить текущее отображаемое имя.
     */
    getMyDisplayName(): string {
        if (!this.client) return '';
        const user = this.client.getUser(this.client.getUserId()!);
        return user?.displayName || this.client.getUserId()!.split(':')[0].substring(1);
    }

    /**
     * Получить URL аватара текущего пользователя.
     * Возвращает HTTP URL, готовый для <img src="...">, или null.
     */
    getMyAvatarUrl(size: number = 96): string | null {
        if (!this.client) return null;
        const user = this.client.getUser(this.client.getUserId()!);
        const mxcUrl = user?.avatarUrl;
        if (!mxcUrl) return null;
        // Конвертируем mxc:// в HTTP URL через Synapse
        return this.client.mxcUrlToHttp(mxcUrl, size, size, 'crop') || null;
    }

    /**
     * Сменить отображаемое имя.
     */
    async setDisplayName(name: string): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        await this.client.setDisplayName(name);
    }

    /**
     * Загрузить аватар (файл изображения) и установить его.
     */
    async setAvatar(file: File): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        // 1. Загрузить файл на сервер → получить mxc:// URL
        const response = await this.client.uploadContent(file, {
            type: file.type,
        });
        const mxcUrl = response.content_uri;
        // 2. Установить как аватар
        await this.client.setAvatarUrl(mxcUrl);
    }

    /**
     * Сменить пароль.
     * Требует текущий пароль для подтверждения (interactive auth).
     */
    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        const userId = this.client.getUserId()!;

        // Matrix API требует interactive auth для смены пароля
        // Используем m.login.password как auth type
        await this.client.setPassword(
            {
                type: 'm.login.password',
                identifier: { type: 'm.id.user', user: userId },
                password: oldPassword,
            } as any,
            newPassword
        );
    }
```

---

## ЧАСТЬ 2: Компонент ProfileModal

### ШАГ 2.1. Создать ProfileModal

Файл: `E:\Uplink\web\src\components\ProfileModal.tsx`

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { Avatar } from './Avatar';

interface ProfileModalProps {
    onClose: () => void;
    onLogout: () => void;
}

/**
 * Модалка настроек профиля:
 * - смена display name
 * - загрузка аватара
 * - смена пароля
 */
export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, onLogout }) => {
    // === Display Name ===
    const [displayName, setDisplayName] = useState(matrixService.getMyDisplayName());
    const [nameSaving, setNameSaving] = useState(false);
    const [nameSuccess, setNameSuccess] = useState(false);
    const [nameError, setNameError] = useState('');

    // === Avatar ===
    const [avatarUrl, setAvatarUrl] = useState<string | null>(matrixService.getMyAvatarUrl());
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // === Password ===
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdSaving, setPwdSaving] = useState(false);
    const [pwdSuccess, setPwdSuccess] = useState(false);
    const [pwdError, setPwdError] = useState('');

    // Закрытие по Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // --- Смена имени ---
    const handleSaveName = async () => {
        const trimmed = displayName.trim();
        if (!trimmed) return;

        setNameSaving(true);
        setNameError('');
        setNameSuccess(false);
        try {
            await matrixService.setDisplayName(trimmed);
            setNameSuccess(true);
            setTimeout(() => setNameSuccess(false), 2000);
        } catch (err: any) {
            setNameError(err.message || 'Ошибка сохранения');
        } finally {
            setNameSaving(false);
        }
    };

    // --- Загрузка аватара ---
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            alert('Выберите изображение (PNG, JPG, GIF)');
            return;
        }

        // Проверка размера (макс 5 МБ)
        if (file.size > 5 * 1024 * 1024) {
            alert('Максимальный размер — 5 МБ');
            return;
        }

        setAvatarUploading(true);
        try {
            await matrixService.setAvatar(file);
            // Обновить URL аватара (может потребоваться задержка для sync)
            setTimeout(() => {
                setAvatarUrl(matrixService.getMyAvatarUrl());
            }, 1000);
        } catch (err: any) {
            alert('Ошибка загрузки: ' + (err.message || 'Неизвестная ошибка'));
        } finally {
            setAvatarUploading(false);
            // Сбросить input чтобы можно было загрузить тот же файл
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- Смена пароля ---
    const handleChangePassword = async () => {
        setPwdError('');
        setPwdSuccess(false);

        if (!oldPassword || !newPassword) {
            setPwdError('Заполните все поля');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwdError('Пароли не совпадают');
            return;
        }
        if (newPassword.length < 6) {
            setPwdError('Минимум 6 символов');
            return;
        }

        setPwdSaving(true);
        try {
            await matrixService.changePassword(oldPassword, newPassword);
            setPwdSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPwdSuccess(false), 3000);
        } catch (err: any) {
            // Matrix возвращает 401 при неправильном текущем пароле
            if (err.httpStatus === 401 || err.errcode === 'M_FORBIDDEN') {
                setPwdError('Неверный текущий пароль');
            } else {
                setPwdError(err.message || 'Ошибка смены пароля');
            }
        } finally {
            setPwdSaving(false);
        }
    };

    return (
        <div className="profile-modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-modal__header">
                    <span className="profile-modal__title">Настройки профиля</span>
                    <button className="profile-modal__close" onClick={onClose}>✕</button>
                </div>

                {/* Аватар */}
                <div className="profile-modal__avatar-section">
                    <div
                        className={`profile-modal__avatar ${avatarUploading ? 'profile-modal__avatar--uploading' : ''}`}
                        onClick={handleAvatarClick}
                        title="Нажмите чтобы сменить фото"
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Аватар" className="profile-modal__avatar-img" />
                        ) : (
                            <Avatar name={displayName} size={80} />
                        )}
                        <div className="profile-modal__avatar-overlay">
                            {avatarUploading ? '...' : '📷'}
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <div className="profile-modal__avatar-hint">Нажмите чтобы сменить фото</div>
                </div>

                {/* Имя */}
                <div className="profile-modal__section">
                    <label className="profile-modal__label">Имя</label>
                    <input
                        className="profile-modal__input"
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Введите имя"
                        maxLength={100}
                    />
                    <button
                        className="profile-modal__btn profile-modal__btn--primary"
                        onClick={handleSaveName}
                        disabled={nameSaving || !displayName.trim()}
                    >
                        {nameSaving ? 'Сохранение...' : nameSuccess ? '✓ Сохранено' : 'Сохранить имя'}
                    </button>
                    {nameError && <div className="profile-modal__error">{nameError}</div>}
                </div>

                <div className="profile-modal__divider" />

                {/* Смена пароля */}
                <div className="profile-modal__section">
                    <label className="profile-modal__label">Сменить пароль</label>
                    <input
                        className="profile-modal__input"
                        type="password"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder="Текущий пароль"
                    />
                    <input
                        className="profile-modal__input"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Новый пароль"
                    />
                    <input
                        className="profile-modal__input"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Повторите новый пароль"
                    />
                    <button
                        className="profile-modal__btn profile-modal__btn--primary"
                        onClick={handleChangePassword}
                        disabled={pwdSaving}
                    >
                        {pwdSaving ? 'Сохранение...' : pwdSuccess ? '✓ Пароль изменён' : 'Сменить пароль'}
                    </button>
                    {pwdError && <div className="profile-modal__error">{pwdError}</div>}
                </div>

                <div className="profile-modal__divider" />

                {/* Выход */}
                <div className="profile-modal__section">
                    <button
                        className="profile-modal__btn profile-modal__btn--danger"
                        onClick={onLogout}
                    >
                        Выйти из аккаунта
                    </button>
                </div>
            </div>
        </div>
    );
};
```

---

## ЧАСТЬ 3: Обновить Sidebar — кнопка профиля в шапке

### ШАГ 3.1. Обновить Sidebar.tsx

Файл: `E:\Uplink\web\src\components\Sidebar.tsx`

Добавить prop `userName` и callback `onProfileClick` в `SidebarProps`:

```typescript
interface SidebarProps {
    channels: RoomInfo[];
    directs: RoomInfo[];
    users: UserInfo[];
    usersLoading: boolean;
    activeRoomId: string | null;
    userName: string;               // ← НОВОЕ
    onSelectRoom: (roomId: string) => void;
    onOpenDM: (userId: string) => void;
    onProfileClick: () => void;     // ← НОВОЕ
    onLogout: () => void;
}
```

Обновить деструктуризацию и шапку:

```tsx
export const Sidebar: React.FC<SidebarProps> = ({
    channels, directs, users, usersLoading,
    activeRoomId, userName, onSelectRoom, onOpenDM, onProfileClick, onLogout,
}) => {
```

Заменить блок `chat-sidebar__header`:

```tsx
    <div className="chat-sidebar__header">
        <span className="chat-sidebar__title">Uplink</span>
        <div className="chat-sidebar__header-actions">
            <button
                className="chat-sidebar__profile-btn"
                onClick={onProfileClick}
                title="Настройки профиля"
            >
                {userName}
            </button>
            <button className="chat-sidebar__logout" onClick={onLogout} title="Выйти">
                &#x2192;
            </button>
        </div>
    </div>
```

---

## ЧАСТЬ 4: Обновить ChatLayout — подключить модалку

### ШАГ 4.1. Обновить ChatLayout.tsx

Файл: `E:\Uplink\web\src\components\ChatLayout.tsx`

Добавить импорт:

```tsx
import { ProfileModal } from './ProfileModal';
```

Добавить state для модалки внутри компонента:

```tsx
    const [showProfile, setShowProfile] = useState(false);
```

Получить имя пользователя:

```tsx
    const userName = matrixService.getMyDisplayName();
```

Передать новые props в Sidebar:

```tsx
    <Sidebar
        channels={channels}
        directs={directs}
        users={users}
        usersLoading={usersLoading}
        activeRoomId={activeRoomId}
        userName={userName}
        onSelectRoom={handleSelectRoom}
        onOpenDM={handleOpenDM}
        onProfileClick={() => setShowProfile(true)}
        onLogout={onLogout}
    />
```

Добавить модалку в JSX (в конец, перед закрывающим `</div>` корневого `chat-layout`):

```tsx
    {/* Модалка профиля */}
    {showProfile && (
        <ProfileModal
            onClose={() => setShowProfile(false)}
            onLogout={onLogout}
        />
    )}
```

---

## ЧАСТЬ 5: Стили

### ШАГ 5.1. Добавить стили в chat.css

Файл: `E:\Uplink\web\src\styles\chat.css`

```css
/* === Sidebar header — кнопка профиля === */
.chat-sidebar__header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.chat-sidebar__profile-btn {
    background: var(--uplink-bg-tertiary, #353840);
    border: none;
    color: var(--uplink-text-primary, #fff);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: background 0.15s;
}

.chat-sidebar__profile-btn:hover {
    background: var(--uplink-sidebar-hover, #3e4249);
}

/* === Profile Modal === */
.profile-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.15s ease;
}

.profile-modal {
    background: var(--uplink-bg-secondary, #2a2d35);
    border-radius: 12px;
    width: 380px;
    max-width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.profile-modal__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.profile-modal__title {
    font-size: 18px;
    font-weight: 600;
    color: var(--uplink-text-primary, #fff);
}

.profile-modal__close {
    background: none;
    border: none;
    color: var(--uplink-text-muted, #888);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
}

.profile-modal__close:hover {
    background: var(--uplink-bg-tertiary, #353840);
    color: var(--uplink-text-primary, #fff);
}

/* Avatar section */
.profile-modal__avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
}

.profile-modal__avatar {
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    transition: opacity 0.15s;
}

.profile-modal__avatar:hover {
    opacity: 0.8;
}

.profile-modal__avatar--uploading {
    opacity: 0.5;
    pointer-events: none;
}

.profile-modal__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-modal__avatar .avatar {
    width: 80px !important;
    height: 80px !important;
    font-size: 32px !important;
}

.profile-modal__avatar-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    text-align: center;
    font-size: 16px;
    padding: 4px 0;
    opacity: 0;
    transition: opacity 0.15s;
}

.profile-modal__avatar:hover .profile-modal__avatar-overlay {
    opacity: 1;
}

.profile-modal__avatar-hint {
    font-size: 12px;
    color: var(--uplink-text-muted, #888);
    margin-top: 8px;
}

/* Sections */
.profile-modal__section {
    margin-bottom: 16px;
}

.profile-modal__label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--uplink-text-muted, #888);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.profile-modal__input {
    width: 100%;
    padding: 10px 12px;
    background: var(--uplink-bg-primary, #1a1d23);
    border: 1px solid var(--uplink-border, #3e4249);
    border-radius: 6px;
    color: var(--uplink-text-primary, #fff);
    font-size: 14px;
    margin-bottom: 8px;
    box-sizing: border-box;
}

.profile-modal__input:focus {
    outline: none;
    border-color: var(--uplink-accent, #5865f2);
}

.profile-modal__input::placeholder {
    color: var(--uplink-text-muted, #888);
}

.profile-modal__btn {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    margin-top: 4px;
}

.profile-modal__btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.profile-modal__btn--primary {
    background: var(--uplink-accent, #5865f2);
    color: white;
}

.profile-modal__btn--primary:hover:not(:disabled) {
    background: #4752c4;
}

.profile-modal__btn--danger {
    background: transparent;
    color: #f44336;
    border: 1px solid #f44336;
}

.profile-modal__btn--danger:hover {
    background: #f44336;
    color: white;
}

.profile-modal__error {
    color: #f44336;
    font-size: 13px;
    margin-top: 6px;
}

.profile-modal__divider {
    height: 1px;
    background: var(--uplink-border, #3e4249);
    margin: 16px 0;
}
```

---

## ЧАСТЬ 6: Обновить Avatar — поддержка реальных изображений

### ШАГ 6.1. Обновить Avatar.tsx

Файл: `E:\Uplink\web\src\components\Avatar.tsx`

Добавить prop `imageUrl` — если задан, показывать реальное изображение вместо буквы:

```tsx
interface AvatarProps {
    name: string;
    size?: number;
    online?: boolean;
    imageUrl?: string | null;   // ← НОВОЕ: URL аватара (mxc → http)
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 36, online, imageUrl }) => {
    const letter = (name[0] || '?').toUpperCase();
    const bg = hashColor(name);

    return (
        <div
            className="avatar"
            style={{ width: size, height: size, fontSize: size * 0.4, background: imageUrl ? 'transparent' : bg }}
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
            ) : (
                letter
            )}
            {online && <span className="avatar__online-dot" />}
        </div>
    );
};
```

Это позволит в будущем показывать аватары и в списке пользователей и в DM.

---

## ЧАСТЬ 7: Проверка

### ШАГ 7.1. Кнопка в шапке

1. Открыть http://192.168.1.74:5174
2. Залогиниться как `@alice:uplink.local` / `test123`
3. В шапке Sidebar: «Uplink» слева, **«Alice»** справа (перед кнопкой выхода)
4. Кнопка обрезает длинные имена (`text-overflow: ellipsis`)

### ШАГ 7.2. Смена имени

1. Кликнуть на имя → модалка «Настройки профиля»
2. Изменить имя на «Alice Иванова»
3. Нажать «Сохранить имя» → появляется «✓ Сохранено»
4. Закрыть модалку → в шапке теперь «Alice Иванова»
5. У других пользователей в списке «Пользователи» имя тоже обновилось

### ШАГ 7.3. Загрузка аватара

1. Открыть модалку → кликнуть на круглый аватар (буква)
2. Выбрать PNG/JPG файл с диска
3. Аватар обновляется — теперь показывает загруженное изображение
4. У других пользователей тоже видно новый аватар (после sync)

### ШАГ 7.4. Смена пароля

1. Ввести текущий пароль (`test123`), новый (`newpass123`), повторить
2. Нажать «Сменить пароль» → «✓ Пароль изменён»
3. Выйти → залогиниться со старым паролем → ошибка
4. Залогиниться с новым паролем → успех
5. **Сменить обратно на `test123`** (чтобы не сломать тестовые данные)

### ШАГ 7.5. Закрытие модалки

1. Клик вне модалки → закрывается
2. Нажатие Escape → закрывается
3. Кнопка ✕ → закрывается

### ШАГ 7.6. Мобильный вид

1. Открыть с телефона
2. Модалка скроллится если не влезает (max-height: 90vh, overflow-y: auto)
3. Кнопка профиля в шапке видна

---

## Критерии приёмки

- [ ] Кнопка с именем пользователя в шапке Sidebar (справа от «Uplink»)
- [ ] Клик → модалка «Настройки профиля»
- [ ] Смена display name работает, обновляется в шапке
- [ ] Загрузка аватара с диска, отображается в модалке
- [ ] Смена пароля с валидацией (совпадение, минимум 6 символов)
- [ ] Ошибка при неверном текущем пароле
- [ ] Кнопка «Выйти из аккаунта» в модалке
- [ ] Закрытие: клик снаружи, Escape, кнопка ✕
- [ ] Avatar.tsx поддерживает `imageUrl` prop
- [ ] Стили модалки: тёмная тема, соответствует дизайну приложения
- [ ] Задеплоено на сервер

## Коммит

```
[web] Личный кабинет: смена имени, аватара, пароля

- ProfileModal: модалка настроек профиля
- MatrixService: setDisplayName, setAvatar, changePassword
- Sidebar: кнопка имени пользователя в шапке
- Avatar: поддержка imageUrl (реальные изображения)
```
