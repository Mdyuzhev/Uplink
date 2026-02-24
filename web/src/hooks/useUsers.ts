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

    return { users, loading, loadUsers };
}
