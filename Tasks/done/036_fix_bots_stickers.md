# 036 — Фикс: боты не отвечают в незашифрованных каналах + панель стикеров/GIF не открывается

## Контекст

Два бага обнаружены на продакшене (скриншоты прилагались):

1. **Боты молчат.** В канале "# Боты" (незашифрованный) Uplink Helper включён через UI-тогл, но команды `/help` и `/remind` не получают ответа. Сообщения отправляются, но бот не реагирует.

2. **Панель стикеров/GIF не открывается.** Клик по кнопке 😊 (Smile) в MessageInput ничего не показывает — панель либо не рендерится, либо рендерится невидимо.

---

## Баг 1: Боты не отвечают

### Диагностика

Поток событий при работающих ботах:
```
User → /help → Synapse → PUT /transactions/:txnId → botservice → eventHandler → helper.mjs → sendBotMessage → Synapse → в чат
```

**Корневая проблема: бот не в комнате → Synapse не пушит события в AS.**

Synapse отправляет события в Application Service ТОЛЬКО для комнат, где есть хотя бы один участник из namespace AS (`@bot_*:uplink.local`). Если `@bot_helper:uplink.local` не joined в комнате — AS никогда не получит события.

Почему бот не в комнате — цепочка ошибок в `inviteBotToRoom()`:

```javascript
// matrixClient.mjs — текущий код
export async function inviteBotToRoom(botLocalpart, roomId) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;
    
    // ШАГ 1: Invite от имени @botservice:uplink.local
    // ПРОБЛЕМА: @botservice НЕ является участником комнаты!
    // Matrix требует, чтобы приглашающий был в комнате с правом invite.
    // AS-токен действует от имени sender_localpart (@botservice),
    // а @botservice не в комнате → 403 Forbidden → invite молча фейлится.
    await fetch(`.../${roomId}/invite`, {
        headers: { 'Authorization': `Bearer ${AS_TOKEN}` },
        body: JSON.stringify({ user_id: userId }),
    });

    // ШАГ 2: Join от имени бота
    // Для public rooms — может сработать и без invite.
    // Для private rooms — нужен invite, который не прошёл → 403.
    await fetch(`.../${roomId}/join?user_id=${userId}`, ...);
}
```

Обе операции не проверяют HTTP-статус ответа — ошибки проглатываются.

### Дополнительные проблемы

1. **Нет логирования** ошибок invite/join — невозможно диагностировать с сервера.
2. **Helper не авто-присоединяется** при старте. Другие боты join-ятся через UI-тогл, но helper "всегда активен" по коду (`botId !== 'helper'` в routeCommand) — при этом физически его никто не join-ит в комнату.
3. **Нет проверки членства** перед ответом — бот пытается отправить сообщение в комнату, где он не участник, и `sendBotMessage` тоже фейлится молча.

### Исправление

#### 1.1. Починить `inviteBotToRoom` — множественные стратегии join

```javascript
// matrixClient.mjs — новая версия

/**
 * Присоединить бота к комнате.
 * Пробуем несколько стратегий, т.к. разные типы комнат требуют разный подход.
 */
export async function joinBotToRoom(botLocalpart, roomId) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;

    // Стратегия 1: Прямой join от имени бота (работает для public rooms)
    {
        const resp = await fetch(
            `${HOMESERVER_URL}/_matrix/client/v3/join/${encodeURIComponent(roomId)}?user_id=${encodeURIComponent(userId)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AS_TOKEN}`,
                },
                body: JSON.stringify({}),
            }
        );
        if (resp.ok) {
            console.log(`[joinBot] ${userId} joined ${roomId} (direct join)`);
            return;
        }
        const err = await resp.text();
        console.warn(`[joinBot] Direct join failed for ${userId} in ${roomId}: ${resp.status} ${err}`);
    }

    // Стратегия 2: Synapse Admin API — force-join (работает для любых комнат)
    {
        const resp = await fetch(
            `${HOMESERVER_URL}/_synapse/admin/v1/join/${encodeURIComponent(roomId)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AS_TOKEN}`,
                },
                body: JSON.stringify({ user_id: userId }),
            }
        );
        if (resp.ok) {
            console.log(`[joinBot] ${userId} joined ${roomId} (admin API)`);
            return;
        }
        const err = await resp.text();
        console.warn(`[joinBot] Admin join failed for ${userId} in ${roomId}: ${resp.status} ${err}`);
    }

    // Стратегия 3: Invite через AS sender, затем join (legacy)
    {
        const inviteResp = await fetch(
            `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AS_TOKEN}`,
                },
                body: JSON.stringify({ user_id: userId }),
            }
        );
        if (inviteResp.ok) {
            const joinResp = await fetch(
                `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join?user_id=${encodeURIComponent(userId)}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AS_TOKEN}`,
                    },
                    body: JSON.stringify({}),
                }
            );
            if (joinResp.ok) {
                console.log(`[joinBot] ${userId} joined ${roomId} (invite+join)`);
                return;
            }
        }
    }

    console.error(`[joinBot] Все стратегии join провалились для ${userId} в ${roomId}`);
    throw new Error(`Не удалось присоединить ${userId} к ${roomId}`);
}
```

**Важно:** переименовать `inviteBotToRoom` → `joinBotToRoom` и обновить все вызовы в `server.mjs` и `customBots.mjs`.

#### 1.2. Проверка членства бота

```javascript
// matrixClient.mjs — добавить

/**
 * Проверить, является ли бот участником комнаты.
 */
export async function isBotInRoom(botLocalpart, roomId) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;
    try {
        const resp = await fetch(
            `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.member/${encodeURIComponent(userId)}`,
            {
                headers: { 'Authorization': `Bearer ${AS_TOKEN}` },
            }
        );
        if (!resp.ok) return false;
        const data = await resp.json();
        return data.membership === 'join';
    } catch {
        return false;
    }
}
```

#### 1.3. Auto-join helper при включении через UI

В `server.mjs` — эндпоинт `/api/bots/:botId/enable`:

```javascript
app.post('/api/bots/:botId/enable', async (req, res) => {
    const { botId } = req.params;
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ error: 'roomId required' });
    if (!BOT_DEFINITIONS[botId]) return res.status(404).json({ error: 'Bot not found' });

    try {
        const encrypted = await isRoomEncrypted(roomId);

        // Присоединить бота к комнате (НОВЫЙ метод с множественными стратегиями)
        await joinBotToRoom(BOT_DEFINITIONS[botId].localpart, roomId);

        // Проверить что бот действительно в комнате
        const inRoom = await isBotInRoom(BOT_DEFINITIONS[botId].localpart, roomId);
        if (!inRoom) {
            return res.status(500).json({
                error: 'Не удалось присоединить бота к комнате. Попробуйте пригласить бота вручную.'
            });
        }

        enableBotInRoom(botId, roomId);

        res.json({
            ok: true,
            warning: encrypted
                ? 'Комната зашифрована (E2E). Боты не могут читать зашифрованные сообщения.'
                : null,
        });
    } catch (err) {
        console.error(`Ошибка включения бота ${botId}:`, err);
        res.status(500).json({ error: err.message });
    }
});
```

#### 1.4. Auto-join helper в существующие комнаты при старте сервиса

В `init()` в `server.mjs` — после регистрации ботов:

```javascript
async function init() {
    // Зарегистрировать ботов
    for (const [id, bot] of Object.entries(BOT_DEFINITIONS)) {
        try {
            await ensureBotUser(bot.localpart, bot.displayName);
        } catch (err) {
            console.warn(`Не удалось зарегистрировать ${id}:`, err.message);
        }
    }

    // Присоединить ботов к комнатам, где они включены
    const bindings = getBotRoomBindings();
    for (const [roomId, botIds] of Object.entries(bindings)) {
        for (const botId of botIds) {
            const bot = BOT_DEFINITIONS[botId];
            if (!bot) continue;
            try {
                const inRoom = await isBotInRoom(bot.localpart, roomId);
                if (!inRoom) {
                    console.log(`[init] Бот ${botId} не в комнате ${roomId}, присоединяю...`);
                    await joinBotToRoom(bot.localpart, roomId);
                }
            } catch (err) {
                console.warn(`[init] Не удалось присоединить ${botId} к ${roomId}:`, err.message);
            }
        }
    }

    console.log('Боты зарегистрированы и присоединены к комнатам.');
    // ...
}
```

#### 1.5. Логирование в eventHandler

Добавить логи в `handleMatrixEvent` и `routeCommand`:

```javascript
export async function handleMatrixEvent(event) {
    console.log(`[event] ${event.type} в ${event.room_id} от ${event.sender}: ${event.content?.body?.slice(0, 50) || ''}`);
    // ... остальная логика
}
```

И в `sendBotMessage` — логировать успех/ошибку:

```javascript
export async function sendBotMessage(botLocalpart, roomId, body, formatted) {
    // ... формирование content
    const resp = await fetch(url, ...);
    if (!resp.ok) {
        const err = await resp.text();
        console.error(`[sendBotMessage] ОШИБКА от ${botLocalpart} в ${roomId}: ${resp.status} ${err}`);
        throw new Error(`Ошибка отправки (${resp.status}): ${err}`);
    }
    const result = await resp.json();
    console.log(`[sendBotMessage] ${botLocalpart} → ${roomId}: "${body.slice(0, 50)}..." (${result.event_id})`);
    return result.event_id;
}
```

#### 1.6. Диагностический эндпоинт

```javascript
// server.mjs — добавить
app.get('/api/debug/rooms/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const bindings = getBotRoomBindings();
    const roomBots = bindings[roomId] || [];
    
    const status = {};
    for (const botId of ['helper', ...roomBots]) {
        const bot = BOT_DEFINITIONS[botId];
        if (!bot) continue;
        status[botId] = {
            enabled: botId === 'helper' || roomBots.includes(botId),
            inRoom: await isBotInRoom(bot.localpart, roomId),
            userId: bot.userId,
        };
    }
    
    const encrypted = await isRoomEncrypted(roomId);
    res.json({ roomId, encrypted, bots: status });
});
```

#### 1.7. UI — показывать ошибку если бот не присоединился

В `BotSettings.tsx` — при toggleBot, обрабатывать ошибку от сервера:

```typescript
const toggleBot = async (botId: string, enable: boolean) => {
    try {
        const action = enable ? 'enable' : 'disable';
        const resp = await fetch(`${config.botApiUrl}/bots/${botId}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId }),
        });
        const data = await resp.json();
        if (!resp.ok) {
            alert(`Ошибка: ${data.error || 'Не удалось переключить бота'}`);
        }
        if (data.warning) {
            alert(data.warning);
        }
    } catch (err) {
        alert('Ошибка подключения к бот-сервису');
    }
    loadBots();
};
```

---

## Баг 2: Панель стикеров/GIF не открывается

### Диагностика

Клик по кнопке Smile переключает `showStickerPanel` state. Панель рендерится:

```tsx
// MessageInput.tsx
{showStickerPanel && roomId && (
    <div className="message-input__sticker-panel-container">
        <StickerGifPanel ... />
    </div>
)}
```

**Корневая проблема: отсутствует CSS для `.message-input__sticker-panel-container`.**

Класс `.sticker-gif-panel` внутри имеет `position: absolute; bottom: 100%` — для правильного позиционирования нужен positioned ancestor. Но:
- `.message-input__sticker-panel-container` — нет CSS вообще
- `.message-input` — нет `position: relative`
- Панель рендерится ВХОЛОСТУЮ: без positioned parent `position: absolute` позиционируется относительно ближайшего positioned ancestor (вероятно body или chat-main), и панель улетает за пределы видимости

### Исправление

#### 2.1. Перенести панель внутрь wrapper

Панель должна позиционироваться относительно `.message-input__wrapper`, у которого уже есть `position: relative` (используется для command-suggestions). Переместить рендер StickerGifPanel внутрь wrapper:

```tsx
// MessageInput.tsx — изменить структуру JSX
return (
    <div className={`message-input ${isDragOver ? 'message-input--drag-over' : ''}`} ...>
        {isDragOver && <div className="message-input__drop-overlay">...</div>}
        <div className="message-input__wrapper">
            {/* Command suggestions — position: absolute, bottom: 100% */}
            {suggestions.length > 0 && <div className="command-suggestions">...</div>}
            
            {/* Sticker/GIF panel — ПЕРЕМЕСТИТЬ СЮДА */}
            {showStickerPanel && roomId && (
                <StickerGifPanel
                    roomId={roomId}
                    onClose={() => setShowStickerPanel(false)}
                    onSendGif={handleSendGif}
                    onSendSticker={handleSendSticker}
                    onOpenCreatePack={() => { setShowStickerPanel(false); setShowCreatePack(true); }}
                />
            )}
            
            {replyTo && <div className="message-input__reply-preview">...</div>}
            {uploading && <div className="message-input__uploading">...</div>}
            <div className="message-input__row">...</div>
        </div>
        {showCreatePack && <CreateStickerPackModal ... />}
    </div>
);
```

Убрать обёртку `message-input__sticker-panel-container` — она не нужна, `.sticker-gif-panel` сам имеет нужный CSS.

#### 2.2. Убедиться что wrapper имеет position: relative

В `message-input.css` у `.message-input__wrapper` нет явного `position: relative`, но command-suggestions работают с absolute позиционированием. Добавить явно на случай если браузер не определяет:

```css
.message-input__wrapper {
    position: relative;
    /* ... остальные стили без изменений ... */
}
```

#### 2.3. Исправить z-index конфликт

`.sticker-gif-panel` имеет `z-index: 15`, `.command-suggestions` имеет `z-index: 10`. Оба работают с `position: absolute; bottom: 100%`. Конфликт маловероятен (одновременно не показываются), но нужно убедиться что панель выше thread-panel (`z-index: 10` в мобильном), модалок и т.д.

Добавить в `stickers.css`:

```css
/* Гарантировать что панель поверх остальных элементов */
.sticker-gif-panel {
    z-index: 20; /* было 15, увеличиваем */
}
```

#### 2.4. Закрытие панели при клике вне

Добавить обработку клика вне панели для закрытия:

```tsx
// StickerGifPanel.tsx — добавить
const panelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
            // Не закрывать если кликнули по кнопке Smile (она сама toggle)
            const smilebtn = (e.target as HTMLElement).closest('.message-input__action-btn');
            if (!smilebtn) onClose();
        }
    };
    // Небольшая задержка чтобы не закрыться сразу при открытии
    const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, [onClose]);

return (
    <div className="sticker-gif-panel" ref={panelRef}>
        {/* ... */}
    </div>
);
```

#### 2.5. Обработка ошибок при загрузке контента

В `StickerGifPanel.tsx` — добавить try/catch и user-friendly сообщения:

```tsx
// GIF tab — обработка ошибок
const loadTrendingGifs = async () => {
    setGifLoading(true);
    try {
        const data = await gifService.trending(30);
        setGifs(data.results);
        setGifNextPos(data.next);
        if (data.results.length === 0) {
            setGifError('GIF-сервис временно недоступен');
        }
    } catch {
        setGifError('Не удалось загрузить GIF');
    } finally {
        setGifLoading(false);
    }
};
```

И в UI:
```tsx
{gifError && (
    <div className="sticker-gif-panel__empty">{gifError}</div>
)}
```

Аналогично для стикеров — если `getCatalogRoomId()` падает, показать сообщение а не пустую панель.

---

## Порядок реализации

1. **matrixClient.mjs** — `joinBotToRoom` (3 стратегии + логи), `isBotInRoom`, логирование в `sendBotMessage`.
2. **server.mjs** — обновить эндпоинт enable (joinBotToRoom + проверка), auto-join при init(), диагностический эндпоинт.
3. **eventHandler.mjs** — добавить логирование входящих событий.
4. **MessageInput.tsx** — переместить StickerGifPanel внутрь wrapper, убрать лишний div.
5. **message-input.css** — явный `position: relative` на wrapper.
6. **StickerGifPanel.tsx** — click outside, error handling.
7. **BotSettings.tsx** — показ ошибок/предупреждений при включении бота.
8. **Деплой + тест** — пересобрать botservice и web, проверить оба бага.

## Файлы

Изменённые:
- `docker/uplink-botservice/matrixClient.mjs` — joinBotToRoom, isBotInRoom, логи sendBotMessage
- `docker/uplink-botservice/server.mjs` — enable endpoint, init() auto-join, debug endpoint
- `docker/uplink-botservice/eventHandler.mjs` — логирование
- `web/src/components/MessageInput.tsx` — StickerGifPanel позиционирование
- `web/src/components/StickerGifPanel.tsx` — click outside, error handling
- `web/src/components/BotSettings.tsx` — error/warning handling
- `web/src/styles/message-input.css` — position: relative на wrapper
- `web/src/styles/stickers.css` — z-index fix

## Тестирование

### Боты:
1. Открыть незашифрованный канал (# Боты)
2. Включить Uplink Helper через панель ботов
3. Отправить `/help` → должен быть ответ
4. Отправить `/remind 1m тест` → должно быть подтверждение + через 1 мин напоминание
5. Включить GitHub Bot → `/github list` → должен ответить "нет подписок"
6. Проверить `/api/debug/rooms/:roomId` → все ботs `inRoom: true`

### Стикеры/GIF:
1. Нажать 😊 → панель открывается НАД полем ввода
2. Таб GIF → видны trending GIF-ки
3. Поиск → результаты обновляются
4. Клик по GIF → отправляется, панель закрывается
5. Таб Стикеры → видны "Нет недавних стикеров" или список паков
6. Клик вне панели → панель закрывается
7. Escape → панель закрывается

## Коммит

```
[fix] Боты: множественные стратегии join, auto-join при старте, логирование
[fix] Стикеры/GIF: позиционирование панели, click outside, error handling
```
