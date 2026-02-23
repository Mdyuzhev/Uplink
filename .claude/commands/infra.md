# /infra — Управление Docker-инфраструктурой

## Аргументы

```
/infra <action>
```

Действия: `up`, `down`, `status`, `logs`, `reset`, `init`

## Действия

### init
Первичная настройка инфраструктуры:
1. Проверь наличие Docker и Docker Compose: `docker --version && docker compose version`
2. Проверь наличие `docker/docker-compose.yml`
3. Если нет — создай конфигурацию:
   - Synapse (Matrix homeserver) на порту 8008
   - LiveKit Server на порту 7880 (HTTP API), 7881 (RTC)
   - PostgreSQL 15 на порту 5432
   - Redis на порту 6379
4. Сгенерируй Synapse конфиг: `docker run --rm -v ./docker/synapse:/data matrixdotorg/synapse generate`
5. Выведи инструкцию по первому запуску

### up
```bash
cd docker && docker compose up -d
echo "--- Ожидание запуска ---"
sleep 10
docker compose ps
echo "--- Health check ---"
curl -sf http://localhost:8008/_matrix/client/versions && echo "✅ Synapse OK" || echo "❌ Synapse не отвечает"
curl -sf http://localhost:7880 && echo "✅ LiveKit OK" || echo "❌ LiveKit не отвечает"
```

### down
```bash
cd docker && docker compose down
docker compose ps
```

### status
```bash
cd docker && docker compose ps
echo "--- Ресурсы ---"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker compose ps -q) 2>/dev/null
echo "--- Volumes ---"
docker volume ls | grep uplink
```

### logs
```bash
cd docker && docker compose logs --tail=50
```

### reset
⚠️ Деструктивное действие! Спроси подтверждение.
```bash
cd docker && docker compose down -v
docker volume rm $(docker volume ls -q | grep uplink) 2>/dev/null
echo "Инфраструктура сброшена. Запусти /infra init для повторной настройки."
```

## Формат вывода

```
Uplink Infrastructure
══════════════════════
Synapse:    ✅ running (port 8008)
LiveKit:    ✅ running (port 7880)
PostgreSQL: ✅ running (port 5432)
Redis:      ✅ running (port 6379)

RAM:  ~512MB total
Disk: ~200MB volumes
```
