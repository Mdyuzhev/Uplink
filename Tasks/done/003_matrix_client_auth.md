# 003: Matrix-клиент — Подключение, авторизация, шифрование, комнаты, сообщения

## Цель

Реализовать полноценный модуль подключения к Matrix Synapse с E2E шифрованием: авторизация по логину/паролю, хранение токена и криптоключей в VS Code SecretStorage, получение списка комнат, отправка и получение зашифрованных сообщений. Обновить существующие sidebar-провайдеры для отображения реальных данных из Matrix.

## Контекст

Это ядро мессенджера. После этой задачи расширение сможет подключаться к Synapse, показывать каналы в sidebar и обмениваться зашифрованными сообщениями. Шифрование закладывается с первого дня — все комнаты encrypted по умолчанию, расшифровка прозрачна для пользователя.

Matrix использует протокол Olm/Megolm (аналог Signal Double Ratchet) для E2E шифрования. matrix-js-sdk поддерживает его через Rust Crypto бэкенд (matrix-sdk-crypto-wasm). На уровне нашего кода после инициализации крипто-бэкенда SDK автоматически шифрует/расшифровывает сообщения в encrypted-комнатах.

## Зависимости

- Задача 001 (Docker-инфраструктура) — **выполнена** ✅, Synapse работает
- Задача 002 (Extension scaffold) — **выполнена** ✅, точка входа и провайдеры готовы

## Предусловия

Перед началом работы проверь:

```bash
# Synapse работает
curl -sf http://localhost:8008/_matrix/client/versions && echo "✅ Synapse OK"

# Admin Panel работает
curl -sf http://localhost:8080 && echo "✅ Admin OK"

# Тестовые пользователи существуют (dev1, dev2, dev3)
# Тестовые комнаты существуют (#general, #backend, #frontend)

# Extension компилируется
cd E:\Uplink
npm run compile && echo "✅ Build OK"
```

Если Synapse не запущен: `cd docker && docker compose up -d`

---

## ЧАСТЬ 1: Обновление серверной конфигурации (шифрование)

### ШАГ 1.1. Обновить homeserver.yaml — включить E2E по умолчанию

Файл: `docker/synapse/homeserver.yaml`

Добавить/изменить следующие секции:

```yaml
# === E2E ШИФРОВАНИЕ ===

# Включить шифрование по умолчанию для всех новых комнат
encryption_enabled_by_default_for_room_type: all

# Разрешить загрузку ключей устройств (необходимо для E2E)
# Эта секция должна уже быть, убедиться что не отключена
allow_device_name_lookup_over_federation: false
```

### ШАГ 1.2. Пересоздать тестовые комнаты с шифрованием

Если комнаты были созданы БЕЗ шифрования (до обновления конфига), их нужно пересоздать. В Matrix нельзя включить шифрование задним числом для существующей комнаты (только для новых сообщений). Поэтому:

1. Перезапустить Synapse: `cd docker && docker compose restart synapse`
2. Через Admin Panel (http://localhost:8080) или через API удалить старые комнаты #general, #backend, #frontend
3. Создать новые комнаты через Matrix Client API (шифрование включится автоматически благодаря настройке):

```bash
# Получить access token для admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"admin","password":"admin_poc_pass"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Token: $ADMIN_TOKEN"

# Создать комнату #general с шифрованием
curl -s -X POST http://localhost:8008/_matrix/client/v3/createRoom \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_alias_name": "general",
    "name": "General",
    "topic": "Общий канал",
    "visibility": "public",
    "preset": "public_chat",
    "initial_state": [
      {
        "type": "m.room.encryption",
        "state_key": "",
        "content": {
          "algorithm": "m.megolm.v1.aes-sha2"
        }
      }
    ]
  }'

# Аналогично для #backend и #frontend
curl -s -X POST http://localhost:8008/_matrix/client/v3/createRoom \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_alias_name": "backend",
    "name": "Backend",
    "topic": "Backend-команда",
    "visibility": "public",
    "preset": "public_chat",
    "initial_state": [
      {
        "type": "m.room.encryption",
        "state_key": "",
        "content": {
          "algorithm": "m.megolm.v1.aes-sha2"
        }
      }
    ]
  }'

curl -s -X POST http://localhost:8008/_matrix/client/v3/createRoom \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_alias_name": "frontend",
    "name": "Frontend",
    "topic": "Frontend-команда",
    "visibility": "public",
    "preset": "public_chat",
    "initial_state": [
      {
        "type": "m.room.encryption",
        "state_key": "",
        "content": {
          "algorithm": "m.megolm.v1.aes-sha2"
        }
      }
    ]
  }'
```

4. Добавить тестовых пользователей в комнаты (invite + join):

```bash
# Получить room_id для #general
GENERAL_ROOM=$(curl -s http://localhost:8008/_matrix/client/v3/directory/room/%23general:uplink.local \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['room_id'])")

# Invite dev1 в #general
curl -s -X POST "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL_ROOM/invite" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "@dev1:uplink.local"}'

# Повторить для dev2, dev3 и для всех комнат
```

### ШАГ 1.3. Проверить что шифрование включено

```bash
# Проверить state комнаты — должен быть m.room.encryption event
curl -s "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL_ROOM/state/m.room.encryption" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Ожидаемый ответ:
# {"algorithm":"m.megolm.v1.aes-sha2"}
```

---

## ЧАСТЬ 2: Установка зависимостей

### ШАГ 2.1. Установить Matrix SDK с крипто-бэкендом

```bash
cd E:\Uplink
npm install matrix-js-sdk @matrix-org/matrix-sdk-crypto-wasm
```

Если `@matrix-org/matrix-sdk-crypto-wasm` не устанавливается (WASM-пакет, может требовать специальную сборку), использовать fallback:

```bash
# Альтернатива: olm (старый, но стабильный)
npm install @matrix-org/olm
```

Приоритет: сначала попробовать `matrix-sdk-crypto-wasm` (современный, быстрый Rust). Если не получается — `@matrix-org/olm` (проверенный, но deprecated).

### ШАГ 2.2. Проверить что SDK импортируется

Создать временный файл для проверки:

```typescript
import * as sdk from 'matrix-js-sdk';
console.log('Matrix SDK version:', sdk.MatrixClient ? 'OK' : 'FAIL');
```

Скомпилировать, убедиться что нет ошибок типов.

---

## ЧАСТЬ 3: Модуль авторизации

### ШАГ 3.1. Создать src/matrix/auth.ts

```typescript
import * as vscode from 'vscode';

/**
 * Управление авторизацией Uplink.
 * 
 * Хранит access token в VS Code SecretStorage — это зашифрованное
 * системное хранилище (Windows Credential Manager / macOS Keychain / libsecret на Linux).
 * Токен никогда не попадает в открытый текст на диск.
 */
export class AuthManager {
    private static readonly TOKEN_KEY = 'uplink.matrix.accessToken';
    private static readonly USER_KEY = 'uplink.matrix.userId';
    private static readonly DEVICE_KEY = 'uplink.matrix.deviceId';

    constructor(private secrets: vscode.SecretStorage) {}

    /**
     * Сохранить credentials после успешного логина.
     * deviceId критичен для шифрования — каждое устройство имеет свои ключи.
     */
    async saveCredentials(userId: string, token: string, deviceId: string): Promise<void> {
        await this.secrets.store(AuthManager.TOKEN_KEY, token);
        await this.secrets.store(AuthManager.USER_KEY, userId);
        await this.secrets.store(AuthManager.DEVICE_KEY, deviceId);
    }

    /**
     * Получить сохранённые credentials.
     * Возвращает null если пользователь не авторизован.
     */
    async getCredentials(): Promise<{
        userId: string;
        token: string;
        deviceId: string;
    } | null> {
        const token = await this.secrets.get(AuthManager.TOKEN_KEY);
        const userId = await this.secrets.get(AuthManager.USER_KEY);
        const deviceId = await this.secrets.get(AuthManager.DEVICE_KEY);
        if (!token || !userId || !deviceId) return null;
        return { userId, token, deviceId };
    }

    /**
     * Очистить credentials (logout).
     * ВАЖНО: при logout криптоключи тоже должны быть очищены через MatrixService.
     */
    async clearCredentials(): Promise<void> {
        await this.secrets.delete(AuthManager.TOKEN_KEY);
        await this.secrets.delete(AuthManager.USER_KEY);
        await this.secrets.delete(AuthManager.DEVICE_KEY);
    }

    /**
     * Показать диалог авторизации.
     * Цепочка InputBox: homeserver → userId → пароль.
     */
    async promptLogin(): Promise<{
        homeserver: string;
        userId: string;
        password: string;
    } | undefined> {
        // Homeserver (с дефолтом из настроек)
        const defaultHomeserver = vscode.workspace
            .getConfiguration('uplink')
            .get<string>('matrix.homeserver', 'http://localhost:8008');

        const homeserver = await vscode.window.showInputBox({
            prompt: 'Matrix Homeserver URL',
            value: defaultHomeserver,
            placeHolder: 'http://localhost:8008',
            validateInput: (v) => {
                try { new URL(v); return null; }
                catch { return 'Введите корректный URL'; }
            }
        });
        if (!homeserver) return undefined;

        // User ID
        const userId = await vscode.window.showInputBox({
            prompt: 'Matrix User ID',
            placeHolder: '@username:uplink.local',
            validateInput: (v) =>
                v.startsWith('@') && v.includes(':')
                    ? null
                    : 'Формат: @username:domain'
        });
        if (!userId) return undefined;

        // Пароль
        const password = await vscode.window.showInputBox({
            prompt: `Пароль для ${userId}`,
            password: true,
            validateInput: (v) => v.length > 0 ? null : 'Введите пароль'
        });
        if (!password) return undefined;

        return { homeserver, userId, password };
    }
}
```

---

## ЧАСТЬ 4: Крипто-хранилище

### ШАГ 4.1. Создать src/matrix/cryptoStore.ts

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Хранилище криптоключей для E2E шифрования.
 *
 * Криптоключи — это identity keys, one-time keys и session keys.
 * Без них невозможно расшифровать сообщения. Если ключи потеряны —
 * доступ к истории зашифрованных сообщений потерян НАВСЕГДА.
 *
 * Стратегия хранения:
 * - Ключи хранятся в globalStorageUri расширения (персистентная директория VS Code)
 * - Директория уникальна для каждого пользователя ОС
 * - НЕ включается в git, НЕ синхронизируется VS Code Settings Sync
 *
 * В продакшене стоит рассмотреть:
 * - Server-side key backup (m.key_backup) для восстановления при потере устройства
 * - Cross-signing для верификации устройств
 */
export class CryptoStoreManager {

    /**
     * Получить путь к директории криптохранилища.
     * Создаёт директорию если не существует.
     */
    static getCryptoStorePath(context: vscode.ExtensionContext): string {
        const storagePath = context.globalStorageUri.fsPath;
        const cryptoPath = path.join(storagePath, 'crypto');
        if (!fs.existsSync(cryptoPath)) {
            fs.mkdirSync(cryptoPath, { recursive: true });
        }
        return cryptoPath;
    }

    /**
     * Очистить криптохранилище.
     * ВНИМАНИЕ: после этого все зашифрованные сообщения станут нечитаемыми!
     * Вызывать только при явном logout или сбросе.
     */
    static clearCryptoStore(context: vscode.ExtensionContext): void {
        const cryptoPath = this.getCryptoStorePath(context);
        if (fs.existsSync(cryptoPath)) {
            fs.rmSync(cryptoPath, { recursive: true, force: true });
            fs.mkdirSync(cryptoPath, { recursive: true });
        }
    }
}
```

---

## ЧАСТЬ 5: Matrix сервис

### ШАГ 5.1. Создать src/matrix/client.ts

```typescript
import * as sdk from 'matrix-js-sdk';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Основной сервис подключения к Matrix.
 *
 * Управляет жизненным циклом: создание клиента → инициализация крипто →
 * логин → sync → получение комнат/сообщений → disconnect.
 *
 * Шифрование инициализируется автоматически. После initCrypto() SDK сам
 * шифрует сообщения в encrypted-комнатах и расшифровывает входящие.
 * На уровне вызывающего кода разницы между encrypted и unencrypted нет.
 */
export class MatrixService {
    private client: sdk.MatrixClient | null = null;
    private syncStarted = false;

    // Эмиттеры событий для UI
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

    /**
     * Подключённый клиент.
     * Бросает ошибку если не подключен — это защита от вызова методов до логина.
     */
    get matrixClient(): sdk.MatrixClient {
        if (!this.client) {
            throw new Error('Matrix клиент не инициализирован. Вызовите login() или loginWithToken()');
        }
        return this.client;
    }

    /**
     * Авторизация по логину/паролю.
     *
     * 1. Создаёт MatrixClient с указанием cryptoStore
     * 2. Инициализирует крипто-бэкенд (Olm/Megolm)
     * 3. Выполняет login
     * 4. Возвращает credentials для сохранения
     *
     * @param homeserver - URL Synapse сервера
     * @param userId - Matrix User ID (@user:domain)
     * @param password - пароль
     * @param cryptoStorePath - путь к директории криптоключей
     * @returns credentials: { accessToken, deviceId, userId }
     */
    async login(
        homeserver: string,
        userId: string,
        password: string,
        cryptoStorePath: string
    ): Promise<{ accessToken: string; deviceId: string; userId: string }> {
        logger.info(`Подключение к ${homeserver} как ${userId}...`);

        try {
            // Создать клиент
            this.client = sdk.createClient({
                baseUrl: homeserver,
                userId: userId,
                // Крипто-хранилище для IndexedDB (в Node.js — файловая система)
                // matrix-js-sdk использует localStorage-подобное хранилище
                // Для VS Code extension используем store path
            });

            // Инициализировать крипто-бэкенд
            // Это загружает WASM-модуль Olm/Megolm и генерирует device keys
            await this.initCrypto(cryptoStorePath);

            // Логин
            const response = await this.client.login('m.login.password', {
                user: userId,
                password: password,
                // device_id — если не указать, Synapse создаст новый
                // Для E2E важно сохранять device_id между сессиями
                initial_device_display_name: 'Uplink VS Code',
            });

            logger.info(`Авторизация успешна. Device ID: ${response.device_id}`);

            return {
                accessToken: response.access_token,
                deviceId: response.device_id,
                userId: response.user_id,
            };
        } catch (err: any) {
            logger.error('Ошибка авторизации', err);
            this.client = null;
            throw err;
        }
    }

    /**
     * Авторизация по сохранённому токену.
     * Используется при повторном запуске VS Code.
     * device_id ОБЯЗАТЕЛЕН — без него крипто-ключи не совпадут.
     */
    async loginWithToken(
        homeserver: string,
        userId: string,
        accessToken: string,
        deviceId: string,
        cryptoStorePath: string
    ): Promise<void> {
        logger.info(`Восстановление сессии ${userId} (device: ${deviceId})...`);

        try {
            this.client = sdk.createClient({
                baseUrl: homeserver,
                accessToken: accessToken,
                userId: userId,
                deviceId: deviceId,
            });

            await this.initCrypto(cryptoStorePath);

            // Проверить что токен валиден
            await this.client.whoami();
            logger.info('Сессия восстановлена');
        } catch (err: any) {
            logger.error('Токен невалиден или сервер недоступен', err);
            this.client = null;
            throw err;
        }
    }

    /**
     * Инициализация E2E шифрования.
     *
     * Что происходит внутри:
     * 1. Загружается Olm WASM-модуль
     * 2. Генерируются identity keys (ed25519 + curve25519) для устройства
     * 3. Генерируются one-time keys для key exchange
     * 4. Keys загружаются на сервер (/_matrix/client/v3/keys/upload)
     *
     * После этого SDK автоматически:
     * - Шифрует исходящие сообщения в encrypted-комнатах
     * - Расшифровывает входящие зашифрованные сообщения
     * - Обменивается ключами с новыми устройствами (key sharing)
     */
    private async initCrypto(storePath: string): Promise<void> {
        if (!this.client) return;

        try {
            // Попытка 1: Rust crypto (современный, быстрый)
            await this.client.initRustCrypto();
            logger.info('Крипто-бэкенд: Rust (matrix-sdk-crypto-wasm)');
        } catch (rustErr) {
            logger.warn('Rust crypto недоступен, пробуем Olm...');
            try {
                // Попытка 2: Olm (legacy, но стабильный)
                await this.client.initCrypto();
                logger.info('Крипто-бэкенд: Olm');
            } catch (olmErr) {
                // Если оба не доступны — работаем без E2E
                // Сообщения в encrypted-комнатах будут показываться как UTD
                logger.error('E2E шифрование недоступно! Проверьте установку @matrix-org/matrix-sdk-crypto-wasm или @matrix-org/olm');
                logger.warn('Продолжаем без шифрования. Encrypted-комнаты будут нечитаемы.');
            }
        }

        // В PoC-режиме: автоматически доверять всем устройствам
        // Это упрощает разработку, но в продакшене нужна верификация
        // TODO: заменить на cross-signing верификацию
        if (this.client.getCrypto()) {
            this.client.getCrypto()!.globalBlacklistUnverifiedDevices = false;
            logger.info('PoC-режим: автодоверие устройствам включено');
        }
    }

    /**
     * Запустить sync — начать получение событий в реальном времени.
     *
     * Sync — это long-polling соединение с Synapse, которое получает
     * все обновления: новые сообщения, presence, typing indicators и т.д.
     * SDK поддерживает инкрементальный sync (since token) — при переподключении
     * получает только пропущенные события, а не всю историю.
     */
    async startSync(): Promise<void> {
        if (!this.client || this.syncStarted) return;

        // Подписаться на события
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

        // Подписаться на новые сообщения
        this.client.on(sdk.RoomEvent.Timeline, (event: sdk.MatrixEvent, room: any) => {
            if (event.getType() === 'm.room.message' || event.getType() === 'm.room.encrypted') {
                this._onNewMessage.fire({ roomId: room.roomId, event });
            }
        });

        // Подписаться на presence
        this.client.on(sdk.UserEvent.Presence, (event: any, user: any) => {
            this._onPresenceChanged.fire({
                userId: user.userId,
                presence: user.presence,  // 'online' | 'offline' | 'unavailable'
            });
        });

        // Подписаться на обновления комнат (join/leave/name change)
        this.client.on(sdk.RoomEvent.MyMembership, () => {
            this._onRoomsUpdated.fire();
        });

        // Запустить sync
        await this.client.startClient({
            initialSyncLimit: 20,           // последние 20 сообщений на комнату при первом sync
            includeArchivedRooms: false,     // не загружать покинутые комнаты
            pollTimeout: 30000,              // long-poll таймаут 30 секунд
        });

        this.syncStarted = true;
    }

    /**
     * Получить список комнат.
     * Возвращает только комнаты, в которых пользователь состоит (joined).
     */
    getRooms(): sdk.Room[] {
        if (!this.client) return [];
        return this.client.getRooms().filter(room =>
            room.getMyMembership() === 'join'
        );
    }

    /**
     * Получить сообщения комнаты из локального кэша sync.
     * Для загрузки истории использовать scrollback().
     */
    getRoomTimeline(roomId: string): sdk.MatrixEvent[] {
        if (!this.client) return [];
        const room = this.client.getRoom(roomId);
        if (!room) return [];

        const timeline = room.getLiveTimeline();
        return timeline.getEvents().filter(e =>
            e.getType() === 'm.room.message' || e.getType() === 'm.room.encrypted'
        );
    }

    /**
     * Загрузить историю сообщений (scroll back).
     * Запрашивает у сервера предыдущую страницу сообщений.
     */
    async loadMoreMessages(roomId: string, limit: number = 30): Promise<boolean> {
        if (!this.client) return false;
        const room = this.client.getRoom(roomId);
        if (!room) return false;

        try {
            const result = await this.client.scrollback(room, limit);
            return result !== null;  // true если есть ещё история
        } catch (err) {
            logger.error(`Ошибка загрузки истории для ${roomId}`, err as Error);
            return false;
        }
    }

    /**
     * Отправить текстовое сообщение.
     * В encrypted-комнате SDK зашифрует автоматически.
     */
    async sendMessage(roomId: string, body: string): Promise<void> {
        this.matrixClient.sendTextMessage(roomId, body);
    }

    /**
     * Отправить code snippet с метаданными.
     *
     * Используем formatted_body (HTML) для отображения в других Matrix-клиентах,
     * и custom data поля для метаданных Uplink.
     */
    async sendCodeSnippet(roomId: string, params: {
        code: string;
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    }): Promise<void> {
        const { code, language, fileName, lineStart, lineEnd, gitBranch } = params;

        // Формируем human-readable body (для клиентов без поддержки HTML)
        const plainBody = `📄 ${fileName}:${lineStart}-${lineEnd}${gitBranch ? ` (${gitBranch})` : ''}\n\`\`\`${language}\n${code}\n\`\`\``;

        // HTML-версия с подсветкой
        const htmlBody = `<div data-uplink-snippet="true">
            <p><strong>📄 ${this.escapeHtml(fileName)}:${lineStart}-${lineEnd}</strong>${gitBranch ? ` <em>(${this.escapeHtml(gitBranch)})</em>` : ''}</p>
            <pre><code class="language-${language}">${this.escapeHtml(code)}</code></pre>
        </div>`;

        await this.matrixClient.sendMessage(roomId, {
            msgtype: 'm.text',
            body: plainBody,
            format: 'org.matrix.custom.html',
            formatted_body: htmlBody,
            // Custom поля Uplink — другие Matrix-клиенты их проигнорируют
            'dev.uplink.code_context': {
                language,
                fileName,
                lineStart,
                lineEnd,
                gitBranch: gitBranch || null,
            },
        });
    }

    /**
     * Отправить typing indicator.
     */
    async sendTyping(roomId: string, isTyping: boolean): Promise<void> {
        if (!this.client) return;
        await this.client.sendTyping(roomId, isTyping, isTyping ? 5000 : 0);
    }

    /**
     * Пометить комнату как прочитанную.
     */
    async markRoomAsRead(roomId: string): Promise<void> {
        if (!this.client) return;
        const room = this.client.getRoom(roomId);
        if (!room) return;
        const lastEvent = room.getLiveTimeline().getEvents().slice(-1)[0];
        if (lastEvent) {
            await this.client.sendReadReceipt(lastEvent);
        }
    }

    /**
     * Получить display name пользователя.
     */
    getDisplayName(userId: string): string {
        if (!this.client) return userId;
        const user = this.client.getUser(userId);
        return user?.displayName || userId.split(':')[0].substring(1);
    }

    /**
     * Получить presence (online/offline) пользователя.
     */
    getPresence(userId: string): 'online' | 'offline' | 'unavailable' {
        if (!this.client) return 'offline';
        const user = this.client.getUser(userId);
        return (user?.presence as any) || 'offline';
    }

    /**
     * Отключиться от Matrix.
     * Останавливает sync, очищает подписки.
     * НЕ очищает криптоключи — они нужны для следующей сессии.
     */
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

    /**
     * Полный logout — отзывает токен на сервере и очищает состояние.
     */
    async logout(): Promise<void> {
        if (this.client) {
            try {
                await this.client.logout(true);  // true = удалить все токены устройства
            } catch (err) {
                logger.warn('Ошибка logout на сервере (игнорируем)', err as Error);
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
```

---

## ЧАСТЬ 6: Работа с комнатами

### ШАГ 6.1. Создать src/matrix/rooms.ts

```typescript
import * as sdk from 'matrix-js-sdk';

/**
 * Утилиты для работы с комнатами Matrix.
 *
 * Разделяет комнаты на два типа:
 * - Каналы (channels) — групповые комнаты с alias (#general:domain)
 * - Личные сообщения (direct) — DM между двумя пользователями
 *
 * Matrix определяет DM через аккаунт-данные m.direct,
 * которые содержат маппинг userId → [roomId].
 */
export class RoomsManager {
    constructor(private client: sdk.MatrixClient) {}

    /**
     * Получить комнаты, сгруппированные по типу.
     * Каналы сортируются по имени, DM — по времени последнего сообщения.
     */
    getGroupedRooms(): { channels: RoomInfo[]; directs: RoomInfo[] } {
        const rooms = this.client.getRooms().filter(r =>
            r.getMyMembership() === 'join'
        );

        const directRoomIds = this.getDirectRoomIds();

        const channels: RoomInfo[] = [];
        const directs: RoomInfo[] = [];

        for (const room of rooms) {
            const info = this.toRoomInfo(room, directRoomIds);
            if (info.type === 'direct') {
                directs.push(info);
            } else {
                channels.push(info);
            }
        }

        // Каналы по алфавиту, DM по последнему сообщению
        channels.sort((a, b) => a.name.localeCompare(b.name));
        directs.sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));

        return { channels, directs };
    }

    /**
     * Получить IDs комнат, помеченных как DM.
     */
    private getDirectRoomIds(): Set<string> {
        const directMap = this.client.getAccountData('m.direct')?.getContent() || {};
        const ids = new Set<string>();
        for (const userId of Object.keys(directMap)) {
            for (const roomId of directMap[userId]) {
                ids.add(roomId);
            }
        }
        return ids;
    }

    /**
     * Преобразовать Matrix Room в наш RoomInfo.
     */
    private toRoomInfo(room: sdk.Room, directRoomIds: Set<string>): RoomInfo {
        const isDirect = directRoomIds.has(room.roomId);
        const lastEvent = room.getLiveTimeline().getEvents()
            .filter(e => e.getType() === 'm.room.message')
            .slice(-1)[0];

        // Для DM: найти собеседника (member, который не мы)
        let peerId: string | undefined;
        let peerPresence: 'online' | 'offline' | 'unavailable' = 'offline';
        if (isDirect) {
            const members = room.getJoinedMembers();
            const peer = members.find(m => m.userId !== this.client.getUserId());
            if (peer) {
                peerId = peer.userId;
                const user = this.client.getUser(peer.userId);
                peerPresence = (user?.presence as any) || 'offline';
            }
        }

        // Проверить шифрование комнаты
        const isEncrypted = room.hasEncryptionStateEvent();

        return {
            id: room.roomId,
            name: isDirect && peerId
                ? this.getDisplayName(peerId)
                : room.name || 'Без названия',
            type: isDirect ? 'direct' : 'channel',
            encrypted: isEncrypted,
            unreadCount: room.getUnreadNotificationCount('total') || 0,
            lastMessage: lastEvent ? lastEvent.getContent().body || '' : undefined,
            lastMessageSender: lastEvent ? this.getDisplayName(lastEvent.getSender()!) : undefined,
            lastMessageTs: lastEvent ? lastEvent.getTs() : undefined,
            peerId,
            peerPresence,
            topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
        };
    }

    /**
     * Получить display name.
     */
    private getDisplayName(userId: string): string {
        const user = this.client.getUser(userId);
        return user?.displayName || userId.split(':')[0].substring(1);
    }

    /**
     * Создать DM-комнату с пользователем.
     * Возвращает roomId.
     */
    async createDirectMessage(userId: string): Promise<string> {
        const result = await this.client.createRoom({
            is_direct: true,
            invite: [userId],
            preset: sdk.Preset.TrustedPrivateChat,  // приватная, encrypted
            initial_state: [
                {
                    type: 'm.room.encryption',
                    state_key: '',
                    content: { algorithm: 'm.megolm.v1.aes-sha2' },
                },
            ],
        });
        return result.room_id;
    }

    /**
     * Присоединиться к комнате по alias (#name:domain).
     */
    async joinRoom(roomAlias: string): Promise<string> {
        const result = await this.client.joinRoom(roomAlias);
        return result.roomId;
    }
}

/**
 * Информация о комнате для отображения в UI.
 */
export interface RoomInfo {
    id: string;
    name: string;
    type: 'channel' | 'direct';
    encrypted: boolean;
    unreadCount: number;
    lastMessage?: string;
    lastMessageSender?: string;
    lastMessageTs?: number;
    peerId?: string;
    peerPresence?: 'online' | 'offline' | 'unavailable';
    topic?: string;
}
```

---

## ЧАСТЬ 7: Форматирование сообщений

### ШАГ 7.1. Создать src/matrix/messages.ts

```typescript
import * as sdk from 'matrix-js-sdk';

/**
 * Парсинг и форматирование сообщений Matrix.
 *
 * Обрабатывает:
 * - Обычные текстовые сообщения
 * - Code snippets Uplink (с метаданными dev.uplink.code_context)
 * - Зашифрованные сообщения, которые не удалось расшифровать (UTD)
 * - Изображения и файлы
 */
export class MessageFormatter {

    /**
     * Распарсить MatrixEvent в структуру для UI.
     *
     * Для encrypted-сообщений: если SDK расшифровал — получаем обычный
     * clearEvent. Если не расшифровал — показываем placeholder "🔒 Зашифрованное сообщение".
     */
    static parseEvent(event: sdk.MatrixEvent): ParsedMessage | null {
        // Пропускаем не-сообщения (state events, reactions, etc.)
        const type = event.getType();
        if (type !== 'm.room.message' && type !== 'm.room.encrypted') {
            return null;
        }

        // Для encrypted: проверяем, расшифровано ли
        if (type === 'm.room.encrypted' && !event.isDecryptionFailure() && !event.getClearContent()) {
            // Ещё не расшифровано — ждём
            return {
                id: event.getId()!,
                sender: event.getSender()!,
                timestamp: event.getTs(),
                type: 'encrypted',
                body: '🔒 Расшифровка...',
            };
        }

        if (event.isDecryptionFailure()) {
            return {
                id: event.getId()!,
                sender: event.getSender()!,
                timestamp: event.getTs(),
                type: 'encrypted',
                body: '🔒 Не удалось расшифровать сообщение',
            };
        }

        const content = event.getContent();
        const msgtype = content.msgtype;

        // Проверяем: это Uplink code snippet?
        if (content['dev.uplink.code_context']) {
            return {
                id: event.getId()!,
                sender: event.getSender()!,
                timestamp: event.getTs(),
                type: 'code',
                body: content.body || '',
                codeContext: content['dev.uplink.code_context'],
            };
        }

        // Обычные типы сообщений
        switch (msgtype) {
            case 'm.text':
                return {
                    id: event.getId()!,
                    sender: event.getSender()!,
                    timestamp: event.getTs(),
                    type: 'text',
                    body: content.body || '',
                    formattedBody: content.formatted_body,
                };

            case 'm.image':
                return {
                    id: event.getId()!,
                    sender: event.getSender()!,
                    timestamp: event.getTs(),
                    type: 'image',
                    body: content.body || 'Изображение',
                    url: content.url,  // mxc:// URL — нужно преобразовать через client.mxcUrlToHttp()
                };

            case 'm.file':
                return {
                    id: event.getId()!,
                    sender: event.getSender()!,
                    timestamp: event.getTs(),
                    type: 'file',
                    body: content.body || 'Файл',
                    url: content.url,
                    fileSize: content.info?.size,
                };

            default:
                return {
                    id: event.getId()!,
                    sender: event.getSender()!,
                    timestamp: event.getTs(),
                    type: 'text',
                    body: content.body || `[${msgtype}]`,
                };
        }
    }
}

export interface ParsedMessage {
    id: string;
    sender: string;
    timestamp: number;
    type: 'text' | 'code' | 'image' | 'file' | 'encrypted';
    body: string;
    formattedBody?: string;
    codeContext?: {
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    };
    url?: string;
    fileSize?: number;
}
```

---

## ЧАСТЬ 8: Контекст кода

### ШАГ 8.1. Создать src/context/codeContext.ts

```typescript
import * as vscode from 'vscode';

/**
 * Получение контекста из текущего редактора VS Code.
 * Используется при отправке code snippets в чат.
 */
export interface CodeContext {
    selectedText: string;
    fileName: string;
    relativePath: string;
    languageId: string;
    lineStart: number;
    lineEnd: number;
    gitBranch?: string;
}

/**
 * Получить контекст текущего выделения в редакторе.
 * Возвращает null если нет активного редактора или выделения.
 */
export function getCodeContext(): CodeContext | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;

    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text) return null;

    return {
        selectedText: text,
        fileName: editor.document.fileName,
        relativePath: vscode.workspace.asRelativePath(editor.document.uri),
        languageId: editor.document.languageId,
        lineStart: selection.start.line + 1,
        lineEnd: selection.end.line + 1,
        gitBranch: getGitBranch(),
    };
}

/**
 * Получить текущую Git-ветку через встроенный VS Code Git extension.
 */
function getGitBranch(): string | undefined {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) return undefined;

        const api = gitExtension.getAPI(1);
        if (!api || api.repositories.length === 0) return undefined;

        const repo = api.repositories[0];
        return repo.state.HEAD?.name || undefined;
    } catch {
        return undefined;
    }
}
```

### ШАГ 8.2. Создать src/context/gitContext.ts

```typescript
import * as vscode from 'vscode';

/**
 * Расширенная Git-информация для привязки сообщений к контексту разработки.
 * Используется в будущих фичах: привязка чатов к MR, автоматические каналы по веткам.
 */
export interface GitInfo {
    branch: string;
    remoteUrl?: string;
    lastCommitHash?: string;
    lastCommitMessage?: string;
    isDirty: boolean;
}

/**
 * Получить информацию о текущем Git-репозитории.
 */
export function getGitInfo(): GitInfo | null {
    try {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) return null;

        const api = gitExtension.getAPI(1);
        if (!api || api.repositories.length === 0) return null;

        const repo = api.repositories[0];
        const head = repo.state.HEAD;

        return {
            branch: head?.name || 'detached',
            remoteUrl: repo.state.remotes[0]?.fetchUrl,
            lastCommitHash: head?.commit?.substring(0, 8),
            lastCommitMessage: head?.name,  // упрощённо для PoC
            isDirty: repo.state.workingTreeChanges.length > 0,
        };
    } catch {
        return null;
    }
}
```

---

## ЧАСТЬ 9: Обновить провайдеры sidebar

### ШАГ 9.1. Обновить src/providers/channelsProvider.ts

Заменить заглушку на реальные данные. Использовать MatrixService и RoomsManager.

Структура TreeView:

```
▾ 🔒 Каналы                    ← секция (encrypted-индикатор)
    # general              3   ← имя + badge непрочитанных
    # backend                  
    # frontend                 
▾ Личные сообщения
    🟢 Петров                  ← online
    ⚪ Сидоров                 ← offline
```

ChannelItem extends TreeItem:
- `iconPath`: `$(hash)` для каналов, `$(person)` для DM
- `description`: превью последнего сообщения (обрезанное до 50 символов)
- `contextValue`: 'channel' или 'direct' (для контекстного меню)
- Клик: `command: 'uplink.openChat'` с аргументом `{ roomId }`
- Badge: `resourceUri` с query-параметром для badge count (или использовать description)

Подписка на обновления:
- `matrixService.onRoomsUpdated` → `channelsProvider.refresh()`
- `matrixService.onNewMessage` → обновить lastMessage и unreadCount → `refresh()`

### ШАГ 9.2. Обновить src/providers/contactsProvider.ts

Собирать уникальных пользователей из всех joined-комнат. Группировать: Online → Offline.

ContactItem extends TreeItem:
- `iconPath`: зелёный/серый circle для online/offline
- `description`: presence status
- Клик: открыть или создать DM-комнату

Подписка: `matrixService.onPresenceChanged` → `contactsProvider.refresh()`

---

## ЧАСТЬ 10: Обновить extension.ts

### ШАГ 10.1. Переписать activate()

Полная логика активации:

```typescript
export async function activate(context: vscode.ExtensionContext) {
    logger.info('Uplink: активация расширения');

    // 1. Создать сервисы
    const authManager = new AuthManager(context.secrets);
    const matrixService = new MatrixService();
    const cryptoStorePath = CryptoStoreManager.getCryptoStorePath(context);

    // 2. Создать провайдеры (пока без данных)
    const channelsProvider = new ChannelsProvider(matrixService);
    const contactsProvider = new ContactsProvider(matrixService);
    vscode.window.registerTreeDataProvider('uplink.channels', channelsProvider);
    vscode.window.registerTreeDataProvider('uplink.contacts', contactsProvider);

    // 3. Status bar
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar.command = 'uplink.openChat';
    updateStatusBar(statusBar, false);
    statusBar.show();

    // 4. Подписки на события Matrix
    matrixService.onConnectionChanged((connected) => {
        updateStatusBar(statusBar, connected);
        if (connected) {
            channelsProvider.refresh();
            contactsProvider.refresh();
        }
    });
    matrixService.onRoomsUpdated(() => channelsProvider.refresh());
    matrixService.onNewMessage(() => channelsProvider.refresh());
    matrixService.onPresenceChanged(() => contactsProvider.refresh());

    // 5. Попытка автологина по сохранённому токену
    const config = getConfig();
    const savedCreds = await authManager.getCredentials();

    if (savedCreds && config.autoConnect) {
        try {
            await matrixService.loginWithToken(
                config.homeserver,
                savedCreds.userId,
                savedCreds.token,
                savedCreds.deviceId,
                cryptoStorePath
            );
            await matrixService.startSync();
            logger.info('Автологин успешен');
        } catch (err) {
            logger.warn('Автологин не удался, требуется повторная авторизация');
            await authManager.clearCredentials();
        }
    }

    // 6. Регистрация команд
    // uplink.openChat — пока показывает info (WebView будет в задаче 004)
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.openChat', async () => {
            if (!matrixService.isConnected) {
                // Показать диалог логина
                const loginData = await authManager.promptLogin();
                if (!loginData) return;

                try {
                    const creds = await matrixService.login(
                        loginData.homeserver,
                        loginData.userId,
                        loginData.password,
                        cryptoStorePath
                    );
                    await authManager.saveCredentials(creds.userId, creds.accessToken, creds.deviceId);
                    await matrixService.startSync();
                    vscode.window.showInformationMessage(`Uplink: подключено как ${creds.userId}`);
                } catch (err: any) {
                    vscode.window.showErrorMessage(`Uplink: ошибка подключения — ${err.message}`);
                }
            } else {
                vscode.window.showInformationMessage('Uplink: чат будет здесь (задача 004)');
            }
        })
    );

    // uplink.sendSnippet — отправка выделенного кода
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.sendSnippet', async () => {
            if (!matrixService.isConnected) {
                vscode.window.showWarningMessage('Uplink: сначала подключитесь к серверу');
                return;
            }

            const codeCtx = getCodeContext();
            if (!codeCtx) {
                vscode.window.showWarningMessage('Uplink: выделите код для отправки');
                return;
            }

            // Показать QuickPick — выбрать комнату
            const roomsManager = new RoomsManager(matrixService.matrixClient);
            const { channels, directs } = roomsManager.getGroupedRooms();
            const allRooms = [...channels, ...directs];

            const picked = await vscode.window.showQuickPick(
                allRooms.map(r => ({
                    label: r.type === 'channel' ? `# ${r.name}` : `👤 ${r.name}`,
                    description: r.encrypted ? '🔒' : '',
                    roomId: r.id,
                })),
                { placeHolder: 'Выберите канал для отправки кода' }
            );
            if (!picked) return;

            try {
                await matrixService.sendCodeSnippet(picked.roomId, {
                    code: codeCtx.selectedText,
                    language: codeCtx.languageId,
                    fileName: codeCtx.relativePath,
                    lineStart: codeCtx.lineStart,
                    lineEnd: codeCtx.lineEnd,
                    gitBranch: codeCtx.gitBranch,
                });
                vscode.window.showInformationMessage(
                    `Uplink: код отправлен в ${picked.label}`
                );
            } catch (err: any) {
                vscode.window.showErrorMessage(`Uplink: ошибка отправки — ${err.message}`);
            }
        })
    );

    // uplink.startCall — заглушка (задача 005)
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.startCall', () => {
            vscode.window.showInformationMessage('Uplink: звонки будут в задаче 005');
        })
    );

    // uplink.disconnect — отключение
    context.subscriptions.push(
        vscode.commands.registerCommand('uplink.disconnect', async () => {
            await matrixService.logout();
            await authManager.clearCredentials();
            CryptoStoreManager.clearCryptoStore(context);
            channelsProvider.refresh();
            contactsProvider.refresh();
            vscode.window.showInformationMessage('Uplink: отключено');
        })
    );

    context.subscriptions.push(statusBar);
}

function updateStatusBar(item: vscode.StatusBarItem, connected: boolean) {
    if (connected) {
        item.text = '$(check) Uplink';
        item.tooltip = 'Uplink: подключено';
        item.backgroundColor = undefined;
    } else {
        item.text = '$(plug) Uplink';
        item.tooltip = 'Uplink: нажмите для подключения';
        item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
}

export function deactivate() {
    logger.info('Uplink: деактивация');
    // MatrixService.disconnect() вызовется через dispose subscriptions
}
```

Не забудь добавить все необходимые импорты в начало файла.

---

## ЧАСТЬ 11: Тесты

### ШАГ 11.1. Создать test/suite/matrix.test.ts

```typescript
import * as assert from 'assert';

suite('MatrixService', () => {
    test('getRooms возвращает пустой массив до подключения', () => {
        const { MatrixService } = require('../../src/matrix/client');
        const service = new MatrixService();
        assert.deepStrictEqual(service.getRooms(), []);
    });

    test('isConnected = false до подключения', () => {
        const { MatrixService } = require('../../src/matrix/client');
        const service = new MatrixService();
        assert.strictEqual(service.isConnected, false);
    });

    test('matrixClient бросает ошибку до подключения', () => {
        const { MatrixService } = require('../../src/matrix/client');
        const service = new MatrixService();
        assert.throws(() => service.matrixClient, /не инициализирован/);
    });
});
```

### ШАГ 11.2. Создать test/suite/messages.test.ts

```typescript
import * as assert from 'assert';

suite('MessageFormatter', () => {
    test('parseEvent возвращает null для state event', () => {
        const { MessageFormatter } = require('../../src/matrix/messages');
        // Мок события с типом m.room.member
        const mockEvent = {
            getType: () => 'm.room.member',
        };
        assert.strictEqual(MessageFormatter.parseEvent(mockEvent), null);
    });

    // Дополнительные тесты с моками MatrixEvent
});
```

### ШАГ 11.3. Создать test/suite/context.test.ts

```typescript
import * as assert from 'assert';

suite('CodeContext', () => {
    test('модуль загружается без ошибок', () => {
        const context = require('../../src/context/codeContext');
        assert.ok(context.getCodeContext);
    });
});
```

---

## ЧАСТЬ 12: Финальная проверка

### ШАГ 12.1. Компиляция и линтер

```bash
cd E:\Uplink
npm run compile
npm run lint
```

Должно пройти без ошибок. Если matrix-js-sdk вызывает проблемы с типами — добавить в tsconfig.json `"skipLibCheck": true` (уже должно быть).

### ШАГ 12.2. Интеграционная проверка (ручная)

1. Убедиться Docker запущен: `cd docker && docker compose up -d`
2. F5 → Extension Development Host
3. Ctrl+Shift+P → "Uplink: Открыть чат"
4. Ввести: homeserver = `http://localhost:8008`, userId = `@dev1:uplink.local`, password = `test123`
5. Проверить:
   - StatusBar меняется на "✓ Uplink"
   - Sidebar "Каналы" показывает: #general, #backend, #frontend с 🔒
   - Sidebar "Контакты" показывает: dev2, dev3
6. Выделить код в редакторе → ПКМ → "Uplink: Отправить код в чат" → выбрать #general → отправить
7. Открыть Admin Panel (http://localhost:8080) → проверить что сообщение появилось в комнате
8. Ctrl+Shift+P → "Uplink: Отключиться" → StatusBar возвращается к "⏻ Uplink"
9. Перезапустить Extension Development Host → проверить автологин (StatusBar сразу "✓ Uplink")

### ШАГ 12.3. Проверка шифрования

```bash
# Проверить через Admin API что сообщения зашифрованы:
# В базе данных Synapse сообщения хранятся как m.room.encrypted events
# Через Admin Panel → Rooms → #general → Events — тип должен быть m.room.encrypted
```

---

## Критерии приёмки

- [ ] Synapse настроен: шифрование включено по умолчанию для всех комнат
- [ ] Тестовые комнаты пересозданы с `m.room.encryption` state event
- [ ] `matrix-js-sdk` + крипто-бэкенд установлены и работают
- [ ] Авторизация по логину/паролю работает
- [ ] Токен и deviceId сохраняются в SecretStorage, автологин при перезапуске VS Code
- [ ] Крипто-бэкенд инициализируется (Rust или Olm), ключи генерируются
- [ ] Sidebar "Каналы" показывает реальные комнаты с индикатором 🔒 (encrypted)
- [ ] Sidebar "Контакты" показывает пользователей с онлайн-статусом
- [ ] `sendMessage()` отправляет зашифрованное сообщение (проверить тип event в Synapse)
- [ ] `sendCodeSnippet()` отправляет код с метаданными (файл, строка, язык, ветка)
- [ ] Входящие сообщения расшифровываются и отображаются (пока в логе, WebView в задаче 004)
- [ ] UTD-сообщения (не удалось расшифровать) показывают placeholder, а не crash
- [ ] StatusBar корректно отображает статус (подключено/отключено)
- [ ] Graceful degradation: если крипто недоступен — предупреждение в логе, работа без E2E
- [ ] Graceful degradation: если сервер недоступен — warning, не crash
- [ ] `npm run compile` — 0 ошибок
- [ ] `npm run lint` — 0 ошибок
- [ ] Тесты проходят

## Коммит

```
[matrix] Интеграция с Matrix Synapse: авторизация, E2E шифрование, комнаты, сообщения

- MatrixService: login, sync, rooms, messages, E2E crypto
- AuthManager: SecretStorage для токенов и deviceId
- CryptoStoreManager: хранение криптоключей в globalStorageUri
- RoomsManager: группировка каналов/DM, presence, encryption status
- MessageFormatter: парсинг текста, code snippets, UTD fallback
- CodeContext: получение контекста редактора (файл, строка, ветка)
- Обновлены провайдеры sidebar (реальные данные из Matrix)
- Обновлён extension.ts: автологин, команды sendSnippet и disconnect
- homeserver.yaml: encryption_enabled_by_default_for_room_type: all
- Тестовые комнаты пересозданы с E2E шифрованием
```
