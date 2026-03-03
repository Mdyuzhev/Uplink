/**
 * Утилиты для fetch-запросов к Bot API с авторизацией.
 */

import { matrixService } from '../matrix/MatrixService';

/** Создать headers с авторизацией для bot API */
export function authHeaders(): Record<string, string> {
    const token = matrixService.getAccessToken();
    return token
        ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

/** fetch с авторизацией */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers as Record<string, string> | undefined) },
    });
}
