#!/bin/bash
# Создать голосовой канал в Uplink
# Использование: ./create-voice-channel.sh "Главный голосовой" "admin_token" [homeserver_url]

CHANNEL_NAME="$1"
TOKEN="$2"
HS="${3:-http://localhost:8008}"

if [ -z "$CHANNEL_NAME" ] || [ -z "$TOKEN" ]; then
  echo "Использование: $0 <название> <access_token> [homeserver_url]"
  exit 1
fi

# Создать комнату
ROOM_ID=$(curl -s -X POST "$HS/_matrix/client/v3/createRoom" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$CHANNEL_NAME\", \"preset\": \"public_chat\"}" \
  | jq -r '.room_id')

echo "Создана комната: $ROOM_ID"

# Пометить как голосовой канал
curl -s -X PUT "$HS/_matrix/client/v3/rooms/$ROOM_ID/state/uplink.room.type/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "voice"}'

echo "Помечена как голосовой канал"
