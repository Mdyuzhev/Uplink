#!/bin/bash
# Удалённый деплой Uplink с машины разработчика (или из среды агента).
#
# Решает две проблемы:
# 1. sshpass может быть не установлен → пробуем установить
# 2. HOME может содержать кириллицу → SSH не создаёт .ssh → подменяем HOME
#
# Использование:
#   bash scripts/deploy-remote.sh              — только деплой на сервере (через SSH)
#   bash scripts/deploy-remote.sh --push       — git push + деплой (через SSH)
#   bash scripts/deploy-remote.sh --webhook    — деплой через GitHub webhook (без SSH)

set -e

SERVER="flomaster@flomasterserver"
PASSWORD="Misha2021@1@"
REMOTE_PATH="~/projects/uplink"
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10"

# ── Установить sshpass если нет ──
if ! command -v sshpass &>/dev/null; then
    echo "sshpass не найден, устанавливаю..."
    if command -v apt-get &>/dev/null; then
        apt-get update -qq && apt-get install -y -qq sshpass 2>/dev/null
    elif command -v apk &>/dev/null; then
        apk add --no-cache sshpass 2>/dev/null
    elif command -v yum &>/dev/null; then
        yum install -y sshpass 2>/dev/null
    fi

    if ! command -v sshpass &>/dev/null; then
        echo "ОШИБКА: не удалось установить sshpass."
        echo "Запусти деплой вручную: ssh $SERVER \"cd $REMOTE_PATH && ./deploy.sh\""
        exit 1
    fi
fi

# ── Деплой через webhook (если --webhook) ──
if [[ "$1" == "--webhook" ]]; then
    WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:5174/api/deploy-webhook/webhook}"
    echo "=== Deploy через webhook ==="
    curl -s -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"ref":"refs/heads/main"}' 2>&1
    echo ""
    echo "Деплой запущен. Проверь логи: docker logs uplink-deploy-webhook"
    exit 0
fi

# ── Git push (если --push) ──
if [[ "$1" == "--push" ]]; then
    echo "=== Git push ==="
    git push origin main 2>&1 || echo "Push не удался (возможно нет изменений)"
    echo ""
fi

# ── Деплой на сервере ──
# HOME=/tmp — обход бага, когда путь HOME содержит кириллицу
# и SSH не может создать ~/.ssh
echo "=== Deploy на $SERVER ==="
HOME=/tmp sshpass -p "$PASSWORD" ssh $SSH_OPTS "$SERVER" \
    "cd $REMOTE_PATH && ./deploy.sh" 2>&1

echo ""
echo "=== Деплой завершён ==="
