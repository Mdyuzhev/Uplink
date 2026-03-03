# Федерация — Uplink

## Статус

Федерация включена в **whitelist-режиме**. Разрешены только серверы из списка `federation_domain_whitelist` в `homeserver.yaml`.

Для полной открытой федерации — удалить параметр `federation_domain_whitelist` целиком (не пустой список, а отсутствие параметра).

## Как работает

- Matrix Synapse обменивается сообщениями с другими Matrix-серверами по протоколу Matrix S2S (server-to-server)
- Пользователи видны федеративным серверам: `@user:uplink.wh-lab.ru`
- Комнаты создаются на нашем сервере: `!xxx:uplink.wh-lab.ru`
- Media-файлы доступны федеративным серверам через `/_matrix/media/`
- E2E ключи обмениваются между серверами через federation API

## Discovery (как нас находят другие серверы)

1. DNS: `uplink.wh-lab.ru` → IP сервера
2. `.well-known/matrix/server` → `{"m.server": "uplink.wh-lab.ru:443"}`
3. TLS: Let's Encrypt, порт 443
4. S2S API: `/_matrix/federation/` через nginx → Synapse:8008

Проверка:
```bash
curl -sf https://uplink.wh-lab.ru/.well-known/matrix/server
# {"m.server": "uplink.wh-lab.ru:443"}

curl -sf "https://federationtester.matrix.org/api/report?server_name=uplink.wh-lab.ru" | python3 -m json.tool
```

## Ограничения ботов в федеративных комнатах

- Боты видят сообщения от федеративных пользователей
- Slash-команды работают от любого пользователя (отправитель не важен)
- Бот **не может** управлять remote-пользователями (kick/ban)
- Slash-автокомплит на клиенте показывает только локальных ботов (ожидаемо)
- E2E-зашифрованные комнаты: боты **не читают** зашифрованные сообщения (AS не получает ключи — by design)

## Whitelist серверов

В `docker/synapse/homeserver.yaml`:
```yaml
federation_domain_whitelist:
  - matrix.org
  - mozilla.org
```

Для добавления нового сервера — добавить в список и обновить конфиг на production:
```bash
# На prod сервере (после git pull):
docker compose -f docker-compose.production.yml restart synapse
```

## Защита от злоупотреблений

- **Whitelist**: контролирует, с какими серверами разрешена федерация
- **Rate limiting**: Synapse `rc_joins.remote` + `rc_invites` (настроено в homeserver.yaml)
- `allow_public_rooms_over_federation: false` — публичные комнаты не раскрываются
- `allow_device_name_lookup_over_federation: false` — имена устройств приватны

Для продвинутой модерации при масштабировании: Mjolnir/Draupnir (сейчас не нужен).

## Диагностика

```bash
# Federation tester
curl -sf "https://federationtester.matrix.org/api/report?server_name=uplink.wh-lab.ru" | python3 -m json.tool

# Логи федерации
docker logs uplink-synapse 2>&1 | grep -i "federation\|error" | tail -20

# .well-known проверка
curl -sf https://uplink.wh-lab.ru/.well-known/matrix/server
curl -sf https://uplink.wh-lab.ru/.well-known/matrix/client
```
