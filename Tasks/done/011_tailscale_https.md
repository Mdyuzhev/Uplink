# 011: Доступ к Uplink через Tailscale (HTTPS извне)

## Цель

Сделать Uplink доступным по HTTPS через Tailscale, аналогично тому как работает Birzha:

```
Birzha:  https://flomasterserver.taila40eda.ts.net       → localhost:31080
Uplink:  https://flomasterserver.taila40eda.ts.net:8443   → localhost:5174
```

Любой авторизованный в Tailscale-сети пользователь открывает адрес в браузере — и попадает в Uplink с HTTPS, без VPN, из любой точки.

## Контекст

Tailscale уже установлен и настроен на `flomasterserver`. Birzha уже работает через `https://flomasterserver.taila40eda.ts.net/login`. Нужно добавить Uplink на отдельный порт, чтобы два приложения не конфликтовали.

**Сервер:** `ssh flomaster@flomasterserver` (пароль: `Misha2021@1@`)
**Путь проекта:** `~/projects/uplink`
**Tailscale домен:** `flomasterserver.taila40eda.ts.net`

## Зависимости

- Задача 010 (Деплой на homelab) — **выполнена** ✅, Uplink работает на `http://192.168.1.74:5174`

---

## ЧАСТЬ 1: Разведка — текущий конфиг Tailscale

### ШАГ 1.1. Подключиться к серверу

```bash
sshpass -p 'Misha2021@1@' ssh -o StrictHostKeyChecking=no flomaster@flomasterserver
```

### ШАГ 1.2. Проверить текущий Tailscale Serve конфиг

```bash
sudo tailscale serve status
```

Эта команда покажет что уже настроено (какие порты, куда проксируют). Запомнить вывод — он покажет как именно Birzha выставлена.

Также проверить:

```bash
# Статус Tailscale
tailscale status

# Версия
tailscale version

# IP в Tailscale-сети
tailscale ip -4
```

---

## ЧАСТЬ 2: Добавить Uplink в Tailscale Serve

### ШАГ 2.1. Добавить Uplink на порт 8443

Birzha уже занимает порт 443 (дефолтный HTTPS). Uplink ставим на **8443**:

```bash
sudo tailscale serve --https=8443 http://localhost:5174
```

Эта команда говорит Tailscale: «принимай HTTPS-соединения на порту 8443 и проксируй их на локальный nginx (5174)».

Tailscale автоматически:
- Выдаёт TLS-сертификат для `flomasterserver.taila40eda.ts.net`
- Терминирует HTTPS
- Проксирует трафик на `http://localhost:5174`

### ШАГ 2.2. Проверить что конфиг применился

```bash
sudo tailscale serve status
```

Ожидаемо в выводе:

```
https://flomasterserver.taila40eda.ts.net (порт 443)
  → http://127.0.0.1:31080    (Birzha)

https://flomasterserver.taila40eda.ts.net:8443
  → http://127.0.0.1:5174     (Uplink)
```

### ШАГ 2.3. Проверить доступность

С сервера:

```bash
curl -sf https://flomasterserver.taila40eda.ts.net:8443 | head -5
```

Должен вернуть HTML страницы Uplink.

---

## ЧАСТЬ 3: Обновить config.ts — поддержка HTTPS и Tailscale

Tailscale Serve терминирует TLS и проксирует на nginx. Из браузера origin будет `https://flomasterserver.taila40eda.ts.net:8443`. Нужно чтобы config.ts корректно вычислял URL-ы.

### ШАГ 3.1. Обновить web/src/config.ts

Файл: `E:\Uplink\web\src\config.ts`

Заменить содержимое на:

```typescript
/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Все URL-ы вычисляются из window.location — работает в любом режиме:
 *
 *   localhost:5173         → Dev (Vite), сервисы на localhost по портам
 *   localhost:5174         → Prod (nginx), /_matrix/ проксируется
 *   192.168.1.74:5174      → LAN, /_matrix/ проксируется
 *   flomasterserver...8443 → Tailscale HTTPS, /_matrix/ проксируется
 */

const host = window.location.hostname;
const isDev = window.location.port === '5173';
const isSecure = window.location.protocol === 'https:';

export const config = {
    /**
     * Matrix homeserver (Synapse).
     * Dev: напрямую на порт 8008.
     * Prod/Tailscale: через nginx proxy (/_matrix/ → synapse:8008).
     */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /**
     * LiveKit Server (WebSocket для WebRTC).
     * Всегда напрямую — WebRTC нельзя проксировать через nginx.
     * wss:// для HTTPS (Tailscale), ws:// для HTTP (LAN).
     *
     * ВАЖНО: через Tailscale LiveKit пока НЕ работает —
     * порт 7880 не пробрасывается. Звонки работают только в LAN.
     * Для звонков через Tailscale нужна задача 012.
     */
    livekitUrl: isDev
        ? `ws://${host}:7880`
        : `${isSecure ? 'wss' : 'ws'}://${host}:7880`,

    /**
     * Сервис генерации LiveKit-токенов.
     * Dev: напрямую на порт 7890.
     * Prod/Tailscale: через nginx proxy (/livekit-token/ → livekit-token:7890).
     */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
```

### ШАГ 3.2. Обновить LoginScreen.tsx

Файл: `E:\Uplink\web\src\components\LoginScreen.tsx`

Если ещё не сделано — заменить определение homeserver на:

```tsx
import { config } from '../config';
// ...
const [homeserver, setHomeserver] = useState(config.matrixHomeserver);
```

### ШАГ 3.3. Пересобрать и задеплоить

На Windows:

```bash
cd E:\Uplink
git add -A
git commit -m "[web] config.ts: поддержка HTTPS/Tailscale, динамические URL"
git push
```

На сервере:

```bash
cd ~/projects/uplink
./deploy.sh
```

---

## ЧАСТЬ 4: Проверка

### ШАГ 4.1. Проверить через Tailscale

С любого устройства, подключённого к Tailscale-сети, открыть в браузере:

```
https://flomasterserver.taila40eda.ts.net:8443
```

1. Экран логина Uplink. Поле «Сервер» = `https://flomasterserver.taila40eda.ts.net:8443`
2. Ввести: `@alice:uplink.local` / `test123`
3. Каналы (#general, #backend, #frontend) и личные сообщения
4. Отправить сообщение — появляется в ленте
5. Открыть второю вкладку, войти как `@bob:uplink.local` — real-time работает

### ШАГ 4.2. Проверить что LAN тоже работает

```
http://192.168.1.74:5174
```

Должно работать как раньше — config.ts обрабатывает оба варианта.

### ШАГ 4.3. Проверить что Birzha не сломалась

```
https://flomasterserver.taila40eda.ts.net/login
```

Birzha на порту 443, Uplink на 8443 — они не пересекаются.

---

## ПРИМЕЧАНИЕ: LiveKit через Tailscale

Звонки (LiveKit) через Tailscale пока **не будут работать**. LiveKit использует WebRTC, который требует прямое соединение на порт 7880 + UDP 7882-7892. Tailscale Serve проксирует только TCP/HTTP.

Варианты решения (для будущей задачи):
- Пробросить LiveKit через `tailscale serve --tcp=7880 tcp://localhost:7880` + UDP через Tailscale subnet routing
- Использовать Tailscale как VPN (устройства видят 100.x.x.x IP сервера) — LiveKit подключается напрямую

Для PoC достаточно: **чат через Tailscale, звонки в LAN**. Если нужно — создадим задачу 012.

---

## Критерии приёмки

- [ ] `sudo tailscale serve status` показывает Uplink на порту 8443
- [ ] `https://flomasterserver.taila40eda.ts.net:8443` — экран логина
- [ ] Логин работает для всех пользователей (alice, bob, charlie, diana, eve / test123)
- [ ] Сообщения отображаются и отправляются
- [ ] Real-time работает между двумя вкладками/устройствами
- [ ] `web/src/config.ts` корректно определяет URL-ы для HTTP и HTTPS
- [ ] LAN-доступ (`http://192.168.1.74:5174`) по-прежнему работает
- [ ] Birzha (`https://flomasterserver.taila40eda.ts.net/login`) не сломалась
- [ ] Консоль браузера: нет ошибок mixed content (HTTP в HTTPS-контексте)

## Коммит

```
[infra] Tailscale HTTPS: Uplink доступен извне на :8443

- config.ts: поддержка HTTPS, wss://, динамический origin
- tailscale serve --https=8443 → localhost:5174
- Чат работает через Tailscale, звонки в LAN
```
