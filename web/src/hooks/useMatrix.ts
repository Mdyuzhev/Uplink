import { useState, useEffect, useCallback } from 'react';
import { matrixService, ConnectionState } from '../matrix/MatrixService';

export function useMatrix() {
    const [connectionState, setConnectionState] = useState<ConnectionState>(
        matrixService.connectionState
    );
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        return matrixService.onConnectionChange((state) => {
            setConnectionState(state);
            if (state === 'connected') setError(null);
        });
    }, []);

    const login = useCallback(async (homeserver: string, userId: string, password: string) => {
        setError(null);
        try {
            await matrixService.login(homeserver, userId, password);
        } catch (err: any) {
            setError(err.message || 'Ошибка подключения');
            throw err;
        }
    }, []);

    const logout = useCallback(async () => {
        await matrixService.logout();
    }, []);

    const restoreSession = useCallback(async (): Promise<boolean> => {
        try {
            return await matrixService.restoreSession();
        } catch {
            return false;
        }
    }, []);

    return { connectionState, error, login, logout, restoreSession };
}
