# 014: Звонки через Cloudflare Tunnel — облачный TURN вместо coturn

## Цель

Заставить аудиозвонки работать при доступе через Cloudflare Tunnel. Сигнализация (WebSocket) уже проходит через туннель, но медиа-трафик (аудио) требует TURN-relay. Самохостный coturn недоступен извне из-за двойного NAT провайдера (WAN роутера = `10.22.89.133`).

## Решение

Заменить coturn на **бесплатный облачный TURN-сервер** (Metered.ca). Код уже почти готов:
- Token service уже отдаёт `turnServers` в ответе
- LiveKitService уже передаёт `rtcConfig` с TURN и `iceTransportPolicy: 'relay'` для внешнего доступа

Нужно только: зарегистрировать бесплатный TURN, обновить credentials, убрать coturn, добавить `turns:` (TURN over TLS на 443).

```
Через Cloudflare Tunnel:
  Сигнализация: Клиент → Cloudflare → nginx → /livekit-ws/ → LiveKit (WebSocket)
  Медиа:        Клиент → metered.ca TURN → relay → LiveKit (аудио по TCP/TLS)

Через LAN:
  Сигнализация: Клиент → ws://192.168.1.74:7880 → LiveKit (WebSocket, напрямую)
  Медиа:        Клиент → UDP → LiveKit (напрямую, без TURN)
```

## Зависимости

- Задача 005 (LiveKit звонки) — **выполнена** ✅
- Задача 011 (Cloudflare Tunnel) — **выполнена** ✅

---

## ЧАСТЬ 1: Получить бесплатный TURN-сервер

### Вариант А: Metered.ca (рекомендуется — надёжнее)

1. Зарегистрироваться на https://www.metered.ca/signup (бесплатно, 500 ГБ/месяц)
2. Создать приложение (TURN app)
3. Получить credentials: API key, TURN URLs, username, password
4. Metered даёт несколько URL-ов (UDP, TCP, TLS на разных портах)

### Вариант Б: Open Relay (без регистрации, может быть менее стабильным)

Бесплатный публичный TURN от Metered, без регистрации:

```
TURN host: openrelay.metered.ca
Порты: 80 (UDP/TCP), 443 (TCP/TLS)
Username: openrelayproject
Password: openrelayproject
```

Для PoC подойдёт вариант Б (быстрее), для продакшена — вариант А.

---

## ЧАСТЬ 2: Обновить Token Service — поддержка TURN over TLS

### ШАГ 2.1. Обновить server.mjs

Файл: `E:\Uplink\docker\livekit-token\server.mjs`

Текущий код генерирует только `turn:` URL-ы. Нужно добавить `turns:` (TURN over TLS) — это критично для прохождения через файрволы и NAT. Заменить блок генерации turnServers:

**Найти** (примерно строка 65):
```javascript
            const turnServers = TURN_HOST ? [
                {
                    urls: `turn:${TURN_HOST}:${TURN_PORT}?transport=udp`,
                    username: TURN_USER,
                    credential: TURN_PASS,
                },
                {
                    urls: `turn:${TURN_HOST}:${TURN_PORT}?transport=tcp`,
                    username: TURN_USER,
                    credential: TURN_PASS,
                },
            ] : [];
```

**Заменить на:**
```javascript
            // TURN-серверы для relay медиа через NAT/firewall
            // Включаем UDP, TCP и TLS варианты для максимальной совместимости
            const TURN_TLS_PORT = process.env.TURN_TLS_PORT || '443';
            const turnServers = TURN_HOST ? [
                {
                    urls: `turn:${TURN_HOST}:${TURN_PORT}?transport=udp`,
                    username: TURN_USER,
                    credential: TURN_PASS,
                },
                {
                    urls: `turn:${TURN_HOST}:${TURN_PORT}?transport=tcp`,
                    username: TURN_USER,
                    credential: TURN_PASS,
                },
                {
                    // TURN over TLS на порту 443 — проходит через любой файрвол
                    urls: `turns:${TURN_HOST}:${TURN_TLS_PORT}?transport=tcp`,
                    username: TURN_USER,
                    credential: TURN_PASS,
                },
            ] : [];
```

---

## ЧАСТЬ 3: Обновить .env на сервере

### ШАГ 3.1. Обновить .env

Файл: `~/projects/uplink/docker/.env` на сервере.

**Для Open Relay (вариант Б, без регистрации):**

```bash
TURN_HOST=openrelay.metered.ca
TURN_PORT=80
TURN_TLS_PORT=443
TURN_USER=openrelayproject
TURN_PASS=openrelayproject
```

**Для Metered.ca (вариант А, после регистрации):**

```bash
TURN_HOST=<your-app>.relay.metered.ca
TURN_PORT=80
TURN_TLS_PORT=443
TURN_USER=<your-api-key>
TURN_PASS=<your-api-key>
```

Также обновить локальный `.env`:

Файл: `E:\Uplink\docker\.env` — добавить те же переменные.

---

## ЧАСТЬ 4: Убрать coturn из docker-compose

### ШАГ 4.1. Удалить сервис coturn

Файл: `E:\Uplink\docker\docker-compose.yml`

Удалить весь блок `coturn:`:

```yaml
  coturn:
    image: coturn/coturn:latest
    container_name: uplink-coturn
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./coturn/turnserver.conf:/etc/coturn/turnserver.conf:ro
    command: -c /etc/coturn/turnserver.conf
```

И добавить `TURN_TLS_PORT` в environment livekit-token:

```yaml
  livekit-token:
    ...
    environment:
      ...
      TURN_TLS_PORT: ${TURN_TLS_PORT:-443}
```

### ШАГ 4.2. Удалить директорию coturn (опционально)

```bash
# На Windows
rd /s E:\Uplink\docker\coturn

# На сервере
rm -rf ~/projects/uplink/docker/coturn
```

---

## ЧАСТЬ 5: Проверить config.ts и LiveKitService

### ШАГ 5.1. Проверить что `isExternal` экспортируется из config.ts

Файл: `E:\Uplink\web\src\config.ts`

Убедиться что `isExternal` определён и экспортирован:

```typescript
export const isExternal = isSecure && (port === '' || port === '443');
```

LiveKitService импортирует `isExternal` — если его нет, звонок не будет использовать TURN для внешнего доступа.

### ШАГ 5.2. Проверить LiveKitService

Файл: `E:\Uplink\web\src\livekit\LiveKitService.ts`

Убедиться что в `joinCall`:
1. `fetchToken` возвращает `{ token, turnServers }`
2. `rtcConfig` формируется с `iceTransportPolicy: 'relay'` когда `isExternal && turnServers.length > 0`
3. `rtcConfig` передаётся в `this.room.connect(config.livekitUrl, token, { rtcConfig })`

Если всё на месте — код менять не нужно.

### ШАГ 5.3. Проверить fetchToken

В `LiveKitService.ts` метод `fetchToken` должен возвращать и token, и turnServers:

```typescript
private async fetchToken(userId: string, roomName: string): Promise<{
    token: string;
    turnServers: RTCIceServer[];
}> {
    const resp = await fetch(`${config.tokenServiceUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, roomName }),
    });
    if (!resp.ok) {
        throw new Error(`Ошибка получения токена: ${resp.status}`);
    }
    const data = await resp.json();
    return {
        token: data.token,
        turnServers: data.turnServers || [],
    };
}
```

Если `fetchToken` возвращает только `data.token` (старая версия) — обновить как выше.

---

## ЧАСТЬ 6: Деплой и проверка

### ШАГ 6.1. Коммит и деплой

```bash
cd E:\Uplink
git add -A
git commit -m "[livekit] Облачный TURN вместо coturn: звонки через Cloudflare Tunnel"
git push
```

На сервере:

```bash
cd ~/projects/uplink

# Остановить coturn если запущен
docker stop uplink-coturn 2>/dev/null; docker rm uplink-coturn 2>/dev/null

./deploy.sh
```

### ШАГ 6.2. Проверить что token service отдаёт TURN

```bash
curl -s -X POST http://localhost:7890/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"@test:uplink.local","roomName":"test"}' | python3 -m json.tool
```

В ответе должен быть массив `turnServers` с тремя элементами (UDP, TCP, TLS):

```json
{
    "token": "eyJ...",
    "turnServers": [
        {"urls": "turn:openrelay.metered.ca:80?transport=udp", ...},
        {"urls": "turn:openrelay.metered.ca:80?transport=tcp", ...},
        {"urls": "turns:openrelay.metered.ca:443?transport=tcp", ...}
    ]
}
```

### ШАГ 6.3. Проверить TURN-сервер доступен

```bash
# С сервера — проверить что TURN отвечает
nc -zv openrelay.metered.ca 443
# Ожидаемо: Connection to openrelay.metered.ca 443 port [tcp/https] succeeded!
```

### ШАГ 6.4. Проверить звонки — LAN (регрессия)

1. Открыть `http://192.168.1.74:5174` (Ctrl+Shift+R)
2. Alice → #general → звонок → CallBar
3. Bob (вторая вкладка) → #general → звонок
4. Аудио работает (LAN = напрямую, TURN не используется)

### ШАГ 6.5. Проверить звонки — Cloudflare Tunnel

1. Открыть Cloudflare URL с телефона (мобильный интернет, Wi-Fi выключен)
2. Ctrl+Shift+R (или хард-рефреш мобильного браузера)
3. Alice → DM с кем-нибудь → звонок
4. Второе устройство → тот же DM → звонок
5. **Оба в CallBar, аудио передаётся**

Если аудио нет — проверить консоль браузера:
- `ICE connection state: connected` = хорошо
- `ICE connection state: failed` = TURN не работает, проверить credentials
- Ошибка `getUserMedia` = браузер блокирует микрофон по HTTP (нужен HTTPS, Cloudflare Tunnel должен давать его)

### ШАГ 6.6. Проверить логи LiveKit

```bash
docker logs -f uplink-livekit --since 1m 2>&1 | grep -E "RTC session|closing|SIGNAL|connected"
```

После фикса: участник подключается и **остаётся** подключённым (нет `SIGNAL_SOURCE_CLOSE` через 30мс).

---

## Критерии приёмки

- [ ] coturn удалён из docker-compose
- [ ] Token service отдаёт `turnServers` с тремя URL (UDP, TCP, TLS)
- [ ] `.env` на сервере содержит `TURN_HOST`, `TURN_PORT`, `TURN_TLS_PORT`, `TURN_USER`, `TURN_PASS`
- [ ] TURN-сервер доступен с сервера (`nc -zv ... 443`)
- [ ] LAN: звонки работают (регрессии нет)
- [ ] Cloudflare Tunnel: звонки работают
- [ ] Cloudflare Tunnel: аудио передаётся между двумя устройствами
- [ ] Логи LiveKit: нет `SIGNAL_SOURCE_CLOSE`
- [ ] Задеплоено на сервер

## Коммит

```
[livekit] Облачный TURN вместо coturn: звонки через Cloudflare Tunnel

- Убран coturn (недоступен из-за двойного NAT)
- Token service: TURN over TLS (turns: на порту 443)
- .env: credentials облачного TURN (metered.ca)
- Звонки через tunnel используют relay, в LAN — напрямую
```
