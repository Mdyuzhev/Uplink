# 033 — Управление шифрованием при создании комнат + фикс ботов

## Контекст

Сейчас E2E шифрование включено принудительно везде:
- `homeserver.yaml` → `encryption_enabled_by_default_for_room_type: "all"`
- `RoomService.createRoomInSpace()` — хардкод `m.room.encryption` в initial_state
- `RoomService.getOrCreateDM()` — хардкод `m.room.encryption` в initial_state
- `RoomService.createSpace()` — шифрования нет (Spaces — метакомнаты)

Из-за этого AS-боты (Application Service) не работают: Synapse шлёт им `m.room.encrypted` вместо `m.room.message`, а боты не участвуют в обмене ключами Megolm. `/remind`, `/help`, любая команда — ничего не происходит.

**Решение:** убрать принудительное шифрование, дать пользователю выбор через тогл при создании любой комнаты. По умолчанию — **выключено**. При включении — предупреждение о ботах. Для DM — настройка в профиле + возможность включить шифрование в существующей комнате через кнопку в RoomHeader.

**Дополнительно:** баг парсинга аргументов в routeCommand — односложные команды (`/remind`, `/poll`, `/help`) разбираются неправильно.


## Шаг 1. homeserver.yaml — убрать принудительное шифрование

Файл: `docker/synapse/homeserver.yaml`

Убрать или закомментировать:
```yaml
# БЫЛО:
encryption_enabled_by_default_for_room_type: "all"

# СТАЛО:
# encryption_enabled_by_default_for_room_type: "all"  # управляется на уровне клиента
```

Теперь Synapse не будет автоматически добавлять `m.room.encryption` в новые комнаты. Контроль полностью на стороне фронтенда.

**Важно:** существующие зашифрованные комнаты останутся зашифрованными. Шифрование в Matrix **необратимо** — нельзя отключить после включения.


## Шаг 2. RoomService — параметр encrypted + метод enableEncryption

Файл: `web/src/matrix/RoomService.ts`

### 2.1. createRoomInSpace — добавить параметр encrypted

```typescript
/**
 * Создать комнату внутри канала (Space).
 * @param encrypted — включить E2E шифрование (по умолчанию false)
 */
async createRoomInSpace(spaceId: string, name: string, topic?: string, encrypted: boolean = false): Promise<string> {
    const client = this.getClient();

    const initial_state: any[] = [
        {
            type: 'm.room.join_rules',
            state_key: '',
            content: { join_rule: 'public' },
        },
        {
            type: 'm.space.parent',
            state_key: spaceId,
            content: { via: [this.getServerDomain()], canonical: true },
        },
    ];

    // Шифрование — только если явно запрошено
    if (encrypted) {
        initial_state.push({
            type: 'm.room.encryption',
            state_key: '',
            content: { algorithm: 'm.megolm.v1.aes-sha2' },
        });
    }

    const response = await client.createRoom({
        name,
        topic,
        visibility: sdk.Visibility.Private,
        preset: sdk.Preset.PublicChat,
        initial_state,
    } as Parameters<sdk.MatrixClient['createRoom']>[0]);

    // ... остальное без изменений (m.space.child, invite, emit)
}
```

### 2.2. createSpace — добавить параметр encrypted

```typescript
async createSpace(name: string, topic?: string, encrypted: boolean = false): Promise<string> {
    const client = this.getClient();

    const initial_state: any[] = [
        {
            type: 'm.room.join_rules',
            state_key: '',
            content: { join_rule: 'public' },
        },
    ];

    if (encrypted) {
        initial_state.push({
            type: 'm.room.encryption',
            state_key: '',
            content: { algorithm: 'm.megolm.v1.aes-sha2' },
        });
    }

    const response = await client.createRoom({
        name,
        topic,
        visibility: sdk.Visibility.Private,
        preset: sdk.Preset.PublicChat,
        creation_content: { type: 'm.space' },
        initial_state,
        power_level_content_override: {
            events: { 'm.space.child': 100 },
        },
    } as Parameters<sdk.MatrixClient['createRoom']>[0]);

    // ... остальное без изменений
}
```

### 2.3. getOrCreateDM — добавить параметр encrypted

```typescript
async getOrCreateDM(userId: string, encrypted: boolean = false): Promise<string> {
    const client = this.getClient();

    const existingRoomId = this.findExistingDM(userId);
    if (existingRoomId) return existingRoomId;

    const invitedRoom = this.findInviteFrom(userId);
    if (invitedRoom) {
        await client.joinRoom(invitedRoom.roomId);
        await this.updateDirectMap(userId, invitedRoom.roomId);
        this.emitRoomsUpdated();
        return invitedRoom.roomId;
    }

    const initial_state: any[] = [];
    if (encrypted) {
        initial_state.push({
            type: 'm.room.encryption',
            state_key: '',
            content: { algorithm: 'm.megolm.v1.aes-sha2' },
        });
    }

    const response = await client.createRoom({
        is_direct: true,
        invite: [userId],
        preset: sdk.Preset.PrivateChat,
        initial_state,
    });

    const newRoomId = response.room_id;
    await this.updateDirectMap(userId, newRoomId);
    return newRoomId;
}
```

### 2.4. enableEncryption — включить шифрование в существующей комнате

```typescript
/**
 * Включить E2E шифрование в существующей комнате.
 * НЕОБРАТИМАЯ операция — после включения отключить нельзя.
 * Работает для любых комнат: каналов, DM, spaces.
 */
async enableEncryption(roomId: string): Promise<void> {
    const client = this.getClient();
    await client.sendStateEvent(roomId, 'm.room.encryption' as any, {
        algorithm: 'm.megolm.v1.aes-sha2',
    }, '');
}

/**
 * Проверить, зашифрована ли комната.
 */
isRoomEncrypted(roomId: string): boolean {
    const client = this.getClient();
    const room = client.getRoom(roomId);
    if (!room) return false;
    return !!room.currentState.getStateEvents('m.room.encryption', '');
}
```


## Шаг 3. CreateRoomModal — тогл шифрования

Файл: `web/src/components/CreateRoomModal.tsx`

Добавить state и тогл:

```typescript
const [encrypted, setEncrypted] = useState(false);
```

В JSX между полем "Описание" и кнопкой "Создать":

```tsx
<div className="profile-modal__section">
    <label className="create-modal__toggle-row">
        <span className="create-modal__toggle-label">
            Сквозное шифрование (E2E)
        </span>
        <div className={`create-modal__toggle ${encrypted ? 'create-modal__toggle--on' : ''}`}
             onClick={() => setEncrypted(!encrypted)}>
            <div className="create-modal__toggle-knob" />
        </div>
    </label>
    {encrypted && (
        <div className="create-modal__toggle-warning">
            ⚠ В зашифрованных комнатах встроенные боты не работают. 
            Шифрование нельзя отключить после создания комнаты.
        </div>
    )}
    {!encrypted && (
        <div className="create-modal__toggle-hint">
            Сообщения не шифруются. Боты и интеграции работают.
        </div>
    )}
</div>
```

Передать в сервис:
```typescript
const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
        await matrixService.rooms.createRoomInSpace(spaceId, name.trim(), topic.trim() || undefined, encrypted);
        onCreated();
        onClose();
    } catch (err) {
        setError((err as Error).message);
    } finally {
        setLoading(false);
    }
};
```


## Шаг 4. CreateSpaceModal — тогл шифрования

Файл: `web/src/components/CreateSpaceModal.tsx`

Аналогично CreateRoomModal:

```typescript
const [encrypted, setEncrypted] = useState(false);
```

Тот же блок с тоглом и предупреждением. Передать:
```typescript
await matrixService.rooms.createSpace(name.trim(), topic.trim() || undefined, encrypted);
```


## Шаг 5. Шифрование в личных сообщениях (DM)

DM создаётся мгновенно при клике на пользователя — показывать модалку нельзя, это убьёт UX. Вместо этого два механизма:

### 5a. Настройка в профиле — «Шифровать новые личные чаты»

Файл: `web/src/components/ProfileModal.tsx`

Добавить секцию «Безопасность» с тоглом:

```typescript
const [dmEncrypted, setDmEncrypted] = useState(
    () => localStorage.getItem('uplink_dm_encrypted') === 'true'
);
```

```tsx
<div className="profile-modal__section">
    <label className="profile-modal__label">Безопасность</label>
    <label className="create-modal__toggle-row">
        <span className="create-modal__toggle-label">
            Шифровать новые личные чаты
        </span>
        <div
            className={`create-modal__toggle ${dmEncrypted ? 'create-modal__toggle--on' : ''}`}
            onClick={() => {
                const newValue = !dmEncrypted;
                setDmEncrypted(newValue);
                localStorage.setItem('uplink_dm_encrypted', String(newValue));
            }}
        >
            <div className="create-modal__toggle-knob" />
        </div>
    </label>
    {dmEncrypted ? (
        <div className="create-modal__toggle-warning">
            ⚠ Новые личные чаты будут зашифрованы. Боты и интеграции в них не работают.
        </div>
    ) : (
        <div className="create-modal__toggle-hint">
            Новые личные чаты создаются без шифрования. Можно включить позже в заголовке чата.
        </div>
    )}
</div>
```

Файл: `web/src/components/ChatLayout.tsx`

Читать настройку при создании DM:
```typescript
const handleOpenDM = async (userId: string) => {
    const dmEncrypted = localStorage.getItem('uplink_dm_encrypted') === 'true';
    const roomId = await matrixService.rooms.getOrCreateDM(userId, dmEncrypted);
    // ...
};
```

### 5b. Кнопка замочка в RoomHeader — включить шифрование в существующей комнате

Работает для **любых** комнат (DM, каналы, spaces). Если комната не зашифрована — показываем 🔓, клик → подтверждение → включение. Если уже зашифрована — показываем 🔒 (неактивный индикатор).

Файл: `web/src/components/RoomHeader.tsx`

State:
```typescript
const [showEncryptConfirm, setShowEncryptConfirm] = useState(false);
const isEncrypted = matrixService.rooms.isRoomEncrypted(roomId);
```

Кнопка в `room-header__actions`:
```tsx
{isEncrypted ? (
    <span className="room-header__encryption-badge" title="Сквозное шифрование включено">
        🔒
    </span>
) : (
    <button
        className="room-header__btn"
        onClick={() => setShowEncryptConfirm(true)}
        title="Включить сквозное шифрование"
    >
        🔓
    </button>
)}
```

Модалка подтверждения:
```tsx
{showEncryptConfirm && (
    <div className="profile-modal-overlay" onClick={() => setShowEncryptConfirm(false)}>
        <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal__header">
                <span className="profile-modal__title">Включить шифрование?</span>
                <button className="profile-modal__close" onClick={() => setShowEncryptConfirm(false)}>
                    &#x2715;
                </button>
            </div>
            <div className="profile-modal__section">
                <p style={{ color: 'var(--uplink-text-secondary)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                    Сквозное шифрование (E2E) защитит все новые сообщения в этой комнате.
                    Только участники смогут их прочитать.
                </p>
                <div className="create-modal__toggle-warning" style={{ marginTop: 8 }}>
                    ⚠ Это действие необратимо — шифрование нельзя отключить после активации.
                    Встроенные боты перестанут работать в этой комнате.
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '0 20px 20px' }}>
                <button className="profile-modal__btn" onClick={() => setShowEncryptConfirm(false)}>
                    Отмена
                </button>
                <button
                    className="profile-modal__btn profile-modal__btn--primary"
                    onClick={async () => {
                        await matrixService.rooms.enableEncryption(roomId);
                        setShowEncryptConfirm(false);
                    }}
                >
                    Включить шифрование
                </button>
            </div>
        </div>
    </div>
)}
```

### RoomsManager — прокинуть encrypted в RoomInfo

Файл: `web/src/matrix/RoomsManager.ts`

Убедиться что `encrypted` корректно определяется в парсинге комнаты:
```typescript
// В parseRoom или аналогичном методе
encrypted: !!room.currentState.getStateEvents('m.room.encryption', ''),
```

Интерфейс RoomInfo (если ещё нет поля):
```typescript
interface RoomInfo {
    // ... существующие поля
    encrypted: boolean;
}
```

### CSS — стиль индикатора шифрования

```css
.room-header__encryption-badge {
    font-size: 16px;
    padding: 4px 6px;
    opacity: 0.7;
    cursor: default;
}
```


## Шаг 6. CSS — стили тогла и предупреждения

Файл: `web/src/styles/chat.css` (или отдельный файл модалок)

```css
/* ═══════════════════════════════════
   TOGGLE в модалках создания
   ═══════════════════════════════════ */
.create-modal__toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 4px 0;
}

.create-modal__toggle-label {
    font-size: 14px;
    color: var(--uplink-text-primary);
    font-weight: 500;
}

.create-modal__toggle {
    width: 44px;
    height: 24px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    position: relative;
    transition: background 0.2s;
    cursor: pointer;
    flex-shrink: 0;
}

.create-modal__toggle--on {
    background: var(--uplink-accent);
}

.create-modal__toggle-knob {
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.create-modal__toggle--on .create-modal__toggle-knob {
    transform: translateX(20px);
}

.create-modal__toggle-warning {
    font-size: 12px;
    color: #f0a030;
    margin-top: 6px;
    line-height: 1.4;
    padding: 6px 8px;
    background: rgba(240, 160, 48, 0.08);
    border-radius: var(--uplink-radius-sm);
}

.create-modal__toggle-hint {
    font-size: 12px;
    color: var(--uplink-text-faint);
    margin-top: 4px;
}

.room-header__encryption-badge {
    font-size: 16px;
    padding: 4px 6px;
    opacity: 0.7;
    cursor: default;
}
```


## Шаг 7. BotSettings — предупреждение при включении бота в зашифрованной комнате

Файл: `web/src/components/BotSettings.tsx`

```typescript
const [warning, setWarning] = useState<string | null>(null);

const toggleBot = async (botId: string, enable: boolean) => {
    setWarning(null);
    const action = enable ? 'enable' : 'disable';
    const resp = await fetch(`/bot-api/bots/${botId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
    });
    const data = await resp.json();
    if (data.warning) {
        setWarning(data.warning);
    }
    loadBots();
};
```

В JSX — над списком ботов:
```tsx
{warning && (
    <div className="bot-settings__warning">{warning}</div>
)}
```

### server.mjs — возвращать warning

В `docker/uplink-botservice/server.mjs`, эндпоинт enable:

```javascript
app.post('/api/bots/:botId/enable', async (req, res) => {
    const { botId } = req.params;
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });
    if (!BOT_DEFINITIONS[botId]) return res.status(404).json({ error: 'Bot not found' });

    try {
        const encrypted = await isRoomEncrypted(roomId);

        await inviteBotToRoom(BOT_DEFINITIONS[botId].localpart, roomId);
        enableBotInRoom(botId, roomId);

        res.json({
            ok: true,
            warning: encrypted
                ? 'Комната зашифрована (E2E). Боты не могут читать зашифрованные сообщения. Создайте незашифрованный канал для работы с ботами.'
                : null,
        });
    } catch (err) {
        console.error(`Ошибка включения бота ${botId}:`, err);
        res.status(500).json({ error: err.message });
    }
});
```

### matrixClient.mjs — isRoomEncrypted

```javascript
export async function isRoomEncrypted(roomId) {
    try {
        const resp = await fetch(
            `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.encryption`,
            {
                headers: { 'Authorization': `Bearer ${AS_TOKEN}` },
            }
        );
        return resp.ok;
    } catch {
        return false;
    }
}
```


## Шаг 8. eventHandler.mjs — логирование encrypted + фикс парсинга

### 8.1. Логирование зашифрованных событий

```javascript
export async function handleMatrixEvent(event) {
    if (event.sender?.startsWith('@bot_')) return;

    if (event.type === 'm.room.encrypted') {
        console.warn(`[botservice] Зашифрованное сообщение в ${event.room_id} от ${event.sender} — боты не читают E2E`);
        return;
    }

    if (event.type !== 'm.room.message') return;
    // ... остальной код
}
```

### 8.2. Фикс парсинга аргументов для одно/двухсловных команд

В функции `routeCommand`:

```javascript
async function routeCommand(roomId, sender, body, eventId) {
    const parts = body.split(/\s+/);
    const commandRoot = parts[0].toLowerCase();

    const botEntry = Object.entries(BOT_DEFINITIONS).find(([_id, bot]) =>
        bot.commands.some(cmd =>
            cmd.command.split(' ')[0].toLowerCase() === commandRoot
        )
    );

    if (botEntry) {
        const [botId, botDef] = botEntry;

        // Проверка привязки (helper — без проверки)
        if (botId !== 'helper') {
            const bindings = getBotRoomBindings();
            const roomBots = bindings[roomId] || [];
            if (!roomBots.includes(botId)) {
                await sendBotMessage('bot_helper', roomId,
                    `Бот **${botDef.displayName}** не активирован в этом канале.`
                );
                return;
            }
        }

        // Определить: команда одно- или двухсловная
        const matchingCmd = botDef.commands.find(cmd =>
            cmd.command.split(' ')[0].toLowerCase() === commandRoot
        );
        const isMultiWord = matchingCmd && matchingCmd.command.trim().includes(' ');

        let subCommand, args;
        if (isMultiWord) {
            // "/github subscribe owner/repo" → sub="subscribe", args=["owner/repo"]
            subCommand = parts[1]?.toLowerCase();
            args = parts.slice(2);
        } else {
            // "/remind 30m текст" → sub=undefined, args=["30m", "текст"]
            subCommand = undefined;
            args = parts.slice(1);
        }

        try {
            const handler = await import(`./handlers/${botId}.mjs`);
            await handler.handleCommand({ roomId, sender, subCommand, args, eventId, body });
        } catch (err) {
            console.error(`Ошибка команды ${botId}:`, err);
            await sendBotMessage(botDef.localpart, roomId, `Ошибка: ${err.message}`);
        }
        return;
    }

    // ... кастомные боты, неизвестная команда
}
```

Результат:
- `/remind 30m тест` → args = `["30m", "тест"]` ✅
- `/help` → args = `[]` ✅
- `/poll "Q" "A" "B"` → args = `['"Q"', '"A"', '"B"']` ✅
- `/github subscribe repo` → subCommand = `"subscribe"`, args = `["repo"]` ✅


## Порядок реализации

1. **homeserver.yaml** — убрать `encryption_enabled_by_default_for_room_type: "all"`
2. **RoomService.ts** — параметр `encrypted = false` в createRoomInSpace, createSpace, getOrCreateDM; методы enableEncryption, isRoomEncrypted
3. **RoomsManager.ts** — прокинуть `encrypted` в RoomInfo
4. **CreateRoomModal.tsx** — тогл шифрования, предупреждение при включении
5. **CreateSpaceModal.tsx** — тогл шифрования, предупреждение при включении
6. **ProfileModal.tsx** — настройка «Шифровать новые личные чаты» (localStorage)
7. **ChatLayout.tsx** — DM читает настройку из localStorage
8. **RoomHeader.tsx** — кнопка 🔓/🔒, модалка подтверждения включения шифрования
9. **CSS** — стили тогла, warning, encryption badge
10. **matrixClient.mjs** — `isRoomEncrypted()` на стороне бот-сервиса
11. **server.mjs** — warning при enable бота в зашифрованной комнате
12. **BotSettings.tsx** — показ warning
13. **eventHandler.mjs** — логирование encrypted, фикс парсинга одно/двухсловных команд
14. **Тест шифрование** — создать комнату без E2E → включить через 🔓 → убедиться что 🔒 появился, обратно не отключается
15. **Тест DM** — включить настройку в профиле → создать новый DM → проверить что зашифрован → выключить → новый DM без шифрования
16. **Тест боты** — создать незашифрованную комнату → включить Helper → `/help`, `/remind 1m тест`, `/poll "Q" "A" "B"` — всё работает
17. **Тест боты E2E** — создать зашифрованную комнату → включить Helper → увидеть warning → команды не работают (ожидаемо)


## Файлы

Изменяемые:
- `docker/synapse/homeserver.yaml` — убрать encryption_enabled_by_default_for_room_type
- `web/src/matrix/RoomService.ts` — параметр encrypted, enableEncryption, isRoomEncrypted
- `web/src/matrix/RoomsManager.ts` — encrypted в RoomInfo
- `web/src/components/CreateRoomModal.tsx` — тогл шифрования + предупреждение
- `web/src/components/CreateSpaceModal.tsx` — тогл шифрования + предупреждение
- `web/src/components/ProfileModal.tsx` — настройка «Шифровать новые личные чаты»
- `web/src/components/ChatLayout.tsx` — DM читает настройку шифрования
- `web/src/components/RoomHeader.tsx` — кнопка 🔓/🔒, модалка подтверждения
- `web/src/components/BotSettings.tsx` — показ warning от API
- `web/src/styles/chat.css` — стили тогла, warning, encryption badge
- `docker/uplink-botservice/eventHandler.mjs` — логирование encrypted, фикс парсинга
- `docker/uplink-botservice/matrixClient.mjs` — isRoomEncrypted()
- `docker/uplink-botservice/server.mjs` — warning при enable в зашифрованной комнате


## Коммиты

```
[config] Убрать принудительное E2E шифрование из homeserver.yaml
[chat] Тогл шифрования при создании комнат/каналов (по умолчанию выключено)
[chat] Шифрование DM: настройка в профиле + кнопка 🔓 в заголовке комнаты
[bots] Warning при включении бота в зашифрованной комнате, isRoomEncrypted
[bots] Фикс парсинга аргументов: одно/двухсловные команды (/remind, /poll, /github subscribe)
```
