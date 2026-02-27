import React, { useState, useEffect } from 'react';
import { matrixService } from '../matrix/MatrixService';
import type { SynapseUser } from '../matrix/AdminService';
import { Avatar } from './Avatar';

interface AdminPanelProps {
    onClose: () => void;
}

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
            const list = await matrixService.admin.listServerUsers();
            setUsers(list);
        } catch (err) {
            setUsersError((err as Error).message);
        } finally {
            setUsersLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleCreateUser = async () => {
        const username = newUsername.trim();
        const password = newPassword.trim();
        if (!username || !password) return;

        setCreating(true);
        setCreateError('');
        setCreateSuccess('');
        try {
            await matrixService.admin.createUser(username, password, newDisplayName.trim() || undefined);
            setCreateSuccess(`Пользователь ${username} создан`);
            setNewUsername('');
            setNewDisplayName('');
            setNewPassword('');
            await loadUsers();
            setTimeout(() => setCreateSuccess(''), 3000);
        } catch (err: any) {
            setCreateError(err.message || 'Ошибка создания пользователя');
        } finally {
            setCreating(false);
        }
    };

    const handleToggleAdmin = async (userId: string, currentAdmin: boolean) => {
        try {
            await matrixService.admin.setUserAdmin(userId, !currentAdmin);
            await loadUsers();
        } catch (err: any) {
            setUsersError(err.message || 'Ошибка изменения роли');
        }
    };

    const handleDeactivate = async (userId: string) => {
        try {
            await matrixService.admin.deactivateUser(userId);
            setConfirmDeactivate(null);
            await loadUsers();
        } catch (err: any) {
            setUsersError(err.message || 'Ошибка блокировки');
            setConfirmDeactivate(null);
        }
    };

    const currentUserId = matrixService.getUserId();

    return (
        <div className="profile-modal-overlay" onClick={onClose}>
            <div className="profile-modal admin-panel" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="profile-modal__header">
                    <span className="profile-modal__title">Управление пользователями</span>
                    <button className="profile-modal__close" onClick={onClose}>&#x2715;</button>
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
                                currentUserId={currentUserId}
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
                                    className="profile-modal__btn admin-panel__confirm-cancel"
                                    onClick={() => setConfirmDeactivate(null)}
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
};

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
                        {user.isAdmin ? '\uD83D\uDC64' : '\uD83D\uDEE1\uFE0F'}
                    </button>
                    <button
                        className="admin-panel__action-btn admin-panel__action-btn--danger"
                        onClick={onDeactivate}
                        title="Заблокировать"
                    >
                        \uD83D\uDEAB
                    </button>
                </div>
            )}
        </div>
    );
};
