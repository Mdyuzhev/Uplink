#!/bin/bash
set -e

echo "=== Uplink Production Deploy ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"

cd ~/projects/uplink

# Защита: synapse-data должна существовать
if [ ! -f "docker/synapse-data/homeserver.yaml" ]; then
    echo "ОШИБКА: docker/synapse-data/homeserver.yaml не найден."
    echo "Если это первый запуск — используйте scripts/clean-start.sh"
    exit 1
fi

# Запомнить текущий коммит для определения изменений
OLD_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "none")

# Забрать последние изменения (reset вместо pull — обходит локальные конфликты)
echo "-> Git fetch & reset..."
git fetch origin main
git reset --hard origin/main

NEW_HEAD=$(git rev-parse HEAD)

# Определить какие сервисы пересобирать
REBUILD=""
if [ "$OLD_HEAD" = "none" ] || [ "$OLD_HEAD" = "$NEW_HEAD" ]; then
    # Первый деплой или ручной запуск — пересобрать всё
    REBUILD="all"
    echo "-> Полная пересборка"
else
    CHANGED=$(git diff --name-only "$OLD_HEAD" "$NEW_HEAD" 2>/dev/null || echo "")
    echo "-> Изменённые файлы:"
    echo "$CHANGED" | head -20

    # Фронтенд
    if echo "$CHANGED" | grep -q "^web/"; then
        REBUILD="$REBUILD uplink"
    fi
    # Botservice
    if echo "$CHANGED" | grep -q "^docker/uplink-botservice/"; then
        REBUILD="$REBUILD uplink-botservice"
    fi
    # LiveKit token
    if echo "$CHANGED" | grep -q "^docker/livekit-token/"; then
        REBUILD="$REBUILD livekit-token"
    fi
    # Deploy webhook
    if echo "$CHANGED" | grep -q "^docker/deploy-webhook/"; then
        REBUILD="$REBUILD deploy-webhook"
    fi
    # Docker compose / конфиги — пересобрать всё
    if echo "$CHANGED" | grep -q "^docker/docker-compose\|^docker/synapse/\|^docker/postgres/\|^docker/monitoring/"; then
        REBUILD="all"
    fi
fi

cd docker

if [ "$REBUILD" = "all" ]; then
    echo "-> Docker compose: полная пересборка..."
    docker compose -f docker-compose.production.yml up -d --build
elif [ -n "$REBUILD" ]; then
    echo "-> Docker compose: пересборка [$REBUILD ]..."
    docker compose -f docker-compose.production.yml build $REBUILD
    docker compose -f docker-compose.production.yml up -d
else
    echo "-> Нет изменений в сервисах, пропуск пересборки"
    docker compose -f docker-compose.production.yml up -d
fi

# Дождаться готовности Synapse
echo "-> Ожидание Synapse..."
for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8008/_matrix/client/versions > /dev/null 2>&1; then
        echo "  Synapse готов (попытка $i)"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "  WARN: Synapse не отвечает после 30 попыток"
        docker compose -f docker-compose.production.yml logs synapse --tail 20
        exit 1
    fi
    sleep 2
done

# Healthcheck
echo "-> Проверка сервисов..."
for svc in "Synapse|http://127.0.0.1:8008/_matrix/client/versions" \
           "Фронтенд|http://127.0.0.1:5174/" \
           "LiveKit Token|http://127.0.0.1:7890/health" \
           "Botservice|http://127.0.0.1:7891/health" \
           "Prometheus|http://127.0.0.1:9090/-/healthy" \
           "Grafana|http://127.0.0.1:3000/api/health"; do
    NAME="${svc%%|*}"
    URL="${svc##*|}"
    CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
    if [ "$CODE" = "200" ]; then
        echo "  ✓ $NAME"
    else
        echo "  ✗ $NAME (HTTP $CODE)"
    fi
done

# Очистка старых образов
echo "-> Очистка Docker..."
docker image prune -f

echo "=== Deploy завершён ==="
