# /infra — Управление Docker-инфраструктурой

## Аргументы

```
/infra <action>
```

Действия: `up`, `down`, `status`, `logs`, `deploy`

## Сервисы в docker-compose.yml

- **postgres** — PostgreSQL 15, порт 5432
- **redis** — Redis 7, порт 6379
- **synapse** — Matrix Synapse, порт 8008
- **synapse-admin** — Synapse Admin UI, порт 8080
- **livekit-token** — генератор JWT для LiveKit, порт 7890
- **uplink** — nginx + React SPA, порт 80/443
- **deploy-webhook** — автодеплой по GitHub webhook, порт 9000

НЕТ: livekit, coturn (используем LiveKit Cloud).

## Действия

### up
```bash
cd docker && docker compose up -d
sleep 10
docker compose ps
curl -sf http://localhost:8008/_matrix/client/versions && echo "✅ Synapse OK" || echo "❌ Synapse не отвечает"
```

### down
```bash
cd docker && docker compose down
```

### status
```bash
cd docker && docker compose ps
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker compose ps -q) 2>/dev/null
```

### logs
```bash
cd docker && docker compose logs --tail=50
```
Можно фильтровать: `docker compose logs --tail=50 synapse`

### deploy

**Автоматический (после настройки webhook):**
Просто `git push origin main` — GitHub отправит webhook, сервер подхватит через 10–15 секунд.

**Из среды агента (Claude Code):**
```bash
git push origin main                        # достаточно — webhook сделает остальное
bash scripts/deploy-remote.sh --webhook     # ручной trigger через webhook
bash scripts/deploy-remote.sh              # fallback через SSH + sshpass
bash scripts/deploy-remote.sh --push       # git push + деплой через SSH
```
НЕ использовать голый `ssh` — сломается из-за кириллицы в HOME.

deploy.sh на сервере: git pull → docker compose up --build -d → healthcheck.

## Рабочие директории

- Docker-файлы: `E:\Uplink\docker\`
- На сервере: `~/projects/uplink/docker/`
- Скрипты деплоя: `E:\Uplink\scripts\deploy-remote.sh`, `E:\Uplink\scripts\deploy.ps1`
