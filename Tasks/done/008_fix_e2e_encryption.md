# 008: Включить E2E шифрование

## Статус: КОД ГОТОВ, НУЖЕН ДЕПЛОЙ

Код изменён локально. Агенту осталось: закоммитить, запушить, задеплоить на сервер, проверить.

---

## Что уже сделано (код)

**MatrixService.ts — initCrypto():**
Удалена ложная проверка `SharedArrayBuffer` которая блокировала E2E на мобильных браузерах и при доступе через Cloudflare Tunnel. Удалён таймаут 10с с `Promise.race`. Теперь чистый `await this.client.initRustCrypto()` без костылей. `matrix-sdk-crypto-wasm` v17 не требует SharedArrayBuffer.

**MatrixService.ts — getOrCreateDM():**
Новые DM создаются с `m.room.encryption` state event (`m.megolm.v1.aes-sha2`). Гарантирует шифрование каждого нового DM.

**homeserver.yaml:**
`encryption_enabled_by_default_for_room_type: "all"` (было `"off"`).

**nginx.conf:**
Удалены мёртвые комментарии COOP/COEP (7 строк).

---

## Что осталось сделать

### ШАГ 1. Коммит и пуш

```powershell
cd E:\Uplink
git add -A
git commit -m "[e2e] Включить шифрование: Rust WASM crypto без SharedArrayBuffer

- initCrypto: удалена ложная проверка SharedArrayBuffer (v17 не требует)
- initCrypto: удалён таймаут 10с, ошибка логируется как error
- homeserver.yaml: encryption по умолчанию для всех новых комнат
- getOrCreateDM: новые DM с m.room.encryption
- nginx: удалены мёртвые COOP/COEP комментарии"
git push
```

### ШАГ 2. Деплой на сервер

```bash
ssh flomaster@flomasterserver
# пароль: Misha2021@1@

cd ~/projects/uplink
./deploy.sh
```

`deploy.sh` делает `git pull`, `docker compose build`, `docker compose up -d`. Но поскольку изменился `homeserver.yaml`, нужно **дополнительно рестартнуть Synapse** чтобы он перечитал конфиг:

```bash
cd ~/projects/uplink/docker
docker compose restart synapse
```

Подождать 10 секунд, проверить здоровье:

```bash
curl -sf http://localhost:8008/health && echo "OK"
```

### ШАГ 3. Проверка — крипто инициализируется

Открыть http://192.168.1.74:5174 (Ctrl+Shift+R для хард-рефреша).
DevTools → Console. Залогиниться как любой пользователь.

**Ожидаемый результат в консоли:**
```
✅ Uplink E2E: Rust crypto (matrix-sdk-crypto-wasm)
PoC-режим: автодоверие устройствам включено
```

**НЕ должно быть:**
```
SharedArrayBuffer недоступен
E2E шифрование недоступно
```

Если вместо ✅ видим ❌ — смотреть полное сообщение ошибки. Частые причины:
- `WebAssembly.instantiate(): expected magic word` → WASM не загрузился, проверить `optimizeDeps.exclude` в vite.config.ts
- `Failed to execute 'open' on 'IDBFactory'` → приватный режим браузера, IndexedDB недоступен

### ШАГ 4. Проверка — шифрованные сообщения работают

1. Вкладка 1: залогиниться как alice (`test123`), через «Пользователи» создать **новый** DM с bob
2. Вкладка 2: залогиниться как bob, открыть этот DM
3. Alice отправляет сообщение → Bob видит расшифрованный текст
4. Bob отправляет ответ → Alice видит расшифрованный текст

**Важно:** тестировать на **новом** DM (старые DM были созданы без шифрования и останутся нешифрованными).

Если вместо текста видно «Не удалось расшифровать» или замок 🔒 — крипто не инициализирован у одного из пользователей. Проверить Console обоих вкладок.

### ШАГ 5. Проверка — старые комнаты работают

Открыть #general (нешифрованная комната). Отправить сообщение. Должно работать как раньше — старые комнаты не затронуты.

### ШАГ 6. (Опционально) Включить шифрование в существующих комнатах

Если нужно зашифровать #general, #backend, #frontend — отправить state event от админа. Это **необратимо**.

```bash
# На сервере flomasterserver
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"admin","password":"admin_poc_pass"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Для каждой комнаты (#general, #backend, #frontend):
for ALIAS in general backend frontend; do
  ROOM_ID=$(curl -s "http://localhost:8008/_matrix/client/v3/directory/room/%23${ALIAS}:uplink.local" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['room_id'])")

  curl -s -X PUT "http://localhost:8008/_matrix/client/v3/rooms/$ROOM_ID/state/m.room.encryption/" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"algorithm": "m.megolm.v1.aes-sha2"}'

  echo "Шифрование включено для #${ALIAS}: $ROOM_ID"
done
```

После этого старые сообщения останутся в plaintext, новые будут шифроваться. Пользователям нужно будет перелогиниться (или перезагрузить страницу) чтобы крипто-сессии обновились.

**Агент должен спросить пользователя** перед выполнением этого шага — хочет ли он шифровать существующие каналы.

### ШАГ 7. Проверка через Cloudflare Tunnel (мобильный)

Если настроен Cloudflare Tunnel — открыть URL с телефона. Залогиниться, создать DM, отправить сообщение. E2E должен работать без COOP/COEP заголовков (matrix-sdk-crypto-wasm v17 их не требует).

---

## Диагностика

**«Не удалось расшифровать» в ленте:**
Крипто-ключи от старых сессий не восстанавливаются автоматически. Это нормально для старых сообщений. Новые будут расшифрованы.

**Сообщения уходят как plaintext в шифрованной комнате:**
Крипто не инициализирован. Проверить Console — должно быть `✅ Uplink E2E:`.

**initRustCrypto() падает с ошибкой:**
Посмотреть полный текст ошибки. Если `Can't find variable: ReadableStream` — Safari слишком старый (нужен 16.4+).

---

## Критерии приёмки

- [ ] Код закоммичен и запушен в git
- [ ] Задеплоено на сервер (`./deploy.sh` + `docker compose restart synapse`)
- [ ] Console при логине: `✅ Uplink E2E: Rust crypto (matrix-sdk-crypto-wasm)`
- [ ] Новый DM между двумя пользователями: сообщения расшифрованы с обеих сторон
- [ ] Существующие нешифрованные комнаты (#general) работают как раньше
- [ ] `curl -sf http://192.168.1.74:8008/health` → OK
