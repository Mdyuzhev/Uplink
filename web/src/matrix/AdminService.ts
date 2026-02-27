import * as sdk from 'matrix-js-sdk';

export interface SynapseUser {
    userId: string;
    displayName: string;
    isAdmin: boolean;
    deactivated: boolean;
    avatarUrl?: string;
}

/**
 * Сервис администрирования — Synapse Admin API v2.
 * Получает клиент через getClient(), не владеет подключением.
 */
export class AdminService {
    constructor(
        private getClient: () => sdk.MatrixClient,
        private mxcToHttp: (url: string | undefined | null, size?: number) => string | null,
    ) {}

    /** Проверить, является ли текущий пользователь серверным админом Synapse */
    async checkIsAdmin(): Promise<boolean> {
        try {
            const client = this.getClient();
            const userId = client.getUserId()!;
            const resp = await client.http.authedRequest(
                sdk.Method.Get,
                `/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
                undefined, undefined, { prefix: '' }
            );
            return (resp as Record<string, unknown>)?.admin === true;
        } catch {
            return false;
        }
    }

    /** Список всех пользователей на сервере */
    async listServerUsers(): Promise<SynapseUser[]> {
        const client = this.getClient();
        try {
            const resp = await client.http.authedRequest(
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

    /** Создать пользователя */
    async createUser(username: string, password: string, displayName?: string): Promise<void> {
        const client = this.getClient();
        const userId = client.getUserId()!;
        const domain = userId.match(/:(.+)$/)?.[1] || 'uplink.local';
        const newUserId = `@${username.toLowerCase()}:${domain}`;
        await client.http.authedRequest(
            sdk.Method.Put,
            `/_synapse/admin/v2/users/${encodeURIComponent(newUserId)}`,
            undefined,
            { password, displayname: displayName || username, admin: false },
            { prefix: '' }
        );
    }

    /** Изменить роль админа */
    async setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
        const client = this.getClient();
        await client.http.authedRequest(
            sdk.Method.Put,
            `/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
            undefined,
            { admin: isAdmin },
            { prefix: '' }
        );
    }

    /** Деактивировать (заблокировать) пользователя — необратимо */
    async deactivateUser(userId: string): Promise<void> {
        const client = this.getClient();
        await client.http.authedRequest(
            sdk.Method.Post,
            `/_synapse/admin/v1/deactivate/${encodeURIComponent(userId)}`,
            undefined,
            { erase: false },
            { prefix: '' }
        );
    }

    /** Сменить пароль текущего пользователя */
    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        const client = this.getClient();
        const userId = client.getUserId()!;
        await client.setPassword(
            {
                type: 'm.login.password',
                identifier: { type: 'm.id.user', user: userId },
                password: oldPassword,
            } as any,
            newPassword
        );
    }
}
