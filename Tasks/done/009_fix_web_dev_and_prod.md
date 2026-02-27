# 009: Починить веб-приложение — dev (5173) + prod (5174), пользователи, данные

## Цель

Привести веб-приложение в рабочее состояние. Два режима:
- **Dev** — `npm run dev` на порту **5173** (Vite, HMR, для разработки)
- **Prod** — Docker-контейнер nginx на порту **5174** (собранный билд, для демо)

Рабочий процесс: пишем код → проверяем на 5173 → всё ок → `docker compose build uplink && docker compose up -d` → работает на 5174.

Починить всё что сломала задача 008: пользователи, комнаты, конфигурация, связанность сервисов.

## Контекст проблемы

Задача 008 (E2E шифрование) внесла деструктивные изменения:
- Включила обязательное E2E шифрование на сервере, но WASM crypto не работает стабильно → нельзя залогиниться
- Контейнер `uplink` (web) повесили на порт 3001, который занят
- Часть тестовых пользователей сломана
- LoginScreen по умолчанию указывает на localhost:8008, а в контейнере nginx проксирует /_matrix/ — путаница

### Что уже исправлено (НЕ ТРОГАТЬ)

1. **`web/src/matrix/MatrixService.ts`** — метод `initCrypto()` больше не бросает исключение если WASM crypto недоступен. Пишет warning и продолжает без шифрования.
2. **`docker/synapse/homeserver.yaml`** — `encryption_enabled_by_default_for_room_type: "off"`.

### Целевая архитектура

```
=== DEV (разработка) ===

Браузер → http://localhost:5173 (Vite dev server, HMR)
              │
              │  matrix-js-sdk → http://localhost:8008 напрямую
              ▼
Docker: Synapse (8008), PostgreSQL (5432), Redis (6379), Synapse Admin (8080)


=== PROD (демо/продакшен) ===

Браузер → http://localhost:5174 (nginx в Docker)
              │
              ├── статика (React build) → /assets/*, /index.html
              │
              └── /_matrix/* → proxy_pass http://synapse:8008
                               (внутренняя Docker-сеть, не localhost)
```

## Зависимости

- Задача 007 (Веб-приложение) — выполнена, код есть
- Docker-инфраструктура (001) — работает

---

## ЧАСТЬ 1: Исправить docker-compose.yml

### ШАГ 1.1. Остановить все контейнеры

```bash
cd E:\Uplink\docker
docker compose down
```

### ШАГ 1.2. Поменять порт контейнера uplink с 3001 на 5174

Файл: `E:\Uplink\docker\docker-compose.yml`

Найти блок сервиса `uplink` и заменить порт:

```yaml
  uplink:
    build:
      context: ../web
      dockerfile: Dockerfile
    container_name: uplink-web
    restart: unless-stopped
    ports:
      - "5174:80"       # <-- было 3001:80, стало 5174:80
    depends_on:
      synapse:
        condition: service_healthy
```

Всё остальное в docker-compose.yml не трогать. Должно быть 5 сервисов: postgres, redis, synapse, synapse-admin, uplink.

---

## ЧАСТЬ 2: Исправить LoginScreen — дефолтный homeserver

### ШАГ 2.1. Файл: `E:\Uplink\web\src\components\LoginScreen.tsx`

Найти строки определения `defaultHomeserver` (или `homeserver` в useState) и заменить на:

```tsx
// Dev (Vite на 5173): подключаемся к Synapse напрямую на 8008
// Prod (nginx на 5174): подключаемся через тот же origin (nginx проксирует /_matrix/)
const defaultHomeserver = window.location.port === '5173'
    ? 'http://localhost:8008'
    : window.location.origin;
const [homeserver, setHomeserver] = useState(defaultHomeserver);
```

Логика:
- На 5173 (Vite) → matrix-js-sdk ходит напрямую на `http://localhost:8008` (Synapse разрешает CORS)
- На 5174 (nginx) → matrix-js-sdk ходит на `http://localhost:5174`, а nginx проксирует `/_matrix/*` → `synapse:8008` по внутренней Docker-сети

---

## ЧАСТЬ 3: Проверить vite.config.ts

### ШАГ 3.1. Файл: `E:\Uplink\web\vite.config.ts`

Убедиться что порт **5173**. Если стоит другой — поменять. Остальное не трогать.

```typescript
server: {
    port: 5173,
    host: '0.0.0.0',
},
```

---

## ЧАСТЬ 4: Проверить nginx.conf

### ШАГ 4.1. Файл: `E:\Uplink\web\nginx.conf`

Убедиться что проксирование /_matrix/ работает. Блок должен содержать:

```nginx
location /_matrix/ {
    proxy_pass http://synapse:8008;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Host $host;
}
```

Имя хоста `synapse` — это имя сервиса в docker-compose. Nginx обращается к Synapse по внутренней Docker-сети, а не по localhost.

---

## ЧАСТЬ 5: Запуск и проверка сборки

### ШАГ 5.1. Запустить Docker (серверы + web)

```bash
cd E:\Uplink\docker
docker compose up -d --build
```

Флаг `--build` пересоберёт контейнер uplink с актуальным кодом.

Подождать 30 секунд.

### ШАГ 5.2. Проверить что Synapse работает

```bash
curl -sf http://localhost:8008/health
```

Ожидаемо: `OK` или пустой 200 ответ.

### ШАГ 5.3. Проверить что nginx отдаёт статику на 5174

Открыть http://localhost:5174 в браузере. Должен появиться экран логина Uplink.

### ШАГ 5.4. Проверить что nginx проксирует Matrix API

```bash
curl -sf http://localhost:5174/_matrix/client/versions
```

Ожидаемо: JSON с полем `versions` (список версий Matrix API).

Если ошибка — проверить логи контейнера:

```bash
docker logs uplink-web
```

---

## ЧАСТЬ 6: Восстановить пользователей и данные

### ШАГ 6.1. Проверить существующих пользователей

Попробовать залогиниться через API за каждого пользователя:

```bash
curl -s -X POST http://localhost:8008/_matrix/client/v3/login -H "Content-Type: application/json" -d "{\"type\":\"m.login.password\",\"user\":\"alice\",\"password\":\"test123\"}"
```

Повторить для: `alice`, `bob`, `charlie`, `diana`, `eve`. Пароль у всех `test123`.

Если кто-то не логинится — пересоздать через Admin API (см. ШАГ 6.2).

### ШАГ 6.2. Пересоздать сломанных пользователей (если нужно)

Получить admin-токен:

```bash
# Залогиниться как admin
curl -s -X POST http://localhost:8008/_matrix/client/v3/login -H "Content-Type: application/json" -d '{"type":"m.login.password","user":"admin","password":"admin_poc_pass"}'
```

Для каждого сломанного пользователя — PUT запрос:

```bash
curl -s -X PUT "http://localhost:8008/_synapse/admin/v2/users/@alice:uplink.local" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"password":"test123","admin":false,"deactivated":false,"displayname":"Alice Иванова"}'
```

Пользователи и displayname:

| username | displayname |
|----------|-------------|
| alice | Alice Иванова |
| bob | Bob Петров |
| charlie | Charlie Сидоров |
| diana | Diana Козлова |
| eve | Eve Смирнова |

### ШАГ 6.3. Залить тестовые данные

Запустить seed-скрипт. Он создаст комнаты (если нет), пригласит пользователей, отправит сообщения:

```bash
cd E:\Uplink
node scripts/seed-test-data.mjs
```

Если скрипт падает с ошибкой — прочитать вывод, скорее всего проблема в том что пользователь не может залогиниться (→ вернуться к ШАГу 6.2).

---

## ЧАСТЬ 7: Проверить DEV-режим (Vite на 5173)

### ШАГ 7.1. Запустить Vite

```bash
cd E:\Uplink\web
npm run dev
```

Ожидаемо: Vite стартует на http://localhost:5173 без ошибок.

### ШАГ 7.2. Проверить в браузере

1. Открыть http://localhost:5173
2. Экран логина. Поле «Сервер» = `http://localhost:8008` (дефолт для dev)
3. Ввести: `@alice:uplink.local` / `test123`
4. После логина — Slack-подобный интерфейс
5. Sidebar: каналы (#general, #backend, #frontend) и личные сообщения
6. Кликнуть #general — сообщения отображаются
7. Отправить сообщение — появляется в ленте
8. Открыть вторую вкладку, войти как `@bob:uplink.local` / `test123` — сообщения от alice видны в real-time

---

## ЧАСТЬ 8: Проверить PROD-режим (nginx на 5174)

### ШАГ 8.1. Проверить в браузере

1. Открыть http://localhost:5174
2. Экран логина. Поле «Сервер» = `http://localhost:5174` (дефолт для prod)
3. Ввести: `@alice:uplink.local` / `test123`
4. Всё то же самое что в DEV — каналы, сообщения, real-time

Если не работает — проверить:
- `docker logs uplink-web` — ошибки nginx
- DevTools → Network — куда уходят запросы к /_matrix/
- DevTools → Console — ошибки JS/WASM

---

## Критерии приёмки

- [ ] docker-compose.yml: контейнер `uplink` на порту **5174** (не 3001)
- [ ] `docker compose up -d --build` — все 5 контейнеров зелёные (postgres, redis, synapse, synapse-admin, uplink)
- [ ] http://localhost:5174 — экран логина, статика отдаётся
- [ ] http://localhost:5174/_matrix/client/versions — JSON (nginx прокси работает)
- [ ] `npm run dev` (в `web/`) — Vite стартует на http://localhost:5173
- [ ] http://localhost:5173 — экран логина, дефолт сервер `http://localhost:8008`
- [ ] Логин работает на **обоих** портах для **всех** пользователей (alice, bob, charlie, diana, eve / test123)
- [ ] После логина видны каналы: #general, #backend, #frontend
- [ ] Сообщения отображаются в каналах
- [ ] Отправка нового сообщения работает
- [ ] Real-time: сообщение от alice видно у bob без перезагрузки
- [ ] Консоль браузера: нет критических ошибок (warning про E2E допустим)

## Коммит

```
[web][fix] Восстановление веб: dev (5173) + prod (5174), пользователи, данные

- docker-compose: контейнер uplink на порту 5174 (было 3001)
- LoginScreen: автодетекция homeserver (8008 для dev, origin для prod)
- E2E шифрование опционально (не крашит при ошибке WASM)
- homeserver.yaml: encryption_enabled_by_default_for_room_type: off
- Пользователи восстановлены, seed-данные залиты
```
