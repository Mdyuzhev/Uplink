#!/bin/bash
# Обновление Uplink на сервере
# Запуск: cd ~/projects/uplink && ./deploy.sh

set -e

echo "=== Uplink Deploy ==="

echo "1. Pulling latest code..."
git pull

echo "2. Building and restarting containers..."
cd docker
docker compose up --build -d

echo "3. Waiting for Synapse..."
sleep 10
for i in $(seq 1 12); do
    if curl -sf http://localhost:8008/health > /dev/null 2>&1; then
        echo "   Synapse OK"
        break
    fi
    echo "   Waiting... ($i/12)"
    sleep 5
done

echo "4. Checking services..."
curl -sf http://localhost:5174 > /dev/null && echo "   Web: OK" || echo "   Web: FAIL"
curl -sf http://localhost:5174/_matrix/client/versions > /dev/null && echo "   Proxy: OK" || echo "   Proxy: FAIL"
curl -sf http://localhost:8008/health > /dev/null && echo "   Synapse: OK" || echo "   Synapse: FAIL"

echo ""
IP=$(hostname -I | awk '{print $1}')
echo "=== Ready: http://${IP}:5174 ==="
