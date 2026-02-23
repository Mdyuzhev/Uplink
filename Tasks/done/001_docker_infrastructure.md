# 001: Docker-инфраструктура — Synapse + PostgreSQL + Redis + Admin Panel

## Цель

Развернуть серверный стек Uplink в Docker Compose: Matrix Synapse homeserver с PostgreSQL, Redis для кэширования, и Synapse Admin UI для управления пользователями.

## Контекст

Это фундамент для всего проекта. Без работающего Synapse расширение не может ни авторизовать пользователей, ни отправлять сообщения. Admin Panel нужна для создания и управления учётными записями без CLI.

## Шаги

### ШАГ 1. Создать структуру каталогов

```bash
mkdir -p docker/synapse
mkdir -p docker/nginx
```

### ШАГ 2. Создать docker-compose.yml

Файл: `docker/docker-compose.yml`

Сервисы:
- **postgres** — PostgreSQL 15, порт 5432
  - Volume: `uplink-postgres-data:/var/lib/postgresql/data`
  - Database: `synapse`, user: `synapse`, password: `synapse_poc_pass`
  - Healthcheck: `pg_isready`

- **redis** — Redis 7, порт 6379
  - Volume: `uplink-redis-data:/data`
  - Healthcheck: `redis-cli ping`

- **synapse** — `matrixdotorg/synapse:latest`, порт 8008
  - Volume: `./synapse:/data`
  - Depends on: postgres, redis
  - Environment: `SYNAPSE_CONFIG_DIR=/data`
  - Healthcheck: `curl -f http://localhost:8008/health`

- **synapse-admin** — `awesometechnologies/synapse-admin:latest`, порт 8080
  - Depends on: synapse
  - Нет volume, stateless

### ШАГ 3. Сгенерировать конфигурацию Synapse

```bash
cd docker
docker run -it --rm \
  -v ./synapse:/data \
  -e SYNAPSE_SERVER_NAME=uplink.local \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:latest generate
```

### ШАГ 4. Настроить homeserver.yaml

Файл: `docker/synapse/homeserver.yaml`

Обязательные изменения после генерации:

```yaml
# Переключить на PostgreSQL (убрать SQLite)
database:
  name: psycopg2
  args:
    user: synapse
    password: synapse_poc_pass
    database: synapse
    host: postgres
    port: 5432
    cp_min: 5
    cp_max: 10

# Redis для кэширования
redis:
  enabled: true
  host: redis
  port: 6379

# Отключить открытую регистрацию (пользователи создаются через Admin API)
enable_registration: false
enable_registration_without_verification: false

# Включить Admin API
# (доступен автоматически для пользователей с admin=true)

# Разрешить CORS для VS Code WebView
# Добавить в listeners секцию:
listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: true
    resources:
      - names: [client, federation]
        compress: false

# Медиа-хранилище
media_store_path: /data/media_store
max_upload_size: 50M

# Логирование
log_config: "/data/log.config"
```

### ШАГ 5. Создать log.config для Synapse

Файл: `docker/synapse/log.config`

Стандартный Python logging config: уровень INFO, вывод в stdout (для docker logs).

### ШАГ 6. Запустить стек и проверить

```bash
cd docker
docker compose up -d

# Подождать запуск
sleep 15

# Health checks
curl -sf http://localhost:8008/health && echo "✅ Synapse OK" || echo "❌ Synapse FAIL"
curl -sf http://localhost:8008/_matrix/client/versions && echo "✅ Client API OK" || echo "❌ Client API FAIL"
curl -sf http://localhost:8080 && echo "✅ Admin Panel OK" || echo "❌ Admin Panel FAIL"
```

### ШАГ 7. Создать администратора

```bash
docker exec -it docker-synapse-1 register_new_matrix_user \
  -u admin \
  -p admin_poc_pass \
  -a \
  -c /data/homeserver.yaml \
  http://localhost:8008
```

### ШАГ 8. Создать тестовых пользователей

Создать скрипт `scripts/create-user.sh`:

```bash
#!/bin/bash
# Использование: ./scripts/create-user.sh username password
# Создаёт пользователя через Synapse Admin API

SYNAPSE_URL="http://localhost:8008"
ADMIN_TOKEN="" # получить через login

USERNAME=$1
PASSWORD=$2

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Использование: $0 <username> <password>"
  exit 1
fi

curl -s -X PUT \
  "${SYNAPSE_URL}/_synapse/admin/v2/users/@${USERNAME}:uplink.local" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"${PASSWORD}\", \"admin\": false, \"deactivated\": false}"
```

Создать 3 тестовых пользователя: `dev1`, `dev2`, `dev3` с паролем `test123`.

### ШАГ 9. Создать тестовые комнаты

Через Admin Panel (http://localhost:8080) или через API создать:
- `#general:uplink.local` — Общий канал
- `#backend:uplink.local` — Backend-команда
- `#frontend:uplink.local` — Frontend-команда

### ШАГ 10. Создать .env файл

Файл: `docker/.env`

```env
POSTGRES_DB=synapse
POSTGRES_USER=synapse
POSTGRES_PASSWORD=synapse_poc_pass
SYNAPSE_SERVER_NAME=uplink.local
```

### ШАГ 11. Обновить .gitignore

Добавить в корневой `.gitignore`:

```
node_modules/
out/
dist/
*.vsix
.env
docker/synapse/*.signing.key
docker/synapse/media_store/
```

## Критерии приёмки

- [ ] `docker compose up -d` поднимает все 4 сервиса без ошибок
- [ ] `curl http://localhost:8008/_matrix/client/versions` возвращает JSON с версиями
- [ ] Admin Panel доступна на http://localhost:8080, вход под admin/admin_poc_pass
- [ ] Тестовые пользователи dev1, dev2, dev3 созданы и видны в Admin Panel
- [ ] Тестовые комнаты general, backend, frontend созданы
- [ ] Скрипт `scripts/create-user.sh` работает
- [ ] Все credentials вынесены в `.env`, файл в `.gitignore`

## Коммит

```
[infra] Настроена Docker-инфраструктура: Synapse + PostgreSQL + Redis + Admin Panel

- docker-compose.yml с 4 сервисами
- homeserver.yaml настроен на PostgreSQL и Redis
- Скрипт создания пользователей
- Тестовые пользователи и комнаты
- .env для credentials
```
