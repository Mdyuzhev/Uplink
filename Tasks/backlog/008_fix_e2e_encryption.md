# 008: Исправление E2E шифрования в веб-приложении

## Цель

Включить E2E шифрование обратно и обеспечить его работу в браузерном клиенте. Сейчас шифрование отключено на сервере как workaround, потому что в веб-приложении не установлен крипто-модуль. Правильное решение: установить WASM-модуль шифрования, настроить Vite для работы с WASM, и вернуть шифрование на сервере.

## Контекст проблемы

Matrix SDK шифрует сообщения через WASM-модуль (Olm/Megolm или Rust crypto). В текущем коде `MatrixService.ts` вызовы `initRustCrypto()` и `initCrypto()` оба падают в catch, потому что ни один крипто-пакет не установлен как npm-зависимость. Без крипто-модуля клиент не может ни шифровать исходящие, ни расшифровывать входящие сообщения в encrypted-комнатах. Агент обошёл это отключением шифрования на сервере — это неприемлемо для корпоративного мессенджера.

Цепочка зависимостей:
```
matrix-js-sdk.initRustCrypto()
  → ищет @matrix-org/matrix-sdk-crypto-wasm
  → пакет содержит .wasm файл
  → Vite должен уметь сервить WASM + поддерживать top-level await
  → в браузере нужен IndexedDB для хранения крипто-ключей
```

## Зависимости

- Задача 007 (Веб-приложение) — **выполнена** ✅, приложение работает без шифрования
- Docker-инфраструктура — работает

## Предусловия

```bash
# Web app работает
cd E:\Uplink\web
npm run dev
# → открыть http://localhost:5173, залогиниться — чат работает без шифрования

# Synapse работает
curl -sf http://localhost:8008/health && echo "✅ Synapse OK"
```

---

## ЧАСТЬ 1: Установка крипто-модуля

### ШАГ 1.1. Установить @matrix-org/matrix-sdk-crypto-wasm

Это Rust-реализация E2E шифрования Matrix, скомпилированная в WebAssembly. Быстрее и стабильнее, чем старый Olm.

```bash
cd E:\Uplink\web
npm install @matrix-org/matrix-sdk-crypto-wasm
```

Проверить что пакет установился и содержит WASM:

```bash
# Должен существовать .wasm файл
dir node_modules\@matrix-org\matrix-sdk-crypto-wasm\pkg\*.wasm
```

Если `matrix-sdk-crypto-wasm` не устанавливается (бывает на Windows из-за native-зависимостей), использовать fallback — `@matrix-org/olm`:

```bash
npm install @matrix-org/olm
```

**ВАЖНО:** Сначала попробуй `matrix-sdk-crypto-wasm`. Переходи на `@matrix-org/olm` только если установка или инициализация не работает. Дальше в инструкции описаны оба варианта.

### ШАГ 1.2. Установить Vite-плагины для WASM

WASM-модули требуют top-level await и специальную обработку при бандлинге:

```bash
npm install -D vite-plugin-wasm vite-plugin-top-level-await
```

---

## ЧАСТЬ 2: Настройка Vite для WASM

### ШАГ 2.1. Обновить vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',  // нужен для top-level await
  },
  optimizeDeps: {
    // Исключить WASM-пакеты из pre-bundling (Vite не умеет оптимизировать WASM)
    exclude: [
      '@matrix-org/matrix-sdk-crypto-wasm',
    ],
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()],
  },
});
```

### ШАГ 2.2. Проверить что Vite стартует без ошибок

```bash
npm run dev
```

Открыть http://localhost:5173, открыть DevTools Console. Не должно быть ошибок связанных с WASM. Если есть ошибки типа "Cannot find module" или "Invalid WASM", переходи к варианту с Olm (ШАГ 2.3).

### ШАГ 2.3. Альтернатива: настройка для @matrix-org/olm

Если `matrix-sdk-crypto-wasm` не работает с Vite, используем Olm. Olm проще в настройке, потому что WASM-файл можно просто положить в `public/`:

```bash
# Скопировать olm.wasm в public/ для раздачи как статический файл
copy node_modules\@matrix-org\olm\olm.wasm public\olm.wasm
```

В `vite.config.ts` в этом случае плагины wasm/topLevelAwait не обязательны, но не помешают.

Добавить в `index.html` перед `<script type="module" src="/src/main.tsx">`:

```html
<script>
  // Olm нужен глобально до инициализации matrix-js-sdk
  window.global = window;
</script>
```

---

## ЧАСТЬ 3: Обновить MatrixService — крипто-инициализация

### ШАГ 3.1. Обновить initClient() в src/matrix/MatrixService.ts

Заменить текущий блок инициализации крипто на правильный:

```typescript
private async initClient(
    homeserver: string,
    userId: string,
    accessToken: string,
    deviceId: string
): Promise<void> {
    this.client = sdk.createClient({
        baseUrl: homeserver,
        accessToken: accessToken,
        userId: userId,
        deviceId: deviceId,
        // Для Olm: указать путь к WASM-файлу
        // cryptoCallbacks: ...,  // если используется Olm
    });

    await this.client.whoami();

    // === ИНИЦИАЛИЗАЦИЯ E2E ШИФРОВАНИЯ ===
    await this.initCrypto();

    // Подписки на события...
    this.client.on(sdk.ClientEvent.Sync, (state: string) => {
        // ... (без изменений)
    });

    this.client.on(sdk.RoomEvent.Timeline, (event: sdk.MatrixEvent, room: sdk.Room | undefined) => {
        // ... (без изменений)
    });

    this.client.on(sdk.RoomEvent.MyMembership, () => {
        this.emitRoomsUpdated();
    });

    await this.client.startClient({ initialSyncLimit: 20 });
}
```

### ШАГ 3.2. Создать отдельный метод initCrypto()

Вынести инициализацию шифрования в отдельный метод с подробным логированием:

```typescript
/**
 * Инициализация E2E шифрования.
 *
 * Стратегия:
 * 1. Попробовать Rust crypto (matrix-sdk-crypto-wasm) — быстрый, современный
 * 2. Если не доступен — попробовать Olm (legacy, но стабильный)
 * 3. Если оба не работают — бросить ошибку (НЕ продолжать без шифрования)
 *
 * ВАЖНО: В отличие от предыдущей версии, мы НЕ глотаем ошибку и НЕ продолжаем
 * без шифрования. Шифрование — обязательное требование.
 */
private async initCrypto(): Promise<void> {
    if (!this.client) return;

    // Попытка 1: Rust crypto
    try {
        await this.client.initRustCrypto();
        console.log('✅ Uplink E2E: Rust crypto (matrix-sdk-crypto-wasm)');
        this.configureCryptoTrust();
        return;
    } catch (err) {
        console.warn('⚠️ Rust crypto недоступен:', (err as Error).message);
    }

    // Попытка 2: Olm
    try {
        // Для Olm в браузере может потребоваться предварительная инициализация
        const Olm = await import('@matrix-org/olm');
        await Olm.init({ locateFile: () => '/olm.wasm' });
        // Установить глобальный Olm для matrix-js-sdk
        (window as any).Olm = Olm;

        await this.client.initCrypto();
        console.log('✅ Uplink E2E: Olm');
        this.configureCryptoTrust();
        return;
    } catch (err) {
        console.warn('⚠️ Olm недоступен:', (err as Error).message);
    }

    // Оба варианта не работают — это критическая ошибка
    const errorMsg = 'E2E шифрование не удалось инициализировать. ' +
        'Проверьте установку @matrix-org/matrix-sdk-crypto-wasm или @matrix-org/olm';
    console.error('❌ ' + errorMsg);
    throw new Error(errorMsg);
}

/**
 * Настройка доверия устройствам.
 * В PoC-режиме автоматически доверяем всем устройствам.
 * В продакшене заменить на cross-signing верификацию.
 */
private configureCryptoTrust(): void {
    if (!this.client) return;
    const crypto = this.client.getCrypto();
    if (crypto) {
        // Не блокировать сообщения от непроверенных устройств
        crypto.globalBlacklistUnverifiedDevices = false;
        console.log('ℹ️ PoC-режим: автодоверие устройствам включено');
    }
}
```

### ШАГ 3.3. Обработка ошибки крипто в UI

Сейчас если крипто не инициализировался, `initClient()` бросит ошибку и пользователь увидит экран логина с сообщением об ошибке. Это корректное поведение — лучше явная ошибка, чем молчаливая работа без шифрования.

Но сообщение ошибки должно быть понятным. В компоненте `LoginScreen.tsx` (или в `App.tsx`, где обрабатывается ошибка логина), проверить что текст ошибки отображается пользователю. Если ошибка содержит "шифрование" или "crypto", показать дополнительную подсказку:

```tsx
// В компоненте, отображающем error:
{error && (
    <div className="login-error">
        <p>{error}</p>
        {error.includes('шифрование') && (
            <p className="login-error__hint">
                Обратитесь к администратору: крипто-модуль не установлен на сервере.
            </p>
        )}
    </div>
)}
```

---

## ЧАСТЬ 4: Обработка IndexedDB для крипто-ключей

### ШАГ 4.1. Проверить хранение ключей

matrix-js-sdk с Rust crypto автоматически использует IndexedDB для хранения крипто-ключей в браузере. Никакой дополнительной настройки не нужно — SDK делает это сам.

Однако стоит добавить обработку ситуации, когда IndexedDB недоступен (приватный режим в некоторых браузерах):

В `initClient()`, перед инициализацией крипто, проверить доступность IndexedDB:

```typescript
// Проверка IndexedDB
try {
    const testDb = indexedDB.open('uplink_crypto_test');
    testDb.onerror = () => {
        console.warn('⚠️ IndexedDB недоступен (приватный режим?). E2E ключи не будут сохранены между сессиями.');
    };
} catch {
    console.warn('⚠️ IndexedDB недоступен');
}
```

### ШАГ 4.2. Добавить очистку крипто при logout

В методе `logout()` добавить очистку IndexedDB баз данных, созданных matrix-js-sdk:

```typescript
async logout(): Promise<void> {
    if (this.client) {
        try { await this.client.logout(true); } catch { /* ignore */ }
    }
    await this.disconnect();
    this.clearSession();

    // Очистить крипто-хранилище IndexedDB
    try {
        const databases = await indexedDB.databases();
        for (const db of databases) {
            if (db.name && (db.name.includes('matrix') || db.name.includes('crypto'))) {
                indexedDB.deleteDatabase(db.name);
                console.log(`🗑️ Удалена IndexedDB: ${db.name}`);
            }
        }
    } catch {
        // indexedDB.databases() может быть недоступен в старых браузерах
        console.warn('Не удалось очистить IndexedDB');
    }
}
```

---

## ЧАСТЬ 5: Вернуть шифрование на сервере

### ШАГ 5.1. Обновить homeserver.yaml

Файл: `E:\Uplink\docker\synapse\homeserver.yaml`

Найти строку:
```yaml
encryption_enabled_by_default_for_room_type: "off"
```

Заменить на:
```yaml
encryption_enabled_by_default_for_room_type: "all"
```

### ШАГ 5.2. Перезапустить Synapse

```bash
cd E:\Uplink\docker
docker compose restart synapse
```

Подождать 15 секунд, проверить:

```bash
curl -sf http://localhost:8008/health && echo "✅ Synapse OK"
```

### ШАГ 5.3. Пересоздать комнаты с шифрованием

Существующие комнаты были созданы без шифрования. Включение `encryption_enabled_by_default_for_room_type: "all"` влияет только на НОВЫЕ комнаты. Старые комнаты нужно пересоздать.

Для каждой комнаты (#general, #backend, #frontend):

1. Получить admin-токен:
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8008/_matrix/client/v3/login \
  -H "Content-Type: application/json" \
  -d '{"type":"m.login.password","user":"admin","password":"admin_poc_pass"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

2. Удалить старую комнату через Admin API (v2):
```bash
# Получить room_id
ROOM_ID=$(curl -s "http://localhost:8008/_matrix/client/v3/directory/room/%23general:uplink.local" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['room_id'])")

# Удалить alias
curl -s -X DELETE "http://localhost:8008/_matrix/client/v3/directory/room/%23general:uplink.local" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Удалить комнату (все покинут + purge)
curl -s -X DELETE "http://localhost:8008/_synapse/admin/v2/rooms/$ROOM_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge": true}'
```

3. Создать новую комнату с явным шифрованием:
```bash
curl -s -X POST http://localhost:8008/_matrix/client/v3/createRoom \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "room_alias_name": "general",
    "name": "General",
    "topic": "Общий канал команды",
    "visibility": "public",
    "preset": "public_chat",
    "initial_state": [
      {
        "type": "m.room.encryption",
        "state_key": "",
        "content": {"algorithm": "m.megolm.v1.aes-sha2"}
      }
    ]
  }'
```

4. Повторить для #backend и #frontend.

5. Пригласить пользователей обратно (как в задаче 006).

6. Проверить что шифрование включено:
```bash
NEW_ROOM_ID=$(curl -s "http://localhost:8008/_matrix/client/v3/directory/room/%23general:uplink.local" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['room_id'])")

curl -s "http://localhost:8008/_matrix/client/v3/rooms/$NEW_ROOM_ID/state/m.room.encryption" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Ожидаемо: {"algorithm":"m.megolm.v1.aes-sha2"}
```

### ШАГ 5.4. Отправить тестовые сообщения

Отправить несколько сообщений от разных пользователей (как в задаче 006) для проверки что зашифрованные сообщения доходят через веб-клиент.

---

## ЧАСТЬ 6: Тестирование

### ШАГ 6.1. Проверить что крипто инициализируется

```bash
cd E:\Uplink\web
npm run dev
```

1. Открыть http://localhost:5173
2. Открыть DevTools → Console
3. Залогиниться как @alice:uplink.local / test123
4. В консоли должно быть: `✅ Uplink E2E: Rust crypto (matrix-sdk-crypto-wasm)` или `✅ Uplink E2E: Olm`
5. НЕ должно быть: `❌ E2E шифрование не удалось инициализировать`

### ШАГ 6.2. Проверить отправку и получение зашифрованных сообщений

1. В первой вкладке: залогиниться как alice, открыть #general
2. Во второй вкладке: залогиниться как bob, открыть #general
3. Alice отправляет сообщение → Bob видит его в real-time (расшифрованным, а не как 🔒)
4. Bob отправляет ответ → Alice видит его расшифрованным

### ШАГ 6.3. Проверить что сообщения зашифрованы на сервере

```bash
# Через Admin API посмотреть последние события в комнате
# Они должны быть типа m.room.encrypted, а не m.room.message
curl -s "http://localhost:8008/_synapse/admin/v1/rooms/$NEW_ROOM_ID/messages?limit=5&dir=b" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for e in data.get('chunk', []):
    print(f\"{e['type']} | sender: {e['sender']} | content keys: {list(e.get('content',{}).keys())}\")"
```

Ожидаемо: `m.room.encrypted | sender: @alice:uplink.local | content keys: ['algorithm', 'ciphertext', 'device_id', 'sender_key', 'session_id']`

Если вместо `m.room.encrypted` видим `m.room.message` — шифрование не работает, нужно отладить.

### ШАГ 6.4. Проверить автовосстановление сессии с крипто

1. Залогиниться как alice в браузере
2. Отправить сообщение в #general
3. Перезагрузить страницу (F5)
4. Сессия должна восстановиться автоматически
5. Старые сообщения должны быть доступны (крипто-ключи сохранены в IndexedDB)
6. Новые сообщения от bob должны расшифровываться

---

## ЧАСТЬ 7: Fallback и отладка

### Если matrix-sdk-crypto-wasm не работает с Vite

Типичные ошибки и решения:

**"Cannot find module '@matrix-org/matrix-sdk-crypto-wasm'"**
→ Пакет не установлен. Запустить `npm install @matrix-org/matrix-sdk-crypto-wasm`

**"SharedArrayBuffer is not defined"**
→ Нужны COOP/COEP заголовки. Добавить в `vite.config.ts`:
```typescript
server: {
    headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
    },
}
```

**"WebAssembly.instantiate(): expected magic word"**
→ WASM-файл не найден или загружается как HTML (404). Проверить что `optimizeDeps.exclude` содержит пакет.

**"Top-level await is not available"**
→ `vite-plugin-top-level-await` не подключен или `build.target` не `esnext`.

**Всё совсем не работает с Rust crypto**
→ Переходить на Olm (ШАГ 2.3). Olm проще, его WASM-файл кладётся в public/ и загружается напрямую. Менее производительный, но для PoC более чем достаточен.

### Если Olm тоже не работает

Крайний fallback — собрать `@nicolo-ribaudo/olm` (community-форк с улучшенной поддержкой bundlers):

```bash
npm install @nicolo-ribaudo/olm
```

И в коде:
```typescript
import Olm from '@nicolo-ribaudo/olm';
await Olm.init();
(window as any).Olm = Olm;
await this.client.initCrypto();
```

---

## Критерии приёмки

- [ ] Крипто-пакет установлен (`@matrix-org/matrix-sdk-crypto-wasm` или `@matrix-org/olm`)
- [ ] Vite настроен для WASM (плагины, optimizeDeps, target)
- [ ] В Console при логине: `✅ Uplink E2E: Rust crypto` или `✅ Uplink E2E: Olm`
- [ ] homeserver.yaml: `encryption_enabled_by_default_for_room_type: "all"`
- [ ] Комнаты пересозданы с `m.room.encryption` state event
- [ ] Отправка сообщений: alice → bob, оба видят расшифрованный текст
- [ ] На сервере сообщения хранятся как `m.room.encrypted` (не plaintext)
- [ ] Перезагрузка страницы: сессия восстанавливается, крипто-ключи в IndexedDB
- [ ] Logout очищает IndexedDB крипто-хранилище
- [ ] `npm run dev` — без ошибок WASM/crypto в консоли
- [ ] `npm run build` — production build собирается

## Коммит

```
[web][fix] E2E шифрование: WASM крипто-модуль + Vite конфигурация

- Установлен @matrix-org/matrix-sdk-crypto-wasm (или @matrix-org/olm)
- Vite: vite-plugin-wasm + vite-plugin-top-level-await
- MatrixService: обязательная инициализация крипто (не fallback на plaintext)
- IndexedDB для хранения крипто-ключей
- homeserver.yaml: encryption_enabled_by_default_for_room_type: "all"
- Комнаты пересозданы с E2E шифрованием
```
