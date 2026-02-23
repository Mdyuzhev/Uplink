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

        try {
            await this.client.initRustCrypto();
            console.log('Uplink: E2E шифрование включено (Rust crypto)');
        } catch {
            try {
                await this.client.initCrypto();
                console.log('Uplink: E2E шифрование включено (Olm)');
            } catch {
                console.warn('Uplink: E2E шифрование недоступно, работаем без него');
            }
        }

        if (this.client.getCrypto()) {
            this.client.getCrypto()!.globalBlacklistUnverifiedDevices = false;
        }

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
