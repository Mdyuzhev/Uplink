import * as sdk from 'matrix-js-sdk';

/**
 * Сервис подключения к Matrix для веб-приложения.
 *
 * В отличие от VS Code версии, работает напрямую в браузере:
 * - Токен хранится в localStorage (для PoC допустимо)
 * - События передаются через callback-функции
 */

const STORAGE_KEYS = {
    HOMESERVER: 'uplink_homeserver',
    USER_ID: 'uplink_user_id',
    ACCESS_TOKEN: 'uplink_access_token',
    DEVICE_ID: 'uplink_device_id',
};

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

type Listener<T extends (...args: any[]) => void> = T;

export class MatrixService {
    private client: sdk.MatrixClient | null = null;
    private _connectionState: ConnectionState = 'disconnected';

    private _connectionListeners = new Set<Listener<(state: ConnectionState) => void>>();
    private _roomsListeners = new Set<Listener<() => void>>();
    private _messageListeners = new Set<Listener<(roomId: string, event: sdk.MatrixEvent) => void>>();

    get connectionState(): ConnectionState { return this._connectionState; }
    get isConnected(): boolean { return this._connectionState === 'connected'; }

    onConnectionChange(fn: (state: ConnectionState) => void): () => void {
        this._connectionListeners.add(fn);
        return () => { this._connectionListeners.delete(fn); };
    }

    onRoomsUpdated(fn: () => void): () => void {
        this._roomsListeners.add(fn);
        return () => { this._roomsListeners.delete(fn); };
    }

    onNewMessage(fn: (roomId: string, event: sdk.MatrixEvent) => void): () => void {
        this._messageListeners.add(fn);
        return () => { this._messageListeners.delete(fn); };
    }

    private emitConnectionChange(state: ConnectionState): void {
        this._connectionListeners.forEach(fn => fn(state));
    }
    private emitRoomsUpdated(): void {
        this._roomsListeners.forEach(fn => fn());
    }
    private emitNewMessage(roomId: string, event: sdk.MatrixEvent): void {
        this._messageListeners.forEach(fn => fn(roomId, event));
    }

    async login(homeserver: string, userId: string, password: string): Promise<void> {
        this.setConnectionState('connecting');

        try {
            const tempClient = sdk.createClient({ baseUrl: homeserver });
            const response = await tempClient.login('m.login.password', {
                user: userId,
                password: password,
                initial_device_display_name: 'Uplink Web',
            });

            localStorage.setItem(STORAGE_KEYS.HOMESERVER, homeserver);
            localStorage.setItem(STORAGE_KEYS.USER_ID, response.user_id);
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
            localStorage.setItem(STORAGE_KEYS.DEVICE_ID, response.device_id);

            await this.initClient(
                homeserver,
                response.user_id,
                response.access_token,
                response.device_id
            );
        } catch (err) {
            this.setConnectionState('error');
            throw err;
        }
    }

    async restoreSession(): Promise<boolean> {
        const homeserver = localStorage.getItem(STORAGE_KEYS.HOMESERVER);
        const userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);

        if (!homeserver || !userId || !token || !deviceId) {
            return false;
        }

        this.setConnectionState('connecting');

        try {
            await this.initClient(homeserver, userId, token, deviceId);
            return true;
        } catch {
            this.clearSession();
            this.setConnectionState('disconnected');
            return false;
        }
    }

    private async initClient(
        homeserver: string,
        userId: string,
        accessToken: string,
        deviceId: string
    ): Promise<void> {
        this.client = sdk.createClient({
            baseUrl: homeserver,
            accessToken: accessToken,
            userId: userId,
            deviceId: deviceId,
        });

        await this.client.whoami();

        // Проверка IndexedDB для хранения крипто-ключей
        try {
            const testDb = indexedDB.open('uplink_crypto_test');
            testDb.onerror = () => {
                console.warn('⚠️ IndexedDB недоступен (приватный режим?). E2E ключи не будут сохранены между сессиями.');
            };
        } catch {
            console.warn('⚠️ IndexedDB недоступен');
        }

        await this.initCrypto();

        this.client.on(sdk.ClientEvent.Sync, (state: string) => {
            if (state === 'PREPARED' || state === 'SYNCING') {
                this.setConnectionState('connected');
                this.emitRoomsUpdated();
            } else if (state === 'ERROR' || state === 'STOPPED') {
                this.setConnectionState('error');
            }
        });

        this.client.on(sdk.RoomEvent.Timeline, (event: sdk.MatrixEvent, room: sdk.Room | undefined) => {
            if (!room) return;
            if (event.getType() === 'm.room.message' || event.getType() === 'm.room.encrypted') {
                this.emitNewMessage(room.roomId, event);
                this.emitRoomsUpdated();
            }
        });

        this.client.on(sdk.RoomEvent.MyMembership, () => {
            this.emitRoomsUpdated();
        });

        await this.client.startClient({ initialSyncLimit: 20 });
    }

    /**
     * Инициализация E2E шифрования.
     * Пробуем Rust crypto (matrix-sdk-crypto-wasm).
     * Если не удалось или зависло (мобилки без SharedArrayBuffer) —
     * продолжаем без шифрования (PoC-режим).
     */
    private async initCrypto(): Promise<void> {
        if (!this.client) return;

        // SharedArrayBuffer нужен для WASM crypto, но доступен только с COOP/COEP.
        // На мобилках без этих заголовков initRustCrypto() может зависнуть.
        if (typeof SharedArrayBuffer === 'undefined') {
            console.warn('⚠️ SharedArrayBuffer недоступен — E2E шифрование отключено');
            return;
        }

        try {
            // Таймаут 10с — если WASM не загрузился, продолжаем без E2E
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 10000)
            );
            await Promise.race([this.client.initRustCrypto(), timeout]);
            console.log('✅ Uplink E2E: Rust crypto (matrix-sdk-crypto-wasm)');
            this.configureCryptoTrust();
        } catch (err) {
            console.warn('⚠️ E2E шифрование недоступно, работаем без него (PoC):', (err as Error).message);
        }
    }

    private configureCryptoTrust(): void {
        if (!this.client) return;
        const crypto = this.client.getCrypto();
        if (crypto) {
            crypto.globalBlacklistUnverifiedDevices = false;
            console.log('PoC-режим: автодоверие устройствам включено');
        }
    }

    getClient(): sdk.MatrixClient {
        if (!this.client) throw new Error('Клиент не инициализирован');
        return this.client;
    }

    getUserId(): string {
        return this.client?.getUserId() || '';
    }

    getRooms(): sdk.Room[] {
        if (!this.client) return [];
        return this.client.getRooms().filter(r => r.getMyMembership() === 'join');
    }

    getRoomTimeline(roomId: string): sdk.MatrixEvent[] {
        if (!this.client) return [];
        const room = this.client.getRoom(roomId);
        if (!room) return [];
        return room.getLiveTimeline().getEvents().filter(e =>
            e.getType() === 'm.room.message' || e.getType() === 'm.room.encrypted'
        );
    }

    async loadMoreMessages(roomId: string, limit: number = 30): Promise<boolean> {
        if (!this.client) return false;
        const room = this.client.getRoom(roomId);
        if (!room) return false;
        try {
            return (await this.client.scrollback(room, limit)) !== null;
        } catch { return false; }
    }

    async sendMessage(roomId: string, body: string): Promise<void> {
        if (!this.client) return;
        await this.client.sendTextMessage(roomId, body);
    }

    async sendTyping(roomId: string, isTyping: boolean): Promise<void> {
        if (!this.client) return;
        await this.client.sendTyping(roomId, isTyping, isTyping ? 5000 : 0);
    }

    async markRoomAsRead(roomId: string): Promise<void> {
        if (!this.client) return;
        const room = this.client.getRoom(roomId);
        if (!room) return;
        const lastEvent = room.getLiveTimeline().getEvents().slice(-1)[0];
        if (lastEvent) {
            await this.client.sendReadReceipt(lastEvent);
        }
    }

    getDisplayName(userId: string): string {
        if (!this.client) return userId;
        const user = this.client.getUser(userId);
        return user?.displayName || userId.split(':')[0].substring(1);
    }

    getPresence(userId: string): string {
        if (!this.client) return 'offline';
        const user = this.client.getUser(userId);
        return (user as any)?.presence || 'offline';
    }

    /** Извлечь домен сервера из userId (например, "uplink.local") */
    private getServerDomain(): string {
        const userId = this.client?.getUserId() || '';
        const match = userId.match(/:(.+)$/);
        return match ? match[1] : 'uplink.local';
    }

    /**
     * Получить список пользователей на сервере.
     * Synapse не поддерживает пустую строку — ищем по имени сервера (домену).
     * Исключает текущего пользователя из результатов.
     */
    async searchUsers(query: string = ''): Promise<Array<{
        userId: string;
        displayName: string;
        avatarUrl?: string;
    }>> {
        if (!this.client) return [];

        try {
            // Synapse User Directory не возвращает результаты для пустой строки.
            // Ищем по домену сервера — все userId содержат его (@user:domain).
            const searchTerm = query || this.getServerDomain();
            const response = await this.client.searchUserDirectory({ term: searchTerm, limit: 50 });
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

    /**
     * Найти существующую DM-комнату с пользователем.
     * Проверяет account data m.direct и membership.
     */
    findExistingDM(userId: string): string | null {
        if (!this.client) return null;

        const directMap = this.client.getAccountData('m.direct')?.getContent() || {};
        const dmRoomIds: string[] = directMap[userId] || [];

        for (const roomId of dmRoomIds) {
            const room = this.client.getRoom(roomId);
            if (!room) continue;
            if (room.getMyMembership() !== 'join') continue;

            const member = room.getMember(userId);
            if (member && (member.membership === 'join' || member.membership === 'invite')) {
                return roomId;
            }
        }

        return null;
    }

    /**
     * Создать DM-комнату с пользователем или вернуть существующую.
     */
    async getOrCreateDM(userId: string): Promise<string> {
        if (!this.client) throw new Error('Клиент не инициализирован');

        const existingRoomId = this.findExistingDM(userId);
        if (existingRoomId) return existingRoomId;

        const response = await this.client.createRoom({
            is_direct: true,
            invite: [userId],
            preset: sdk.Preset.PrivateChat,
            initial_state: [],
        });

        const newRoomId = response.room_id;

        const directMap = this.client.getAccountData('m.direct')?.getContent() || {};
        if (!directMap[userId]) {
            directMap[userId] = [];
        }
        if (!directMap[userId].includes(newRoomId)) {
            directMap[userId].push(newRoomId);
        }
        await this.client.setAccountData('m.direct', directMap);

        return newRoomId;
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            this.client.stopClient();
            this.client.removeAllListeners();
            this.client = null;
        }
        this.setConnectionState('disconnected');
    }

    async logout(): Promise<void> {
        if (this.client) {
            try { await this.client.logout(true); } catch { /* ignore */ }
        }
        await this.disconnect();
        this.clearSession();

        // Очистить крипто-хранилище IndexedDB
        try {
            const databases = await indexedDB.databases();
            for (const db of databases) {
                if (db.name && (db.name.includes('matrix') || db.name.includes('crypto'))) {
                    indexedDB.deleteDatabase(db.name);
                    console.log(`Удалена IndexedDB: ${db.name}`);
                }
            }
        } catch {
            console.warn('Не удалось очистить IndexedDB');
        }
    }

    clearSession(): void {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }

    private setConnectionState(state: ConnectionState): void {
        this._connectionState = state;
        this.emitConnectionChange(state);
    }
}

export const matrixService = new MatrixService();
