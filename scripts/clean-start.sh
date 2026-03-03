#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════
# Uplink — чистый старт инфраструктуры
# ВНИМАНИЕ: удаляет ВСЕ данные (БД, медиа, ключи)!
# Запускать только на новом/пустом инстансе.
# ═══════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_DIR/docker"
SYNAPSE_DATA="$DOCKER_DIR/synapse-data"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.production.yml"

echo "=== Uplink — чистый старт ==="
echo "Дата: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Проект: $PROJECT_DIR"
echo ""

# Загрузить переменные
if [ ! -f "$DOCKER_DIR/.env" ]; then
    echo "ОШИБКА: $DOCKER_DIR/.env не найден"
    exit 1
fi
source "$DOCKER_DIR/.env"

SERVER_NAME="${SYNAPSE_SERVER_NAME:-uplink.wh-lab.ru}"
echo "server_name: $SERVER_NAME"
echo ""

# ── Подтверждение ──
read -p "ВНИМАНИЕ: будут удалены ВСЕ данные (БД, медиа, ключи). Продолжить? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Отменено."
    exit 0
fi

# ── 1. Остановить и очистить ──
echo ""
echo "-> Остановка контейнеров..."
cd "$DOCKER_DIR"
docker compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true

echo "-> Очистка synapse-data..."
sudo rm -rf "$SYNAPSE_DATA"
mkdir -p "$SYNAPSE_DATA"

# ── 2. Скопировать конфиги Synapse ──
echo "-> Копирование конфигов..."
cp "$DOCKER_DIR/synapse/homeserver.yaml" "$SYNAPSE_DATA/homeserver.yaml"
cp "$DOCKER_DIR/synapse/appservice-bots.yaml" "$SYNAPSE_DATA/appservice-bots.yaml"

# ── 3. Сгенерировать signing key ──
echo "-> Генерация signing key..."
docker run --rm \
    -v "$SYNAPSE_DATA:/data" \
    -e SYNAPSE_SERVER_NAME="$SERVER_NAME" \
    matrixdotorg/synapse:latest \
    generate

# Synapse generate создаёт свой homeserver.yaml — перезаписать нашим
cp "$DOCKER_DIR/synapse/homeserver.yaml" "$SYNAPSE_DATA/homeserver.yaml"
cp "$DOCKER_DIR/synapse/appservice-bots.yaml" "$SYNAPSE_DATA/appservice-bots.yaml"

# ── 4. Создать log config ──
cat > "$SYNAPSE_DATA/$SERVER_NAME.log.config" << 'EOF'
version: 1
formatters:
  precise:
    format: '%(asctime)s - %(name)s - %(lineno)d - %(levelname)s - %(request)s - %(message)s'
handlers:
  console:
    class: logging.StreamHandler
    formatter: precise
root:
  level: INFO
  handlers: [console]
disable_existing_loggers: false
EOF

# ── 5. Права доступа ──
echo "-> Установка прав (uid 991 для Synapse)..."
sudo chown -R 991:991 "$SYNAPSE_DATA"

# ── 6. Запуск стека ──
echo "-> Запуск docker compose..."
docker compose -f "$COMPOSE_FILE" up -d --build

# ── 7. Ожидание Synapse ──
echo "-> Ожидание готовности Synapse..."
for i in $(seq 1 60); do
    if curl -sf http://127.0.0.1:8008/_matrix/client/versions > /dev/null 2>&1; then
        echo "  Synapse готов (попытка $i)"
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo "  ОШИБКА: Synapse не поднялся за 120 секунд"
        docker compose -f "$COMPOSE_FILE" logs synapse --tail 30
        exit 1
    fi
    sleep 2
done

# ── 8. Создание admin-пользователя ──
echo ""
echo "-> Создание admin-пользователя..."
ADMIN_USER="admin"
ADMIN_PASS="UplinkAdmin2026!"

docker exec uplink-synapse register_new_matrix_user \
    -u "$ADMIN_USER" \
    -p "$ADMIN_PASS" \
    -a \
    -c /data/homeserver.yaml \
    http://localhost:8008 2>/dev/null && echo "  Создан: @${ADMIN_USER}:${SERVER_NAME}" || echo "  (пользователь уже существует)"

# ── 9. Создание тестовых пользователей ──
echo "-> Создание тестовых пользователей..."
for USER in alice bob charlie; do
    docker exec uplink-synapse register_new_matrix_user \
        -u "$USER" \
        -p "password123" \
        -c /data/homeserver.yaml \
        http://localhost:8008 2>/dev/null && echo "  Создан: @${USER}:${SERVER_NAME}" || echo "  @${USER} уже существует"
done

# ── 10. Healthcheck всех сервисов ──
echo ""
echo "-> Healthcheck..."

check_service() {
    local name="$1"
    local url="$2"
    local code
    code=$(curl -sf -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
        echo "  ✓ $name"
    else
        echo "  ✗ $name (HTTP $code)"
    fi
}

check_service "Synapse" "http://127.0.0.1:8008/_matrix/client/versions"
check_service "Фронтенд" "http://127.0.0.1:5174/"
check_service "LiveKit Token" "http://127.0.0.1:7890/health"
check_service "Botservice" "http://127.0.0.1:7891/health"
check_service "Well-known (server)" "http://127.0.0.1:5174/.well-known/matrix/server"
check_service "Well-known (client)" "http://127.0.0.1:5174/.well-known/matrix/client"

# ── 11. Federation check ──
echo ""
echo "-> Проверка well-known..."
WK_SERVER=$(curl -sf http://127.0.0.1:5174/.well-known/matrix/server 2>/dev/null)
WK_CLIENT=$(curl -sf http://127.0.0.1:5174/.well-known/matrix/client 2>/dev/null)
echo "  matrix/server: $WK_SERVER"
echo "  matrix/client: $WK_CLIENT"

echo ""
echo "=== Чистый старт завершён ==="
echo ""
echo "server_name: $SERVER_NAME"
echo "Admin: @${ADMIN_USER}:${SERVER_NAME} / $ADMIN_PASS"
echo "Тестовые: @alice, @bob, @charlie / password123"
echo ""
echo "Следующие шаги:"
echo "  1. Настроить TLS: sudo certbot --nginx -d $SERVER_NAME"
echo "  2. Проверить HTTPS: https://$SERVER_NAME"
echo "  3. Проверить федерацию: https://federationtester.matrix.org/#$SERVER_NAME"
echo "  4. Сохранить signing key: $SYNAPSE_DATA/$SERVER_NAME.signing.key"
