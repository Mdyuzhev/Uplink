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

export interface SynapseUser {
    userId: string;
    displayName: string;
    isAdmin: boolean;
    deactivated: boolean;
    avatarUrl?: string;
}

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
            if (event.getType() === 'm.room.message' || event.getType() === 'm.room.encrypted') {
                this.emitNewMessage(room.roomId, event);
                this.emitRoomsUpdated();
            }
        });

        this.client.on(sdk.RoomEvent.MyMembership, (room: sdk.Room, membership: string) => {
            // Авто-принятие invite в DM-комнаты
            if (membership === 'invite') {
                this.autoAcceptInvite(room);
            }
            this.emitRoomsUpdated();
        });

        await this.client.startClient({ initialSyncLimit: 20 });
    }

    /**
     * Инициализация E2E шифрования (Rust crypto / WASM).
     *
     * matrix-sdk-crypto-wasm v7+ НЕ требует SharedArrayBuffer —
     * проверка удалена (она ложно блокировала E2E на мобильных
     * браузерах и при доступе через Cloudflare Tunnel без COOP/COEP).
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
                    await this.updateDirectMap(peerId, room.roomId);
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
                    avatarUrl: this.mxcToHttp(u.avatar_url, 36) || undefined,
                }));
        } catch (err) {
            console.error('Ошибка поиска пользователей:', err);
            return [];
        }
    }

    /**
     * Найти существующую DM-комнату с пользователем.
     *
     * Стратегия:
     * 1. Собрать ВСЕ joined-комнаты с этим пользователем (из m.direct + scan)
     * 2. Если дубликаты — выбрать самую активную (по последнему сообщению)
     * 3. Обновить m.direct если нужно
     */
    findExistingDM(userId: string): string | null {
        if (!this.client) return null;

        const directMap = this.client.getAccountData('m.direct')?.getContent() || {};
        const dmRoomIds: string[] = directMap[userId] || [];
        const myUserId = this.client.getUserId();

        // Собрать все кандидаты: joined-комнаты с этим пользователем
        const candidates: sdk.Room[] = [];

        // Из m.direct
        for (const roomId of dmRoomIds) {
            const room = this.client.getRoom(roomId);
            if (!room) continue;
            if (room.getMyMembership() !== 'join') continue;
            const member = room.getMember(userId);
            if (member && (member.membership === 'join' || member.membership === 'invite')) {
                candidates.push(room);
            }
        }

        // Scan всех joined-комнат (найти пропущенные в m.direct)
        const allRooms = this.client.getRooms().filter(r => r.getMyMembership() === 'join');
        for (const room of allRooms) {
            if (dmRoomIds.includes(room.roomId)) continue;
            if (candidates.some(c => c.roomId === room.roomId)) continue;

            const members = room.getJoinedMembers();
            if (members.length !== 2) continue;
            if (!members.some(m => m.userId === userId)) continue;
            if (!members.some(m => m.userId === myUserId)) continue;

            candidates.push(room);
        }

        if (candidates.length === 0) return null;

        // Выбрать самую активную комнату (по времени последнего события)
        const best = candidates.reduce((a, b) => {
            const tsA = this.getLastEventTs(a);
            const tsB = this.getLastEventTs(b);
            return tsB > tsA ? b : a;
        });

        // Обновить m.direct если комната не была там
        if (!dmRoomIds.includes(best.roomId)) {
            console.log(`Найдена DM с ${userId} вне m.direct: ${best.roomId}, обновляю...`);
            this.updateDirectMap(userId, best.roomId);
        }

        return best.roomId;
    }

    /** Время последнего события в комнате (для выбора самой активной). */
    private getLastEventTs(room: sdk.Room): number {
        const events = room.getLiveTimeline().getEvents();
        if (events.length === 0) return 0;
        return events[events.length - 1].getTs();
    }

    /**
     * Обновить m.direct account data для пользователя.
     */
    private async updateDirectMap(userId: string, roomId: string): Promise<void> {
        if (!this.client) return;
        try {
            const directMap = this.client.getAccountData('m.direct')?.getContent() || {};
            if (!directMap[userId]) {
                directMap[userId] = [];
            }
            if (!directMap[userId].includes(roomId)) {
                directMap[userId].push(roomId);
            }
            await this.client.setAccountData('m.direct', directMap);
        } catch (err) {
            console.warn('Не удалось обновить m.direct:', (err as Error).message);
        }
    }

    /**
     * Создать DM-комнату с пользователем или вернуть существующую.
     *
     * Порядок поиска:
     * 1. Joined-комната через findExistingDM (m.direct + scan)
     * 2. Pending invite от этого пользователя → принять вместо создания дубля
     * 3. Только если ничего нет — создать новую
     */
    async getOrCreateDM(userId: string): Promise<string> {
        if (!this.client) throw new Error('Клиент не инициализирован');

        // 1. Есть ли уже joined-комната?
        const existingRoomId = this.findExistingDM(userId);
        if (existingRoomId) return existingRoomId;

        // 2. Есть ли pending invite от этого пользователя?
        const invitedRoom = this.findInviteFrom(userId);
        if (invitedRoom) {
            await this.client.joinRoom(invitedRoom.roomId);
            await this.updateDirectMap(userId, invitedRoom.roomId);
            console.log(`Принят invite от ${userId} вместо создания дубля: ${invitedRoom.roomId}`);
            this.emitRoomsUpdated();
            return invitedRoom.roomId;
        }

        // 3. Создать новую комнату с E2E шифрованием
        const response = await this.client.createRoom({
            is_direct: true,
            invite: [userId],
            preset: sdk.Preset.PrivateChat,
            initial_state: [
                {
                    type: 'm.room.encryption',
                    state_key: '',
                    content: { algorithm: 'm.megolm.v1.aes-sha2' },
                },
            ],
        });

        const newRoomId = response.room_id;
        await this.updateDirectMap(userId, newRoomId);

        return newRoomId;
    }

    /**
     * Найти комнату, в которую нас пригласил указанный пользователь (invite pending).
     */
    private findInviteFrom(userId: string): sdk.Room | null {
        if (!this.client) return null;
        const myUserId = this.client.getUserId()!;

        for (const room of this.client.getRooms()) {
            if (room.getMyMembership() !== 'invite') continue;

            // Проверить, что invite пришёл от нужного пользователя
            const inviteEvent = room.currentState.getStateEvents('m.room.member', myUserId);
            if (inviteEvent?.getSender() === userId) {
                return room;
            }
        }
        return null;
    }

    // === Профиль пользователя ===

    /** Конвертировать mxc:// URL в HTTP URL для <img src> */
    mxcToHttp(mxcUrl: string | undefined | null, size: number = 96): string | null {
        if (!this.client || !mxcUrl) return null;
        // mxc://serverName/mediaId → /_matrix/client/v1/media/thumbnail/serverName/mediaId
        // Synapse 1.147: старый /_matrix/media/v3/ отключён, нужен новый authenticated endpoint
        const match = mxcUrl.match(/^mxc:\/\/([^/]+)\/(.+)$/);
        if (!match) return null;
        const [, serverName, mediaId] = match;
        const baseUrl = this.client.getHomeserverUrl();
        const token = this.client.getAccessToken();
        const params = new URLSearchParams({ width: String(size), height: String(size), method: 'crop' });
        if (token) params.set('access_token', token);
        return `${baseUrl}/_matrix/client/v1/media/thumbnail/${serverName}/${mediaId}?${params}`;
    }

    /** Получить HTTP URL аватара любого пользователя */
    getUserAvatarUrl(userId: string, size: number = 36): string | null {
        if (!this.client) return null;
        const user = this.client.getUser(userId);
        return this.mxcToHttp(user?.avatarUrl, size);
    }

    getMyDisplayName(): string {
        if (!this.client) return '';
        const user = this.client.getUser(this.client.getUserId()!);
        return user?.displayName || this.client.getUserId()!.split(':')[0].substring(1);
    }

    getMyAvatarUrl(size: number = 96): string | null {
        if (!this.client) return null;
        const user = this.client.getUser(this.client.getUserId()!);
        return this.mxcToHttp(user?.avatarUrl, size);
    }

    /** Получить mxc:// URL аватара через Profile API (не зависит от sync) */
    async fetchMyAvatarUrl(size: number = 96): Promise<string | null> {
        if (!this.client) return null;
        try {
            const profile = await this.client.getProfileInfo(this.client.getUserId()!);
            return this.mxcToHttp(profile.avatar_url, size);
        } catch {
            return null;
        }
    }

    async setDisplayName(name: string): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        await this.client.setDisplayName(name);
    }

    async setAvatar(file: File): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        const response = await this.client.uploadContent(file, {
            type: file.type,
        });
        const mxcUrl = response.content_uri;
        await this.client.setAvatarUrl(mxcUrl);
    }

    /** Получить HTTP URL для скачивания/просмотра полного файла (не thumbnail) */
    mxcToHttpDownload(mxcUrl: string | undefined | null): string | null {
        if (!this.client || !mxcUrl) return null;
        const match = mxcUrl.match(/^mxc:\/\/([^/]+)\/(.+)$/);
        if (!match) return null;
        const [, serverName, mediaId] = match;
        const baseUrl = this.client.getHomeserverUrl();
        const token = this.client.getAccessToken();
        const params = new URLSearchParams();
        if (token) params.set('access_token', token);
        return `${baseUrl}/_matrix/client/v1/media/download/${serverName}/${mediaId}?${params}`;
    }

    /** Загрузить файл на сервер и отправить как сообщение */
    async sendFile(roomId: string, file: File): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        const uploadResponse = await this.client.uploadContent(file, { type: file.type });
        const mxcUrl = uploadResponse.content_uri;
        const isImage = file.type.startsWith('image/');

        if (isImage) {
            const dims = await this.getImageDimensions(file);
            await this.client.sendMessage(roomId, {
                msgtype: 'm.image',
                body: file.name,
                url: mxcUrl,
                info: { mimetype: file.type, size: file.size, w: dims.width, h: dims.height },
            } as any);
        } else {
            await this.client.sendMessage(roomId, {
                msgtype: 'm.file',
                body: file.name,
                url: mxcUrl,
                info: { mimetype: file.type, size: file.size },
            } as any);
        }
    }

    private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(img.src); };
            img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(img.src); };
            img.src = URL.createObjectURL(file);
        });
    }

    // === Каналы (Spaces) и админ ===

    /** Проверить, является ли текущий пользователь серверным админом Synapse */
    async checkIsAdmin(): Promise<boolean> {
        if (!this.client) return false;
        try {
            const userId = this.client.getUserId()!;
            const resp = await this.client.http.authedRequest(
                sdk.Method.Get,
                `/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
                undefined, undefined, { prefix: '' }
            );
            return (resp as Record<string, unknown>)?.admin === true;
        } catch {
            return false;
        }
    }

    /**
     * Создать канал (Matrix Space).
     * Space — комната с типом m.space, в которую вложены обычные комнаты.
     */
    async createSpace(name: string, topic?: string): Promise<string> {
        if (!this.client) throw new Error('Клиент не инициализирован');

        const response = await this.client.createRoom({
            name,
            topic,
            visibility: sdk.Visibility.Private,
            preset: sdk.Preset.PublicChat,
            creation_content: { type: 'm.space' },
            initial_state: [
                {
                    type: 'm.room.join_rules',
                    state_key: '',
                    content: { join_rule: 'public' },
                },
            ],
            power_level_content_override: {
                events: { 'm.space.child': 100 },
            },
        } as Parameters<sdk.MatrixClient['createRoom']>[0]);

        await this.inviteAllUsersToRoom(response.room_id);
        this.emitRoomsUpdated();
        return response.room_id;
    }

    /**
     * Создать комнату внутри канала (Space).
     * Привязывает к Space через m.space.child / m.space.parent, включает E2E.
     */
    async createRoomInSpace(spaceId: string, name: string, topic?: string): Promise<string> {
        if (!this.client) throw new Error('Клиент не инициализирован');

        const response = await this.client.createRoom({
            name,
            topic,
            visibility: sdk.Visibility.Private,
            preset: sdk.Preset.PublicChat,
            initial_state: [
                {
                    type: 'm.room.encryption',
                    state_key: '',
                    content: { algorithm: 'm.megolm.v1.aes-sha2' },
                },
                {
                    type: 'm.room.join_rules',
                    state_key: '',
                    content: { join_rule: 'public' },
                },
                {
                    type: 'm.space.parent',
                    state_key: spaceId,
                    content: { via: [this.getServerDomain()], canonical: true },
                },
            ],
        } as Parameters<sdk.MatrixClient['createRoom']>[0]);

        const roomId = response.room_id;

        // Привязать комнату к Space через m.space.child
        await this.client.sendStateEvent(spaceId, 'm.space.child' as any, {
            via: [this.getServerDomain()],
        }, roomId);

        await this.inviteAllUsersToRoom(roomId);
        this.emitRoomsUpdated();
        return roomId;
    }

    /** Пригласить всех пользователей сервера в комнату */
    private async inviteAllUsersToRoom(roomId: string): Promise<void> {
        if (!this.client) return;
        try {
            const users = await this.searchUsers('');
            const myUserId = this.client.getUserId();
            for (const user of users) {
                if (user.userId === myUserId) continue;
                try {
                    await this.client.invite(roomId, user.userId);
                } catch {
                    // Пользователь уже в комнате — пропускаем
                }
            }
        } catch (err) {
            console.warn('Не удалось пригласить пользователей:', (err as Error).message);
        }
    }

    /** Проверить, является ли комната Space */
    isSpace(roomId: string): boolean {
        if (!this.client) return false;
        const room = this.client.getRoom(roomId);
        if (!room) return false;
        const createEvent = room.currentState.getStateEvents('m.room.create', '');
        return createEvent?.getContent()?.type === 'm.space';
    }

    // === Admin API (Synapse) ===

    /** Список всех пользователей на сервере (Synapse Admin API v2) */
    async listServerUsers(): Promise<SynapseUser[]> {
        if (!this.client) return [];
        try {
            const resp = await this.client.http.authedRequest(
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

    /** Создать пользователя (Synapse Admin API v2) */
    async createUser(username: string, password: string, displayName?: string): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        const domain = this.getServerDomain();
        const userId = `@${username}:${domain}`;
        await this.client.http.authedRequest(
            sdk.Method.Put,
            `/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
            undefined,
            { password, displayname: displayName || username, admin: false },
            { prefix: '' }
        );
    }

    /** Изменить роль админа (Synapse Admin API v2) */
    async setUserAdmin(userId: string, isAdmin: boolean): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        await this.client.http.authedRequest(
            sdk.Method.Put,
            `/_synapse/admin/v2/users/${encodeURIComponent(userId)}`,
            undefined,
            { admin: isAdmin },
            { prefix: '' }
        );
    }

    /** Деактивировать (заблокировать) пользователя — необратимо */
    async deactivateUser(userId: string): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        await this.client.http.authedRequest(
            sdk.Method.Post,
            `/_synapse/admin/v1/deactivate/${encodeURIComponent(userId)}`,
            undefined,
            { erase: false },
            { prefix: '' }
        );
    }

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
        if (!this.client) throw new Error('Клиент не инициализирован');
        const userId = this.client.getUserId()!;
        await this.client.setPassword(
            {
                type: 'm.login.password',
                identifier: { type: 'm.id.user', user: userId },
                password: oldPassword,
            } as any,
            newPassword
        );
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
