# 005: LiveKit — Аудиозвонки

## Цель

Добавить поддержку аудиозвонков через LiveKit SFU: кнопка звонка в заголовке комнаты, мини-панель управления (mute, disconnect), индикация активного звонка в UI. На этом этапе — только аудио, без видео.

## Контекст

Звонки — вторая ключевая функция после чата. Для PoC достаточно базовых аудиозвонков внутри комнат. LiveKit выбран как open source SFU с хорошим JS SDK и возможностью on-premise развёртывания.

## Зависимости

- Задача 001 (Docker-инфраструктура) — **расширить** docker-compose.yml: добавить LiveKit Server
- Задача 004 (Chat WebView) — **блокирующая**, нужен UI для размещения call-панели

## Шаги

### ШАГ 1. Добавить LiveKit Server в Docker Compose

Дополнить `docker/docker-compose.yml`:

```yaml
livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"   # HTTP API
      - "7881:7881"   # RTC (WebRTC)
      - "7882:7882/udp"  # UDP для медиа
    volumes:
      - ./livekit/livekit.yaml:/etc/livekit.yaml
    command: --config /etc/livekit.yaml
    depends_on:
      redis:
        condition: service_healthy
```

Создать `docker/livekit/livekit.yaml`:

```yaml
port: 7880
rtc:
  port_range_start: 7882
  port_range_end: 7892
  use_external_ip: false
redis:
  address: redis:6379
keys:
  uplink-api-key: uplink-api-secret
logging:
  level: info
```

### ШАГ 2. Установить зависимости

```bash
npm install livekit-client livekit-server-sdk
npm install -D @types/livekit-client
```

### ШАГ 3. Создать src/livekit/tokenService.ts

```typescript
/**
 * Генерация LiveKit access tokens.
 * В PoC — генерация на стороне extension (в продакшене — через backend).
 */
import { AccessToken } from 'livekit-server-sdk';

export class LiveKitTokenService {
    constructor(
        private apiKey: string,
        private apiSecret: string
    ) {}

    /**
     * Сгенерировать токен для подключения к комнате.
     * roomName привязан к Matrix roomId.
     */
    generateToken(userId: string, roomName: string): string {
        const token = new AccessToken(this.apiKey, this.apiSecret, {
            identity: userId,
            name: userId,
        });
        token.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
        });
        return token.toJwt();
    }
}
```

### ШАГ 4. Создать src/livekit/client.ts

```typescript
import { Room, RoomEvent, Track, LocalParticipant, RemoteParticipant } from 'livekit-client';

/**
 * Сервис управления LiveKit-звонками.
 */
export class LiveKitService {
    private room: Room | null = null;
    private _onParticipantsChanged = new EventEmitter<Participant[]>();
    private _onCallStateChanged = new EventEmitter<CallState>();

    readonly onParticipantsChanged = this._onParticipantsChanged.event;
    readonly onCallStateChanged = this._onCallStateChanged.event;

    get isInCall(): boolean { ... }
    get participants(): Participant[] { ... }
    get isMuted(): boolean { ... }

    /**
     * Присоединиться к аудиозвонку в комнате.
     */
    async joinCall(livekitUrl: string, token: string): Promise<void> {
        this.room = new Room();

        this.room.on(RoomEvent.ParticipantConnected, this._onParticipantJoined.bind(this));
        this.room.on(RoomEvent.ParticipantDisconnected, this._onParticipantLeft.bind(this));
        this.room.on(RoomEvent.TrackSubscribed, this._onTrackSubscribed.bind(this));
        this.room.on(RoomEvent.Disconnected, this._onDisconnected.bind(this));

        await this.room.connect(livekitUrl, token);

        // Публикуем только аудио (без видео для PoC)
        await this.room.localParticipant.setMicrophoneEnabled(true);
    }

    /** Включить/выключить микрофон */
    async toggleMute(): Promise<boolean> { ... }

    /** Покинуть звонок */
    async leaveCall(): Promise<void> { ... }

    /** Получить список участников */
    getParticipants(): ParticipantInfo[] { ... }
}

interface ParticipantInfo {
    identity: string;
    displayName: string;
    isMuted: boolean;
    isSpeaking: boolean;
}

type CallState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
```

### ШАГ 5. Создать src/livekit/audioCall.ts

```typescript
/**
 * Высокоуровневый менеджер аудиозвонков.
 * Связывает LiveKitService с Matrix (комната → звонок) и UI.
 */
export class AudioCallManager {
    constructor(
        private livekit: LiveKitService,
        private tokenService: LiveKitTokenService,
        private matrixService: MatrixService
    ) {}

    /**
     * Начать звонок в комнате Matrix.
     * 1. Генерирует токен
     * 2. Подключается к LiveKit
     * 3. Отправляет системное сообщение в Matrix: "🔊 Звонок начался"
     */
    async startCall(matrixRoomId: string): Promise<void> { ... }

    /**
     * Присоединиться к существующему звонку.
     */
    async joinCall(matrixRoomId: string): Promise<void> { ... }

    /**
     * Покинуть звонок.
     * Отправляет в Matrix: "Пользователь покинул звонок"
     */
    async leaveCall(): Promise<void> { ... }
}
```

### ШАГ 6. Добавить Call UI в Chat WebView

Добавить в `src/webview/chat/` новые компоненты:

#### CallBar.tsx — мини-панель активного звонка

```
┌──────────────────────────────────────┐
│ 🔊 Звонок в #general  |  02:35      │
│ 👤 dev1  👤 dev2  👤 dev3            │
│                                      │
│   [🎤 Mute]    [📞 Завершить]       │
└──────────────────────────────────────┘
```

Это компонент, который появляется поверх ленты сообщений когда пользователь в звонке.

```tsx
interface CallBarProps {
    roomName: string;
    participants: ParticipantInfo[];
    isMuted: boolean;
    duration: number;  // секунды, обновляется таймером
    onToggleMute: () => void;
    onLeave: () => void;
}
```

#### CallButton.tsx — кнопка звонка в заголовке комнаты

В компоненте MainArea, рядом с названием комнаты:
- Если нет звонка: иконка телефона 📞, по клику — startCall
- Если звонок активен: зелёная иконка 🟢📞, по клику — joinCall
- Если пользователь в звонке: красная иконка 🔴📞, по клику — leaveCall

#### SpeakingIndicator.tsx — индикатор говорящего

В списке участников CallBar: пульсирующий зелёный круг рядом с именем участника, который сейчас говорит. LiveKit SDK предоставляет событие `isSpeaking`.

### ШАГ 7. Расширить postMessage протокол

Добавить сообщения для звонков:

```typescript
// WebView → Extension:
{ type: 'startCall', roomId: string }
{ type: 'joinCall', roomId: string }
{ type: 'leaveCall' }
{ type: 'toggleMute' }

// Extension → WebView:
{ type: 'callState', state: CallState, roomId: string }
{ type: 'callParticipants', participants: ParticipantInfo[] }
{ type: 'callDuration', seconds: number }
```

### ШАГ 8. Обновить extension.ts

Добавить инициализацию LiveKit сервисов:

```typescript
// В activate():
const tokenService = new LiveKitTokenService(
    'uplink-api-key',   // из конфигурации
    'uplink-api-secret'
);
const livekitService = new LiveKitService();
const callManager = new AudioCallManager(livekitService, tokenService, matrixService);

// Команда startCall
vscode.commands.registerCommand('uplink.startCall', async () => {
    // Показать QuickPick с комнатами
    // Вызвать callManager.startCall(roomId)
});
```

### ШАГ 9. Написать тесты

Файл: `test/suite/livekit.test.ts`

```typescript
suite('LiveKitService', () => {
    test('joinCall подключается к серверу');
    test('toggleMute переключает микрофон');
    test('leaveCall отключается и очищает состояние');
    test('getParticipants возвращает список');
});
```

Файл: `test/suite/tokenService.test.ts`

```typescript
suite('LiveKitTokenService', () => {
    test('generateToken возвращает валидный JWT');
    test('токен содержит правильный roomName и identity');
});
```

### ШАГ 10. Интеграционная проверка

1. `cd docker && docker compose up -d` — все 5 сервисов работают
2. F5 → Extension Development Host
3. Открыть чат, выбрать #general
4. Нажать кнопку звонка 📞 в заголовке
5. Должен появиться CallBar с таймером
6. Открыть второй VS Code (или второго юзера) → присоединиться к звонку
7. Проверить что голос передаётся
8. Mute/unmute работает
9. Индикатор speaking работает
10. Завершение звонка — CallBar исчезает

## Критерии приёмки

- [ ] LiveKit Server работает в Docker Compose
- [ ] Аудиозвонок устанавливается между двумя клиентами
- [ ] CallBar отображается во время звонка (участники, таймер)
- [ ] Mute/Unmute работает
- [ ] Индикатор говорящего работает
- [ ] Завершение звонка корректно отключает аудио
- [ ] В Matrix-комнату приходит системное сообщение о звонке
- [ ] При недоступности LiveKit — graceful degradation (чат работает без звонков)
- [ ] Тесты проходят

## Коммит

```
[livekit] Аудиозвонки через LiveKit SFU

- LiveKit Server в Docker Compose
- LiveKitService: connect, mute, participants
- AudioCallManager: привязка звонков к Matrix-комнатам
- CallBar UI: участники, таймер, mute, leave
- Индикатор говорящего
- Генерация токенов
```
