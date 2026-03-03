#!/bin/bash
# Создание тестовых пользователей Uplink
# Использование: ./scripts/create-users.sh

SYNAPSE_URL="http://localhost:8008"
ADMIN_USER="admin"
ADMIN_PASS="admin_poc_pass"

# Получить admin токен
ADMIN_TOKEN=$(curl -s -X POST "$SYNAPSE_URL/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"m.login.password\",\"user\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" \
  | node -e "process.stdin.on('data',d=>{try{console.log(JSON.parse(d).access_token)}catch{}})")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Не удалось получить admin токен. Проверь что Synapse запущен."
  exit 1
fi

echo "Admin токен получен"

create_user() {
  local username=$1
  local displayname=$2
  local password=${3:-test123}

  curl -s -X PUT \
    "$SYNAPSE_URL/_synapse/admin/v2/users/@${username}:uplink.local" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "{\"password\":\"$password\",\"admin\":false,\"deactivated\":false,\"displayname\":\"$displayname\"}" \
    > /dev/null

  echo "  @${username}:uplink.local ($displayname)"
}

echo ""
echo "Создание пользователей..."
create_user "alice" "Alice Иванова"
create_user "bob" "Bob Петров"
create_user "charlie" "Charlie Сидоров"
create_user "diana" "Diana Козлова"
create_user "eve" "Eve Смирнова"

echo ""
echo "Готово! Все пользователи созданы с паролем: test123"
echo ""
echo "Для входа в Uplink:"
echo "  User ID:  @alice:uplink.local  (или bob, charlie, diana, eve)"
echo "  Password: test123"
echo "  Server:   http://localhost:8008"
