# Uplink — Развёртывание и настройка

## Запуск инфраструктуры

```bash
cd docker
docker compose up -d
```

Сервисы:
- **Synapse** (Matrix homeserver): http://localhost:8008
- **Synapse Admin Panel**: http://localhost:8080
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Тестовые пользователи

| User ID | Display Name | Пароль | Комнаты |
|---------|-------------|--------|---------|
| @alice:uplink.local | Alice Иванова | test123 | #general, #frontend |
| @bob:uplink.local | Bob Петров | test123 | #general, #backend |
| @charlie:uplink.local | Charlie Сидоров | test123 | #general, #backend |
| @diana:uplink.local | Diana Козлова | test123 | #general, #frontend |
| @eve:uplink.local | Eve Смирнова | test123 | #general, #backend, #frontend |

Admin: `admin` / `admin_poc_pass`

### Быстрое создание пользователей

```bash
# Windows (PowerShell)
powershell scripts/create-users.ps1

# Linux/Mac
bash scripts/create-users.sh
```

### Полное наполнение (пользователи + комнаты + сообщения)

```bash
node scripts/seed-test-data.mjs
```

## Комнаты

| Комната | Назначение | Участники |
|---------|-----------|-----------|
| #general:uplink.local | Общий канал | admin + все 5 |
| #backend:uplink.local | Backend-разработка | admin, bob, charlie, eve |
| #frontend:uplink.local | Frontend-разработка | admin, alice, diana, eve |

## Подключение расширения

В настройках VS Code:

```json
{
  "uplink.matrix.homeserver": "http://localhost:8008",
  "uplink.matrix.userId": "@alice:uplink.local"
}
```
