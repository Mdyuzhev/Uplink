# 006: Создание тестовых пользователей и наполнение комнат

## Цель

Создать набор тестовых пользователей через Synapse Admin API, добавить их во все существующие комнаты, и отправить тестовые сообщения для проверки работы чата между несколькими участниками.

## Контекст

Расширение Uplink собрано и работает (VSIX установлен). Нужно подготовить тестовое окружение: несколько пользователей, которые состоят в общих комнатах и имеют историю сообщений. Это позволит проверить real-time доставку, отображение имён, группировку сообщений и шифрование между разными устройствами.

## Зависимости

- Задача 001 (Docker-инфраструктура) — **выполнена** ✅, Synapse работает на http://localhost:8008
- Admin-пользователь: `admin` / `admin_poc_pass`

## Предусловия

Перед началом работы проверь доступность Synapse:

```bash
curl -sf http://localhost:8008/health && echo "✅ Synapse OK" || echo "❌ Synapse недоступен — запусти: cd E:\Uplink\docker && docker compose up -d"
```

Все операции выполняются через HTTP API. Используй `curl` или PowerShell `Invoke-RestMethod`.

---

## ШАГ 1. Получить admin access token

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"admin","password":"admin_poc_pass"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Admin token: $ADMIN_TOKEN"
```

Если python3 недоступен, парси JSON другим способом (jq, PowerShell, node). Токен нужен для всех последующих запросов.

**CHECKPOINT:** Если токен пустой или ошибка — проверь что admin-пользователь существует и Synapse запущен.

---

## ШАГ 2. Создать тестовых пользователей

Создать 5 пользователей через Synapse Admin API v2. Пароль у всех: `test123`.

| username | displayname | Роль в тестах |
|----------|-------------|---------------|
| alice | Alice Иванова | Frontend-разработчик |
| bob | Bob Петров | Backend-разработчик |
| charlie | Charlie Сидоров | QA-инженер |
| diana | Diana Козлова | DevOps-инженер |
| eve | Eve Смирнова | Team Lead |

Для каждого пользователя выполни PUT-запрос:

```bash
curl -s -X PUT \
  "http://localhost:8008/_synapse/admin/v2/users/@alice:uplink.local" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "password": "test123",
    "admin": false,
    "deactivated": false,
    "displayname": "Alice Иванова"
  }'
```

Повтори для bob, charlie, diana, eve с соответствующими displayname.

**Проверка:** Запроси список пользователей и убедись что все 5 созданы:

```bash
curl -s "http://localhost:8008/_synapse/admin/v2/users?from=0&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; users=json.load(sys.stdin)['users']; [print(u['name'], u.get('displayname','')) for u in users]"
```

Ожидаемый результат: admin + alice + bob + charlie + diana + eve (+ dev1/dev2/dev3 если были созданы ранее).

---

## ШАГ 3. Получить room_id всех существующих комнат

```bash
# #general
GENERAL=$(curl -s "http://localhost:8008/_matrix/client/v3/directory/room/%23general:uplink.local" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['room_id'])")
echo "general: $GENERAL"

# #backend
BACKEND=$(curl -s "http://localhost:8008/_matrix/client/v3/directory/room/%23backend:uplink.local" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['room_id'])")
echo "backend: $BACKEND"

# #frontend
FRONTEND=$(curl -s "http://localhost:8008/_matrix/client/v3/directory/room/%23frontend:uplink.local" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['room_id'])")
echo "frontend: $FRONTEND"
```

Если какая-то комната не найдена (404), создай её:

```bash
curl -s -X POST http://localhost:8008/_matrix/client/v3/createRoom \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_alias_name": "general",
    "name": "General",
    "topic": "Общий канал команды",
    "visibility": "public",
    "preset": "public_chat",
    "initial_state": [
      {
        "type": "m.room.encryption",
        "state_key": "",
        "content": {"algorithm": "m.megolm.v1.aes-sha2"}
      }
    ]
  }'
```

---

## ШАГ 4. Invite + Join всех пользователей во все комнаты

Для каждой комбинации (пользователь × комната) нужно два шага: admin делает invite, затем пользователь делает join. Для join нужен токен самого пользователя.

### 4.1. Получить токены всех пользователей

```bash
ALICE_TOKEN=$(curl -s -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"alice","password":"test123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

BOB_TOKEN=$(curl -s -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"bob","password":"test123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

CHARLIE_TOKEN=$(curl -s -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"charlie","password":"test123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

DIANA_TOKEN=$(curl -s -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"diana","password":"test123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

EVE_TOKEN=$(curl -s -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"eve","password":"test123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### 4.2. Invite + Join в #general (все 5)

Для каждого пользователя:

```bash
# Invite alice
curl -s -X POST "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL/invite" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "@alice:uplink.local"}'

# Alice joins
curl -s -X POST "http://localhost:8008/_matrix/client/v3/join/$GENERAL" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Повторить для bob (BOB_TOKEN), charlie (CHARLIE_TOKEN), diana (DIANA_TOKEN), eve (EVE_TOKEN).

### 4.3. Invite + Join в #backend (bob, charlie, eve)

Только backend-релевантные пользователи:

```bash
for USER_ID in "@bob:uplink.local" "@charlie:uplink.local" "@eve:uplink.local"; do
  curl -s -X POST "http://localhost:8008/_matrix/client/v3/rooms/$BACKEND/invite" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\": \"$USER_ID\"}"
done

# Join
curl -s -X POST "http://localhost:8008/_matrix/client/v3/join/$BACKEND" \
  -H "Authorization: Bearer $BOB_TOKEN" -H "Content-Type: application/json" -d '{}'
curl -s -X POST "http://localhost:8008/_matrix/client/v3/join/$BACKEND" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" -H "Content-Type: application/json" -d '{}'
curl -s -X POST "http://localhost:8008/_matrix/client/v3/join/$BACKEND" \
  -H "Authorization: Bearer $EVE_TOKEN" -H "Content-Type: application/json" -d '{}'
```

### 4.4. Invite + Join в #frontend (alice, diana, eve)

```bash
for USER_ID in "@alice:uplink.local" "@diana:uplink.local" "@eve:uplink.local"; do
  curl -s -X POST "http://localhost:8008/_matrix/client/v3/rooms/$FRONTEND/invite" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\": \"$USER_ID\"}"
done

curl -s -X POST "http://localhost:8008/_matrix/client/v3/join/$FRONTEND" \
  -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" -d '{}'
curl -s -X POST "http://localhost:8008/_matrix/client/v3/join/$FRONTEND" \
  -H "Authorization: Bearer $DIANA_TOKEN" -H "Content-Type: application/json" -d '{}'
curl -s -X POST "http://localhost:8008/_matrix/client/v3/join/$FRONTEND" \
  -H "Authorization: Bearer $EVE_TOKEN" -H "Content-Type: application/json" -d '{}'
```

**CHECKPOINT:** Проверь membership через Admin API:

```bash
curl -s "http://localhost:8008/_synapse/admin/v1/rooms/$GENERAL/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; members=json.load(sys.stdin)['members']; print(f'#general: {len(members)} участников'); [print(f'  {m}') for m in members]"
```

Ожидаемо: #general — 6 (admin + 5), #backend — 4 (admin + 3), #frontend — 4 (admin + 3).

---

## ШАГ 5. Отправить тестовые сообщения в #general

Отправить серию сообщений от разных пользователей, имитируя реальный разговор:

```bash
# Eve начинает
curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL/send/m.room.message/msg1" \
  -H "Authorization: Bearer $EVE_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Всем привет! Сегодня планируем спринт, кто готов?"}'

sleep 1

# Alice отвечает
curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL/send/m.room.message/msg2" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Привет! Я готова, вчера закончила компонент Sidebar"}'

sleep 1

# Bob отвечает
curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL/send/m.room.message/msg3" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Привет, я тоже. API авторизации готов, нужен ревью"}'

sleep 1

# Charlie
curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL/send/m.room.message/msg4" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Я написал автотесты на Matrix-клиент, 12 тестов, все зелёные 🟢"}'

sleep 1

# Diana
curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL/send/m.room.message/msg5" \
  -H "Authorization: Bearer $DIANA_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Docker-инфра обновлена, добавила мониторинг через Prometheus"}'

sleep 1

# Eve отвечает всем
curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL/send/m.room.message/msg6" \
  -H "Authorization: Bearer $EVE_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Отлично! Давайте созвон через 15 минут в #general, обсудим приоритеты"}'

# Bob — code snippet
curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$GENERAL/send/m.room.message/msg7" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "msgtype": "m.text",
    "body": "📄 src/matrix/auth.ts:15-28\n```typescript\nasync login(homeserver: string, userId: string, password: string): Promise<Credentials> {\n    const client = sdk.createClient({ baseUrl: homeserver });\n    const response = await client.login(\"m.login.password\", {\n        user: userId,\n        password: password,\n        initial_device_display_name: \"Uplink VS Code\"\n    });\n    return { accessToken: response.access_token, deviceId: response.device_id };\n}\n```",
    "format": "org.matrix.custom.html",
    "formatted_body": "<div data-uplink-snippet=\"true\"><p><strong>📄 src/matrix/auth.ts:15-28</strong></p><pre><code class=\"language-typescript\">async login(homeserver: string, userId: string, password: string): Promise&lt;Credentials&gt; {\n    const client = sdk.createClient({ baseUrl: homeserver });\n    const response = await client.login(\"m.login.password\", {\n        user: userId,\n        password: password,\n        initial_device_display_name: \"Uplink VS Code\"\n    });\n    return { accessToken: response.access_token, deviceId: response.device_id };\n}</code></pre></div>",
    "dev.uplink.code_context": {
      "language": "typescript",
      "fileName": "src/matrix/auth.ts",
      "lineStart": 15,
      "lineEnd": 28,
      "gitBranch": "main"
    }
  }'
```

---

## ШАГ 6. Отправить тестовые сообщения в #backend

```bash
curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$BACKEND/send/m.room.message/bmsg1" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Ребят, мигрировал БД на PostgreSQL 15, тесты прошли"}'

sleep 1

curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$BACKEND/send/m.room.message/bmsg2" \
  -H "Authorization: Bearer $CHARLIE_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Отлично, запускаю регресс. Результаты скину через час"}'

sleep 1

curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$BACKEND/send/m.room.message/bmsg3" \
  -H "Authorization: Bearer $EVE_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Bob, не забудь обновить README с новыми env-переменными"}'
```

---

## ШАГ 7. Отправить тестовые сообщения в #frontend

```bash
curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$FRONTEND/send/m.room.message/fmsg1" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Закончила стили для dark theme, всё на CSS-переменных VS Code"}'

sleep 1

curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$FRONTEND/send/m.room.message/fmsg2" \
  -H "Authorization: Bearer $DIANA_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Классно! Можешь показать скриншот? Хочу убедиться что в light theme тоже ок"}'

sleep 1

curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$FRONTEND/send/m.room.message/fmsg3" \
  -H "Authorization: Bearer $EVE_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"msgtype":"m.text","body":"Alice, добавь пожалуйста responsive для мобильной версии, ширина < 500px"}'
```

---

## ШАГ 8. Создать скрипт для быстрого создания пользователей

Сохранить утилиту для будущего использования.

Файл: `scripts/create-users.sh`

```bash
#!/bin/bash
# Создание тестовых пользователей Uplink
# Использование: ./scripts/create-users.sh

SYNAPSE_URL="http://localhost:8008"
ADMIN_USER="admin"
ADMIN_PASS="admin_poc_pass"

# Получить admin токен
ADMIN_TOKEN=$(curl -s -X POST "$SYNAPSE_URL/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"user\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Не удалось получить admin токен. Проверь что Synapse запущен."
  exit 1
fi

echo "✅ Admin токен получен"

# Создать пользователя
create_user() {
  local username=$1
  local displayname=$2
  local password=${3:-test123}

  curl -s -X PUT \
    "$SYNAPSE_URL/_synapse/admin/v2/users/@${username}:uplink.local" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "{\"password\":\"$password\",\"admin\":false,\"deactivated\":false,\"displayname\":\"$displayname\"}" \
    > /dev/null

  echo "  ✅ @${username}:uplink.local ($displayname)"
}

echo ""
echo "Создание пользователей..."
create_user "alice" "Alice Иванова"
create_user "bob" "Bob Петров"
create_user "charlie" "Charlie Сидоров"
create_user "diana" "Diana Козлова"
create_user "eve" "Eve Смирнова"

echo ""
echo "Готово! Все пользователи созданы с паролем: test123"
echo ""
echo "Для входа в Uplink используй:"
echo "  User ID:  @alice:uplink.local  (или bob, charlie, diana, eve)"
echo "  Password: test123"
echo "  Server:   http://localhost:8008"
```

Сделать исполняемым: `chmod +x scripts/create-users.sh` (на Linux/Mac).

Файл: `scripts/create-users.ps1` (PowerShell-версия для Windows)

```powershell
# Создание тестовых пользователей Uplink (Windows PowerShell)

$SynapseUrl = "http://localhost:8008"

# Получить admin токен
$loginResp = Invoke-RestMethod -Uri "$SynapseUrl/_matrix/client/v3/login" -Method Post -ContentType "application/json" -Body '{"type":"m.login.password","user":"admin","password":"admin_poc_pass"}'
$token = $loginResp.access_token

if (-not $token) {
    Write-Host "❌ Не удалось получить admin токен" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Admin токен получен" -ForegroundColor Green

# Создать пользователей
$users = @(
    @{username="alice"; displayname="Alice Иванова"},
    @{username="bob"; displayname="Bob Петров"},
    @{username="charlie"; displayname="Charlie Сидоров"},
    @{username="diana"; displayname="Diana Козлова"},
    @{username="eve"; displayname="Eve Смирнова"}
)

foreach ($u in $users) {
    $body = @{
        password = "test123"
        admin = $false
        deactivated = $false
        displayname = $u.displayname
    } | ConvertTo-Json -Depth 3

    try {
        Invoke-RestMethod -Uri "$SynapseUrl/_synapse/admin/v2/users/@$($u.username):uplink.local" `
            -Method Put `
            -Headers @{Authorization="Bearer $token"} `
            -ContentType "application/json; charset=utf-8" `
            -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
        Write-Host "  ✅ @$($u.username):uplink.local ($($u.displayname))" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ @$($u.username):uplink.local — ошибка: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Готово! Пароль для всех: test123" -ForegroundColor Cyan
```

---

## ШАГ 9. Обновить документацию

Добавить в `docs/setup.md` (создать если нет) секцию с тестовыми аккаунтами:

```markdown
## Тестовые пользователи

| User ID | Display Name | Пароль | Комнаты |
|---------|-------------|--------|---------|
| @alice:uplink.local | Alice Иванова | test123 | #general, #frontend |
| @bob:uplink.local | Bob Петров | test123 | #general, #backend |
| @charlie:uplink.local | Charlie Сидоров | test123 | #general, #backend |
| @diana:uplink.local | Diana Козлова | test123 | #general, #frontend |
| @eve:uplink.local | Eve Смирнова | test123 | #general, #backend, #frontend |

### Быстрое создание пользователей

Windows: `powershell scripts/create-users.ps1`
Linux/Mac: `bash scripts/create-users.sh`
```

---

## Критерии приёмки

- [ ] 5 пользователей созданы (alice, bob, charlie, diana, eve) с displayname
- [ ] Все пользователи видны в Synapse Admin Panel (http://localhost:8080)
- [ ] #general — 6 участников (admin + 5 пользователей)
- [ ] #backend — 4 участника (admin + bob, charlie, eve)
- [ ] #frontend — 4 участника (admin + alice, diana, eve)
- [ ] В #general — минимум 7 тестовых сообщений включая code snippet
- [ ] В #backend — минимум 3 тестовых сообщения
- [ ] В #frontend — минимум 3 тестовых сообщения
- [ ] Скрипты `scripts/create-users.sh` и `scripts/create-users.ps1` созданы и работают
- [ ] `docs/setup.md` содержит таблицу тестовых аккаунтов

## Коммит

```
[infra] Тестовые пользователи, наполнение комнат, скрипты создания

- 5 тестовых пользователей через Synapse Admin API
- Тестовые сообщения в #general, #backend, #frontend
- Скрипты create-users.sh и create-users.ps1
- Документация тестовых аккаунтов в docs/setup.md
```
