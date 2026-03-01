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

# Забрать последние изменения
echo "-> Git pull..."
git pull origin main

# Пересобрать и перезапустить
echo "-> Docker compose build & up..."
cd docker
docker compose -f docker-compose.production.yml up -d --build

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
           "Botservice|http://127.0.0.1:7891/health"; do
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
