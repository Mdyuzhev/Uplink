# 017: Звонки через LiveKit Cloud + видеозвонки

## Статус: ГОТОВО К ВЫПОЛНЕНИЮ

LiveKit Cloud аккаунт создан, проект "Uplink" готов.

**Известные данные:**
- URL: `wss://uplink-3ism3la4.livekit.cloud`
- API Key: `APIXUKnGCb2vUQZ`
- API Secret: `hMkeeXl3pjOZKrpUCJa5OAy0wsrlYkGllb1bcQHeZDjA`

---

## Цель

Перенести медиасервер в LiveKit Cloud. Убрать self-hosted LiveKit, coturn, nginx WebSocket proxy. Добавить видеозвонки.

## Зачем

LiveKit — единственный сервис, которому нужен публичный IP с открытыми UDP-портами. На homelab за двойным NAT он работает только в LAN. Cloudflare Tunnel пробрасывает HTTP/WebSocket, но не UDP (WebRTC медиа). LiveKit Cloud решает это: TURN/STUN встроены, работает через любой NAT, один URL для всех клиентов. Бесплатный tier — 50 participant-minutes/месяц.

## Зависимости

- Задача 005 (LiveKit аудио) — выполнена ✅
- Задача 013 (звонки в DM) — выполнена ✅
- LiveKit Cloud аккаунт — создан ✅

## Предусловия

API Key и Secret получены, все значения прописаны в задаче.

```bash
# Веб-приложение работает
curl -sf http://192.168.1.74:5174 && echo "OK"
# Synapse работает
curl -sf http://192.168.1.74:8008/health && echo "OK"
```

---

## ЧАСТЬ 1: Обновить docker/.env

Файл: `E:\Uplink\docker\.env`

**Убрать** строку `TURN_HOST=81.200.8.171`.

**Добавить** ключи LiveKit Cloud:

```env
# LiveKit Cloud
LIVEKIT_API_KEY=APIo9mdkwkQchic
LIVEKIT_API_SECRET=hMkeeXl3pjOZKrpUCJa5OAy0wsrlYkGllb1bcQHeZDjA
```



---

## ЧАСТЬ 2: Обновить config.ts

Файл: `E:\Uplink\web\src\config.ts`

LiveKit теперь в облаке — один URL для всех клиентов (LAN, Cloudflare Tunnel, мобильный). Логика `isExternal` для LiveKit больше не нужна.

Заменить **весь файл** на:

```typescript
/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Matrix (Synapse) — на homelab, доступ через nginx.
 * LiveKit — в облаке (LiveKit Cloud), единый URL для всех клиентов.
 * Token Service — на homelab, проксируется через nginx.
 */

const host = window.location.hostname;
const port = window.location.port;
const isDev = port === '5173';

export const config = {
    /** Matrix homeserver (Synapse) */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /**
     * LiveKit Cloud — единый URL для всех клиентов.
     * TURN/STUN встроены, работает через любой NAT.
     */
    livekitUrl: 'wss://uplink-3ism3la4.livekit.cloud',

    /** Сервис генерации LiveKit-токенов (на homelab) */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
```

**Убрать** экспорт `isExternal` — он больше нигде не нужен. Если другие файлы импортируют `isExternal`, убрать импорт оттуда.

---

## ЧАСТЬ 3: Упростить LiveKitService — убрать TURN, добавить видео

Файл: `E:\Uplink\web\src\livekit\LiveKitService.ts`

### ШАГ 3.1. Убрать импорт isExternal

Найти:
```typescript
import { config, isExternal } from '../config';
```
Заменить на:
```typescript
import { config } from '../config';
```

### ШАГ 3.2. Убрать TURN из joinCall()

В методе `joinCall()` найти и **удалить** блок TURN/rtcConfig:

```typescript
            // УДАЛИТЬ ЭТОТ БЛОК:
            const rtcConfig: RTCConfiguration | undefined =
                isExternal && turnServers.length > 0
                    ? { iceServers: turnServers, iceTransportPolicy: 'relay' as RTCIceTransportPolicy }
                    : undefined;
```

И убрать `rtcConfig` из вызова `connect()`:

**Было:**
```typescript
await this.room.connect(config.livekitUrl, token, { rtcConfig });
```
**Стало:**
```typescript
await this.room.connect(config.livekitUrl, token);
```

### ШАГ 3.3. Упростить fetchToken()

**Было:**
```typescript
private async fetchToken(userId: string, roomName: string): Promise<{ token: string; turnServers: RTCIceServer[] }> {
    // ...
    return { token: data.token, turnServers: data.turnServers || [] };
}
```

**Стало:**
```typescript
/** Получить токен. TURN не нужен — LiveKit Cloud сам управляет relay. */
private async fetchToken(userId: string, roomName: string): Promise<string> {
    const resp = await fetch(`${config.tokenServiceUrl}/token`, {
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
```

Соответственно в `joinCall()` обновить вызов:

**Было:**
```typescript
const { token, turnServers } = await this.fetchToken(userId, roomName);
```
**Стало:**
```typescript
const token = await this.fetchToken(userId, roomName);
```

### ШАГ 3.4. Добавить поддержку видео

В интерфейс `CallParticipant` добавить:
```typescript
isCameraOn: boolean;
```

В `getParticipants()` для каждого участника (local и remote) добавить:
```typescript
isCameraOn: local.isCameraEnabled,  // для локального
isCameraOn: p.isCameraEnabled,       // для remote
```

Добавить поле и событие для видеотреков:

```typescript
private _videoTrackListeners = new Set<Listener<(identity: string, track: MediaStreamTrack | null) => void>>();

/** Подписка на появление/исчезновение видеотреков */
onVideoTrack(fn: (identity: string, track: MediaStreamTrack | null) => void): () => void {
    this._videoTrackListeners.add(fn);
    return () => { this._videoTrackListeners.delete(fn); };
}

private emitVideoTrack(identity: string, track: MediaStreamTrack | null): void {
    this._videoTrackListeners.forEach(fn => fn(identity, track));
}
```

Добавить метод `toggleCamera()`:

```typescript
/** Переключить камеру (вкл/выкл) */
async toggleCamera(): Promise<boolean> {
    if (!this.room) return false;

    const currentlyEnabled = this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(!currentlyEnabled);

    if (!currentlyEnabled) {
        const pub = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (pub?.track) {
            this.emitVideoTrack(this.room.localParticipant.identity, pub.track.mediaStreamTrack);
        }
    } else {
        this.emitVideoTrack(this.room.localParticipant.identity, null);
    }

    this.emitParticipants();
    return !currentlyEnabled;
}

get isCameraOn(): boolean {
    if (!this.room) return false;
    return this.room.localParticipant.isCameraEnabled;
}
```

В `setupRoomListeners()`, в обработчике `TrackSubscribed` добавить видео:

```typescript
this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind === Track.Kind.Audio) {
        const audioEl = track.attach();
        audioEl.id = `audio-${participant.identity}`;
        document.body.appendChild(audioEl);
    } else if (track.kind === Track.Kind.Video) {
        this.emitVideoTrack(participant.identity, track.mediaStreamTrack);
    }
});
```

В `TrackUnsubscribed`:

```typescript
this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
    if (track.kind === Track.Kind.Audio) {
        track.detach().forEach(el => el.remove());
        const audioEl = document.getElementById(`audio-${participant.identity}`);
        if (audioEl) audioEl.remove();
    } else if (track.kind === Track.Kind.Video) {
        this.emitVideoTrack(participant.identity, null);
    }
});
```

В `ParticipantDisconnected`:

```typescript
this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
    this.emitVideoTrack(participant.identity, null);
    this.emitParticipants();
});
```

В `cleanup()` перед обнулением `this.room` — сбросить видеотреки:

```typescript
if (this.room) {
    this.room.removeAllListeners();
    this.room.remoteParticipants.forEach((p) => {
        const audioEl = document.getElementById(`audio-${p.identity}`);
        if (audioEl) audioEl.remove();
        this.emitVideoTrack(p.identity, null);
    });
    this.emitVideoTrack(this.room.localParticipant.identity, null);
    this.room = null;
}
```

В конструкторе `Room()` в `joinCall()` добавить videoCaptureDefaults:

```typescript
this.room = new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
        resolution: { width: 640, height: 480, frameRate: 24 },
    },
});
```

---

## ЧАСТЬ 4: Упростить Token Service

Файл: `E:\Uplink\docker\livekit-token\server.mjs`

### ШАГ 4.1. Убрать TURN-логику

Удалить переменные `TURN_HOST`, `TURN_PORT`, `TURN_USER`, `TURN_PASS` и весь блок построения `turnServers`.

### ШАГ 4.2. Убрать fallback-значения для ключей

**Было:**
```javascript
const API_KEY = process.env.LIVEKIT_API_KEY || 'uplink-api-key';
const API_SECRET = process.env.LIVEKIT_API_SECRET || 'uplink-api-secret-change-me-in-prod';
```

**Стало:**
```javascript
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!API_KEY || !API_SECRET) {
    console.error('LIVEKIT_API_KEY и LIVEKIT_API_SECRET обязательны!');
    process.exit(1);
}
```

### ШАГ 4.3. Упростить ответ

**Было:**
```javascript
res.end(JSON.stringify({ token, turnServers }));
```

**Стало:**
```javascript
res.end(JSON.stringify({ token }));
```

---

## ЧАСТЬ 5: Убрать livekit и coturn из docker-compose

Файл: `E:\Uplink\docker\docker-compose.yml`

### ШАГ 5.1. Удалить сервис `livekit`

Весь блок `livekit:` (image, ports 7880/7881/7882-7892, volumes, command, depends_on, healthcheck).

### ШАГ 5.2. Удалить сервис `coturn`

Весь блок `coturn:` (image, network_mode, volumes, command).

### ШАГ 5.3. Обновить сервис `livekit-token`

Убрать `depends_on: livekit`. Убрать TURN-переменные из `environment`. Ключи берутся из `.env`:

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
      LIVEKIT_API_KEY: ${LIVEKIT_API_KEY}
      LIVEKIT_API_SECRET: ${LIVEKIT_API_SECRET}
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://localhost:7890/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))\""]
      interval: 10s
      timeout: 5s
      retries: 5
```

### ШАГ 5.4. Удалить конфигурационные файлы

```bash
rm -rf E:\Uplink\docker\livekit\
rm -rf E:\Uplink\docker\coturn\
```

На сервере тоже:
```bash
rm -rf ~/projects/uplink/docker/livekit/
rm -rf ~/projects/uplink/docker/coturn/
```

---

## ЧАСТЬ 6: Убрать livekit-ws proxy из nginx

Файл: `E:\Uplink\web\nginx.conf`

**Удалить** весь блок `location /livekit-ws/` (клиент теперь подключается напрямую к LiveKit Cloud):

```nginx
    # УДАЛИТЬ:
    location /livekit-ws/ {
        proxy_pass http://livekit:7880/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
```

**Оставить** `/livekit-token/` и `/_matrix/`.

---

## ЧАСТЬ 7: Добавить UI для видеозвонков

### ШАГ 7.1. CallBar — кнопка камеры

Файл: `E:\Uplink\web\src\components\CallBar.tsx`

Добавить пропсы `isCameraOn: boolean` и `onToggleCamera: () => void`.

Добавить кнопку камеры между Mute и Завершить:

```tsx
<button
    className={`call-bar__btn call-bar__btn--camera ${isCameraOn ? 'call-bar__btn--active' : ''}`}
    onClick={onToggleCamera}
    title={isCameraOn ? 'Выключить камеру' : 'Включить камеру'}
>
    {isCameraOn ? '📹 Камера' : '📷 Камера'}
</button>
```

У участников с камерой показать индикатор:
```tsx
{p.isCameraOn ? ' 📹' : ''}
```

### ШАГ 7.2. VideoGrid — рендеринг видеопотоков

Создать файл: `E:\Uplink\web\src\components\VideoGrid.tsx`

Компонент подписывается на `livekitService.onVideoTrack()` и рендерит `<video>` для каждого участника с камерой. Каждый видеопоток в отдельном тайле с именем участника. Если ни у кого камера не включена — компонент не рендерится.

Внутри VideoTile:
```tsx
const videoRef = useRef<HTMLVideoElement>(null);
useEffect(() => {
    if (videoRef.current && track) {
        videoRef.current.srcObject = new MediaStream([track]);
    }
    return () => { if (videoRef.current) videoRef.current.srcObject = null; };
}, [track]);
```

### ШАГ 7.3. Встроить VideoGrid в ChatLayout

В ChatLayout, рядом с CallBar:
```tsx
{isInCall && <VideoGrid />}
```

Добавить состояние `isCameraOn` и обработчик `handleToggleCamera`, прокинуть в CallBar.

### ШАГ 7.4. CSS для видео

Добавить стили `.video-grid`, `.video-tile`, `.video-tile__video`, `.video-tile__name`, `.call-bar__btn--camera`. Видеосетка: тёмный фон, flex-wrap, тайлы с border-radius, имя участника поверх видео.

---

## ЧАСТЬ 8: Коммит, деплой, проверка

### ШАГ 8.1. Коммит и пуш

```powershell
cd E:\Uplink
git add -A
git commit -m "[livekit] Миграция на LiveKit Cloud + видеозвонки

- LiveKit Cloud вместо self-hosted (TURN встроен, один URL)
- Удалены livekit, coturn из docker-compose
- Удалён nginx /livekit-ws/ proxy
- config.ts: один livekitUrl, убрана логика isExternal
- LiveKitService: убран TURN, добавлены видеотреки и toggleCamera
- CallBar: кнопка камеры, VideoGrid для видеопотоков
- Token service: упрощён, без TURN, валидация env"
git push
```

### ШАГ 8.2. Деплой на сервер

```bash
ssh flomaster@flomasterserver
# пароль: Misha2021@1@

cd ~/projects/uplink
./deploy.sh

# Остановить старые контейнеры (livekit, coturn могут остаться)
cd docker
docker compose down --remove-orphans
docker compose up -d

# Проверить — должны быть: postgres, redis, synapse, synapse-admin, livekit-token, uplink-web
# НЕ должно быть: livekit, coturn
docker compose ps
```

### ШАГ 8.3. Проверка — аудиозвонок через облако

1. Открыть http://192.168.1.74:5174 (Ctrl+Shift+R)
2. Залогиниться как Alice, открыть DM с Bob, позвонить
3. Console: подключение к `wss://uplink-3ism3la4.livekit.cloud`
4. Bob присоединяется — голос слышен с обеих сторон

### ШАГ 8.4. Проверка — видеозвонок

1. Alice в звонке → нажать «📷 Камера»
2. Появляется VideoGrid с собственным видео
3. Bob видит видео Alice
4. Bob включает камеру → оба видят друг друга
5. Выключить камеру → видеотайл исчезает

### ШАГ 8.5. Проверка — внешний доступ (Cloudflare Tunnel)

**Самая важная проверка** — раньше звонки через туннель не работали:
1. Открыть Cloudflare Tunnel URL с телефона
2. Залогиниться, позвонить
3. Аудио и видео работают через NAT без костылей

### ШАГ 8.6. Проверка — чат не сломан

Сообщения, DM, профиль, список пользователей — всё работает как раньше.

---

## Критерии приёмки

- [ ] `.env`: LIVEKIT_API_KEY + LIVEKIT_API_SECRET прописаны
- [ ] config.ts: `livekitUrl: 'wss://uplink-3ism3la4.livekit.cloud'`
- [ ] LiveKitService: TURN-логика убрана, видео добавлено
- [ ] Token service: TURN убран, ключи из .env, валидация
- [ ] docker-compose.yml: livekit и coturn удалены
- [ ] nginx.conf: /livekit-ws/ удалён
- [ ] Аудиозвонок работает в LAN
- [ ] Аудиозвонок работает через Cloudflare Tunnel
- [ ] Видеозвонок: камера вкл/выкл, оба участника видят друг друга
- [ ] Чат и остальные функции не сломаны
- [ ] Задеплоено на сервер

## Коммит

```
[livekit] Миграция на LiveKit Cloud + видеозвонки

- LiveKit Cloud (wss://uplink-3ism3la4.livekit.cloud) вместо self-hosted
- Удалены livekit, coturn из docker-compose
- Удалён nginx /livekit-ws/ proxy
- config.ts: один livekitUrl, убрана логика isExternal
- LiveKitService: убран TURN, видеотреки, toggleCamera
- CallBar + VideoGrid: UI видеозвонков
- Token service: упрощён, без TURN
```
