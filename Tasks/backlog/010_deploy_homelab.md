# 010: Деплой Uplink на homelab-сервер, доступ из локальной сети

## Цель

Развернуть Uplink на homelab-сервере (`flomasterserver`). Все сервисы (Synapse, PostgreSQL, Redis, web, LiveKit) крутятся на сервере. С любого ноутбука или телефона в сети — открыл браузер, зашёл по IP, работаешь. После доработок на Windows — `git push` → на сервере `git pull && docker compose up --build -d` → обновлённая версия доступна.

## Контекст

Проект Birzha уже работает на том же сервере по такой схеме. Uplink разворачивается аналогично.

Сервер: `ssh flomaster@flomasterserver` (пароль: `Misha2021@1@`)
Путь проекта на сервере: `~/projects/uplink`

### Целевая схема

```
flomasterserver (Linux, Docker):
  ├── Synapse        :8008   (Matrix homeserver)
  ├── PostgreSQL     :5432   (БД для Synapse)
  ├── Redis          :6379   (кэш)
  ├── Synapse Admin  :8080   (админка)
  ├── Web (nginx)    :5174   (React билд + proxy /_matrix/)
  ├── LiveKit        :7880   (WebRTC SFU)  ← после задачи 005
  └── LiveKit Token  :7890   (JWT токены)  ← после задачи 005

Ноут A: браузер → http://<SERVER_IP>:5174
Ноут B: браузер → http://<SERVER_IP>:5174
Телефон: браузер → http://<SERVER_IP>:5174
```

## Зависимости

- Задача 009 (Починка веб) — должна быть выполнена, веб работает локально
- Git-репозиторий инициализирован в E:\Uplink

---

## ЧАСТЬ 1: Подготовить проект к деплою

### ШАГ 1.1. Проверить .gitignore

Файл: `E:\Uplink\.gitignore`

Убедиться что есть:

```
node_modules/
dist/
.env
*.log
docker/synapse/*.signing.key
docker/synapse/*.log.config
docker/synapse/media_store/
```

Volumes данные PostgreSQL и Redis хранятся в Docker volumes на сервере, их не коммитим.

### ШАГ 1.2. Создать config.ts — динамические URL сервисов

Файл: `E:\Uplink\web\src\config.ts`

Все URL-ы сервисов вычисляются из `window.location.hostname`. Открыл по IP сервера — всё автоматически по этому IP. Открыл по localhost — всё по localhost.

```typescript
/**
 * Централизованная конфигурация URL-ов сервисов Uplink.
 *
 * Все URL-ы вычисляются из window.location.hostname:
 *   localhost      → все сервисы на localhost
 *   192.168.1.50   → все сервисы на 192.168.1.50
 *   flomasterserver → все сервисы на flomasterserver
 *
 * Prod-режим (nginx на 5174):
 *   nginx проксирует /_matrix/ и /livekit-token/ внутрь Docker-сети.
 *   LiveKit WebSocket идёт напрямую (WebRTC нельзя проксировать).
 *
 * Dev-режим (Vite на 5173):
 *   Браузер подключается к сервисам напрямую по портам.
 */
const host = window.location.hostname;
const isDev = window.location.port === '5173';

export const config = {
    /** Matrix homeserver (Synapse) */
    matrixHomeserver: isDev
        ? `http://${host}:8008`
        : window.location.origin,

    /** LiveKit Server (WebSocket для WebRTC) */
    livekitUrl: `ws://${host}:7880`,

    /** Сервис генерации LiveKit-токенов */
    tokenServiceUrl: isDev
        ? `http://${host}:7890`
        : `${window.location.origin}/livekit-token`,
};
```

### ШАГ 1.3. Обновить LoginScreen.tsx — использовать config

Файл: `E:\Uplink\web\src\components\LoginScreen.tsx`

Заменить вычисление `host` и `defaultHomeserver` на:

```tsx
import { config } from '../config';
// ...
const [homeserver, setHomeserver] = useState(config.matrixHomeserver);
```

Удалить старый код с `window.location.port === '5173'` и `window.location.hostname` — всё теперь в `config.ts`.

### ШАГ 1.4. Обновить docker-compose.yml — порт 5174

Файл: `E:\Uplink\docker\docker-compose.yml`

Сервис `uplink` должен быть на порту **5174**:

```yaml
  uplink:
    build:
      context: ../web
      dockerfile: Dockerfile
    container_name: uplink-web
    restart: unless-stopped
    ports:
      - "5174:80"
    depends_on:
      synapse:
        condition: service_healthy
```

### ШАГ 1.5. Добавить proxy для LiveKit Token в nginx.conf

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

Этот блок понадобится когда будет задача 005 (LiveKit). Если контейнера `livekit-token` ещё нет — nginx просто вернёт 502 на этот путь, ничего не сломается.

### ШАГ 1.6. Закоммитить и запушить

```bash
cd E:\Uplink
git add -A
git commit -m "[infra] Подготовка к деплою на сервер: config.ts, порт 5174, nginx proxy"
git push
```

Если remote ещё не настроен — настроить (GitLab, GitHub, или bare repo на сервере — см. ШАГ 2.2).

---

## ЧАСТЬ 2: Настроить сервер

### ШАГ 2.1. Подключиться к серверу

```bash
ssh flomaster@flomasterserver
# пароль: Misha2021@1@
```

Или через sshpass:

```bash
sshpass -p 'Misha2021@1@' ssh -o StrictHostKeyChecking=no flomaster@flomasterserver
```

### ШАГ 2.2. Склонировать проект

Вариант А — если есть remote (GitHub/GitLab):

```bash
mkdir -p ~/projects
cd ~/projects
git clone <URL_РЕПОЗИТОРИЯ> uplink
cd uplink
```

Вариант Б — если remote нет, передать через scp с Windows:

```powershell
# На Windows (PowerShell):
scp -r E:\Uplink flomaster@flomasterserver:~/projects/uplink
```

Или создать bare repo на сервере:

```bash
# На сервере:
mkdir -p ~/repos/uplink.git
cd ~/repos/uplink.git
git init --bare

# На Windows:
cd E:\Uplink
git remote add server flomaster@flomasterserver:~/repos/uplink.git
git push server main

# На сервере:
cd ~/projects
git clone ~/repos/uplink.git uplink
```

### ШАГ 2.3. Проверить Docker на сервере

```bash
docker --version
docker compose version
```

Docker и Docker Compose должны быть установлены. Если нет:

```bash
# Ubuntu/Debian:
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker flomaster
# Перелогиниться чтобы группа применилась
```

### ШАГ 2.4. Создать .env на сервере

Файл: `~/projects/uplink/docker/.env`

```bash
cd ~/projects/uplink/docker
cat > .env << 'EOF'
POSTGRES_DB=synapse
POSTGRES_USER=synapse
POSTGRES_PASSWORD=synapse_poc_pass
SYNAPSE_SERVER_NAME=uplink.local
EOF
```

### ШАГ 2.5. Сгенерировать signing key Synapse (если отсутствует)

Signing key не коммитится в git. Если файла `docker/synapse/uplink.local.signing.key` нет:

```bash
cd ~/projects/uplink/docker
docker run --rm -v ./synapse:/data matrixdotorg/synapse:latest generate_signing_key -o /data/uplink.local.signing.key
```

Также проверить наличие log config:

```bash
ls docker/synapse/uplink.local.log.config
```

Если нет — создать минимальный:

```bash
cat > docker/synapse/uplink.local.log.config << 'EOF'
version: 1
formatters:
  precise:
    format: '%(asctime)s - %(name)s - %(lineno)d - %(levelname)s - %(message)s'
handlers:
  console:
    class: logging.StreamHandler
    formatter: precise
root:
  level: INFO
  handlers: [console]
disable_existing_loggers: false
EOF
```

---

## ЧАСТЬ 3: Запуск на сервере

### ШАГ 3.1. Собрать и запустить

```bash
cd ~/projects/uplink/docker
docker compose up --build -d
```

Первая сборка может занять 2-5 минут (скачивание образов, npm ci, сборка React).

### ШАГ 3.2. Проверить контейнеры

```bash
docker compose ps
```

Ожидаемо: все контейнеры в статусе `running` или `healthy`:

| Name | Status |
|------|--------|
| uplink-postgres | healthy |
| uplink-redis | healthy |
| uplink-synapse | healthy |
| uplink-synapse-admin | running |
| uplink-web | running |

### ШАГ 3.3. Проверить доступность сервисов

```bash
curl -sf http://localhost:8008/health && echo "Synapse OK"
curl -sf http://localhost:5174 | head -5 && echo "Web OK"
curl -sf http://localhost:5174/_matrix/client/versions && echo "Nginx proxy OK"
```

### ШАГ 3.4. Создать admin-пользователя (если первый запуск)

```bash
cd ~/projects/uplink/docker
docker compose exec synapse register_new_matrix_user \
  -u admin -p admin_poc_pass -a \
  -c /data/homeserver.yaml \
  http://localhost:8008
```

Флаг `-a` — admin. Если пользователь уже существует — команда сообщит об этом, это нормально.

### ШАГ 3.5. Создать тестовых пользователей и залить данные

```bash
cd ~/projects/uplink
node scripts/seed-test-data.mjs
```

Если Node.js не установлен на сервере, два варианта:

Вариант А — установить Node:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Вариант Б — запустить seed через Docker:

```bash
cd ~/projects/uplink
docker run --rm --network uplink_default \
  -v ./scripts:/scripts \
  -w /scripts \
  node:20-alpine \
  sh -c "node seed-test-data.mjs"
```

**ВАЖНО:** seed-скрипт обращается к `http://localhost:8008`. Если используешь вариант Б (Docker), замени в скрипте `localhost` на `synapse` (имя контейнера в Docker-сети), либо используй `--network host`:

```bash
docker run --rm --network host \
  -v ./scripts:/scripts \
  -w /scripts \
  node:20-alpine \
  sh -c "node seed-test-data.mjs"
```

---

## ЧАСТЬ 4: Проверить с ноутбука

### ШАГ 4.1. Узнать IP сервера

На сервере:

```bash
hostname -I | awk '{print $1}'
```

Или использовать имя `flomasterserver` если оно резолвится в сети.

### ШАГ 4.2. Проверить с ноутбука

С ноутбука в браузере открыть (заменить IP):

```
http://<SERVER_IP>:5174
```

Должен появиться экран логина Uplink. Поле «Сервер» автоматически заполнится как `http://<SERVER_IP>:5174` (config.ts вычислит из hostname).

### ШАГ 4.3. Тест чата между двумя устройствами

1. **Ноут A**: `http://<SERVER_IP>:5174` → логин `@alice:uplink.local` / `test123`
2. **Ноут B**: `http://<SERVER_IP>:5174` → логин `@bob:uplink.local` / `test123`
3. Оба открывают #general
4. Alice пишет сообщение → Bob видит в real-time
5. Bob отвечает → Alice видит

### ШАГ 4.4. Firewall на сервере (если не доступен)

Если порты не отвечают с ноутбука:

```bash
# Ubuntu/Debian с ufw:
sudo ufw allow 5174/tcp comment "Uplink Web"
sudo ufw allow 8008/tcp comment "Synapse API"
sudo ufw allow 8080/tcp comment "Synapse Admin"
# Для LiveKit (после задачи 005):
sudo ufw allow 7880/tcp comment "LiveKit HTTP"
sudo ufw allow 7881/tcp comment "LiveKit RTC TCP"
sudo ufw allow 7882:7892/udp comment "LiveKit RTC UDP"
sudo ufw allow 7890/tcp comment "LiveKit Token Service"
```

Если firewall не используется (iptables чистый) — ничего делать не надо.

---

## ЧАСТЬ 5: Скрипт обновления (deploy)

### ШАГ 5.1. Создать скрипт деплоя на сервере

Файл на сервере: `~/projects/uplink/deploy.sh`

```bash
#!/bin/bash
# Обновление Uplink на сервере
# Запуск: cd ~/projects/uplink && ./deploy.sh

set -e

echo "=== Uplink Deploy ==="

echo "1. Pulling latest code..."
git pull

echo "2. Building and restarting containers..."
cd docker
docker compose up --build -d

echo "3. Waiting for Synapse..."
sleep 10
for i in $(seq 1 12); do
    if curl -sf http://localhost:8008/health > /dev/null 2>&1; then
        echo "   Synapse OK"
        break
    fi
    echo "   Waiting... ($i/12)"
    sleep 5
done

echo "4. Checking services..."
curl -sf http://localhost:5174 > /dev/null && echo "   Web: OK" || echo "   Web: FAIL"
curl -sf http://localhost:5174/_matrix/client/versions > /dev/null && echo "   Proxy: OK" || echo "   Proxy: FAIL"
curl -sf http://localhost:8008/health > /dev/null && echo "   Synapse: OK" || echo "   Synapse: FAIL"

echo ""
IP=$(hostname -I | awk '{print $1}')
echo "=== Ready: http://${IP}:5174 ==="
```

Сделать исполняемым:

```bash
chmod +x ~/projects/uplink/deploy.sh
```

### ШАГ 5.2. Создать скрипт деплоя с Windows (одна команда)

Файл: `E:\Uplink\scripts\deploy.ps1`

```powershell
# Деплой Uplink на сервер
# Запуск: powershell scripts/deploy.ps1

$Server = "flomaster@flomasterserver"
$Password = "Misha2021@1@"
$RemotePath = "~/projects/uplink"

Write-Host "=== Uplink Deploy ===" -ForegroundColor Cyan

# 1. Коммит и пуш (если есть изменения)
Write-Host "1. Git push..." -ForegroundColor Yellow
git add -A
$status = git status --porcelain
if ($status) {
    $msg = Read-Host "Commit message (Enter для 'update')"
    if (-not $msg) { $msg = "update" }
    git commit -m $msg
}
git push

# 2. SSH: pull + rebuild
Write-Host "2. Deploying on server..." -ForegroundColor Yellow
sshpass -p $Password ssh -o StrictHostKeyChecking=no $Server "cd $RemotePath && ./deploy.sh"

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
```

**ПРИМЕЧАНИЕ:** Если `sshpass` не установлен на Windows, использовать SSH с ключами (ssh-copy-id) или запускать деплой вручную:

```powershell
# Вариант без sshpass:
git push
ssh flomaster@flomasterserver "cd ~/projects/uplink && ./deploy.sh"
```

---

## ЧАСТЬ 6: Рабочий процесс после настройки

Ежедневный workflow:

```
1. Пишешь код на ноутбуке (E:\Uplink\web\...)
2. Проверяешь локально: npm run dev → http://localhost:5173
3. Всё ок → git push
4. На сервере: ./deploy.sh (или powershell scripts/deploy.ps1)
5. Открываешь http://<SERVER_IP>:5174 — обновлённая версия
6. Тестируешь с нескольких устройств
```

---

## Критерии приёмки

- [ ] `web/src/config.ts` создан, все URL-ы сервисов из `window.location.hostname`
- [ ] LoginScreen использует `config.matrixHomeserver`
- [ ] Проект склонирован/скопирован на `flomasterserver:~/projects/uplink`
- [ ] `docker compose up --build -d` на сервере — все контейнеры healthy
- [ ] Admin-пользователь создан, seed-данные залиты
- [ ] С ноутбука: `http://<SERVER_IP>:5174` — экран логина открывается
- [ ] Логин работает для всех пользователей (alice, bob, charlie, diana, eve / test123)
- [ ] Два ноутбука: real-time сообщения между ними
- [ ] `deploy.sh` на сервере работает (git pull → rebuild → проверка)
- [ ] `scripts/deploy.ps1` на Windows — пуш + деплой одной командой
- [ ] nginx.conf: proxy `/livekit-token/` добавлен (для будущей задачи 005)

## Коммит

```
[infra] Деплой на homelab: config.ts, deploy.sh, серверная настройка

- web/src/config.ts: URL-ы сервисов из window.location.hostname
- LoginScreen использует централизованный config
- deploy.sh: обновление на сервере одной командой
- scripts/deploy.ps1: пуш + деплой с Windows
- nginx.conf: proxy /livekit-token/ для задачи 005
```
