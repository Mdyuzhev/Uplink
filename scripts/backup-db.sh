#!/bin/bash
# Ежедневный бэкап PostgreSQL + signing key.
# Хранит 7 последних бэкапов.
# Cron: 0 3 * * * /home/ubuntu/projects/uplink/scripts/backup-db.sh >> /home/ubuntu/backups/backup.log 2>&1

set -e

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/postgres}"
COMPOSE_FILE="${COMPOSE_FILE:-/home/ubuntu/projects/uplink/docker/docker-compose.production.yml}"
SYNAPSE_DATA="/home/ubuntu/projects/uplink/docker/synapse-data"
DAYS_TO_KEEP=7
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Начало бэкапа PostgreSQL..."

docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dumpall -U synapse --clean --if-exists \
    | gzip > "$BACKUP_DIR/uplink_${DATE}.sql.gz"

SIZE=$(du -h "$BACKUP_DIR/uplink_${DATE}.sql.gz" | cut -f1)
echo "[$(date)] Бэкап создан: uplink_${DATE}.sql.gz ($SIZE)"

# Удалить старые бэкапы
find "$BACKUP_DIR" -name "uplink_*.sql.gz" -mtime +${DAYS_TO_KEEP} -delete
echo "[$(date)] Очистка завершена (оставлено ${DAYS_TO_KEEP} дней)"

# Бэкап signing key
if [ -f "$SYNAPSE_DATA/uplink.wh-lab.ru.signing.key" ]; then
    cp "$SYNAPSE_DATA/uplink.wh-lab.ru.signing.key" "$BACKUP_DIR/signing.key.backup"
    echo "[$(date)] Signing key скопирован"
fi
