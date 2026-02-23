#!/bin/bash
# Создание пользователя через Synapse Admin API
# Использование: ./scripts/create-user.sh <username> <password> [admin_token]

SYNAPSE_URL="http://localhost:8008"

USERNAME=$1
PASSWORD=$2
ADMIN_TOKEN=$3

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Использование: $0 <username> <password> [admin_token]"
  exit 1
fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Получаю токен админа..."
  ADMIN_TOKEN=$(curl -s -X POST "${SYNAPSE_URL}/_matrix/client/r0/login" \
    -H "Content-Type: application/json" \
    -d '{"type": "m.login.password", "user": "admin", "password": "admin_poc_pass"}' \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null \
    || curl -s -X POST "${SYNAPSE_URL}/_matrix/client/r0/login" \
    -H "Content-Type: application/json" \
    -d '{"type": "m.login.password", "user": "admin", "password": "admin_poc_pass"}' \
    | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
fi

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Не удалось получить токен админа"
  exit 1
fi

echo "Создаю пользователя @${USERNAME}:uplink.local ..."

curl -s -X PUT \
  "${SYNAPSE_URL}/_synapse/admin/v2/users/@${USERNAME}:uplink.local" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"${PASSWORD}\", \"admin\": false, \"deactivated\": false}"

echo ""
echo "Готово."
