#!/bin/bash
set -e

DEPLOY_START=$(date +%s)
DEPLOY_SUCCESS=false

echo "=== Uplink Production Deploy ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"

cd ~/projects/uplink

# Защита: synapse-data должна существовать
if [ ! -f "docker/synapse-data/homeserver.yaml" ]; then
    echo "ОШИБКА: docker/synapse-data/homeserver.yaml не найден."
    echo "Если это первый запуск — используйте scripts/clean-start.sh"
    exit 1
fi

# Отправить CI-уведомление через botservice
# (ждёт до 30 сек пока botservice станет доступен)
send_ci_notification() {
    local status=$1
    local elapsed=$(( $(date +%s) - DEPLOY_START ))
    local commit_hash commit_msg commit_author
    commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "")
    commit_msg=$(git log -1 --pretty=format:'%s' 2>/dev/null | sed 's/\\/\\\\/g; s/"/\\"/g' || echo "")
    commit_author=$(git log -1 --pretty=format:'%an' 2>/dev/null | sed 's/\\/\\\\/g; s/"/\\"/g' || echo "")

    local i
    for i in $(seq 1 15); do
        if curl -sf http://127.0.0.1:7891/health > /dev/null 2>&1; then break; fi
        sleep 2
    done

    local payload="{\"status\":\"$status\",\"elapsed\":$elapsed,\"commit\":{\"hash\":\"$commit_hash\",\"message\":\"$commit_msg\",\"author\":\"$commit_author\"}}"
    curl -sf -X POST "http://localhost:7891/hooks/ci" \
        -H "Content-Type: application/json" \
        -H "x-deploy-event: deploy" \
        -d "$payload" || true
}

# Отправляем failure если скрипт завершился не через DEPLOY_SUCCESS=true
on_exit() {
    if [ "$DEPLOY_SUCCESS" != "true" ]; then
        send_ci_notification "failure"
    fi
}
trap on_exit EXIT

# Запомнить текущий коммит для определения изменений
OLD_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "none")

if [ "${SKIP_GIT_PULL:-0}" = "1" ]; then
    echo "-> Git уже обновлён (SKIP_GIT_PULL=1)"
else
    echo "-> Git fetch & reset..."
    git fetch origin main
    git reset --hard origin/main
fi

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

# Room ID комнаты #ci для CI-уведомлений
# Используется botservice (CI_NOTIFY_ROOM_ID env) если не задан в .env
export CI_NOTIFY_ROOM_ID="${CI_NOTIFY_ROOM_ID:-!tFXRLxMHLSzVoiPXek:uplink.wh-lab.ru}"

cd docker

if [ "$REBUILD" = "all" ]; then
    echo "-> Docker compose: полная пересборка..."
    # build отдельно от up — Docker не перезапускает контейнеры с неизменённым образом
    docker compose -f docker-compose.production.yml build
    docker compose -f docker-compose.production.yml up -d
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

# Bootstrap SYNAPSE_ADMIN_TOKEN — нужен для force-join ботов в закрытые комнаты.
# Обновляем при каждом деплое — токен может устаревать.
echo "-> Обновление SYNAPSE_ADMIN_TOKEN..."
ADMIN_ACCESS_TOKEN=$(curl -sf -X POST "http://127.0.0.1:8008/_matrix/client/v3/login" \
    -H "Content-Type: application/json" \
    -d '{"type":"m.login.password","identifier":{"type":"m.id.user","user":"admin"},"password":"UplinkAdmin2026!","device_id":"botservice_admin"}' \
    2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('access_token',''))" 2>/dev/null || echo "")
if [ -n "$ADMIN_ACCESS_TOKEN" ]; then
    sed -i '/^SYNAPSE_ADMIN_TOKEN=/d' .env
    echo "SYNAPSE_ADMIN_TOKEN=$ADMIN_ACCESS_TOKEN" >> .env
    export SYNAPSE_ADMIN_TOKEN="$ADMIN_ACCESS_TOKEN"
    # Перезапустить botservice с обновлённым токеном
    docker compose -f docker-compose.production.yml up -d --no-deps uplink-botservice
    echo "  ✓ SYNAPSE_ADMIN_TOKEN обновлён"
    sleep 3
else
    echo "  ✗ Не удалось получить admin token — join закрытых комнат может не работать"
fi

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

DEPLOY_SUCCESS=true
send_ci_notification "success"

echo "=== Deploy завершён ==="
