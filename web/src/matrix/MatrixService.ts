import * as sdk from 'matrix-js-sdk';
import { AdminService } from './AdminService';
import { MediaService } from './MediaService';
import { MessageService } from './MessageService';
import { PinService } from './PinService';
import { ReactionService } from './ReactionService';
import { ThreadService } from './ThreadService';
import { UserService } from './UserService';
import { RoomService } from './RoomService';
import { SpaceService } from './SpaceService';
import { ThreadIndexService } from './ThreadIndexService';
import { storageGet, storageSet, storageRemove } from '../utils/storage';

/**
 * Сервис подключения к Matrix для веб-приложения.
 *
 * В отличие от VS Code версии, работает напрямую в браузере:
 * - Токен хранится через storage.ts (localStorage / VS Code bridge)
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

    // Модули
    readonly admin: AdminService;
    readonly media: MediaService;
    readonly messages: MessageService;
    readonly pins: PinService;
    readonly reactions: ReactionService;
    readonly threads: ThreadService;
    readonly users: UserService;
    readonly rooms: RoomService;
    readonly spaces: SpaceService;
    readonly threadIndex: ThreadIndexService;

    constructor() {
        const getClient = () => this.getClient();
        this.media = new MediaService(getClient);
        this.messages = new MessageService(getClient);
        this.pins = new PinService(getClient);
        this.reactions = new ReactionService(getClient);
        this.users = new UserService(getClient, this.media.mxcToHttp.bind(this.media));
        this.threads = new ThreadService(getClient, (userId: string) => this.users.getDisplayName(userId));
        this.rooms = new RoomService(
            getClient,
            () => this.users.searchUsers(''),
            () => this.emitRoomsUpdated(),
        );
        this.admin = new AdminService(getClient, this.media.mxcToHttp.bind(this.media));
        this.spaces = new SpaceService(getClient, this.media.mxcToHttp.bind(this.media));
        this.threadIndex = new ThreadIndexService(getClient, (userId: string) => this.users.getDisplayName(userId));
    }

    private _connectionListeners = new Set<Listener<(state: ConnectionState) => void>>();
    private _roomsListeners = new Set<Listener<() => void>>();
    private _messageListeners = new Set<Listener<(roomId: string, event: sdk.MatrixEvent) => void>>();
    private _typingListeners = new Set<Listener<(roomId: string, userIds: string[]) => void>>();
    private _threadListeners = new Set<Listener<(roomId: string, threadRootId: string) => void>>();

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

    onTyping(fn: (roomId: string, userIds: string[]) => void): () => void {
        this._typingListeners.add(fn);
        return () => { this._typingListeners.delete(fn); };
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

            storageSet(STORAGE_KEYS.HOMESERVER, homeserver);
            storageSet(STORAGE_KEYS.USER_ID, response.user_id);
            storageSet(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
            storageSet(STORAGE_KEYS.DEVICE_ID, response.device_id);

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
        const homeserver = storageGet(STORAGE_KEYS.HOMESERVER);
        const userId = storageGet(STORAGE_KEYS.USER_ID);
        const token = storageGet(STORAGE_KEYS.ACCESS_TOKEN);
        const deviceId = storageGet(STORAGE_KEYS.DEVICE_ID);

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
            if (state === 'PREPARED') {
                // При первом sync — принять все ожидающие invite
                this.acceptPendingInvites();
                this.setConnectionState('connected');
                this.emitRoomsUpdated();
            } else if (state === 'SYNCING') {
                this.setConnectionState('connected');
                this.emitRoomsUpdated();
            } else if (state === 'ERROR' || state === 'STOPPED') {
                this.setConnectionState('error');
            }
        });

        this.client.on(sdk.RoomEvent.Timeline, (event: sdk.MatrixEvent, room: sdk.Room | undefined) => {
            if (!room) return;
            const evType = event.getType();
            if (evType === 'm.room.message' || evType === 'm.room.encrypted' || evType === 'm.reaction' || evType === 'm.sticker' || evType === 'm.room.redaction') {
                this.emitNewMessage(room.roomId, event);
                this.emitRoomsUpdated();
            }
        });

        // Redaction — удаление сообщений (отдельный ивент в matrix-js-sdk)
        this.client.on(sdk.RoomEvent.Redaction, (_event: sdk.MatrixEvent, room: sdk.Room) => {
            if (!room) return;
            this.emitNewMessage(room.roomId, _event);
            this.emitRoomsUpdated();
        });

        // Typing indicator
        this.client.on('RoomMember.typing' as any, (_event: any, member: any) => {
            if (!this.client) return;
            const roomId = member.roomId;
            const room = this.client.getRoom(roomId);
            if (!room) return;
            const myUserId = this.client.getUserId();
            const typingIds = room.getMembers()
                .filter((m: any) => m.typing)
                .map((m: any) => m.userId)
                .filter((id: string) => id !== myUserId);
            const displayNames = typingIds.map((id: string) => this.users.getDisplayName(id));
            this._typingListeners.forEach(fn => fn(roomId, displayNames));
        });

        this.client.on(sdk.RoomEvent.MyMembership, (room: sdk.Room, membership: string) => {
            // Авто-принятие invite в DM-комнаты
            if (membership === 'invite') {
                this.autoAcceptInvite(room);
            }
            this.emitRoomsUpdated();
        });

        // Слушать изменения state-событий (pinned messages и др.)
        this.client.on('RoomState.events' as any, (event: sdk.MatrixEvent) => {
            if (event.getType() === 'm.room.pinned_events') {
                const roomId = event.getRoomId();
                if (roomId) this.emitNewMessage(roomId, event);
            }
            if (event.getType() === 'uplink.voice.member') {
                this.emitRoomsUpdated();
            }
        });

        // Подписка на новые и обновлённые треды
        this.client.on('Thread.update' as any, (thread: any) => {
            if (!thread?.roomId || !thread?.id) return;
            this._threadListeners.forEach(fn => fn(thread.roomId, thread.id));
            this.emitRoomsUpdated();
        });

        this.client.on('Thread.new' as any, (thread: any) => {
            if (!thread?.roomId || !thread?.id) return;
            this._threadListeners.forEach(fn => fn(thread.roomId, thread.id));
            this.emitRoomsUpdated();
        });

        await this.client.startClient({ initialSyncLimit: 20, threadSupport: true });
    }

    /**
     * Инициализация E2E шифрования (Rust crypto / WASM).
     *
     * matrix-sdk-crypto-wasm v7+ НЕ требует SharedArrayBuffer —
     * проверка удалена (она ложно блокировала E2E на мобильных
     * браузерах и без COOP/COEP).
     *
     * При ошибке — логируем, но не ломаем приложение.
     * Нешифрованные комнаты продолжат работать.
     */
    private async initCrypto(): Promise<void> {
        if (!this.client) return;

        try {
            await this.client.initRustCrypto();
            console.log('✅ Uplink E2E: Rust crypto (matrix-sdk-crypto-wasm)');
            this.configureCryptoTrust();
        } catch (err) {
            console.error('❌ E2E шифрование не удалось инициализировать:', (err as Error).message);
            console.error('Сообщения в шифрованных комнатах не будут расшифрованы.');
        }
    }

    /**
     * Принять все ожидающие приглашения при начальном sync.
     */
    private async acceptPendingInvites(): Promise<void> {
        if (!this.client) return;
        const invited = this.client.getRooms().filter(r => r.getMyMembership() === 'invite');
        for (const room of invited) {
            this.autoAcceptInvite(room);
        }
    }

    /**
     * Авто-принятие приглашений в комнаты.
     * Без этого DM не работают: Alice создаёт комнату, Bob получает invite,
     * но не видит комнату пока не примет приглашение вручную.
     *
     * После join — обновляем m.direct, чтобы комната показывалась как DM,
     * а не как канал. Иначе получатель и отправитель смотрят в разные комнаты.
     */
    private async autoAcceptInvite(room: sdk.Room): Promise<void> {
        if (!this.client) return;
        try {
            await this.client.joinRoom(room.roomId);
            console.log(`Авто-принятие invite: ${room.roomId}`);

            // Определить, является ли комната DM.
            // Проверяем is_direct из invite-события или по числу участников.
            const myUserId = this.client.getUserId()!;
            const inviteEvent = room.currentState.getStateEvents('m.room.member', myUserId);
            const isDirect = inviteEvent?.getContent()?.is_direct === true;

            if (isDirect) {
                // Найти peer — того, кто пригласил нас
                const peerId = inviteEvent?.getSender();
                if (peerId && peerId !== myUserId) {
                    await this.rooms.updateDirectMap(peerId, room.roomId);
                    console.log(`m.direct обновлён: ${peerId} → ${room.roomId}`);
                }
            }

            this.emitRoomsUpdated();
        } catch (err) {
            console.warn(`Не удалось принять invite ${room.roomId}:`, (err as Error).message);
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

    getAccessToken(): string | null {
        return this.client?.getAccessToken() ?? null;
    }

    getUserId(): string {
        return this.client?.getUserId() || '';
    }

    getRooms(): sdk.Room[] {
        if (!this.client) return [];
        return this.client.getRooms().filter(r => r.getMyMembership() === 'join');
    }

    onThreadUpdate(fn: (roomId: string, threadRootId: string) => void): () => void {
        this._threadListeners.add(fn);
        return () => { this._threadListeners.delete(fn); };
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
        Object.values(STORAGE_KEYS).forEach(key => storageRemove(key));
    }

    private setConnectionState(state: ConnectionState): void {
        this._connectionState = state;
        this.emitConnectionChange(state);
    }
}

export const matrixService = new MatrixService();
