# 003: Matrix-клиент — Подключение, авторизация, получение комнат

## Цель

Реализовать модуль подключения к Matrix Synapse: авторизация по логину/паролю, хранение токена в VS Code SecretStorage, получение списка комнат, отправка и получение сообщений. Обновить sidebar-провайдеры для отображения реальных данных.

## Контекст

Это ядро мессенджера. После этой задачи расширение сможет подключаться к Synapse, показывать каналы в sidebar и обмениваться сообщениями (пока через Output Channel, без WebView UI).

## Зависимости

- Задача 001 (Docker-инфраструктура) — **блокирующая**, нужен работающий Synapse
- Задача 002 (Extension scaffold) — **блокирующая**, нужна точка входа и провайдеры

## Шаги

### ШАГ 1. Создать src/matrix/client.ts — обёртка Matrix SDK

Класс `MatrixService` — singleton, управляет подключением:

```typescript
import * as matrix from 'matrix-js-sdk';

/**
 * Сервис подключения к Matrix.
 * Singleton — один экземпляр на всё расширение.
 */
export class MatrixService {
    private client: matrix.MatrixClient | null = null;
    private _onConnectionChanged = new EventEmitter<boolean>();
    readonly onConnectionChanged = this._onConnectionChanged.event;

    /** Текущее состояние подключения */
    get isConnected(): boolean { ... }

    /** Подключённый клиент (бросает ошибку если не подключен) */
    get matrixClient(): matrix.MatrixClient { ... }

    /**
     * Авторизация по логину/паролю.
     * Возвращает access_token для сохранения.
     */
    async login(homeserver: string, userId: string, password: string): Promise<string> { ... }

    /**
     * Авторизация по сохранённому токену.
     */
    async loginWithToken(homeserver: string, userId: string, token: string): Promise<void> { ... }

    /**
     * Запуск sync — начать получение событий.
     */
    async startSync(): Promise<void> { ... }

    /**
     * Получить список комнат, в которых состоит пользователь.
     */
    getRooms(): matrix.Room[] { ... }

    /**
     * Получить сообщения комнаты.
     */
    async getRoomMessages(roomId: string, limit?: number): Promise<matrix.MatrixEvent[]> { ... }

    /**
     * Отправить текстовое сообщение.
     */
    async sendMessage(roomId: string, body: string): Promise<void> { ... }

    /**
     * Отправить code snippet с метаданными.
     * Формат: Matrix custom event или formatted_body с HTML.
     */
    async sendCodeSnippet(roomId: string, code: string, language: string, fileName: string, lineNumber: number): Promise<void> { ... }

    /**
     * Отключиться.
     */
    async disconnect(): Promise<void> { ... }
}
```

Обработка ошибок:
- Таймаут подключения: 10 секунд
- Невалидный токен: очистить SecretStorage, показать диалог логина
- Сервер недоступен: показать warning, retry через 30 секунд
- Ошибка sync: логировать, не крашить расширение

### ШАГ 2. Создать src/matrix/auth.ts — управление авторизацией

```typescript
import * as vscode from 'vscode';

/**
 * Управление авторизацией Uplink.
 * Хранит токен в VS Code SecretStorage (зашифрованное хранилище).
 */
export class AuthManager {
    private static TOKEN_KEY = 'uplink.matrix.accessToken';
    private static USER_KEY = 'uplink.matrix.userId';

    constructor(private secrets: vscode.SecretStorage) {}

    /** Сохранить токен после успешного логина */
    async saveToken(userId: string, token: string): Promise<void> { ... }

    /** Получить сохранённый токен */
    async getToken(): Promise<{ userId: string; token: string } | null> { ... }

    /** Очистить токен (logout) */
    async clearToken(): Promise<void> { ... }

    /**
     * Показать диалог авторизации.
     * Цепочка: ввод userId → ввод пароля → логин.
     */
    async promptLogin(): Promise<{ userId: string; password: string } | undefined> {
        const userId = await vscode.window.showInputBox({
            prompt: 'Matrix User ID',
            placeHolder: '@username:uplink.local',
            validateInput: (v) => v.startsWith('@') ? null : 'Формат: @username:domain'
        });
        if (!userId) return undefined;

        const password = await vscode.window.showInputBox({
            prompt: 'Пароль',
            password: true
        });
        if (!password) return undefined;

        return { userId, password };
    }
}
```

### ШАГ 3. Создать src/matrix/rooms.ts — работа с комнатами

```typescript
import * as matrix from 'matrix-js-sdk';

/**
 * Утилиты для работы с комнатами Matrix.
 */
export class RoomsManager {
    constructor(private client: matrix.MatrixClient) {}

    /**
     * Получить комнаты, сгруппированные по типу:
     * - channels: комнаты с alias (публичные каналы, аналог Slack channels)
     * - direct: личные сообщения (DM)
     */
    getGroupedRooms(): { channels: matrix.Room[]; direct: matrix.Room[] } { ... }

    /**
     * Получить отображаемое имя комнаты.
     * Для DM — имя собеседника. Для каналов — название комнаты.
     */
    getRoomDisplayName(room: matrix.Room): string { ... }

    /**
     * Получить последнее сообщение комнаты (для превью в sidebar).
     */
    getLastMessage(room: matrix.Room): { sender: string; body: string; ts: number } | null { ... }

    /**
     * Получить количество непрочитанных сообщений.
     */
    getUnreadCount(room: matrix.Room): number { ... }

    /**
     * Создать DM-комнату с пользователем.
     */
    async createDirectMessage(userId: string): Promise<string> { ... }

    /**
     * Присоединиться к комнате по alias.
     */
    async joinRoom(roomAlias: string): Promise<string> { ... }
}
```

### ШАГ 4. Создать src/matrix/messages.ts — форматирование сообщений

```typescript
/**
 * Форматирование сообщений для отображения и отправки.
 */
export class MessageFormatter {
    /**
     * Форматировать code snippet как Matrix HTML-сообщение.
     * Включает метаданные: файл, строка, язык, ветка.
     */
    static formatCodeSnippet(params: {
        code: string;
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    }): { body: string; formatted_body: string; format: string } { ... }

    /**
     * Распарсить сообщение: определить тип (текст, код, изображение).
     */
    static parseMessage(event: MatrixEvent): ParsedMessage { ... }
}

interface ParsedMessage {
    type: 'text' | 'code' | 'image' | 'file';
    body: string;
    /** Для code: метаданные сниппета */
    codeContext?: {
        language: string;
        fileName: string;
        lineStart: number;
        lineEnd: number;
        gitBranch?: string;
    };
    sender: string;
    timestamp: number;
}
```

### ШАГ 5. Обновить src/providers/channelsProvider.ts

Заменить заглушку на реальные данные из Matrix:

```typescript
/**
 * TreeView провайдер для каналов.
 * Показывает два раздела: Каналы и Личные сообщения.
 */
export class ChannelsProvider implements vscode.TreeDataProvider<ChannelItem> {
    constructor(private matrixService: MatrixService) {}

    getChildren(element?: ChannelItem): ChannelItem[] {
        if (!this.matrixService.isConnected) {
            return [placeholder('Не подключено к серверу')];
        }
        if (!element) {
            // Корневые элементы: секции
            return [
                new ChannelItem('Каналы', 'section', vscode.TreeItemCollapsibleState.Expanded),
                new ChannelItem('Личные сообщения', 'section', vscode.TreeItemCollapsibleState.Expanded),
            ];
        }
        // Дочерние: комнаты в секции
        const rooms = this.roomsManager.getGroupedRooms();
        if (element.label === 'Каналы') return rooms.channels.map(toChannelItem);
        if (element.label === 'Личные сообщения') return rooms.direct.map(toChannelItem);
        return [];
    }
}
```

Каждый ChannelItem должен показывать:
- Иконка: `$(hash)` для каналов, `$(person)` для DM
- Имя комнаты / собеседника
- Description: превью последнего сообщения
- Badge: количество непрочитанных (если > 0)
- Клик: команда `uplink.openChat` с roomId

### ШАГ 6. Обновить src/providers/contactsProvider.ts

```typescript
/**
 * TreeView провайдер для контактов.
 * Показывает пользователей с онлайн-статусом.
 */
export class ContactsProvider implements vscode.TreeDataProvider<ContactItem> {
    getChildren(): ContactItem[] {
        // Получить пользователей из joined rooms
        // Группировка: Online → Offline
        // Иконка: $(circle-filled) зелёная для online, $(circle-outline) для offline
        // Клик: uplink.openDirectMessage с userId
    }
}
```

### ШАГ 7. Обновить src/extension.ts — связать всё вместе

Логика активации:

```
activate() {
    1. Создать MatrixService, AuthManager
    2. Проверить сохранённый токен → если есть, loginWithToken()
    3. Если нет токена или токен истёк → promptLogin()
    4. После успешного логина → startSync()
    5. Создать провайдеры с MatrixService
    6. Зарегистрировать провайдеры
    7. Обновить StatusBar: "$(check) Uplink: @user"
    8. Подписаться на события Matrix:
       - новые сообщения → refresh providers
       - изменение presence → refresh contacts
}

deactivate() {
    1. matrixService.disconnect()
    2. cleanup subscriptions
}
```

### ШАГ 8. Реализовать команду sendSnippet

Обновить обработчик команды `uplink.sendSnippet`:

```typescript
// 1. Получить выделенный текст
// 2. Получить контекст: fileName, lineStart, lineEnd, languageId
// 3. Получить git branch (если есть git extension)
// 4. Показать QuickPick — выбрать комнату для отправки
// 5. Отформатировать через MessageFormatter
// 6. Отправить через MatrixService
// 7. Показать notification: "Код отправлен в #channel"
```

### ШАГ 9. Создать src/context/codeContext.ts

```typescript
import * as vscode from 'vscode';

/**
 * Получение контекста из текущего редактора.
 */
export function getCodeContext(): CodeContext | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;

    return {
        fileName: editor.document.fileName,
        relativePath: vscode.workspace.asRelativePath(editor.document.uri),
        languageId: editor.document.languageId,
        selectedText: editor.document.getText(editor.selection),
        lineStart: editor.selection.start.line + 1,
        lineEnd: editor.selection.end.line + 1,
    };
}

export function getGitBranch(): string | undefined {
    // Использовать VS Code Git extension API
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    // ... получить текущую ветку
}
```

### ШАГ 10. Написать тесты

Файл: `test/suite/matrix.test.ts`

```typescript
suite('MatrixService', () => {
    test('login с неверным паролем возвращает ошибку');
    test('getRooms возвращает массив');
    test('sendMessage отправляет текст');
    test('disconnect очищает состояние');
});
```

Файл: `test/suite/messageFormatter.test.ts`

```typescript
suite('MessageFormatter', () => {
    test('formatCodeSnippet создаёт HTML с подсветкой');
    test('formatCodeSnippet включает метаданные файла');
    test('parseMessage определяет тип code');
    test('parseMessage определяет тип text');
});
```

Файл: `test/suite/context.test.ts`

```typescript
suite('CodeContext', () => {
    test('getCodeContext возвращает null без активного редактора');
    // Остальные тесты требуют мока vscode API
});
```

### ШАГ 11. Проверить интеграцию

1. Запустить Docker-инфраструктуру: `cd docker && docker compose up -d`
2. F5 → Extension Development Host
3. Ctrl+Shift+P → "Uplink: Открыть чат"
4. Ввести credentials тестового пользователя (@dev1:uplink.local / test123)
5. Sidebar должен показать каналы: #general, #backend, #frontend
6. Sidebar должен показать контакты: dev2, dev3 (если online)
7. Выделить код → ПКМ → "Uplink: Отправить код в чат" → выбрать канал → отправить
8. Проверить в Admin Panel (http://localhost:8080) что сообщение дошло

## Критерии приёмки

- [ ] Авторизация по логину/паролю работает
- [ ] Токен сохраняется в SecretStorage, при перезапуске VS Code — автологин
- [ ] Sidebar "Каналы" показывает реальные комнаты из Synapse
- [ ] Sidebar "Контакты" показывает пользователей
- [ ] Команда sendSnippet отправляет код с метаданными (файл, строка, язык)
- [ ] Сообщения появляются в Synapse (проверка через Admin Panel или другой Matrix-клиент)
- [ ] StatusBar показывает статус подключения
- [ ] При недоступности сервера — warning, retry, не crash
- [ ] Тесты проходят

## Коммит

```
[matrix] Интеграция с Matrix Synapse: авторизация, комнаты, сообщения

- MatrixService: login, sync, rooms, messages
- AuthManager: SecretStorage для токенов
- RoomsManager: группировка каналов и DM
- MessageFormatter: code snippets с метаданными
- Обновлены провайдеры sidebar
- Команда sendSnippet с контекстом кода
```
