import * as sdk from 'matrix-js-sdk';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Основной сервис подключения к Matrix.
 * Управляет жизненным циклом: создание клиента → крипто → логин → sync.
 */
export class MatrixService {
    private client: sdk.MatrixClient | null = null;
    private syncStarted = false;

    private _onConnectionChanged = new vscode.EventEmitter<boolean>();
    private _onNewMessage = new vscode.EventEmitter<{ roomId: string; event: sdk.MatrixEvent }>();
    private _onRoomsUpdated = new vscode.EventEmitter<void>();
    private _onPresenceChanged = new vscode.EventEmitter<{ userId: string; presence: string }>();

    readonly onConnectionChanged = this._onConnectionChanged.event;
    readonly onNewMessage = this._onNewMessage.event;
    readonly onRoomsUpdated = this._onRoomsUpdated.event;
    readonly onPresenceChanged = this._onPresenceChanged.event;

    private _isConnected = false;
    get isConnected(): boolean { return this._isConnected; }

    /** Подключённый клиент. Бросает ошибку если не подключен. */
    get matrixClient(): sdk.MatrixClient {
        if (!this.client) {
            throw new Error('Matrix клиент не инициализирован. Вызовите login() или loginWithToken()');
        }
        return this.client;
    }

    /** Авторизация по логину/паролю. */
    async login(
        homeserver: string,
        userId: string,
        password: string,
        _cryptoStorePath: string
    ): Promise<{ accessToken: string; deviceId: string; userId: string }> {
        logger.info(`Подключение к ${homeserver} как ${userId}...`);

        try {
            this.client = sdk.createClient({
                baseUrl: homeserver,
                userId: userId,
            });

            await this.initCrypto();

            const response = await this.client.login('m.login.password', {
                user: userId,
                password: password,
                initial_device_display_name: 'Uplink VS Code',
            });

            logger.info(`Авторизация успешна. Device ID: ${response.device_id}`);

            return {
                accessToken: response.access_token,
                deviceId: response.device_id,
                userId: response.user_id,
            };
        } catch (err) {
            logger.error('Ошибка авторизации', err as Error);
            this.client = null;
            throw err;
        }
    }

    /** Авторизация по сохранённому токену. */
    async loginWithToken(
        homeserver: string,
        userId: string,
        accessToken: string,
        deviceId: string,
        _cryptoStorePath: string
    ): Promise<void> {
        logger.info(`Восстановление сессии ${userId} (device: ${deviceId})...`);

        try {
            this.client = sdk.createClient({
                baseUrl: homeserver,
                accessToken: accessToken,
                userId: userId,
                deviceId: deviceId,
            });

            await this.initCrypto();
            await this.client.whoami();
            logger.info('Сессия восстановлена');
        } catch (err) {
            logger.error('Токен невалиден или сервер недоступен', err as Error);
            this.client = null;
            throw err;
        }
    }

    /** Инициализация E2E шифрования с таймаутом. */
    private async initCrypto(): Promise<void> {
        if (!this.client) { return; }

        const timeout = (ms: number) => new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Crypto init timeout')), ms)
        );

        try {
            await Promise.race([
                this.client.initRustCrypto(),
                timeout(5000),
            ]);
            logger.info('Крипто-бэкенд: Rust (matrix-sdk-crypto-wasm)');
        } catch (_rustErr) {
            logger.warn('Rust crypto недоступен или timeout, пробуем без E2E...');
            // PoC: работаем без шифрования — на localhost это допустимо
            logger.info('PoC-режим: E2E шифрование отключено, чат работает без крипто');
            return;
        }

        const crypto = this.client.getCrypto();
        if (crypto) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (crypto as any).globalBlacklistUnverifiedDevices = false;
            logger.info('PoC-режим: автодоверие устройствам включено');
        }
    }

    /** Запустить sync — получение событий в реальном времени. */
    async startSync(): Promise<void> {
        if (!this.client || this.syncStarted) { return; }

        this.client.on(sdk.ClientEvent.Sync, (state: string) => {
            if (state === 'PREPARED' || state === 'SYNCING') {
                if (!this._isConnected) {
                    this._isConnected = true;
                    this._onConnectionChanged.fire(true);
                    this._onRoomsUpdated.fire();
                    logger.info('Sync активен');
                }
            } else if (state === 'ERROR' || state === 'STOPPED') {
                this._isConnected = false;
                this._onConnectionChanged.fire(false);
                logger.warn(`Sync state: ${state}`);
            } else if (state === 'RECONNECTING') {
                logger.warn('Переподключение к серверу...');
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.client.on(sdk.RoomEvent.Timeline, (event: sdk.MatrixEvent, room: any) => {
            if (event.getType() === 'm.room.message' || event.getType() === 'm.room.encrypted') {
                this._onNewMessage.fire({ roomId: room.roomId, event });
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.client.on(sdk.UserEvent.Presence, (_event: any, user: any) => {
            this._onPresenceChanged.fire({
                userId: user.userId,
                presence: user.presence,
            });
        });

        this.client.on(sdk.RoomEvent.MyMembership, () => {
            this._onRoomsUpdated.fire();
        });

        await this.client.startClient({
            initialSyncLimit: 20,
            includeArchivedRooms: false,
            pollTimeout: 30000,
        });

        this.syncStarted = true;
    }

    /** Получить список joined-комнат. */
    getRooms(): sdk.Room[] {
        if (!this.client) { return []; }
        return this.client.getRooms().filter(room =>
            room.getMyMembership() === 'join'
        );
    }

    /** Получить timeline комнаты. */
    getRoomTimeline(roomId: string): sdk.MatrixEvent[] {
        if (!this.client) { return []; }
        const room = this.client.getRoom(roomId);
        if (!room) { return []; }
        const timeline = room.getLiveTimeline();
        return timeline.getEvents().filter(e =>
            e.getType() === 'm.room.message' || e.getType() === 'm.room.encrypted'
        );
    }

    /** Загрузить историю (scroll back). */
    async loadMoreMessages(roomId: string, limit: number = 30): Promise<boolean> {
        if (!this.client) { return false; }
        const room = this.client.getRoom(roomId);
        if (!room) { return false; }
        try {
            const result = await this.client.scrollback(room, limit);
            return result !== null;
        } catch (err) {
            logger.error(`Ошибка загрузки истории для ${roomId}`, err as Error);
            return false;
        }
    }

    /** Отправить текстовое сообщение. */
    async sendMessage(roomId: string, body: string): Promise<void> {
        this.matrixClient.sendTextMessage(roomId, body);
    }

    /** Отправить code snippet с метаданными. */
    async sendCodeSnippet(roomId: string, params: {
        code: string;
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    }): Promise<void> {
        const { code, language, fileName, lineStart, lineEnd, gitBranch } = params;

        const plainBody = `📄 ${fileName}:${lineStart}-${lineEnd}${gitBranch ? ` (${gitBranch})` : ''}\n\`\`\`${language}\n${code}\n\`\`\``;

        const htmlBody = `<div data-uplink-snippet="true">
            <p><strong>📄 ${this.escapeHtml(fileName)}:${lineStart}-${lineEnd}</strong>${gitBranch ? ` <em>(${this.escapeHtml(gitBranch)})</em>` : ''}</p>
            <pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>
        </div>`;

        await this.matrixClient.sendMessage(roomId, {
            msgtype: 'm.text',
            body: plainBody,
            format: 'org.matrix.custom.html',
            formatted_body: htmlBody,
            'dev.uplink.code_context': {
                language,
                fileName,
                lineStart,
                lineEnd,
                gitBranch: gitBranch || null,
            },
        } as sdk.IContent);
    }

    /** Отправить typing indicator. */
    async sendTyping(roomId: string, isTyping: boolean): Promise<void> {
        if (!this.client) { return; }
        await this.client.sendTyping(roomId, isTyping, isTyping ? 5000 : 0);
    }

    /** Пометить комнату как прочитанную. */
    async markRoomAsRead(roomId: string): Promise<void> {
        if (!this.client) { return; }
        const room = this.client.getRoom(roomId);
        if (!room) { return; }
        const lastEvent = room.getLiveTimeline().getEvents().slice(-1)[0];
        if (lastEvent) {
            await this.client.sendReadReceipt(lastEvent);
        }
    }

    /** Получить display name пользователя. */
    getDisplayName(userId: string): string {
        if (!this.client) { return userId; }
        const user = this.client.getUser(userId);
        return user?.displayName || userId.split(':')[0].substring(1);
    }

    /** Получить presence пользователя. */
    getPresence(userId: string): 'online' | 'offline' | 'unavailable' {
        if (!this.client) { return 'offline'; }
        const user = this.client.getUser(userId);
        return (user?.presence as 'online' | 'offline' | 'unavailable') || 'offline';
    }

    /** Отключиться от Matrix. НЕ очищает криптоключи. */
    async disconnect(): Promise<void> {
        if (this.client) {
            this.client.stopClient();
            this.client.removeAllListeners();
            this.client = null;
        }
        this.syncStarted = false;
        this._isConnected = false;
        this._onConnectionChanged.fire(false);
        logger.info('Отключено от Matrix');
    }

    /** Полный logout — отзывает токен на сервере. */
    async logout(): Promise<void> {
        if (this.client) {
            try {
                await this.client.logout(true);
            } catch (err) {
                logger.warn('Ошибка logout на сервере (игнорируем)');
            }
        }
        await this.disconnect();
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
