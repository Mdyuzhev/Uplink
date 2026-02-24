# 014: Исправить звонки — SIGNAL_SOURCE_CLOSE и проксирование LiveKit

## Цель

Исправить аудиозвонки. Сейчас при нажатии «Позвонить» соединение устанавливается и **мгновенно рвётся** (30мс). В логах LiveKit:

```
starting RTC session {"room": "Nastya", "participant": "@misha:uplink.local"}
participant closing ... reason: "SIGNAL_SOURCE_CLOSE"
```

## Проблемы и решения

### Проблема 1: nginx неправильно проксирует LiveKit WebSocket

LiveKit SDK при подключении к `wss://domain/livekit-ws` добавляет путь `/rtc`. Итоговый запрос: `/livekit-ws/rtc`. Текущий nginx config:

```nginx
location /livekit-ws {
    proxy_pass http://livekit:7880;   # БЕЗ trailing slash
```

Nginx передаёт **полный** URI: `http://livekit:7880/livekit-ws/rtc`. LiveKit не знает путь `/livekit-ws/rtc` → отклоняет.

**Решение:** добавить trailing slash на оба — nginx стрипает `/livekit-ws/` и заменяет на `/`:

```nginx
location /livekit-ws/ {
    proxy_pass http://livekit:7880/;   # С trailing slash — стрипает префикс
```

### Проблема 2: кэшированный JS

В логах комната `"Nastya"` — это display name, а не room ID. Коммит `6d980e3` уже передаёт `room.id`, но пользователь работает на кэшированной версии.

**Решение:** после деплоя попросить пользователей сделать Ctrl+Shift+R (хард-рефреш). Плюс — проверить что nginx отдаёт правильные кэш-заголовки: `index.html` без кэша, `/assets/*` с immutable.

### Проблема 3: микрофон по HTTP

Некоторые браузеры (Chrome, Yandex) блокируют `getUserMedia()` по HTTP (незащищённый контекст). Но код уже обрабатывает это в try/catch — микрофон недоступен, но звонок должен продолжиться (слушать можно, говорить нет).

`SIGNAL_SOURCE_CLOSE` вероятнее всего вызван именно **проблемой 1** — nginx не стрипает путь, LiveKit отклоняет подключение.

## Зависимости

- Задача 005 (LiveKit звонки) — **выполнена** ✅
- Задача 011 (Cloudflare Tunnel) — **выполнена** ✅
- Задача 013 (Звонки в DM, room.id) — **выполнена** ✅

---

## ШАГ 1: Исправить nginx.conf — LiveKit WebSocket proxy

Файл: `E:\Uplink\web\nginx.conf`

**Заменить** блок `/livekit-ws`:

БЫЛО:
```nginx
    location /livekit-ws {
        proxy_pass http://livekit:7880;
```

СТАЛО:
```nginx
    location /livekit-ws/ {
        proxy_pass http://livekit:7880/;
```

**Только эти две строки.** Все остальные строки блока (proxy_http_version, Upgrade, timeout и т.д.) — оставить как есть.

## ШАГ 2: Добавить no-cache для index.html

В том же `nginx.conf`, обновить блок `location /`:

БЫЛО:
```nginx
    location / {
        try_files $uri $uri/ /index.html;
    }
```

СТАЛО:
```nginx
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Не кэшировать index.html — чтобы обновлённый JS подтягивался сразу
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
```

## ШАГ 3: Проверить config.ts — URL LiveKit

Файл: `E:\Uplink\web\src\config.ts`

Убедиться что LiveKit URL для внешнего доступа (HTTPS) указывает на `/livekit-ws/` **с trailing slash**:

```typescript
livekitUrl: isExternal
    ? `wss://${host}/livekit-ws/`
    : `ws://${host}:7880`,
```

Если в config.ts стоит `wss://${host}/livekit-ws` (без `/` в конце) — LiveKit SDK сформирует путь `/livekit-wsrtc` вместо `/livekit-ws/rtc`. Trailing slash обязателен.

## ШАГ 4: Проверить livekit.yaml — TCP fallback

Файл: `E:\Uplink\docker\livekit\livekit.yaml`

Убедиться что включён `tcp_port`:

```yaml
port: 7880
rtc:
  port_range_start: 7882
  port_range_end: 7892
  use_external_ip: false
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

Если `tcp_port: 7881` отсутствует — добавить. Это нужно чтобы медиа-трафик (аудио) мог идти по TCP когда UDP недоступен (что всегда так через Cloudflare Tunnel).

## ШАГ 5: Коммит, пуш, деплой

```bash
cd E:\Uplink
git add -A
git commit -m "[livekit][fix] nginx WS proxy: trailing slash, no-cache index.html, TCP fallback"
git push
```

На сервере:

```bash
cd ~/projects/uplink
./deploy.sh
# Перезапустить LiveKit (конфиг мог измениться)
cd docker && docker compose restart livekit
```

## ШАГ 6: Проверить nginx proxy

С сервера:

```bash
# WebSocket upgrade через nginx → LiveKit
# Ожидаемо: 101 (Switching Protocols) или 400 (от LiveKit — значит дошло)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://localhost:5174/livekit-ws/rtc

# Прямой запрос к LiveKit (для сравнения)
curl -s -o /dev/null -w "%{http_code}" \
  -H "Upgrade: websocket" \
  -H "Connection: Upgrade" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://localhost:7880/rtc

# Оба должны вернуть одинаковый код (101 или 400)
# Если первый 404, а второй 101/400 — nginx всё ещё не стрипает путь
```

## ШАГ 7: Проверить в логах LiveKit

```bash
# Следить за логами в реальном времени
docker logs -f uplink-livekit --since 1m 2>&1 | grep -E "RTC session|closing|SIGNAL"
```

Открыть приложение, нажать звонок, смотреть логи. После фикса не должно быть `SIGNAL_SOURCE_CLOSE` через 30мс. Участник должен оставаться подключённым.

## ШАГ 8: Проверка звонков

### 8.1 LAN

1. Открыть `http://192.168.1.74:5174` (хард-рефреш: Ctrl+Shift+R)
2. Alice → #general → звонок → CallBar появляется, таймер тикает
3. Bob (вторая вкладка) → #general → звонок → оба в CallBar
4. Аудио между Alice и Bob

### 8.2 Cloudflare Tunnel

1. Открыть Cloudflare URL с телефона (мобильный интернет)
2. Хард-рефреш
3. Alice → #general → звонок → CallBar
4. Bob (другое устройство) → #general → звонок
5. Оба в CallBar, аудио работает

### 8.3 DM-звонок

1. Alice → DM с Bob → звонок
2. Bob → DM с Alice → звонок
3. В логах LiveKit: комната = `!roomId:uplink.local` (НЕ имя "Nastya" или "Bob")

---

## Критерии приёмки

- [ ] `nginx.conf`: `/livekit-ws/` с trailing slash на location и proxy_pass
- [ ] `nginx.conf`: `index.html` отдаётся с `no-cache`
- [ ] `config.ts`: LiveKit URL заканчивается на `/livekit-ws/` (с trailing slash)
- [ ] `livekit.yaml`: `tcp_port: 7881` присутствует
- [ ] curl к `/livekit-ws/rtc` через nginx возвращает 101 или 400 (не 404)
- [ ] Логи LiveKit: нет `SIGNAL_SOURCE_CLOSE` через 30мс
- [ ] Логи LiveKit: имя комнаты = room ID (не display name)
- [ ] LAN: звонки работают в каналах и DM
- [ ] Cloudflare Tunnel: звонки работают
- [ ] Задеплоено на сервер

## Коммит

```
[livekit][fix] Исправить звонки: nginx WS proxy trailing slash, no-cache, TCP fallback

- nginx.conf: /livekit-ws/ с trailing slash — правильный path stripping
- nginx.conf: index.html no-cache — свежий JS при деплое
- config.ts: livekitUrl trailing slash
- livekit.yaml: tcp_port 7881
```
