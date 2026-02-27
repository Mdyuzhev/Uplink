import * as sdk from 'matrix-js-sdk';

/**
 * Сервис пользователей — поиск, профили, аватары, typing.
 * Получает клиент через getClient(), не владеет подключением.
 */
export class UserService {
    constructor(
        private getClient: () => sdk.MatrixClient,
        private mxcToHttp: (url: string | undefined | null, size?: number) => string | null,
    ) {}

    /** Извлечь домен сервера из userId */
    getServerDomain(): string {
        const userId = this.getClient().getUserId() || '';
        const match = userId.match(/:(.+)$/);
        return match ? match[1] : 'uplink.local';
    }

    getDisplayName(userId: string): string {
        const client = this.getClient();
        const user = client.getUser(userId);
        return user?.displayName || userId.split(':')[0].substring(1);
    }

    getPresence(userId: string): string {
        const client = this.getClient();
        const user = client.getUser(userId);
        return (user as any)?.presence || 'offline';
    }

    /**
     * Получить список пользователей на сервере.
     * Synapse не поддерживает пустую строку — ищем по имени сервера (домену).
     */
    async searchUsers(query: string = ''): Promise<Array<{
        userId: string;
        displayName: string;
        avatarUrl?: string;
    }>> {
        const client = this.getClient();
        try {
            const searchTerm = query || this.getServerDomain();
            const response = await client.searchUserDirectory({ term: searchTerm, limit: 50 });
            const myUserId = client.getUserId();

            return (response.results || [])
                .filter((u: any) => u.user_id !== myUserId)
                .map((u: any) => ({
                    userId: u.user_id,
                    displayName: u.display_name || u.user_id.split(':')[0].substring(1),
                    avatarUrl: this.mxcToHttp(u.avatar_url, 36) || undefined,
                }));
        } catch (err) {
            console.error('Ошибка поиска пользователей:', err);
            return [];
        }
    }

    /** Получить HTTP URL аватара любого пользователя */
    getUserAvatarUrl(userId: string, size: number = 36): string | null {
        const client = this.getClient();
        const user = client.getUser(userId);
        return this.mxcToHttp(user?.avatarUrl, size);
    }

    getMyDisplayName(): string {
        const client = this.getClient();
        const user = client.getUser(client.getUserId()!);
        return user?.displayName || client.getUserId()!.split(':')[0].substring(1);
    }

    getMyAvatarUrl(size: number = 96): string | null {
        const client = this.getClient();
        const user = client.getUser(client.getUserId()!);
        return this.mxcToHttp(user?.avatarUrl, size);
    }

    /** Получить mxc:// URL аватара через Profile API (не зависит от sync) */
    async fetchMyAvatarUrl(size: number = 96): Promise<string | null> {
        const client = this.getClient();
        try {
            const profile = await client.getProfileInfo(client.getUserId()!);
            return this.mxcToHttp(profile.avatar_url, size);
        } catch {
            return null;
        }
    }

    async setDisplayName(name: string): Promise<void> {
        await this.getClient().setDisplayName(name);
    }

    async setAvatar(file: File): Promise<void> {
        const client = this.getClient();
        const response = await client.uploadContent(file, { type: file.type });
        await client.setAvatarUrl(response.content_uri);
    }

    async sendTyping(roomId: string, isTyping: boolean): Promise<void> {
        await this.getClient().sendTyping(roomId, isTyping, isTyping ? 5000 : 0);
    }
}
