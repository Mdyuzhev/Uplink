# 007: Веб-приложение чата (standalone React + Matrix SDK)

## Цель

Создать standalone веб-приложение Uplink Web — полноценный чат-клиент, работающий в браузере. UI повторяет Slack-стиль из VS Code расширения, но работает с Matrix SDK напрямую, без прослойки extension host. Приложение должно быть готово к использованию как PWA на мобильных устройствах.

## Контекст

VS Code расширение хранит credentials глобально — нельзя открыть два аккаунта одновременно. Веб-приложение решает эту проблему: каждая вкладка браузера — независимый клиент. Кроме того, веб-версия будет доступна разработчикам, которые не используют VS Code (JetBrains, vim), и на мобильных устройствах.

Архитектурно веб-приложение работает с тем же сервером Synapse, использует тот же Matrix-протокол. Отличие от расширения: вместо postMessage между WebView и extension host — прямое подключение к Matrix через matrix-js-sdk в браузере.

## Зависимости

- Задача 001 (Docker-инфраструктура) — **выполнена** ✅, Synapse работает
- Задача 006 (Тестовые пользователи) — желательно, но не блокирует

## Стек технологий

- **Vite** — сборщик (быстрый dev server, HMR, оптимальный production build)
- **React 18** — UI
- **TypeScript** — strict mode
- **matrix-js-sdk** — прямое подключение к Synapse из браузера
- **CSS** — переменные для dark/light тем (без CSS-фреймворков для минимального размера)

Vite выбран вместо webpack, потому что для standalone веб-приложения он значительно быстрее в dev-режиме и проще в настройке. Webpack остаётся для сборки WebView расширения.

---

## ЧАСТЬ 1: Инициализация проекта

### ШАГ 1.1. Создать каталог веб-приложения

Веб-приложение живёт внутри репозитория Uplink, в папке `web/`:

```bash
cd E:\Uplink
mkdir web
cd web
```

### ШАГ 1.2. Инициализировать Vite проект

```bash
npm create vite@latest . -- --template react-ts
```

Если интерактивный режим не работает, создать вручную:

Файл: `web/package.json`

```json
{
  "name": "uplink-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 3000",
    "build": "tsc && vite build",
    "preview": "vite preview --port 3000",
    "lint": "eslint . --ext ts,tsx"
  },
  "dependencies": {
    "matrix-js-sdk": "^31.6.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.56.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  }
}
```

### ШАГ 1.3. Создать vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',  // доступно по IP в локальной сети (мобилка)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

### ШАГ 1.4. Создать tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

### ШАГ 1.5. Создать структуру каталогов

```bash
mkdir -p src/components
mkdir -p src/matrix
mkdir -p src/hooks
mkdir -p src/styles
mkdir -p public
```

Итоговая структура `web/`:

```
web/
├── public/
│   ├── manifest.json         # PWA манифест
│   ├── uplink-icon-192.png   # иконка PWA
│   └── uplink-icon-512.png   # иконка PWA
├── src/
│   ├── main.tsx              # точка входа React
│   ├── App.tsx               # корневой компонент (роутинг login/chat)
│   ├── matrix/
│   │   ├── MatrixService.ts  # подключение, sync, комнаты, сообщения
│   │   ├── RoomsManager.ts   # группировка каналов/DM
│   │   └── MessageFormatter.ts  # парсинг сообщений
│   ├── hooks/
│   │   ├── useMatrix.ts      # React hook для MatrixService
│   │   ├── useRooms.ts       # hook для списка комнат
│   │   └── useMessages.ts    # hook для сообщений комнаты
│   ├── components/
│   │   ├── LoginScreen.tsx   # экран авторизации
│   │   ├── ChatLayout.tsx    # основной layout (sidebar + main)
│   │   ├── Sidebar.tsx       # панель каналов и DM
│   │   ├── RoomHeader.tsx    # заголовок комнаты
│   │   ├── MessageList.tsx   # лента сообщений
│   │   ├── MessageBubble.tsx # одно сообщение
│   │   ├── CodeSnippet.tsx   # блок кода
│   │   ├── MessageInput.tsx  # поле ввода
│   │   └── Avatar.tsx        # аватар пользователя
│   └── styles/
│       ├── variables.css     # CSS-переменные (dark/light)
│       ├── global.css        # глобальные стили
│       ├── login.css         # стили логина
│       └── chat.css          # стили чата
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .eslintrc.json
```

---

## ЧАСТЬ 2: HTML-точка входа и PWA

### ШАГ 2.1. Создать index.html

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#1a1d23">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Uplink">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/uplink-icon-192.png">
    <title>Uplink</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### ШАГ 2.2. Создать PWA manifest

Файл: `web/public/manifest.json`

```json
{
  "name": "Uplink",
  "short_name": "Uplink",
  "description": "Контекстный мессенджер для разработчиков",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1d23",
  "theme_color": "#1a1d23",
  "orientation": "any",
  "icons": [
    {
      "src": "/uplink-icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/uplink-icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### ШАГ 2.3. Создать PWA иконки

Сгенерировать простые PNG-иконки программно (через canvas в Node.js или использовать SVG → PNG конвертацию). Минимальный вариант — создать SVG и сконвертировать.

Если конвертация сложна, создай placeholder PNG — квадрат 192x192 и 512x512 с текстом "U" на тёмном фоне. Можно использовать ImageMagick, sharp, или просто скопировать `media/uplink-icon.svg` и отконвертировать позже.

---

## ЧАСТЬ 3: Matrix-сервис для браузера

### ШАГ 3.1. Создать src/matrix/MatrixService.ts

Это ключевой модуль — прямое подключение к Matrix из браузера. Отличие от VS Code версии: нет SecretStorage (используем localStorage для токена), нет vscode.EventEmitter (используем нативные EventTarget или колбэки).

```typescript
import * as sdk from 'matrix-js-sdk';

/**
 * Сервис подключения к Matrix для веб-приложения.
 *
 * В отличие от VS Code версии, работает напрямую в браузере:
 * - Токен хранится в localStorage (для PoC допустимо)
 * - Крипто-ключи хранятся в IndexedDB
 * - События передаются через callback-функции
 */

// Ключи localStorage
const STORAGE_KEYS = {
    HOMESERVER: 'uplink_homeserver',
    USER_ID: 'uplink_user_id',
    ACCESS_TOKEN: 'uplink_access_token',
    DEVICE_ID: 'uplink_device_id',
};

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MatrixServiceCallbacks {
    onConnectionChange?: (state: ConnectionState) => void;
    onRoomsUpdated?: () => void;
    onNewMessage?: (roomId: string, event: sdk.MatrixEvent) => void;
    onPresenceChanged?: (userId: string, presence: string) => void;
}

export class MatrixService {
    private client: sdk.MatrixClient | null = null;
    private callbacks: MatrixServiceCallbacks = {};
    private _connectionState: ConnectionState = 'disconnected';

    get connectionState(): ConnectionState { return this._connectionState; }
    get isConnected(): boolean { return this._connectionState === 'connected'; }

    /** Установить callbacks для событий */
    setCallbacks(cb: MatrixServiceCallbacks): void {
        this.callbacks = cb;
    }

    /**
     * Авторизация по логину/паролю.
     * Сохраняет credentials в localStorage.
     */
    async login(homeserver: string, userId: string, password: string): Promise<void> {
        this.setConnectionState('connecting');

        try {
            // Создать временный клиент для логина
            const tempClient = sdk.createClient({ baseUrl: homeserver });
            const response = await tempClient.login('m.login.password', {
                user: userId,
                password: password,
                initial_device_display_name: 'Uplink Web',
            });

            // Сохранить credentials
            localStorage.setItem(STORAGE_KEYS.HOMESERVER, homeserver);
            localStorage.setItem(STORAGE_KEYS.USER_ID, response.user_id);
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
            localStorage.setItem(STORAGE_KEYS.DEVICE_ID, response.device_id);

            // Создать полноценный клиент с credentials
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

    /**
     * Восстановить сессию из localStorage.
     * Возвращает true если сессия восстановлена.
     */
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
        } catch (err) {
            // Токен истёк или невалиден
            this.clearSession();
            this.setConnectionState('disconnected');
            return false;
        }
    }

    /**
     * Инициализировать клиент и запустить sync.
     */
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

        // Проверить что токен валиден
        await this.client.whoami();

        // Попытка инициализации E2E (может не работать в браузере без дополнительных пакетов)
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

        // Автодоверие устройствам (PoC)
        if (this.client.getCrypto()) {
            this.client.getCrypto()!.globalBlacklistUnverifiedDevices = false;
        }

        // Подписки на события
        this.client.on(sdk.ClientEvent.Sync, (state: string) => {
            if (state === 'PREPARED' || state === 'SYNCING') {
                this.setConnectionState('connected');
                this.callbacks.onRoomsUpdated?.();
            } else if (state === 'ERROR' || state === 'STOPPED') {
                this.setConnectionState('error');
            }
        });

        this.client.on(sdk.RoomEvent.Timeline, (event: sdk.MatrixEvent, room: any) => {
            if (event.getType() === 'm.room.message' || event.getType() === 'm.room.encrypted') {
                this.callbacks.onNewMessage?.(room.roomId, event);
                this.callbacks.onRoomsUpdated?.();
            }
        });

        this.client.on(sdk.RoomEvent.MyMembership, () => {
            this.callbacks.onRoomsUpdated?.();
        });

        // Запустить sync
        await this.client.startClient({ initialSyncLimit: 20 });
    }

    /** Получить Matrix клиент */
    getClient(): sdk.MatrixClient {
        if (!this.client) throw new Error('Клиент не инициализирован');
        return this.client;
    }

    /** Получить userId текущего пользователя */
    getUserId(): string {
        return this.client?.getUserId() || '';
    }

    /** Получить список комнат */
    getRooms(): sdk.Room[] {
        if (!this.client) return [];
        return this.client.getRooms().filter(r => r.getMyMembership() === 'join');
    }

    /** Получить timeline комнаты */
    getRoomTimeline(roomId: string): sdk.MatrixEvent[] {
        if (!this.client) return [];
        const room = this.client.getRoom(roomId);
        if (!room) return [];
        return room.getLiveTimeline().getEvents().filter(e =>
            e.getType() === 'm.room.message' || e.getType() === 'm.room.encrypted'
        );
    }

    /** Загрузить историю */
    async loadMoreMessages(roomId: string, limit: number = 30): Promise<boolean> {
        if (!this.client) return false;
        const room = this.client.getRoom(roomId);
        if (!room) return false;
        try {
            return (await this.client.scrollback(room, limit)) !== null;
        } catch { return false; }
    }

    /** Отправить текстовое сообщение */
    async sendMessage(roomId: string, body: string): Promise<void> {
        if (!this.client) return;
        await this.client.sendTextMessage(roomId, body);
    }

    /** Отправить typing indicator */
    async sendTyping(roomId: string, isTyping: boolean): Promise<void> {
        if (!this.client) return;
        await this.client.sendTyping(roomId, isTyping, isTyping ? 5000 : 0);
    }

    /** Пометить комнату как прочитанную */
    async markRoomAsRead(roomId: string): Promise<void> {
        if (!this.client) return;
        const room = this.client.getRoom(roomId);
        if (!room) return;
        const lastEvent = room.getLiveTimeline().getEvents().slice(-1)[0];
        if (lastEvent) {
            await this.client.sendReadReceipt(lastEvent);
        }
    }

    /** Получить display name */
    getDisplayName(userId: string): string {
        if (!this.client) return userId;
        const user = this.client.getUser(userId);
        return user?.displayName || userId.split(':')[0].substring(1);
    }

    /** Получить presence */
    getPresence(userId: string): string {
        if (!this.client) return 'offline';
        const user = this.client.getUser(userId);
        return (user as any)?.presence || 'offline';
    }

    /** Отключиться */
    async disconnect(): Promise<void> {
        if (this.client) {
            this.client.stopClient();
            this.client.removeAllListeners();
            this.client = null;
        }
        this.setConnectionState('disconnected');
    }

    /** Выйти (logout + очистка) */
    async logout(): Promise<void> {
        if (this.client) {
            try { await this.client.logout(true); } catch {}
        }
        await this.disconnect();
        this.clearSession();
    }

    /** Очистить сохранённую сессию */
    clearSession(): void {
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    }

    /** Обновить состояние подключения */
    private setConnectionState(state: ConnectionState): void {
        this._connectionState = state;
        this.callbacks.onConnectionChange?.(state);
    }
}

// Singleton — один экземпляр на приложение
export const matrixService = new MatrixService();
```

### ШАГ 3.2. Создать src/matrix/RoomsManager.ts

```typescript
import * as sdk from 'matrix-js-sdk';

/**
 * Утилиты для группировки и отображения комнат.
 * Аналог VS Code версии, но без зависимости от vscode API.
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
    peerPresence?: string;
    topic?: string;
}

export function getGroupedRooms(client: sdk.MatrixClient): {
    channels: RoomInfo[];
    directs: RoomInfo[];
} {
    const rooms = client.getRooms().filter(r => r.getMyMembership() === 'join');
    const directMap = client.getAccountData('m.direct')?.getContent() || {};
    const directIds = new Set<string>();
    for (const userId of Object.keys(directMap)) {
        for (const roomId of directMap[userId]) {
            directIds.add(roomId);
        }
    }

    const channels: RoomInfo[] = [];
    const directs: RoomInfo[] = [];

    for (const room of rooms) {
        const isDirect = directIds.has(room.roomId);
        const lastEvent = room.getLiveTimeline().getEvents()
            .filter(e => e.getType() === 'm.room.message')
            .slice(-1)[0];

        let peerId: string | undefined;
        let peerPresence = 'offline';
        if (isDirect) {
            const members = room.getJoinedMembers();
            const peer = members.find(m => m.userId !== client.getUserId());
            if (peer) {
                peerId = peer.userId;
                const user = client.getUser(peer.userId);
                peerPresence = (user as any)?.presence || 'offline';
            }
        }

        const info: RoomInfo = {
            id: room.roomId,
            name: isDirect && peerId
                ? getDisplayName(client, peerId)
                : room.name || 'Без названия',
            type: isDirect ? 'direct' : 'channel',
            encrypted: room.hasEncryptionStateEvent(),
            unreadCount: room.getUnreadNotificationCount('total') || 0,
            lastMessage: lastEvent?.getContent().body,
            lastMessageSender: lastEvent ? getDisplayName(client, lastEvent.getSender()!) : undefined,
            lastMessageTs: lastEvent?.getTs(),
            peerId,
            peerPresence,
            topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
        };

        if (isDirect) directs.push(info);
        else channels.push(info);
    }

    channels.sort((a, b) => a.name.localeCompare(b.name));
    directs.sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));

    return { channels, directs };
}

export function getDisplayName(client: sdk.MatrixClient, userId: string): string {
    const user = client.getUser(userId);
    return user?.displayName || userId.split(':')[0].substring(1);
}
```

### ШАГ 3.3. Создать src/matrix/MessageFormatter.ts

```typescript
import * as sdk from 'matrix-js-sdk';

/**
 * Парсинг сообщений Matrix для отображения в UI.
 * Идентичен VS Code версии, но без зависимости от vscode.
 */

export interface ParsedMessage {
    id: string;
    sender: string;
    senderDisplayName: string;
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
}

export function parseEvent(event: sdk.MatrixEvent, getDisplayName: (userId: string) => string): ParsedMessage | null {
    const type = event.getType();
    if (type !== 'm.room.message' && type !== 'm.room.encrypted') return null;

    const sender = event.getSender()!;
    const senderDisplayName = getDisplayName(sender);

    if (type === 'm.room.encrypted') {
        if (event.isDecryptionFailure()) {
            return { id: event.getId()!, sender, senderDisplayName, timestamp: event.getTs(), type: 'encrypted', body: '🔒 Не удалось расшифровать' };
        }
        if (!event.getClearContent()) {
            return { id: event.getId()!, sender, senderDisplayName, timestamp: event.getTs(), type: 'encrypted', body: '🔒 Расшифровка...' };
        }
    }

    const content = event.getContent();

    // Uplink code snippet
    if (content['dev.uplink.code_context']) {
        return {
            id: event.getId()!, sender, senderDisplayName,
            timestamp: event.getTs(), type: 'code',
            body: content.body || '',
            codeContext: content['dev.uplink.code_context'],
        };
    }

    // Обычное сообщение
    return {
        id: event.getId()!, sender, senderDisplayName,
        timestamp: event.getTs(),
        type: content.msgtype === 'm.image' ? 'image' : content.msgtype === 'm.file' ? 'file' : 'text',
        body: content.body || '',
        formattedBody: content.formatted_body,
    };
}
```

---

## ЧАСТЬ 4: React Hooks

### ШАГ 4.1. Создать src/hooks/useMatrix.ts

```typescript
import { useState, useEffect, useCallback } from 'react';
import { matrixService, ConnectionState } from '../matrix/MatrixService';

/**
 * Hook для управления подключением к Matrix.
 * Обеспечивает реактивное обновление UI при изменении состояния.
 */
export function useMatrix() {
    const [connectionState, setConnectionState] = useState<ConnectionState>(
        matrixService.connectionState
    );
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        matrixService.setCallbacks({
            ...matrixService['callbacks'],  // сохранить остальные
            onConnectionChange: (state) => {
                setConnectionState(state);
                if (state === 'connected') setError(null);
            },
        });
    }, []);

    const login = useCallback(async (homeserver: string, userId: string, password: string) => {
        setError(null);
        try {
            await matrixService.login(homeserver, userId, password);
        } catch (err: any) {
            setError(err.message || 'Ошибка подключения');
            throw err;
        }
    }, []);

    const logout = useCallback(async () => {
        await matrixService.logout();
    }, []);

    const restoreSession = useCallback(async (): Promise<boolean> => {
        try {
            return await matrixService.restoreSession();
        } catch {
            return false;
        }
    }, []);

    return { connectionState, error, login, logout, restoreSession };
}
```

### ШАГ 4.2. Создать src/hooks/useRooms.ts

```typescript
import { useState, useEffect } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { getGroupedRooms, RoomInfo } from '../matrix/RoomsManager';

/**
 * Hook для реактивного списка комнат.
 */
export function useRooms() {
    const [channels, setChannels] = useState<RoomInfo[]>([]);
    const [directs, setDirects] = useState<RoomInfo[]>([]);

    const refresh = () => {
        if (!matrixService.isConnected) return;
        try {
            const client = matrixService.getClient();
            const grouped = getGroupedRooms(client);
            setChannels(grouped.channels);
            setDirects(grouped.directs);
        } catch {}
    };

    useEffect(() => {
        matrixService.setCallbacks({
            ...matrixService['callbacks'],
            onRoomsUpdated: refresh,
            onNewMessage: () => refresh(),
        });
        refresh();
    }, [matrixService.isConnected]);

    return { channels, directs, refresh };
}
```

### ШАГ 4.3. Создать src/hooks/useMessages.ts

```typescript
import { useState, useEffect, useCallback } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { parseEvent, ParsedMessage } from '../matrix/MessageFormatter';

/**
 * Hook для сообщений активной комнаты.
 */
export function useMessages(roomId: string | null) {
    const [messages, setMessages] = useState<ParsedMessage[]>([]);

    const loadMessages = useCallback(() => {
        if (!roomId || !matrixService.isConnected) {
            setMessages([]);
            return;
        }
        const events = matrixService.getRoomTimeline(roomId);
        const getDisplayName = (userId: string) => matrixService.getDisplayName(userId);
        const parsed = events
            .map(e => parseEvent(e, getDisplayName))
            .filter((m): m is ParsedMessage => m !== null);
        setMessages(parsed);
    }, [roomId]);

    useEffect(() => {
        loadMessages();

        // Подписка на новые сообщения
        const prevCallback = matrixService['callbacks'].onNewMessage;
        matrixService.setCallbacks({
            ...matrixService['callbacks'],
            onNewMessage: (msgRoomId, event) => {
                prevCallback?.(msgRoomId, event);
                if (msgRoomId === roomId) {
                    loadMessages();  // перечитать timeline
                }
            },
        });
    }, [roomId, loadMessages]);

    const sendMessage = useCallback(async (body: string) => {
        if (!roomId) return;
        await matrixService.sendMessage(roomId, body);
    }, [roomId]);

    const loadMore = useCallback(async () => {
        if (!roomId) return;
        await matrixService.loadMoreMessages(roomId);
        loadMessages();
    }, [roomId, loadMessages]);

    return { messages, sendMessage, loadMore };
}
```

---

## ЧАСТЬ 5: UI компоненты

### ШАГ 5.1. Создать src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/variables.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
```

### ШАГ 5.2. Создать src/App.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { useMatrix } from './hooks/useMatrix';
import { LoginScreen } from './components/LoginScreen';
import { ChatLayout } from './components/ChatLayout';

/**
 * Корневой компонент. Показывает LoginScreen или ChatLayout в зависимости от авторизации.
 */
export const App: React.FC = () => {
    const { connectionState, error, login, logout, restoreSession } = useMatrix();
    const [loading, setLoading] = useState(true);

    // Попытка восстановить сессию при загрузке
    useEffect(() => {
        restoreSession().finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="uplink-loading">
                <div className="uplink-loading__spinner" />
                <p>Uplink</p>
            </div>
        );
    }

    if (connectionState === 'disconnected' || connectionState === 'error') {
        return <LoginScreen onLogin={login} error={error} />;
    }

    if (connectionState === 'connecting') {
        return (
            <div className="uplink-loading">
                <div className="uplink-loading__spinner" />
                <p>Подключение...</p>
            </div>
        );
    }

    return <ChatLayout onLogout={logout} />;
};
```

### ШАГ 5.3. Создать src/components/LoginScreen.tsx

Экран авторизации. Поля: Server URL, User ID, Password. Кнопка "Войти".

Дизайн: центрированная карточка на тёмном фоне, логотип Uplink сверху, минималистичные инпуты. Должен выглядеть хорошо и на мобилке (ширина карточки max 400px, padding адаптивный).

```tsx
/**
 * Экран входа в Uplink.
 *
 * Дефолтные значения:
 * - Server: http://localhost:8008
 * - User ID: пустой, placeholder @username:uplink.local
 * - Password: пустой
 *
 * При ошибке показывает сообщение красным текстом под кнопкой.
 * Enter в поле пароля = нажатие кнопки "Войти".
 */
interface LoginScreenProps {
    onLogin: (homeserver: string, userId: string, password: string) => Promise<void>;
    error: string | null;
}
```

Элементы:
- Логотип/название "Uplink" с иконкой
- Input: Server URL (дефолт http://localhost:8008)
- Input: User ID (placeholder @username:uplink.local)
- Input: Password (type=password)
- Button: "Войти" (disabled пока поля пустые, loading state при подключении)
- Текст ошибки (если есть)

### ШАГ 5.4. Создать src/components/ChatLayout.tsx

```tsx
/**
 * Основной layout чата: Sidebar + Main area.
 *
 * На десктопе (>768px): sidebar слева (260px) + main area справа.
 * На мобилке (<768px): переключение между sidebar и main area.
 *   - По умолчанию видна sidebar
 *   - При выборе комнаты — переход на main area
 *   - Кнопка "назад" возвращает на sidebar
 */
interface ChatLayoutProps {
    onLogout: () => void;
}
```

Состояние:
- `activeRoomId: string | null` — выбранная комната
- `mobileView: 'sidebar' | 'chat'` — для мобилки

### ШАГ 5.5. Создать src/components/Sidebar.tsx

Повторяет дизайн Slack:

```
┌────────────────────┐
│ ⬆ Uplink      [⚙] │  ← заголовок + кнопка logout
│                    │
│ 🔍 Поиск...       │  ← фильтр
│                    │
│ ▾ Каналы           │
│   # general    3   │  ← название + badge
│   # backend        │
│   # frontend       │
│                    │
│ ▾ Личные сообщения │
│   🟢 Bob Петров    │
│   ⚪ Eve Смирнова  │
└────────────────────┘
```

Props:
- `channels: RoomInfo[]`
- `directs: RoomInfo[]`
- `activeRoomId: string | null`
- `onSelectRoom: (roomId: string) => void`
- `onLogout: () => void`

Стили:
- Фон: `var(--uplink-sidebar-bg)` (тёмный, #1a1d23)
- Текст: `var(--uplink-sidebar-text)` (#d1d2d3)
- Активный элемент: `var(--uplink-sidebar-active)` (rgba(255,255,255,0.1))
- Hover: чуть светлее
- Badge: круг с числом, `var(--uplink-accent)` (#4a9eff)

### ШАГ 5.6. Создать src/components/MessageList.tsx

Лента сообщений. Группировка по автору (как в Slack): если предыдущее сообщение от того же автора и разница < 5 минут — не показывать аватар и имя, только текст.

Разделители по дням: "Сегодня", "Вчера", "15 января 2026".

Auto-scroll к последнему сообщению при новых. Если пользователь проскроллил вверх — не скроллить (не мешать чтению истории).

### ШАГ 5.7. Создать src/components/MessageBubble.tsx

Одно сообщение. Варианты:

- **Полное** (showAuthor=true): аватар слева + имя + время + текст
- **Компактное** (showAuthor=false): только текст с отступом (продолжение от того же автора)
- **Code** (type='code'): CodeSnippet компонент
- **Encrypted** (type='encrypted'): серый текст с замком

### ШАГ 5.8. Создать src/components/CodeSnippet.tsx

Блок кода в ленте. Заголовок с именем файла и строками, тело с моноширинным шрифтом. Кнопка "Копировать" (navigator.clipboard.writeText).

В веб-версии нет кнопки "Открыть в редакторе" (нет доступа к файловой системе).

### ШАГ 5.9. Создать src/components/MessageInput.tsx

Поле ввода. Enter — отправить, Shift+Enter — новая строка. Textarea с auto-resize.

На мобилке: адаптивная высота, кнопка отправки справа (иконка-стрелка), крупнее touch target.

### ШАГ 5.10. Создать src/components/Avatar.tsx

Простой аватар — круг с первой буквой имени, цвет генерируется из хэша userId (чтобы у одного пользователя всегда был один цвет).

```tsx
interface AvatarProps {
    name: string;
    size?: number;    // px, дефолт 32
    online?: boolean; // зелёная точка
}
```

### ШАГ 5.11. Создать src/components/RoomHeader.tsx

Заголовок над лентой сообщений:

```
┌─────────────────────────────────────┐
│ [←]  # general  🔒         👥 6    │
│      Общий канал команды            │
└─────────────────────────────────────┘
```

- `[←]` — кнопка "назад", только на мобилке
- Имя комнаты
- 🔒 если encrypted
- Количество участников
- Topic (мелким текстом)

---

## ЧАСТЬ 6: Стили

### ШАГ 6.1. Создать src/styles/variables.css

```css
/* Dark theme (основная) */
:root {
    --uplink-bg: #1a1d23;
    --uplink-sidebar-bg: #14161a;
    --uplink-sidebar-text: #d1d2d3;
    --uplink-sidebar-text-muted: #8b8d90;
    --uplink-sidebar-active: rgba(255, 255, 255, 0.08);
    --uplink-sidebar-hover: rgba(255, 255, 255, 0.04);
    --uplink-border: #2e3136;
    --uplink-text: #dcddde;
    --uplink-text-muted: #72767d;
    --uplink-accent: #4a9eff;
    --uplink-accent-hover: #3a8eef;
    --uplink-danger: #ed4245;
    --uplink-success: #3ba55d;
    --uplink-input-bg: #2a2d33;
    --uplink-code-bg: #2b2d31;
    --uplink-message-hover: rgba(255, 255, 255, 0.02);
    --uplink-scrollbar: #1a1c20;
    --uplink-scrollbar-thumb: #4f545c;
    --uplink-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --uplink-font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
    --uplink-radius: 4px;
    --uplink-sidebar-width: 260px;
    --uplink-avatar-size: 36px;
}

/* Light theme */
@media (prefers-color-scheme: light) {
    :root {
        --uplink-bg: #ffffff;
        --uplink-sidebar-bg: #f2f3f5;
        --uplink-sidebar-text: #1a1d23;
        --uplink-sidebar-text-muted: #5c5e66;
        --uplink-sidebar-active: rgba(0, 0, 0, 0.06);
        --uplink-sidebar-hover: rgba(0, 0, 0, 0.03);
        --uplink-border: #e3e5e8;
        --uplink-text: #2e3136;
        --uplink-text-muted: #747680;
        --uplink-input-bg: #ebedef;
        --uplink-code-bg: #f2f3f5;
        --uplink-message-hover: rgba(0, 0, 0, 0.02);
        --uplink-scrollbar: #f2f3f5;
        --uplink-scrollbar-thumb: #c1c3c7;
    }
}
```

### ШАГ 6.2. Создать src/styles/global.css

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: var(--uplink-font);
    font-size: 15px;
    color: var(--uplink-text);
    background: var(--uplink-bg);
    overflow: hidden;
    height: 100vh;
    height: 100dvh;  /* для мобилок с динамической адресной строкой */
    -webkit-font-smoothing: antialiased;
}

/* Скроллбар */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--uplink-scrollbar); }
::-webkit-scrollbar-thumb { background: var(--uplink-scrollbar-thumb); border-radius: 4px; }

/* Loading screen */
.uplink-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 16px;
    color: var(--uplink-text-muted);
}
.uplink-loading__spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--uplink-border);
    border-top-color: var(--uplink-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

### ШАГ 6.3. Создать src/styles/login.css и src/styles/chat.css

Login: центрированная карточка, max-width 400px, padding 32px, border-radius 8px, тёмный фон чуть светлее основного.

Chat: flexbox layout. На десктопе sidebar (var(--uplink-sidebar-width)) + main area (flex: 1). На мобилке — 100vw переключение. Все размеры в CSS-переменных.

Ключевые media queries:
```css
/* Мобилка */
@media (max-width: 768px) {
    .chat-layout { /* sidebar и main area переключаются */ }
    .chat-sidebar { width: 100%; }
    .chat-main { width: 100%; }
}
```

Touch-оптимизация:
```css
@media (pointer: coarse) {
    /* Крупнее tap targets для touch */
    .sidebar-room-item { min-height: 48px; }
    .message-input textarea { font-size: 16px; }  /* предотвращает zoom на iOS */
}
```

---

## ЧАСТЬ 7: Сборка и запуск

### ШАГ 7.1. Установить зависимости

```bash
cd E:\Uplink\web
npm install
```

### ШАГ 7.2. Запустить dev server

```bash
npm run dev
```

Ожидаемо: Vite поднимает dev server на http://localhost:3000 (и доступен по IP в локальной сети — можно открыть с мобилки).

### ШАГ 7.3. Проверка

1. Открыть http://localhost:3000 в браузере
2. Должен показаться экран авторизации
3. Ввести: Server = `http://localhost:8008`, User = `@alice:uplink.local`, Password = `test123`
4. После входа — Slack-подобный интерфейс с каналами в sidebar
5. Кликнуть #general — должны появиться тестовые сообщения
6. Отправить сообщение — оно появляется в ленте
7. Открыть вторую вкладку, войти как @bob:uplink.local — должны видеть сообщения друг друга в real-time
8. Открыть http://[IP-компьютера]:3000 на мобилке — должен работать мобильный layout

### ШАГ 7.4. Production build

```bash
npm run build
```

Результат в `web/dist/` — статические файлы, которые можно раздавать через nginx.

---

## ЧАСТЬ 8: Docker для веб-клиента (опционально)

### ШАГ 8.1. Добавить nginx для раздачи статики

Если нужно раздавать веб-клиент из Docker, добавить в `docker/docker-compose.yml`:

```yaml
uplink-web:
    image: nginx:alpine
    container_name: uplink-web
    ports:
      - "3000:80"
    volumes:
      - ../web/dist:/usr/share/nginx/html:ro
      - ./nginx/web.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      synapse:
        condition: service_healthy
```

Файл: `docker/nginx/web.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: все роуты → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статики
    location ~* \.(js|css|png|svg|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Критерии приёмки

- [ ] `npm run dev` запускает Vite dev server на http://localhost:3000
- [ ] Экран логина отображается, поля работают, Enter в пароле = отправка
- [ ] Авторизация через Matrix работает, ошибки показываются
- [ ] После логина — Slack-подобный layout: sidebar + лента сообщений
- [ ] Sidebar показывает каналы (#general, #backend, #frontend) и DM
- [ ] Непрочитанные сообщения — badge с числом
- [ ] Клик по каналу — загрузка и отображение сообщений
- [ ] Группировка сообщений по автору (не повторять аватар при < 5 мин)
- [ ] Разделители по дням
- [ ] Code snippets рендерятся с заголовком и кнопкой "Копировать"
- [ ] Отправка сообщений работает (Enter)
- [ ] Real-time: сообщения от другого пользователя (другая вкладка) приходят мгновенно
- [ ] Автовосстановление сессии при перезагрузке страницы (localStorage)
- [ ] Logout очищает сессию и показывает экран логина
- [ ] Мобильный layout: на ширине < 768px sidebar/chat переключаются
- [ ] Dark/light тема через prefers-color-scheme
- [ ] `npm run build` собирает production bundle
- [ ] PWA manifest и мета-теги для "Добавить на главный экран"

## Коммит

```
[web] Веб-приложение Uplink: React + Matrix SDK + PWA

- Vite проект в web/ с React 18 + TypeScript
- MatrixService: прямое подключение из браузера
- React hooks: useMatrix, useRooms, useMessages
- Slack-style UI: sidebar, message list, code snippets
- Экран авторизации с восстановлением сессии
- Адаптивный layout (desktop + mobile)
- Dark/light тема через CSS-переменные
- PWA manifest для установки на мобилку
```
