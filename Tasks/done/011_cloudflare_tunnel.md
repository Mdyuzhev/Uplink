# 011: Доступ к Uplink из интернета через Cloudflare Tunnel

## Цель

Сделать Uplink доступным из интернета по HTTPS-ссылке. Пользователь открывает URL в обычном браузере — ничего не устанавливает, не настраивает VPN, просто работает.

```
https://uplink.example.com → cloudflared tunnel → localhost:5174 (nginx/Uplink)
```

## Контекст проблемы

- Tailscale Funnel заблокирован в РФ (РКН блокирует `*.ts.net` на уровне DNS и SNI)
- Белого IP нет — роутер за NAT провайдера (WAN = `10.22.89.133`, серый IP)
- Проброс портов на роутере бесполезен — провайдер не прокидывает входящий трафик

Cloudflare Tunnel решает все три проблемы:
- Работает через исходящее соединение с сервера → не нужен белый IP и проброс портов
- Домен `*.cloudflare.com` / свой домен — не заблокирован
- Бесплатный, автоматический HTTPS

**Сервер:** `ssh flomaster@flomasterserver` (пароль: `Misha2021@1@`)
**Путь проекта:** `~/projects/uplink`

## Зависимости

- Задача 010 (Деплой на homelab) — **выполнена** ✅, Uplink работает на `http://192.168.1.74:5174`

---

## ЧАСТЬ 1: Быстрый тест (без регистрации, без домена)

Cloudflare позволяет запустить туннель **одной командой** без аккаунта. Получишь временный URL вида `https://random-words.trycloudflare.com`. Работает пока запущен процесс — для проверки что вообще всё работает.

### ШАГ 1.1. Установить cloudflared на сервер

```bash
sshpass -p 'Misha2021@1@' ssh -o StrictHostKeyChecking=no flomaster@flomasterserver
```

```bash
# Ubuntu/Debian:
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb

# Проверить
cloudflared --version
```

### ШАГ 1.2. Запустить быстрый туннель

```bash
cloudflared tunnel --url http://localhost:5174
```

В выводе будет строка вида:

```
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-words-here.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

### ШАГ 1.3. Проверить с телефона

Открыть URL из вывода в браузере телефона (мобильный интернет, не Wi-Fi). Должен появиться экран логина Uplink.

Если работает — переходить к ЧАСТИ 2 (постоянная настройка). Если нет — смотреть логи cloudflared в консоли.

Остановить: `Ctrl+C`.

---

## ЧАСТЬ 2: Постоянный туннель (бесплатный аккаунт Cloudflare)

Быстрый туннель из ЧАСТИ 1 умирает при перезагрузке и меняет URL. Для постоянной работы нужен аккаунт Cloudflare (бесплатный) и именованный туннель.

### ШАГ 2.1. Создать аккаунт Cloudflare

Если ещё нет — зарегистрироваться на https://dash.cloudflare.com (бесплатно).

### ШАГ 2.2. Авторизовать cloudflared на сервере

```bash
cloudflared tunnel login
```

Откроется ссылка для авторизации в браузере. Если на сервере нет GUI — скопировать ссылку из вывода, открыть на ноутбуке, авторизоваться. Файл сертификата сохранится в `~/.cloudflared/cert.pem`.

### ШАГ 2.3. Создать именованный туннель

```bash
cloudflared tunnel create uplink
```

Вывод покажет UUID туннеля и создаст credentials-файл в `~/.cloudflared/<UUID>.json`.

Запомнить UUID — он понадобится в конфиге.

### ШАГ 2.4. Настроить DNS

#### Вариант А — свой домен (рекомендуется)

Если есть свой домен, добавленный в Cloudflare (бесплатный план):

```bash
cloudflared tunnel route dns uplink uplink.yourdomain.com
```

Это создаст CNAME-запись `uplink.yourdomain.com` → `<UUID>.cfargotunnel.com`.

#### Вариант Б — без своего домена

Cloudflare при запуске туннеля всё равно даст URL. Можно использовать trycloudflare.com из ЧАСТИ 1 на постоянной основе через systemd (URL будет меняться при рестарте, но для PoC сойдёт — см. ШАГ 2.8 Альтернатива).

### ШАГ 2.5. Создать конфигурацию туннеля

Файл: `~/.cloudflared/config.yml`

```bash
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <UUID>
credentials-file: /home/flomaster/.cloudflared/<UUID>.json

ingress:
  # Uplink web
  - hostname: uplink.yourdomain.com
    service: http://localhost:5174
  # Catch-all (обязательно)
  - service: http_status:404
EOF
```

Заменить `<UUID>` на реальный UUID из шага 2.3, `uplink.yourdomain.com` на реальный домен.

### ШАГ 2.6. Проверить что туннель работает

```bash
cloudflared tunnel run uplink
```

С телефона (мобильный интернет) открыть `https://uplink.yourdomain.com`. Должен появиться экран логина.

Остановить: `Ctrl+C`.

### ШАГ 2.7. Настроить как systemd-сервис (автозапуск)

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Проверить
sudo systemctl status cloudflared
```

Теперь туннель стартует автоматически при перезагрузке сервера.

### ШАГ 2.8. Альтернатива: постоянный quick tunnel без домена

Если домена нет и регистрировать не хочется — можно запустить quick tunnel как systemd-сервис. URL будет меняться при рестарте, но можно его автоматически логировать:

```bash
# Создать сервис
sudo tee /etc/systemd/system/cloudflared-uplink.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel for Uplink
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=flomaster
ExecStart=/usr/bin/cloudflared tunnel --url http://localhost:5174
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cloudflared-uplink
sudo systemctl start cloudflared-uplink

# Посмотреть URL
sudo journalctl -u cloudflared-uplink --no-pager | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com'
```

---

## ЧАСТЬ 3: Обновить config.ts — поддержка Cloudflare HTTPS

### ШАГ 3.1. Обновить web/src/config.ts

Cloudflare терминирует TLS и проксирует на localhost:5174. Из браузера origin будет `https://uplink.yourdomain.com`. `config.ts` уже должен корректно работать с `window.location.origin`, но убедимся.

Файл: `E:\Uplink\web\src\config.ts`

```typescript
/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Все URL-ы вычисляются из window.location — работает в любом режиме:
 *
 *   localhost:5173                        → Dev (Vite), сервисы напрямую
 *   localhost:5174 / 192.168.1.74:5174    → Prod LAN (nginx)
 *   uplink.yourdomain.com                 → Cloudflare Tunnel (HTTPS)
 *   *.trycloudflare.com                   → Cloudflare Quick Tunnel (HTTPS)
 */

const host = window.location.hostname;
const isDev = window.location.port === '5173';

export const config = {
    /**
     * Matrix homeserver (Synapse).
     * Dev: напрямую на порт 8008.
     * Prod/Cloudflare: через nginx proxy (/_matrix/ → synapse:8008).
     */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /**
     * LiveKit Server (WebSocket для WebRTC).
     * Через Cloudflare Tunnel НЕ работает — WebRTC требует прямое UDP-соединение.
     * Звонки работают только в LAN.
     */
    livekitUrl: `ws://${host}:7880`,

    /**
     * Сервис генерации LiveKit-токенов.
     * Dev: напрямую на порт 7890.
     * Prod/Cloudflare: через nginx proxy (/livekit-token/ → livekit-token:7890).
     */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
```

### ШАГ 3.2. Обновить LoginScreen.tsx — использовать config

Файл: `E:\Uplink\web\src\components\LoginScreen.tsx`

Добавить import и заменить определение homeserver:

```tsx
import { config } from '../config';
// ...
const [homeserver, setHomeserver] = useState(config.matrixHomeserver);
```

Удалить старый код с вычислением `host` и `defaultHomeserver`.

### ШАГ 3.3. Закоммитить, запушить, задеплоить

```bash
cd E:\Uplink
git add -A
git commit -m "[web] config.ts: централизованные URL, поддержка Cloudflare Tunnel"
git push
```

На сервере:

```bash
cd ~/projects/uplink
./deploy.sh
```

---

## ЧАСТЬ 4: Добавить Birzha (опционально)

Если нужно заменить Tailscale Funnel и для Birzha — добавить второй hostname в `config.yml`:

```yaml
ingress:
  - hostname: uplink.yourdomain.com
    service: http://localhost:5174
  - hostname: birzha.yourdomain.com
    service: http://localhost:31080
  - service: http_status:404
```

И добавить DNS-запись:

```bash
cloudflared tunnel route dns uplink birzha.yourdomain.com
```

---

## ЧАСТЬ 5: Проверка

### ШАГ 5.1. С телефона (мобильный интернет, Wi-Fi выключен)

1. Открыть `https://uplink.yourdomain.com` (или URL от trycloudflare.com)
2. Экран логина Uplink
3. Ввести: `@alice:uplink.local` / `test123`
4. Каналы, сообщения, отправка — всё работает

### ШАГ 5.2. Два устройства

1. Устройство A → Alice
2. Устройство B → Bob
3. Оба в #general → real-time сообщения

### ШАГ 5.3. LAN по-прежнему работает

```
http://192.168.1.74:5174
```

---

## ЧАСТЬ 6: Скрипт обновления deploy.sh (дополнение)

Дополнить `~/projects/uplink/deploy.sh` — после проверки сервисов показать URL Cloudflare:

```bash
# В конце deploy.sh добавить:
echo ""
echo "=== Cloudflare Tunnel ==="
if systemctl is-active --quiet cloudflared 2>/dev/null; then
    echo "   Tunnel: active"
elif systemctl is-active --quiet cloudflared-uplink 2>/dev/null; then
    URL=$(journalctl -u cloudflared-uplink --no-pager -n 50 | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
    echo "   Tunnel: active"
    echo "   URL: $URL"
else
    echo "   Tunnel: not running"
fi
```

---

## Критерии приёмки

- [ ] `cloudflared` установлен на сервере
- [ ] Quick tunnel (ЧАСТЬ 1) работает — URL открывается с телефона через мобильный интернет
- [ ] Постоянный туннель настроен (systemd, автозапуск) — ЧАСТЬ 2
- [ ] `https://uplink.yourdomain.com` (или trycloudflare URL) — экран логина
- [ ] Логин работает (alice, bob, charlie, diana, eve / test123)
- [ ] Сообщения отображаются и отправляются
- [ ] Real-time между двумя устройствами
- [ ] `web/src/config.ts` создан, URL-ы динамические
- [ ] LAN (`http://192.168.1.74:5174`) работает
- [ ] `deploy.sh` показывает Cloudflare URL

## Коммит

```
[infra] Cloudflare Tunnel: Uplink доступен из интернета

- cloudflared установлен, туннель настроен
- config.ts: централизованные URL, поддержка HTTPS/Cloudflare
- LoginScreen использует config.matrixHomeserver
- deploy.sh: показывает Cloudflare URL
```
