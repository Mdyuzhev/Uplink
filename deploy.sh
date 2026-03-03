#!/bin/bash
# Деплой Uplink — ТОЛЬКО для dev/homelab среды.
# Для production используйте: deploy-prod.sh (или git push → CI)
# Запуск: cd ~/projects/uplink && ./deploy.sh

set -e

# Защита от запуска на production
if [ -f "/home/ubuntu/projects/uplink/deploy-prod.sh" ]; then
    echo "ОШИБКА: Похоже на production-сервер. Используйте deploy-prod.sh"
    exit 1
fi

echo "=== Uplink Dev Deploy ==="

echo "1. Pulling latest code..."
git pull

echo "2. Building and restarting containers..."
cd docker
docker compose up --build -d

echo "3. Fixing media_store permissions..."
docker exec -u root uplink-synapse chown -R 991:991 /data/media_store 2>/dev/null || true

echo "4. Waiting for Synapse..."
sleep 10
for i in $(seq 1 12); do
    if curl -sf http://localhost:8008/health > /dev/null 2>&1; then
        echo "   Synapse OK"
        break
    fi
    echo "   Waiting... ($i/12)"
    sleep 5
done

echo "5. Checking services..."
curl -sf http://localhost:5174 > /dev/null && echo "   Web: OK" || echo "   Web: FAIL"
curl -sf http://localhost:5174/_matrix/client/versions > /dev/null && echo "   Proxy: OK" || echo "   Proxy: FAIL"
curl -sf http://localhost:8008/health > /dev/null && echo "   Synapse: OK" || echo "   Synapse: FAIL"

echo ""
IP=$(hostname -I | awk '{print $1}')
echo "=== Ready: http://${IP}:5174 ==="
