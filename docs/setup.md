# Uplink — Развёртывание

## Production (uplink.wh-lab.ru)

Деплой автоматический: `git push main` → GitHub Actions → SSH → `deploy-prod.sh`.

Ручной первый запуск:
```bash
ssh ubuntu@93.77.189.225
cd ~/projects/uplink
bash scripts/clean-start.sh
```

Сервисы (все за host nginx, порт 443):
- **Uplink** — https://uplink.wh-lab.ru
- **Synapse** — `/_matrix/` (API), `/_synapse/` (admin API)
- **Grafana** — https://uplink.wh-lab.ru/grafana/
- **Synapse Admin** — localhost:8080 (только с сервера)

Учётные данные: см. `.claude/CLAUDE.md` → Учётные данные.

## Локальная разработка

```bash
# 1. Поднять инфраструктуру
cd docker
cp .env.example .env   # заполнить реальными значениями
docker compose up -d

# 2. Дождаться Synapse
curl -sf http://localhost:8008/health

# 3. Запустить фронтенд
cd web
npm install
npm run dev   # http://localhost:5173
```

Dev-сервисы:
- **Synapse**: http://localhost:8008
- **Synapse Admin**: http://localhost:8080
- **Token Service**: http://localhost:7890
- **Botservice**: http://localhost:7891

## Создание пользователей

```bash
# Через registration shared secret (см. homeserver.yaml)
bash scripts/create-user.sh <username> <password> <displayname>
```

## Бэкапы

Cron на production (настраивается вручную):
- `03:00` — `scripts/backup-db.sh` (PostgreSQL + signing key)
- `04:00` — `scripts/backup-media.sh` (media_store rsync)

Подробнее: `docs/disaster-recovery.md`
