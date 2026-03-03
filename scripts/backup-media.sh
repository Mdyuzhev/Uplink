#!/bin/bash
# Инкрементальный бэкап media_store через rsync.
# Cron: 0 4 * * * /home/ubuntu/projects/uplink/scripts/backup-media.sh >> /home/ubuntu/backups/backup.log 2>&1

set -e

MEDIA_VOLUME="uplink-synapse-media"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/media}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Начало бэкапа media_store..."

MOUNT=$(docker volume inspect "$MEDIA_VOLUME" --format '{{ .Mountpoint }}')

if [ -z "$MOUNT" ]; then
    echo "ОШИБКА: volume $MEDIA_VOLUME не найден"
    exit 1
fi

sudo rsync -a --delete "$MOUNT/" "$BACKUP_DIR/current/"

SIZE=$(du -sh "$BACKUP_DIR/current/" | cut -f1)
echo "[$(date)] Media бэкап завершён ($SIZE)"
