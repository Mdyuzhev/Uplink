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
            // Пробуем Admin API — видит ВСЕХ пользователей сервера
            const serverUsers = await matrixService.admin.listServerUsers();
            const myUserId = matrixService.getUserId();
            setUsers(serverUsers
                .filter(u => u.userId !== myUserId && !u.deactivated && !u.userId.startsWith('@bot_'))
                .map(u => ({ userId: u.userId, displayName: u.displayName, avatarUrl: u.avatarUrl }))
            );
        } catch {
            // Не админ — фолбэк на User Directory
            try {
                const result = await matrixService.users.searchUsers('');
                setUsers(result.filter(u => !u.userId.startsWith('@bot_')));
            } catch (err) {
                console.error('Ошибка загрузки пользователей:', err);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    return { users, loading, loadUsers };
}
