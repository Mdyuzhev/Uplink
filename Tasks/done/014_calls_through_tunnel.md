# 014: Звонки через Cloudflare Tunnel

## Цель

Заставить аудиозвонки работать при доступе через Cloudflare Tunnel. Сейчас чат работает, а звонки нет — браузер пытается подключиться к LiveKit по `wss://<trycloudflare-домен>:7880`, а такого туннеля нет.

## Контекст проблемы

Cloudflare Tunnel проксирует только один порт — `localhost:5174` (nginx). Nginx проксирует `/_matrix/` → Synapse, отдаёт статику. Но LiveKit (порт 7880) ничем не проксируется.

Кроме того, LiveKit использует WebRTC: сигнализация идёт по WebSocket, а медиа (аудио) — по UDP. UDP через Cloudflare Tunnel **невозможен**. Но LiveKit умеет отправлять медиа по **TCP через тот же WebSocket** — это называется ICE/TCP fallback.

### Решение

Всё через **один** Cloudflare Tunnel и **один** nginx:

```
Браузер (Cloudflare Tunnel)
  → https://xxx.trycloudflare.com
    → nginx (:5174)
      ├── /                → статика React
      ├── /_matrix/*       → synapse:8008
      ├── /livekit-token/* → livekit-token:7890
      └── /livekit-ws      → livekit:7880 (WebSocket proxy)  ← НОВОЕ
```

LiveKit-клиент подключается к `wss://xxx.trycloudflare.com/livekit-ws` — WebSocket идёт через nginx → через Cloudflare Tunnel. Медиа-трафик тоже идёт по TCP/WebSocket (force TCP).

## Зависимости

- Задача 005 (LiveKit звонки) — **выполнена** ✅
- Задача 011 (Cloudflare Tunnel) — **выполнена** ✅, чат работает через туннель

---

## ЧАСТЬ 1: Добавить WebSocket-проксирование LiveKit в nginx

### ШАГ 1.1. Обновить nginx.conf

Файл: `E:\Uplink\web\nginx.conf`

Добавить блок **перед** `location /_matrix/`:

```nginx
    # Проксирование LiveKit WebSocket через nginx
    # Клиент подключается к wss://domain/livekit-ws → LiveKit Server
    location /livekit-ws {
        proxy_pass http://livekit:7880;
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

**Ключевое:** `Upgrade` и `Connection "upgrade"` — это включает WebSocket-проксирование. `proxy_read_timeout 86400s` — не обрывать долгие WebSocket-соединения (звонки могут длиться часами).

---

## ЧАСТЬ 2: Включить TCP fallback в LiveKit Server

### ШАГ 2.1. Обновить livekit.yaml

Файл: `E:\Uplink\docker\livekit\livekit.yaml`

Заменить содержимое:

```yaml
port: 7880
rtc:
  port_range_start: 7882
  port_range_end: 7892
  use_external_ip: false
  # TCP-порт для WebRTC медиа (fallback когда UDP недоступен)
  tcp_port: 7881
  stun_servers:
    - stun:stun.l.google.com:19302
redis:
  address: redis:6379
keys:
  uplink-api-key: uplink-api-secret-change-me-in-prod
logging:
  level: info
```

Добавлено: `tcp_port: 7881`. Это включает ICE/TCP-кандидаты — LiveKit будет предлагать клиенту TCP-соединение для медиа когда UDP недоступен.

---

## ЧАСТЬ 3: Обновить config.ts

### ШАГ 3.1. Обновить LiveKit URL

Файл: `E:\Uplink\web\src\config.ts`

Заменить содержимое:

```typescript
/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Все URL-ы вычисляются из window.location — работает в любом режиме:
 *
 *   localhost:5173                        → Dev (Vite), сервисы напрямую
 *   localhost:5174 / 192.168.1.74:5174    → Prod LAN (nginx)
 *   *.trycloudflare.com                   → Cloudflare Tunnel (HTTPS)
 */

const host = window.location.hostname;
const port = window.location.port;
const isDev = port === '5173';
const isSecure = window.location.protocol === 'https:';

/**
 * Определяем режим доступа:
 * - external: через Cloudflare Tunnel (HTTPS, без порта или 443)
 *   LiveKit через nginx WebSocket proxy: wss://domain/livekit-ws
 * - lan: LAN или localhost (HTTP, порт 5174)
 *   LiveKit напрямую: ws://host:7880
 * - dev: Vite dev server (порт 5173)
 *   LiveKit напрямую: ws://host:7880
 */
const isExternal = isSecure && (port === '' || port === '443');

export const config = {
    /** Matrix homeserver (Synapse) */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /**
     * LiveKit Server (WebSocket).
     * External (Cloudflare): через nginx proxy /livekit-ws
     * LAN/Dev: напрямую на порт 7880
     */
    livekitUrl: isExternal
        ? `wss://${host}/livekit-ws`
        : `ws://${host}:7880`,

    /** Сервис генерации LiveKit-токенов */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
```

---

## ЧАСТЬ 4: Пересобрать и задеплоить

### ШАГ 4.1. Закоммитить

```bash
cd E:\Uplink
git add -A
git commit -m "[livekit][infra] Звонки через Cloudflare Tunnel: nginx WS proxy, TCP fallback"
git push
```

### ШАГ 4.2. Задеплоить

```bash
ssh flomaster@flomasterserver "cd ~/projects/uplink && ./deploy.sh"
```

### ШАГ 4.3. Перезапустить LiveKit (конфиг изменился)

```bash
ssh flomaster@flomasterserver "cd ~/projects/uplink/docker && docker compose restart livekit"
```

### ШАГ 4.4. Перезапустить Cloudflare Tunnel (если systemd)

Туннель уже проксирует localhost:5174, nginx обновился — туннель перезапускать не нужно. Но если используется quick tunnel — перезапустить:

```bash
ssh flomaster@flomasterserver "sudo systemctl restart cloudflared-uplink 2>/dev/null; cloudflared tunnel --url http://localhost:5174"
```

---

## ЧАСТЬ 5: Проверка

### ШАГ 5.1. LAN — регрессия

1. Открыть `http://192.168.1.74:5174`
2. Залогиниться как Alice, открыть #general, нажать звонок
3. Вторая вкладка — Bob, #general, звонок
4. Оба в CallBar, аудио работает

### ШАГ 5.2. Cloudflare Tunnel — звонки

1. Открыть `https://xxx.trycloudflare.com` с телефона (мобильный интернет)
2. Залогиниться как Alice, открыть #general
3. Нажать кнопку звонка
4. CallBar появляется, таймер тикает
5. На другом устройстве (или вкладке) — Bob, #general, звонок
6. Оба видят друг друга в CallBar
7. Аудио передаётся

### ШАГ 5.3. Cloudflare Tunnel — звонки в DM

1. Alice открывает DM с Bob, нажимает звонок
2. Bob открывает DM с Alice, нажимает звонок
3. Оба в одной LiveKit-комнате, аудио работает

### ШАГ 5.4. Проверить что nginx проксирует LiveKit WS

```bash
# С сервера — WebSocket upgrade должен работать
curl -s -o /dev/null -w "%{http_code}" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  http://localhost:5174/livekit-ws
# Ожидаемо: 101 (Switching Protocols) или 400 (Bad Request от LiveKit — тоже OK, значит дошло)
```

---

## Критерии приёмки

- [ ] `nginx.conf`: блок `/livekit-ws` проксирует WebSocket к LiveKit
- [ ] `livekit.yaml`: `tcp_port: 7881` включён
- [ ] `config.ts`: LiveKit URL = `wss://domain/livekit-ws` для HTTPS, `ws://host:7880` для LAN
- [ ] LAN: звонки в каналах работают (регрессии нет)
- [ ] LAN: звонки в DM работают
- [ ] Cloudflare Tunnel: звонки в каналах работают
- [ ] Cloudflare Tunnel: звонки в DM работают
- [ ] Cloudflare Tunnel: аудио передаётся между двумя устройствами
- [ ] Задеплоено на сервер

## Коммит

```
[livekit][infra] Звонки через Cloudflare Tunnel: nginx WS proxy, TCP fallback

- nginx.conf: /livekit-ws → LiveKit WebSocket proxy
- livekit.yaml: tcp_port 7881 для ICE/TCP fallback
- config.ts: wss://domain/livekit-ws для внешнего доступа
```
