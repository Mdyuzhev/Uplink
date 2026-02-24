# 010: Доступ из локальной сети — тестирование с нескольких устройств

## Цель

Обеспечить работу Uplink с нескольких устройств в одной локальной сети. Разработчик открывает `http://192.168.x.x:5173` на втором ноутбуке (или телефоне) — чат и звонки работают между устройствами.

## Контекст проблемы

Сейчас по всему коду захардкожен `localhost`. Если открыть Uplink с другого ноутбука по IP хост-машины (`http://192.168.1.50:5173`), браузер попытается подключить matrix-js-sdk к `localhost:8008` — а это localhost **того** ноутбука, где Synapse нет. Аналогично с LiveKit и Token Service.

Нужно: все URL-ы сервисов вычисляются динамически из `window.location.hostname`. Открыл по IP — все сервисы тоже по IP. Открыл по localhost — всё по localhost. Ноль конфигурации для пользователя.

### Целевая схема

```
Ноут A (хост, 192.168.1.50):
  Docker: Synapse (8008), PostgreSQL (5432), Redis (6379),
          LiveKit (7880), Token Service (7890),
          Synapse Admin (8080), nginx (5174)
  Vite dev server: 5173

Ноут B (клиент, 192.168.1.51):
  Браузер → http://192.168.1.50:5173
    → matrix-js-sdk  → http://192.168.1.50:8008
    → LiveKit WS     → ws://192.168.1.50:7880
    → Token Service  → http://192.168.1.50:7890

Телефон (клиент, 192.168.1.52):
  Браузер → http://192.168.1.50:5173
    → то же самое
```

## Зависимости

- Задача 009 (Починка веб) — должна быть выполнена
- Docker-стек работает

---

## ЧАСТЬ 1: Централизованный конфиг URL-ов сервисов

Сейчас URL-ы раскиданы по разным файлам. Нужно собрать их в одном месте, чтобы все вычислялись из `window.location.hostname`.

### ШАГ 1.1. Создать src/config.ts

Файл: `E:\Uplink\web\src\config.ts`

```typescript
/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Все URL-ы вычисляются из window.location.hostname — благодаря этому
 * приложение работает из любого места в локальной сети:
 *   - localhost      → все сервисы на localhost
 *   - 192.168.1.50   → все сервисы на 192.168.1.50
 *   - uplink.company → все сервисы на uplink.company
 *
 * Dev-режим (Vite, порт 5173):
 *   Браузер подключается к сервисам напрямую по портам.
 *
 * Prod-режим (nginx, порт 5174):
 *   nginx проксирует /_matrix/ и /livekit-token/ к соответствующим сервисам.
 *   LiveKit WebSocket идёт напрямую (WebRTC нельзя проксировать через nginx).
 */

const host = window.location.hostname;
const isDev = window.location.port === '5173';

export const config = {
    /** URL Matrix homeserver (Synapse) */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /** URL LiveKit Server (WebSocket для WebRTC) */
    livekitUrl: `ws://${host}:7880`,

    /** URL сервиса генерации LiveKit-токенов */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
```

### ШАГ 1.2. Обновить LoginScreen.tsx — использовать config

Файл: `E:\Uplink\web\src\components\LoginScreen.tsx`

Заменить блок определения `defaultHomeserver` на:

```tsx
import { config } from '../config';

// ...

const [homeserver, setHomeserver] = useState(config.matrixHomeserver);
```

Удалить вычисление `host`, `defaultHomeserver` — всё уже в `config.ts`.

### ШАГ 1.3. Обновить LiveKitService.ts — использовать config

Файл: `E:\Uplink\web\src\livekit\LiveKitService.ts`

(Этот файл будет создан в задаче 005. Если он уже есть — обновить.)

Заменить хардкод:

```typescript
// БЫЛО:
const TOKEN_SERVICE_URL = 'http://localhost:7890';
const LIVEKIT_URL = 'ws://localhost:7880';

// СТАЛО:
import { config } from '../config';
// ...использовать config.tokenServiceUrl и config.livekitUrl
```

В методе `fetchToken`:

```typescript
const resp = await fetch(`${config.tokenServiceUrl}/token`, { ... });
```

В методе `joinCall`:

```typescript
await this.room.connect(config.livekitUrl, token);
```

---

## ЧАСТЬ 2: Docker — привязка к 0.0.0.0

### ШАГ 2.1. Проверить docker-compose.yml

Docker по умолчанию привязывает порты к `0.0.0.0` (все интерфейсы). Убедиться что порты прописаны **без привязки к конкретному IP**:

```yaml
ports:
  - "8008:8008"      # ✅ 0.0.0.0:8008 → контейнер:8008
  - "127.0.0.1:8008:8008"  # ❌ только localhost
```

Проверить все сервисы в `E:\Uplink\docker\docker-compose.yml`:

| Сервис | Порт | Должно быть |
|--------|------|-------------|
| postgres | 5432 | `"5432:5432"` |
| redis | 6379 | `"6379:6379"` |
| synapse | 8008 | `"8008:8008"` |
| synapse-admin | 8080 | `"8080:80"` |
| uplink (nginx) | 5174 | `"5174:80"` |
| livekit | 7880, 7881, 7882-7892 | `"7880:7880"` и т.д. |
| livekit-token | 7890 | `"7890:7890"` |

Если где-то стоит `127.0.0.1:` — убрать. Все порты должны быть в формате `"ХОСТ_ПОРТ:КОНТЕЙНЕР_ПОРТ"` без IP-префикса.

### ШАГ 2.2. Проверить Vite config

Файл: `E:\Uplink\web\vite.config.ts`

Убедиться что `host: '0.0.0.0'`:

```typescript
server: {
    port: 5173,
    host: '0.0.0.0',  // доступ по IP из локальной сети
},
```

Если стоит `host: 'localhost'` или `host` отсутствует — исправить.

---

## ЧАСТЬ 3: LiveKit — настройка для работы по IP

### ШАГ 3.1. Обновить livekit.yaml

Файл: `E:\Uplink\docker\livekit\livekit.yaml`

LiveKit должен сообщать клиентам свой внешний IP, чтобы WebRTC-соединение устанавливалось по IP хост-машины, а не по внутреннему Docker IP.

```yaml
port: 7880
rtc:
  port_range_start: 7882
  port_range_end: 7892
  use_external_ip: true       # <-- ВАЖНО: использовать внешний IP хоста
  stun_servers:
    - stun:stun.l.google.com:19302
redis:
  address: redis:6379
keys:
  uplink-api-key: uplink-api-secret-change-me-in-prod
logging:
  level: info
```

Ключевое изменение: `use_external_ip: true`. LiveKit определит IP хост-машины и передаст его клиентам в SDP (WebRTC negotiation). Без этого клиент с другого ноута получит внутренний Docker IP (172.x.x.x) и не сможет установить медиа-соединение.

---

## ЧАСТЬ 4: Synapse — CORS для запросов с любого IP

### ШАГ 4.1. Проверить Synapse CORS

Synapse по умолчанию разрешает CORS для client API с любого origin. Дополнительных настроек не нужно.

Проверить с другого ноута (заменить IP):

```bash
curl -sf http://192.168.1.50:8008/_matrix/client/versions
```

Если ответ приходит — CORS работает. Если нет — проблема в файрволе (см. ЧАСТЬ 5).

---

## ЧАСТЬ 5: Windows Firewall

### ШАГ 5.1. Открыть порты в Windows Firewall

Это критический шаг. Windows Firewall по умолчанию блокирует входящие соединения. С другого ноута запросы не пройдут даже если Docker слушает на 0.0.0.0.

Запустить **PowerShell от администратора** и выполнить:

```powershell
# Порты Uplink для доступа из локальной сети
New-NetFirewallRule -DisplayName "Uplink - Vite Dev" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
New-NetFirewallRule -DisplayName "Uplink - Nginx Prod" -Direction Inbound -Protocol TCP -LocalPort 5174 -Action Allow
New-NetFirewallRule -DisplayName "Uplink - Synapse" -Direction Inbound -Protocol TCP -LocalPort 8008 -Action Allow
New-NetFirewallRule -DisplayName "Uplink - Synapse Admin" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
New-NetFirewallRule -DisplayName "Uplink - LiveKit HTTP" -Direction Inbound -Protocol TCP -LocalPort 7880 -Action Allow
New-NetFirewallRule -DisplayName "Uplink - LiveKit RTC TCP" -Direction Inbound -Protocol TCP -LocalPort 7881 -Action Allow
New-NetFirewallRule -DisplayName "Uplink - LiveKit RTC UDP" -Direction Inbound -Protocol UDP -LocalPort 7882-7892 -Action Allow
New-NetFirewallRule -DisplayName "Uplink - LiveKit Token" -Direction Inbound -Protocol TCP -LocalPort 7890 -Action Allow
```

### ШАГ 5.2. Проверить с другого устройства

С другого ноута или телефона в той же Wi-Fi сети (заменить IP):

```bash
# Synapse
curl -sf http://192.168.1.50:8008/_matrix/client/versions && echo "Synapse OK"

# Vite dev
curl -sf http://192.168.1.50:5173 && echo "Vite OK"

# LiveKit Token Service (если уже запущен)
curl -sf http://192.168.1.50:7890/health && echo "Token Service OK"
```

Если не отвечает — перепроверить правила файрвола:

```powershell
Get-NetFirewallRule -DisplayName "Uplink*" | Format-Table DisplayName, Enabled, Direction, Action
```

---

## ЧАСТЬ 6: Обновить nginx.conf (prod) — проксирование Token Service

### ШАГ 6.1. Добавить proxy для LiveKit Token Service

Файл: `E:\Uplink\web\nginx.conf`

Добавить блок **перед** `location /_matrix/`:

```nginx
    # Проксирование запросов токенов к LiveKit Token Service
    location /livekit-token/ {
        proxy_pass http://livekit-token:7890/;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $host;
    }
```

Это нужно для prod-режима (5174): браузер пойдёт на `http://192.168.1.50:5174/livekit-token/token`, nginx проксирует внутрь Docker-сети к контейнеру `livekit-token:7890`.

---

## ЧАСТЬ 7: Узнать свой IP — вспомогательный скрипт

### ШАГ 7.1. Создать скрипт scripts/lan-info.ps1

Файл: `E:\Uplink\scripts\lan-info.ps1`

```powershell
# Показать URL-ы для доступа из локальной сети

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254.*" -and
    $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "Не удалось определить IP. Подключены к Wi-Fi/Ethernet?" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Uplink — доступ из локальной сети ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "IP хост-машины: $ip" -ForegroundColor White
Write-Host ""
Write-Host "Откройте на другом устройстве:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  DEV:           http://${ip}:5173" -ForegroundColor Green
Write-Host "  PROD:          http://${ip}:5174" -ForegroundColor Green
Write-Host "  Synapse Admin: http://${ip}:8080" -ForegroundColor Gray
Write-Host ""
Write-Host "Пользователи (пароль test123):" -ForegroundColor Yellow
Write-Host "  @alice:uplink.local"
Write-Host "  @bob:uplink.local"
Write-Host "  @charlie:uplink.local"
Write-Host "  @diana:uplink.local"
Write-Host "  @eve:uplink.local"
Write-Host ""

# Проверка доступности сервисов
Write-Host "Проверка сервисов:" -ForegroundColor Yellow
$services = @(
    @{Name="Synapse";     Url="http://${ip}:8008/_matrix/client/versions"},
    @{Name="Vite Dev";    Url="http://${ip}:5173"},
    @{Name="Nginx Prod";  Url="http://${ip}:5174"},
    @{Name="LiveKit";     Url="http://${ip}:7880"},
    @{Name="Token Svc";   Url="http://${ip}:7890/health"}
)
foreach ($svc in $services) {
    try {
        $null = Invoke-WebRequest -Uri $svc.Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Host "  $($svc.Name): OK" -ForegroundColor Green
    } catch {
        Write-Host "  $($svc.Name): НЕДОСТУПЕН" -ForegroundColor Red
    }
}
Write-Host ""
```

Запуск: `powershell scripts/lan-info.ps1`

---

## ЧАСТЬ 8: Проверка — два устройства

### ШАГ 8.1. Подготовка

1. На хост-машине: Docker запущен, Vite dev запущен
2. Узнать IP: `powershell scripts/lan-info.ps1`
3. Все проверки зелёные

### ШАГ 8.2. Тест чата

1. **Ноут A**: Открыть `http://localhost:5173`, залогиниться как `@alice:uplink.local` / `test123`
2. **Ноут B**: Открыть `http://192.168.x.x:5173`, залогиниться как `@bob:uplink.local` / `test123`
3. Оба открывают #general
4. Alice отправляет сообщение → Bob видит его в real-time
5. Bob отвечает → Alice видит

### ШАГ 8.3. Тест звонков (после выполнения задачи 005)

1. **Ноут A** (Alice): в #general нажать кнопку звонка
2. **Ноут B** (Bob): в #general нажать кнопку звонка
3. Оба видят CallBar с двумя участниками
4. Голос передаётся между ноутами
5. Mute на одном → индикатор muted у другого
6. Завершить звонок → CallBar исчезает у обоих

### ШАГ 8.4. Тест с телефона (опционально)

1. Открыть `http://192.168.x.x:5173` в мобильном браузере
2. Залогиниться как `@charlie:uplink.local` / `test123`
3. Мобильный layout (sidebar переключается на чат)
4. Сообщения отображаются, отправка работает

---

## Критерии приёмки

- [ ] `web/src/config.ts` создан, все URL-ы сервисов вычисляются из `window.location.hostname`
- [ ] LoginScreen, LiveKitService используют `config` вместо захардкоженных URL
- [ ] Все Docker-порты привязаны к `0.0.0.0` (нет `127.0.0.1:`)
- [ ] `vite.config.ts`: `host: '0.0.0.0'`
- [ ] `livekit.yaml`: `use_external_ip: true`
- [ ] Windows Firewall: правила для портов 5173, 5174, 8008, 7880, 7881, 7882-7892, 7890
- [ ] `scripts/lan-info.ps1` показывает IP и проверяет доступность сервисов
- [ ] С другого ноута: `http://IP:5173` — экран логина открывается
- [ ] С другого ноута: логин работает (Synapse доступен по IP)
- [ ] Два устройства: real-time сообщения между ними
- [ ] Два устройства: аудиозвонок между ними (после задачи 005)
- [ ] nginx.conf: добавлено проксирование `/livekit-token/`

## Коммит

```
[infra] Доступ из локальной сети: динамические URL, firewall, LAN-конфиг

- web/src/config.ts: URL-ы сервисов из window.location.hostname
- LoginScreen, LiveKitService используют централизованный config
- livekit.yaml: use_external_ip: true (WebRTC по IP хоста)
- nginx.conf: proxy /livekit-token/ для prod-режима
- scripts/lan-info.ps1: показать IP, проверить доступность
- Инструкция по Windows Firewall
```
