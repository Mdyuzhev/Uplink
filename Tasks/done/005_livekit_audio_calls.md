# 005: LiveKit — Аудиозвонки в веб-приложении

## Цель

Добавить аудиозвонки в веб-приложение Uplink через LiveKit SFU. Кнопка звонка в заголовке комнаты, мини-панель управления (mute, disconnect), индикация участников и говорящего. На этом этапе — только аудио, без видео.

## Контекст

Звонки — вторая ключевая функция после чата. LiveKit — open source SFU с хорошим JS SDK и возможностью on-premise развёртывания. Для генерации токенов (чтобы API secret не утекал в браузер) нужен серверный компонент — поднимаем микросервис `livekit-token` в Docker.

## Зависимости

- Задача 001 (Docker-инфраструктура) — **выполнена** ✅
- Задача 007 (Веб-приложение) — **выполнена** ✅, React-приложение работает
- Задача 009 (Починка веб) — **должна быть выполнена** перед этой задачей

## Предусловия

```bash
# Docker-стек работает
cd E:\Uplink\docker && docker compose ps
# Synapse отвечает
curl -sf http://localhost:8008/health && echo "OK"
# Веб работает на 5173 (dev) или 5174 (prod)
cd E:\Uplink\web && npm run dev
```

## Текущая структура web/src (для ориентации)

```
web/src/
├── main.tsx
├── App.tsx
├── matrix/
│   ├── MatrixService.ts      # singleton, event listeners
│   ├── RoomsManager.ts       # группировка комнат
│   └── MessageFormatter.ts   # парсинг сообщений
├── hooks/
│   ├── useMatrix.ts
│   ├── useRooms.ts
│   └── useMessages.ts
├── components/
│   ├── ChatLayout.tsx         # sidebar + main area
│   ├── Sidebar.tsx
│   ├── RoomHeader.tsx         # ← сюда добавим кнопку звонка
│   ├── MessageList.tsx
│   ├── MessageBubble.tsx
│   ├── MessageInput.tsx
│   ├── Avatar.tsx
│   └── CodeSnippet.tsx
└── styles/
    ├── variables.css
    ├── global.css
    ├── login.css
    └── chat.css
```

---

## ЧАСТЬ 1: LiveKit Server в Docker

### ШАГ 1.1. Создать конфигурацию LiveKit

Файл: `E:\Uplink\docker\livekit\livekit.yaml`

```yaml
port: 7880
rtc:
  port_range_start: 7882
  port_range_end: 7892
  use_external_ip: false
  # STUN-серверы для WebRTC за NAT (для localhost PoC хватит Google STUN)
  stun_servers:
    - stun:stun.l.google.com:19302
redis:
  address: redis:6379
keys:
  # API key → API secret (для генерации токенов)
  # В продакшене заменить на случайные значения
  uplink-api-key: uplink-api-secret-change-me-in-prod
logging:
  level: info
```

### ШАГ 1.2. Добавить LiveKit Server в docker-compose.yml

Файл: `E:\Uplink\docker\docker-compose.yml`

Добавить сервис `livekit` после `synapse-admin` и перед `uplink`:

```yaml
  livekit:
    image: livekit/livekit-server:latest
    container_name: uplink-livekit
    restart: unless-stopped
    ports:
      - "7880:7880"        # HTTP API + WebSocket (клиент подключается сюда)
      - "7881:7881"        # WebRTC TCP
      - "7882-7892:7882-7892/udp"  # WebRTC UDP (медиа-трафик)
    volumes:
      - ./livekit/livekit.yaml:/etc/livekit.yaml:ro
    command: --config /etc/livekit.yaml --node-ip=0.0.0.0
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:7880"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### ШАГ 1.3. Запустить и проверить

```bash
cd E:\Uplink\docker
docker compose up -d livekit

# Проверить что LiveKit отвечает
curl -sf http://localhost:7880 && echo "LiveKit OK"
```

---

## ЧАСТЬ 2: Микросервис генерации токенов

LiveKit требует JWT-токен для подключения клиента. Токен подписывается API secret — этот секрет **нельзя** хранить в браузере. Поэтому создаём микросервис `livekit-token`, который принимает userId и roomName, возвращает подписанный JWT.

### ШАГ 2.1. Создать директорию и package.json

Директория: `E:\Uplink\docker\livekit-token\`

Файл: `E:\Uplink\docker\livekit-token\package.json`

```json
{
  "name": "uplink-livekit-token",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "node server.mjs"
  },
  "dependencies": {
    "livekit-server-sdk": "^2.0.0"
  }
}
```

### ШАГ 2.2. Создать сервер

Файл: `E:\Uplink\docker\livekit-token\server.mjs`

```javascript
/**
 * Микросервис генерации LiveKit токенов.
 *
 * POST /token
 * Body: { "userId": "@alice:uplink.local", "roomName": "general" }
 * Response: { "token": "eyJ..." }
 *
 * Секреты берутся из переменных окружения.
 * CORS разрешён для localhost (PoC).
 */

import http from 'node:http';
import { AccessToken } from 'livekit-server-sdk';

const PORT = 7890;
const API_KEY = process.env.LIVEKIT_API_KEY || 'uplink-api-key';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'uplink-api-secret-change-me-in-prod';

/**
 * Генерация токена с правами на подключение к комнате,
 * публикацию аудио и подписку на треки других участников.
 */
function generateToken(userId, roomName) {
    const token = new AccessToken(API_KEY, API_SECRET, {
        identity: userId,
        name: userId.split(':')[0].replace('@', ''),  // displayName из Matrix userId
        ttl: '6h',
    });
    token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
    });
    return token.toJwt();
}

const server = http.createServer(async (req, res) => {
    // CORS (для dev на localhost:5173 и prod на localhost:5174)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Healthcheck
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        return;
    }

    // Генерация токена
    if (req.method === 'POST' && req.url === '/token') {
        try {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = JSON.parse(Buffer.concat(chunks).toString());

            const { userId, roomName } = body;
            if (!userId || !roomName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'userId и roomName обязательны' }));
                return;
            }

            const token = await generateToken(userId, roomName);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ token }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`LiveKit Token Service listening on :${PORT}`);
});
```

### ШАГ 2.3. Создать Dockerfile для токен-сервиса

Файл: `E:\Uplink\docker\livekit-token\Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server.mjs ./
EXPOSE 7890
CMD ["node", "server.mjs"]
```

### ШАГ 2.4. Добавить токен-сервис в docker-compose.yml

Добавить сервис `livekit-token` после `livekit`:

```yaml
  livekit-token:
    build:
      context: ./livekit-token
      dockerfile: Dockerfile
    container_name: uplink-livekit-token
    restart: unless-stopped
    ports:
      - "7890:7890"
    environment:
      LIVEKIT_API_KEY: uplink-api-key
      LIVEKIT_API_SECRET: uplink-api-secret-change-me-in-prod
    depends_on:
      livekit:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:7890/health"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### ШАГ 2.5. Запустить и проверить

```bash
cd E:\Uplink\docker
docker compose up -d --build livekit-token

# Проверить healthcheck
curl -sf http://localhost:7890/health && echo "Token Service OK"

# Проверить генерацию токена
curl -s -X POST http://localhost:7890/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"@alice:uplink.local","roomName":"general"}'
# Ожидаемо: {"token":"eyJ..."}
```

---

## ЧАСТЬ 3: LiveKitService для веб-приложения

### ШАГ 3.1. Установить livekit-client

```bash
cd E:\Uplink\web
npm install livekit-client
```

### ШАГ 3.2. Создать src/livekit/LiveKitService.ts

Сервис следует паттерну MatrixService: singleton, подписки через listener-функции.

Файл: `E:\Uplink\web\src\livekit\LiveKitService.ts`

```typescript
import {
    Room,
    RoomEvent,
    RemoteParticipant,
    LocalParticipant,
    Participant,
    Track,
    ConnectionState,
} from 'livekit-client';

/**
 * URL токен-сервиса.
 * Dev (5173): напрямую на localhost:7890.
 * Prod (5174): тоже напрямую, т.к. токен-сервис на отдельном порту.
 * В продакшене заменить на проксирование через nginx.
 */
const TOKEN_SERVICE_URL = 'http://localhost:7890';

/**
 * URL LiveKit Server (WebSocket).
 * Клиент подключается напрямую — LiveKit использует WebRTC,
 * проксирование через nginx не нужно.
 */
const LIVEKIT_URL = 'ws://localhost:7880';

export type CallState = 'idle' | 'connecting' | 'connected' | 'error';

export interface CallParticipant {
    identity: string;
    displayName: string;
    isMuted: boolean;
    isSpeaking: boolean;
    isLocal: boolean;
}

type Listener<T extends (...args: any[]) => void> = T;

export class LiveKitService {
    private room: Room | null = null;
    private _callState: CallState = 'idle';
    private _activeRoomName: string | null = null;
    private _durationTimer: ReturnType<typeof setInterval> | null = null;
    private _durationSeconds = 0;

    private _callStateListeners = new Set<Listener<(state: CallState) => void>>();
    private _participantsListeners = new Set<Listener<(participants: CallParticipant[]) => void>>();
    private _durationListeners = new Set<Listener<(seconds: number) => void>>();

    get callState(): CallState { return this._callState; }
    get isInCall(): boolean { return this._callState === 'connected'; }
    get activeRoomName(): string | null { return this._activeRoomName; }
    get durationSeconds(): number { return this._durationSeconds; }

    // === Подписки ===

    onCallStateChange(fn: (state: CallState) => void): () => void {
        this._callStateListeners.add(fn);
        return () => { this._callStateListeners.delete(fn); };
    }

    onParticipantsChange(fn: (participants: CallParticipant[]) => void): () => void {
        this._participantsListeners.add(fn);
        return () => { this._participantsListeners.delete(fn); };
    }

    onDurationChange(fn: (seconds: number) => void): () => void {
        this._durationListeners.add(fn);
        return () => { this._durationListeners.delete(fn); };
    }

    private emitCallState(state: CallState): void {
        this._callState = state;
        this._callStateListeners.forEach(fn => fn(state));
    }

    private emitParticipants(): void {
        const participants = this.getParticipants();
        this._participantsListeners.forEach(fn => fn(participants));
    }

    private emitDuration(seconds: number): void {
        this._durationListeners.forEach(fn => fn(seconds));
    }

    // === Основные методы ===

    /**
     * Присоединиться к звонку в комнате.
     * roomName — человекочитаемое имя (general, backend и т.д.),
     * используется как имя LiveKit-комнаты.
     * userId — Matrix userId для получения токена.
     */
    async joinCall(roomName: string, userId: string): Promise<void> {
        if (this._callState === 'connected' || this._callState === 'connecting') {
            console.warn('Уже в звонке, сначала выйдите');
            return;
        }

        this.emitCallState('connecting');
        this._activeRoomName = roomName;

        try {
            // 1. Получить токен от серверного микросервиса
            const token = await this.fetchToken(userId, roomName);

            // 2. Создать и подключить LiveKit Room
            this.room = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            // 3. Подписаться на события
            this.setupRoomListeners();

            // 4. Подключиться
            await this.room.connect(LIVEKIT_URL, token);

            // 5. Включить микрофон (только аудио, без видео)
            await this.room.localParticipant.setMicrophoneEnabled(true);

            // 6. Запустить таймер длительности
            this.startDurationTimer();

            this.emitCallState('connected');
            this.emitParticipants();

            console.log(`✅ Звонок начат: ${roomName}`);
        } catch (err) {
            console.error('Ошибка подключения к звонку:', err);
            this.emitCallState('error');
            this.cleanup();
            throw err;
        }
    }

    /**
     * Покинуть звонок.
     */
    async leaveCall(): Promise<void> {
        if (!this.room) return;

        try {
            this.room.disconnect(true);
        } catch {
            // ignore disconnect errors
        }

        this.cleanup();
        this.emitCallState('idle');
        console.log('Звонок завершён');
    }

    /**
     * Переключить микрофон (mute/unmute).
     * Возвращает новое состояние: true = замьючен.
     */
    async toggleMute(): Promise<boolean> {
        if (!this.room) return false;

        const currentlyEnabled = this.room.localParticipant.isMicrophoneEnabled;
        await this.room.localParticipant.setMicrophoneEnabled(!currentlyEnabled);

        this.emitParticipants();
        return !currentlyEnabled === false; // true если muted
    }

    /**
     * Проверить замьючен ли локальный участник.
     */
    get isMuted(): boolean {
        if (!this.room) return false;
        return !this.room.localParticipant.isMicrophoneEnabled;
    }

    /**
     * Получить список участников звонка.
     */
    getParticipants(): CallParticipant[] {
        if (!this.room) return [];

        const result: CallParticipant[] = [];

        // Локальный участник
        const local = this.room.localParticipant;
        result.push({
            identity: local.identity,
            displayName: local.name || local.identity.split(':')[0].replace('@', ''),
            isMuted: !local.isMicrophoneEnabled,
            isSpeaking: local.isSpeaking,
            isLocal: true,
        });

        // Удалённые участники
        this.room.remoteParticipants.forEach((p: RemoteParticipant) => {
            result.push({
                identity: p.identity,
                displayName: p.name || p.identity.split(':')[0].replace('@', ''),
                isMuted: !p.isMicrophoneEnabled,
                isSpeaking: p.isSpeaking,
                isLocal: false,
            });
        });

        return result;
    }

    // === Вспомогательные методы ===

    /**
     * Запросить токен у серверного микросервиса.
     */
    private async fetchToken(userId: string, roomName: string): Promise<string> {
        const resp = await fetch(`${TOKEN_SERVICE_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, roomName }),
        });

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Ошибка получения токена: ${resp.status} ${text}`);
        }

        const data = await resp.json();
        return data.token;
    }

    /**
     * Подписка на события LiveKit Room.
     */
    private setupRoomListeners(): void {
        if (!this.room) return;

        // Участник присоединился
        this.room.on(RoomEvent.ParticipantConnected, () => {
            this.emitParticipants();
        });

        // Участник ушёл
        this.room.on(RoomEvent.ParticipantDisconnected, () => {
            this.emitParticipants();
        });

        // Трек подписан (аудио от удалённого участника)
        this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
            if (track.kind === Track.Kind.Audio) {
                // Воспроизвести аудио — создаём <audio> элемент
                const audioEl = track.attach();
                audioEl.id = `audio-${participant.identity}`;
                document.body.appendChild(audioEl);
            }
        });

        // Трек отписан
        this.room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
            track.detach().forEach(el => el.remove());
            const audioEl = document.getElementById(`audio-${participant.identity}`);
            if (audioEl) audioEl.remove();
        });

        // Изменение состояния микрофона или speaking
        this.room.on(RoomEvent.TrackMuted, () => this.emitParticipants());
        this.room.on(RoomEvent.TrackUnmuted, () => this.emitParticipants());
        this.room.on(RoomEvent.ActiveSpeakersChanged, () => this.emitParticipants());

        // Отключение от сервера
        this.room.on(RoomEvent.Disconnected, () => {
            console.log('Отключены от LiveKit');
            this.cleanup();
            this.emitCallState('idle');
        });

        // Переподключение
        this.room.on(RoomEvent.Reconnecting, () => {
            console.log('Переподключение к LiveKit...');
        });

        this.room.on(RoomEvent.Reconnected, () => {
            console.log('Переподключение к LiveKit успешно');
            this.emitParticipants();
        });
    }

    /**
     * Запустить таймер длительности звонка.
     */
    private startDurationTimer(): void {
        this._durationSeconds = 0;
        this._durationTimer = setInterval(() => {
            this._durationSeconds++;
            this.emitDuration(this._durationSeconds);
        }, 1000);
    }

    /**
     * Очистить состояние после завершения звонка.
     */
    private cleanup(): void {
        if (this._durationTimer) {
            clearInterval(this._durationTimer);
            this._durationTimer = null;
        }
        this._durationSeconds = 0;
        this._activeRoomName = null;

        if (this.room) {
            this.room.removeAllListeners();
            // Удалить все <audio> элементы
            this.room.remoteParticipants.forEach((p) => {
                const el = document.getElementById(`audio-${p.identity}`);
                if (el) el.remove();
            });
            this.room = null;
        }

        this.emitParticipants();
        this.emitDuration(0);
    }
}

// Singleton
export const livekitService = new LiveKitService();
```

---

## ЧАСТЬ 4: React Hook

### ШАГ 4.1. Создать src/hooks/useLiveKit.ts

Файл: `E:\Uplink\web\src\hooks\useLiveKit.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { livekitService, CallState, CallParticipant } from '../livekit/LiveKitService';
import { matrixService } from '../matrix/MatrixService';

/**
 * Hook для управления звонками.
 * Предоставляет реактивное состояние звонка и методы управления.
 */
export function useLiveKit() {
    const [callState, setCallState] = useState<CallState>(livekitService.callState);
    const [participants, setParticipants] = useState<CallParticipant[]>([]);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [activeRoomName, setActiveRoomName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsub1 = livekitService.onCallStateChange((state) => {
            setCallState(state);
            setActiveRoomName(livekitService.activeRoomName);
            if (state === 'error') {
                setError('Не удалось подключиться к звонку');
            } else {
                setError(null);
            }
        });
        const unsub2 = livekitService.onParticipantsChange((p) => {
            setParticipants(p);
            setIsMuted(livekitService.isMuted);
        });
        const unsub3 = livekitService.onDurationChange(setDuration);

        return () => { unsub1(); unsub2(); unsub3(); };
    }, []);

    /**
     * Начать/присоединиться к звонку.
     * roomName — имя канала (general, backend...).
     */
    const joinCall = useCallback(async (roomName: string) => {
        setError(null);
        try {
            const userId = matrixService.getUserId();
            await livekitService.joinCall(roomName, userId);
        } catch (err: any) {
            setError(err.message || 'Ошибка звонка');
        }
    }, []);

    const leaveCall = useCallback(async () => {
        await livekitService.leaveCall();
    }, []);

    const toggleMute = useCallback(async () => {
        await livekitService.toggleMute();
        setIsMuted(livekitService.isMuted);
    }, []);

    return {
        callState,
        participants,
        duration,
        isMuted,
        activeRoomName,
        error,
        joinCall,
        leaveCall,
        toggleMute,
    };
}
```

---

## ЧАСТЬ 5: UI компоненты

### ШАГ 5.1. Создать src/components/CallBar.tsx

Мини-панель, которая появляется над MessageList во время звонка:

```
┌──────────────────────────────────────────┐
│ 🔊 #general  ·  02:35                   │
│ 👤 Alice (вы)  👤 Bob  🗣 Charlie       │
│                                          │
│      [ 🎤 Mute ]    [ 📞 Завершить ]    │
└──────────────────────────────────────────┘
```

Файл: `E:\Uplink\web\src\components\CallBar.tsx`

```tsx
import React from 'react';
import { CallParticipant } from '../livekit/LiveKitService';

interface CallBarProps {
    roomName: string;
    participants: CallParticipant[];
    isMuted: boolean;
    duration: number;
    onToggleMute: () => void;
    onLeave: () => void;
}

/**
 * Форматирование секунд в MM:SS.
 */
function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export const CallBar: React.FC<CallBarProps> = ({
    roomName, participants, isMuted, duration, onToggleMute, onLeave,
}) => {
    return (
        <div className="call-bar">
            <div className="call-bar__info">
                <span className="call-bar__title">
                    <span className="call-bar__icon">&#128266;</span>
                    #{roomName}
                </span>
                <span className="call-bar__duration">{formatDuration(duration)}</span>
            </div>

            <div className="call-bar__participants">
                {participants.map(p => (
                    <span
                        key={p.identity}
                        className={`call-bar__participant ${p.isSpeaking ? 'call-bar__participant--speaking' : ''} ${p.isMuted ? 'call-bar__participant--muted' : ''}`}
                    >
                        {p.displayName}{p.isLocal ? ' (вы)' : ''}
                    </span>
                ))}
            </div>

            <div className="call-bar__controls">
                <button
                    className={`call-bar__btn call-bar__btn--mute ${isMuted ? 'call-bar__btn--active' : ''}`}
                    onClick={onToggleMute}
                    title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                >
                    {isMuted ? '&#128263;' : '&#127908;'}
                    {isMuted ? ' Unmute' : ' Mute'}
                </button>
                <button
                    className="call-bar__btn call-bar__btn--leave"
                    onClick={onLeave}
                    title="Завершить звонок"
                >
                    &#128222; Завершить
                </button>
            </div>
        </div>
    );
};
```

### ШАГ 5.2. Обновить RoomHeader — добавить кнопку звонка

Файл: `E:\Uplink\web\src\components\RoomHeader.tsx`

Полностью заменить содержимое:

```tsx
import React from 'react';
import { RoomInfo } from '../matrix/RoomsManager';
import { CallState } from '../livekit/LiveKitService';

interface RoomHeaderProps {
    room: RoomInfo;
    onBack?: () => void;
    /** Состояние звонка для этой комнаты */
    callState: CallState;
    /** Имя комнаты текущего активного звонка (если есть) */
    activeCallRoomName: string | null;
    /** Начать/присоединиться к звонку */
    onJoinCall: () => void;
    /** Покинуть звонок */
    onLeaveCall: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
    room, onBack, callState, activeCallRoomName, onJoinCall, onLeaveCall,
}) => {
    // Определить состояние кнопки звонка для текущей комнаты
    const isThisRoomInCall = activeCallRoomName === room.name;
    const isOtherRoomInCall = activeCallRoomName !== null && !isThisRoomInCall;

    return (
        <div className="room-header">
            {onBack && (
                <button className="room-header__back" onClick={onBack}>
                    &#8592;
                </button>
            )}
            <div className="room-header__info">
                <div className="room-header__name">
                    {room.type === 'channel' ? '# ' : ''}{room.name}
                    {room.encrypted && ' \uD83D\uDD12'}
                </div>
                {room.topic && <div className="room-header__topic">{room.topic}</div>}
            </div>

            {/* Кнопка звонка — только для каналов (не DM пока) */}
            {room.type === 'channel' && (
                <div className="room-header__call">
                    {isThisRoomInCall ? (
                        <button
                            className="room-header__call-btn room-header__call-btn--leave"
                            onClick={onLeaveCall}
                            title="Завершить звонок"
                        >
                            &#128308;&#128222;
                        </button>
                    ) : (
                        <button
                            className="room-header__call-btn room-header__call-btn--join"
                            onClick={onJoinCall}
                            disabled={isOtherRoomInCall || callState === 'connecting'}
                            title={isOtherRoomInCall ? 'Сначала завершите текущий звонок' : 'Начать звонок'}
                        >
                            {callState === 'connecting' ? '...' : '&#128222;'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
```

### ШАГ 5.3. Обновить ChatLayout — подключить звонки

Файл: `E:\Uplink\web\src\components\ChatLayout.tsx`

Полностью заменить содержимое:

```tsx
import React, { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useMessages } from '../hooks/useMessages';
import { useLiveKit } from '../hooks/useLiveKit';
import { Sidebar } from './Sidebar';
import { RoomHeader } from './RoomHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { CallBar } from './CallBar';
import '../styles/chat.css';

interface ChatLayoutProps {
    onLogout: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ onLogout }) => {
    const { channels, directs } = useRooms();
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
    const { messages, sendMessage, loadMore } = useMessages(activeRoomId);

    const {
        callState, participants, duration, isMuted,
        activeRoomName, joinCall, leaveCall, toggleMute,
    } = useLiveKit();

    const allRooms = [...channels, ...directs];
    const activeRoom = allRooms.find(r => r.id === activeRoomId) || null;

    const handleSelectRoom = (roomId: string) => {
        setActiveRoomId(roomId);
        setMobileView('chat');
    };

    const handleBack = () => {
        setMobileView('sidebar');
    };

    const handleJoinCall = () => {
        if (activeRoom) {
            joinCall(activeRoom.name);
        }
    };

    return (
        <div className="chat-layout">
            <div className={`chat-sidebar ${mobileView === 'chat' ? 'chat-sidebar--hidden' : ''}`}>
                <Sidebar
                    channels={channels}
                    directs={directs}
                    activeRoomId={activeRoomId}
                    onSelectRoom={handleSelectRoom}
                    onLogout={onLogout}
                />
            </div>

            <div className="chat-main">
                {activeRoom ? (
                    <>
                        <RoomHeader
                            room={activeRoom}
                            onBack={handleBack}
                            callState={callState}
                            activeCallRoomName={activeRoomName}
                            onJoinCall={handleJoinCall}
                            onLeaveCall={leaveCall}
                        />

                        {/* Панель звонка — показывается если звонок активен в текущей комнате */}
                        {callState === 'connected' && activeRoomName === activeRoom.name && (
                            <CallBar
                                roomName={activeRoomName}
                                participants={participants}
                                isMuted={isMuted}
                                duration={duration}
                                onToggleMute={toggleMute}
                                onLeave={leaveCall}
                            />
                        )}

                        <MessageList messages={messages} onLoadMore={loadMore} />
                        <MessageInput
                            onSend={sendMessage}
                            roomName={activeRoom.name}
                        />
                    </>
                ) : (
                    <div className="chat-main__empty">
                        Выберите канал или чат
                    </div>
                )}
            </div>
        </div>
    );
};
```

---

## ЧАСТЬ 6: Стили для звонков

### ШАГ 6.1. Добавить стили в конец файла src/styles/chat.css

Добавить в конец `chat.css` (перед блоком `/* === Mobile === */`):

```css
/* === Call Bar === */
.call-bar {
    background: #1e4620;
    border-bottom: 1px solid #2d6630;
    padding: 10px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.call-bar__info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.call-bar__title {
    font-size: 14px;
    font-weight: 600;
    color: #4ade80;
}

.call-bar__icon {
    margin-right: 4px;
}

.call-bar__duration {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    font-variant-numeric: tabular-nums;
}

.call-bar__participants {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.call-bar__participant {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
}

.call-bar__participant--speaking {
    color: #4ade80;
    background: rgba(74, 222, 128, 0.15);
    box-shadow: 0 0 0 1px #4ade80;
}

.call-bar__participant--muted {
    opacity: 0.5;
}

.call-bar__controls {
    display: flex;
    gap: 8px;
}

.call-bar__btn {
    padding: 5px 14px;
    border: none;
    border-radius: var(--uplink-radius);
    font-size: 13px;
    font-family: var(--uplink-font);
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
}

.call-bar__btn--mute {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
}

.call-bar__btn--mute:hover {
    background: rgba(255, 255, 255, 0.2);
}

.call-bar__btn--mute.call-bar__btn--active {
    background: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
}

.call-bar__btn--leave {
    background: var(--uplink-danger);
    color: #fff;
}

.call-bar__btn--leave:hover {
    opacity: 0.85;
}

/* === Call button in RoomHeader === */
.room-header__call {
    flex-shrink: 0;
    margin-left: auto;
}

.room-header__call-btn {
    background: none;
    border: 1px solid var(--uplink-border);
    color: var(--uplink-text-muted);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
}

.room-header__call-btn--join:hover {
    color: var(--uplink-success);
    border-color: var(--uplink-success);
    background: rgba(59, 165, 93, 0.1);
}

.room-header__call-btn--leave {
    border-color: var(--uplink-danger);
}

.room-header__call-btn--leave:hover {
    background: rgba(237, 66, 69, 0.1);
}

.room-header__call-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}
```

---

## ЧАСТЬ 7: Обновить nginx.conf (prod-режим)

### ШАГ 7.1. Добавить проксирование LiveKit Token Service

Файл: `E:\Uplink\web\nginx.conf`

Добавить блок location перед `location /_matrix/`:

```nginx
    # Проксирование запросов токенов к LiveKit Token Service
    location /livekit-token/ {
        proxy_pass http://livekit-token:7890/;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $host;
    }
```

**ВАЖНО:** Если этот блок добавлен, нужно также обновить `TOKEN_SERVICE_URL` в `LiveKitService.ts`. Сделать его зависимым от режима:

```typescript
// В LiveKitService.ts, заменить константу TOKEN_SERVICE_URL:
const TOKEN_SERVICE_URL = window.location.port === '5173'
    ? 'http://localhost:7890'                                    // Dev: напрямую
    : `${window.location.origin}/livekit-token`;                 // Prod: через nginx
```

---

## ЧАСТЬ 8: Сборка, запуск и проверка

### ШАГ 8.1. Установить зависимости веб-приложения

```bash
cd E:\Uplink\web
npm install livekit-client
```

### ШАГ 8.2. Запустить Docker (все сервисы)

```bash
cd E:\Uplink\docker
docker compose up -d --build
```

Дождаться запуска всех контейнеров. Проверить:

```bash
docker compose ps
# Ожидаемо: postgres, redis, synapse, synapse-admin, livekit, livekit-token, uplink — все running/healthy

curl -sf http://localhost:8008/health && echo "Synapse OK"
curl -sf http://localhost:7880 && echo "LiveKit OK"
curl -sf http://localhost:7890/health && echo "Token Service OK"
```

### ШАГ 8.3. Проверить DEV-режим (Vite на 5173)

```bash
cd E:\Uplink\web
npm run dev
```

1. Открыть http://localhost:5173
2. Залогиниться как `@alice:uplink.local` / `test123`
3. Открыть #general
4. В заголовке комнаты должна быть кнопка звонка (📞)
5. Нажать кнопку → CallBar появляется, таймер тикает, микрофон включен
6. Открыть вторую вкладку → залогиниться как `@bob:uplink.local` / `test123`
7. Bob открывает #general → нажимает кнопку звонка
8. У обоих видно двух участников в CallBar
9. Проверить что голос передаётся (нужны наушники чтобы не было эхо)
10. Mute/Unmute — индикатор меняется
11. Индикатор speaking (зелёная подсветка) при разговоре
12. Завершить звонок — CallBar исчезает

### ШАГ 8.4. Проверить PROD-режим (nginx на 5174)

```bash
cd E:\Uplink\docker
docker compose up -d --build uplink
```

1. Открыть http://localhost:5174
2. Повторить шаги 2-12 из 8.3

### ШАГ 8.5. Graceful degradation

1. Остановить LiveKit: `docker compose stop livekit`
2. Открыть чат — должен работать без ошибок (звонки просто не подключаются)
3. Нажать кнопку звонка — должно показать ошибку, но чат продолжает работать
4. Запустить LiveKit обратно: `docker compose start livekit`

---

## Критерии приёмки

- [ ] LiveKit Server работает в Docker (`curl http://localhost:7880`)
- [ ] Token Service работает и отдаёт JWT (`curl -X POST http://localhost:7890/token ...`)
- [ ] `npm run dev` — Vite стартует без ошибок
- [ ] Кнопка звонка отображается в заголовке каналов (#general, #backend, #frontend)
- [ ] Кнопка звонка НЕ отображается в DM (личных сообщениях)
- [ ] Клик по кнопке → CallBar появляется, таймер тикает
- [ ] Два пользователя (две вкладки) подключаются к одному звонку
- [ ] Аудио передаётся между участниками
- [ ] Mute/Unmute работает, индикатор отражает состояние
- [ ] Индикатор speaking (зелёная подсветка) работает
- [ ] Завершение звонка — CallBar исчезает, ресурсы освобождаются
- [ ] При недоступности LiveKit — чат работает, кнопка звонка показывает ошибку
- [ ] Работает в DEV (5173) и PROD (5174) режимах
- [ ] docker-compose: все контейнеры healthy

## Коммит

```
[livekit] Аудиозвонки через LiveKit SFU в веб-приложении

- LiveKit Server + Token Service в Docker Compose
- LiveKitService: подключение, mute, participants, speaking
- useLiveKit hook для React
- CallBar UI: участники, таймер, mute, leave
- Кнопка звонка в RoomHeader
- Интеграция в ChatLayout
- Стили для call-панели
- Graceful degradation при недоступности LiveKit
```
