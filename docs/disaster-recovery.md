# Disaster Recovery — Uplink

## Бэкапы

Расположение на production сервере:
- PostgreSQL: `/home/ubuntu/backups/postgres/`
- Media store: `/home/ubuntu/backups/media/current/`
- Signing key: `/home/ubuntu/backups/postgres/signing.key.backup`

Cron (настраивается вручную после деплоя):
```
0 3 * * * /home/ubuntu/projects/uplink/scripts/backup-db.sh >> /home/ubuntu/backups/backup.log 2>&1
0 4 * * * /home/ubuntu/projects/uplink/scripts/backup-media.sh >> /home/ubuntu/backups/backup.log 2>&1
```

## Восстановление PostgreSQL

```bash
# 1. Остановить сервисы
cd /home/ubuntu/projects/uplink/docker
docker compose -f docker-compose.production.yml down

# 2. Удалить volume
docker volume rm uplink-postgres-data

# 3. Запустить postgres
docker compose -f docker-compose.production.yml up -d postgres

# 4. Дождаться healthcheck
docker compose -f docker-compose.production.yml ps

# 5. Восстановить из бэкапа
gunzip -c /home/ubuntu/backups/postgres/uplink_YYYYMMDD_HHMMSS.sql.gz \
    | docker compose -f docker-compose.production.yml exec -T postgres psql -U synapse

# 6. Запустить остальные сервисы
docker compose -f docker-compose.production.yml up -d
```

## Восстановление media_store

```bash
# 1. Получить mount point
MOUNT=$(docker volume inspect uplink-synapse-media --format '{{ .Mountpoint }}')

# 2. Восстановить файлы
sudo rsync -a /home/ubuntu/backups/media/current/ "$MOUNT/"

# 3. Восстановить права (Synapse запускается от uid 991)
sudo chown -R 991:991 "$MOUNT/"
```

## Восстановление signing key (КРИТИЧНО для федерации)

Signing key — cryptographic identity сервера в Matrix federation.
**Потеря ключа без бэкапа означает:**
- Все федеративные серверы перестанут доверять `uplink.wh-lab.ru`
- Нельзя восстановить identity — потребуется менять `server_name` (невозможно без полного пересоздания)

Бэкап: `/home/ubuntu/backups/postgres/signing.key.backup`
Оригинал: `docker/synapse-data/uplink.wh-lab.ru.signing.key`
Формат: `ed25519 a_XXXX <base64_key>`

```bash
cp /home/ubuntu/backups/postgres/signing.key.backup \
    /home/ubuntu/projects/uplink/docker/synapse-data/uplink.wh-lab.ru.signing.key

sudo chown 991:991 /home/ubuntu/projects/uplink/docker/synapse-data/uplink.wh-lab.ru.signing.key

# Перезапустить Synapse
docker compose -f docker-compose.production.yml restart synapse
```

**Дополнительный бэкап** (рекомендуется хранить отдельно от сервера):
```bash
scp ubuntu@93.77.189.225:~/projects/uplink/docker/synapse-data/uplink.wh-lab.ru.signing.key ./
# Сохранить в password manager / encrypted storage
```

## Восстановление botservice data (PostgreSQL)

Данные ботов (привязки, подписки) хранятся в схеме `bots.kv_store` базы данных `synapse`.
Восстанавливаются автоматически при восстановлении PostgreSQL.

Проверка:
```bash
docker compose -f docker-compose.production.yml exec postgres \
    psql -U synapse -c "SELECT key FROM bots.kv_store;"
```

## Проверка целостности бэкапа

```bash
# PostgreSQL
gunzip -c /home/ubuntu/backups/postgres/uplink_*.sql.gz | head -20

# Media
ls -la /home/ubuntu/backups/media/current/ | head -10
```
