# 023 — Чат-фичи: реакции, ответы, markdown, typing, закреплённые сообщения

## Контекст

Анализ open-source мессенджеров (Cinny, Revolt, Mattermost, Zulip, Element) выявил набор стандартных фич, которых не хватает в Uplink. Все они нативно поддерживаются Matrix-протоколом — нужна только реализация на фронтенде.

Cinny (github.com/cinnyapp/cinny) — ближайший аналог по стеку (React 18 + TS + matrix-js-sdk + matrix-sdk-crypto-wasm + Tauri). Использовать как референс для реализации.

## Фичи (в порядке приоритета)

### 1. Emoji-реакции на сообщения
### 2. Ответ на сообщение (reply с цитатой)
### 3. Markdown-рендеринг в сообщениях
### 4. Typing indicator (индикатор набора)
### 5. Закреплённые сообщения (pinned)

---

## Фича 1: Emoji-реакции

### Как работает в Matrix

Реакция — это событие `m.reaction` с `m.relates_to`:
```json
{
  "type": "m.reaction",
  "content": {
    "m.relates_to": {
      "rel_type": "m.annotation",
      "event_id": "$target_event_id",
      "key": "👍"
    }
  }
}
```
Снятие реакции — redact этого события.

### MatrixService — новые методы

```typescript
/** Отправить реакцию на сообщение */
async sendReaction(roomId: string, eventId: string, emoji: string): Promise<string> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    const resp = await this.client.sendEvent(roomId, 'm.reaction' as any, {
        'm.relates_to': {
            rel_type: 'm.annotation',
            event_id: eventId,
            key: emoji,
        },
    });
    return resp.event_id;
}

/** Убрать свою реакцию (redact) */
async removeReaction(roomId: string, reactionEventId: string): Promise<void> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    await this.client.redactEvent(roomId, reactionEventId);
}
```

### useMessages — агрегация реакций

В хуке useMessages (или в отдельной утилите) — собрать реакции из timeline для каждого сообщения:

```typescript
interface ReactionInfo {
    emoji: string;
    count: number;
    users: string[];           // userId тех кто поставил
    myReactionEventId?: string; // если текущий user поставил — ID события для redact
}

// Для каждого m.room.message собрать все m.reaction с matching event_id
// через event.getRelation() или вручную фильтруя timeline
```

Реакции хранятся в timeline как отдельные события. matrix-js-sdk агрегирует их через `room.getUnfilteredTimelineSet()`. Также можно использовать `event.getAnnotations()` если SDK поддерживает, иначе — ручная фильтрация.

**Референс:** Cinny `src/app/features/room/message/Reactions.tsx` и `src/app/hooks/useRelations.ts`.

### UI — MessageBubble

Под текстом сообщения — строка реакций:
```tsx
<div className="message-bubble__reactions">
    {reactions.map(r => (
        <button
            key={r.emoji}
            className={`reaction-chip ${r.myReactionEventId ? 'reaction-chip--active' : ''}`}
            onClick={() => r.myReactionEventId
                ? matrixService.removeReaction(roomId, r.myReactionEventId)
                : matrixService.sendReaction(roomId, eventId, r.emoji)
            }
        >
            <span className="reaction-chip__emoji">{r.emoji}</span>
            <span className="reaction-chip__count">{r.count}</span>
        </button>
    ))}
</div>
```

Hover на сообщение — кнопка "😀+" для добавления реакции. По клику — быстрый picker с 6-8 частыми emoji (👍 ❤️ 😂 🎉 👀 🔥 ✅ ❌). Без полного emoji-picker — он слишком тяжёлый, добавим потом если нужно.

### CSS

```css
.message-bubble__reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
}

.reaction-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.15s, border-color 0.15s;
}

.reaction-chip:hover {
    background: rgba(255, 255, 255, 0.1);
}

.reaction-chip--active {
    background: rgba(88, 101, 242, 0.15);
    border-color: var(--uplink-accent);
}

.reaction-chip__count {
    font-size: 12px;
    color: var(--uplink-text-muted);
    font-weight: 600;
}

/* Кнопка добавления реакции (hover на сообщение) */
.message-bubble__action-bar {
    position: absolute;
    top: -14px;
    right: 16px;
    display: flex;
    gap: 2px;
    background: var(--uplink-bg-secondary);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--uplink-radius-sm);
    padding: 2px;
    opacity: 0;
    transition: opacity 0.1s;
    z-index: 5;
}

.message-bubble:hover .message-bubble__action-bar {
    opacity: 1;
}

.message-bubble__action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 6px;
    font-size: 16px;
    border-radius: var(--uplink-radius-sm);
    color: var(--uplink-text-faint);
    transition: background 0.1s, color 0.1s;
}

.message-bubble__action-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--uplink-text-primary);
}
```

**Quick emoji picker** — абсолютно-позиционированный попап с 8 кнопками, без отдельной библиотеки.

---

## Фича 2: Ответ на сообщение (Reply)

### Как работает в Matrix

Ответ — это `m.room.message` с `m.relates_to.m.in_reply_to`:
```json
{
  "type": "m.room.message",
  "content": {
    "msgtype": "m.text",
    "body": "> <@user:server> оригинальный текст\n\nмой ответ",
    "format": "org.matrix.custom.html",
    "formatted_body": "<mx-reply>цитата</mx-reply>мой ответ",
    "m.relates_to": {
      "m.in_reply_to": {
        "event_id": "$original_event_id"
      }
    }
  }
}
```

matrix-js-sdk: можно использовать `client.sendMessage()` с `m.relates_to`, или вручную через `sendEvent`.

### Состояние "отвечаю на сообщение"

В ChatLayout (или useMessages) — state:
```typescript
const [replyTo, setReplyTo] = useState<{ eventId: string; sender: string; body: string } | null>(null);
```

Передавать в MessageInput и MessageBubble.

### MessageBubble — кнопка "Ответить"

В action-bar при hover (тот же что для реакции) — кнопка ↩ (reply). По клику → setReplyTo.

### MessageInput — превью ответа

Над textarea — полоска с превью цитируемого сообщения:
```tsx
{replyTo && (
    <div className="message-input__reply-preview">
        <div className="message-input__reply-line" />
        <div className="message-input__reply-content">
            <span className="message-input__reply-sender">{replyTo.sender}</span>
            <span className="message-input__reply-text">{replyTo.body}</span>
        </div>
        <button className="message-input__reply-close" onClick={() => setReplyTo(null)}>✕</button>
    </div>
)}
```

### MessageBubble — показ цитаты

Если сообщение содержит `m.in_reply_to` — показать блок цитаты над текстом:
```tsx
{replyEvent && (
    <div className="message-bubble__reply-quote" onClick={() => scrollToMessage(replyEvent.eventId)}>
        <span className="message-bubble__reply-sender">{replyEvent.sender}</span>
        <span className="message-bubble__reply-text">{replyEvent.body}</span>
    </div>
)}
```

Для получения цитируемого события: `room.findEventById(inReplyToId)` или фильтрация timeline.

### MatrixService — отправка reply

```typescript
async sendReply(roomId: string, replyToEventId: string, body: string): Promise<void> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    const room = this.client.getRoom(roomId);
    const replyEvent = room?.findEventById(replyToEventId);
    const originalBody = replyEvent?.getContent()?.body || '';
    const originalSender = replyEvent?.getSender() || '';

    // Fallback body для клиентов без поддержки reply
    const fallbackBody = `> <${originalSender}> ${originalBody}\n\n${body}`;

    await this.client.sendEvent(roomId, 'm.room.message' as any, {
        msgtype: 'm.text',
        body: fallbackBody,
        format: 'org.matrix.custom.html',
        formatted_body: `<mx-reply><blockquote><a href="https://matrix.to/#/${roomId}/${replyToEventId}">In reply to</a> <a href="https://matrix.to/#/${originalSender}">${originalSender}</a><br>${originalBody}</blockquote></mx-reply>${body}`,
        'm.relates_to': {
            'm.in_reply_to': {
                event_id: replyToEventId,
            },
        },
    });
}
```

### CSS

```css
.message-bubble__reply-quote {
    padding: 4px 8px;
    margin-bottom: 4px;
    border-left: 3px solid var(--uplink-accent);
    border-radius: 0 var(--uplink-radius-sm) var(--uplink-radius-sm) 0;
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    max-width: 400px;
}

.message-bubble__reply-quote:hover {
    background: rgba(255, 255, 255, 0.06);
}

.message-bubble__reply-sender {
    font-size: 12px;
    font-weight: 600;
    color: var(--uplink-accent);
    margin-right: 6px;
}

.message-bubble__reply-text {
    font-size: 13px;
    color: var(--uplink-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
    max-width: 300px;
    vertical-align: bottom;
}

.message-input__reply-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--uplink-radius-sm) var(--uplink-radius-sm) 0 0;
}

.message-input__reply-line {
    width: 3px;
    height: 32px;
    background: var(--uplink-accent);
    border-radius: 2px;
    flex-shrink: 0;
}

.message-input__reply-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.message-input__reply-sender {
    font-size: 12px;
    font-weight: 600;
    color: var(--uplink-text-primary);
}

.message-input__reply-text {
    font-size: 13px;
    color: var(--uplink-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.message-input__reply-close {
    background: none;
    border: none;
    color: var(--uplink-text-faint);
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    border-radius: var(--uplink-radius-sm);
    flex-shrink: 0;
}

.message-input__reply-close:hover {
    color: var(--uplink-text-primary);
    background: rgba(255, 255, 255, 0.08);
}
```

---

## Фича 3: Markdown-рендеринг

### Что рендерить

Минимальный набор (без внешних библиотек):
- **Жирный:** `**текст**` → `<strong>`
- **Курсив:** `*текст*` или `_текст_` → `<em>`
- **Зачёркнутый:** `~~текст~~` → `<del>`
- **Инлайн-код:** `` `код` `` → `<code>`
- **Блок кода:** ` ```язык\nкод\n``` ` → `<pre><code>` (уже есть CodeSnippet)
- **Ссылки:** автодетект URL → `<a href>`
- **Цитата:** `> текст` → `<blockquote>`

### Реализация

Создать утилиту `web/src/utils/markdown.ts`:

```typescript
/**
 * Легковесный markdown-рендер для сообщений.
 * Без внешних библиотек — регулярки + DOM sanitization.
 * Не покрывает весь CommonMark — только часто используемые элементы.
 */
export function renderMarkdown(text: string): string {
    let html = escapeHtml(text);

    // Блоки кода (```...```) — обрабатываем первыми, чтобы не ломать содержимое
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre class="md-code-block" data-lang="${lang}"><code>${code}</code></pre>`
    );

    // Инлайн-код
    html = html.replace(/`([^`\n]+)`/g, '<code class="md-inline-code">$1</code>');

    // Жирный
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Курсив (после жирного!)
    html = html.replace(/(?<!\*)\*([^\*\n]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '<em>$1</em>');

    // Зачёркнутый
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Цитата (строка начинающаяся с >)
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');

    // Ссылки (автодетект URL)
    html = html.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    return html;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
```

### MessageBubble — использование

Вместо `{message.body}` → `<span dangerouslySetInnerHTML={{ __html: renderMarkdown(message.body) }} />`.

**Важно:** escapeHtml вызывается первой — XSS-безопасно. Но нужно проверить что CodeSnippet-логика (уже есть в MessageBubble) не конфликтует с markdown-рендером. Возможно, нужно рендерить код-блоки через CodeSnippet, а markdown — для остального текста.

### CSS

```css
.md-inline-code {
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: var(--uplink-font-mono);
    font-size: 0.9em;
    color: var(--uplink-text-primary);
}

.md-code-block {
    background: var(--uplink-code-bg);
    border: 1px solid var(--uplink-border);
    border-radius: var(--uplink-radius-md);
    padding: 10px 12px;
    margin: 4px 0;
    overflow-x: auto;
    max-width: 600px;
}

.md-code-block code {
    font-family: var(--uplink-font-mono);
    font-size: 13px;
    line-height: 1.5;
    white-space: pre;
}

.md-quote {
    border-left: 3px solid var(--uplink-text-faint);
    padding-left: 10px;
    color: var(--uplink-text-muted);
    margin: 4px 0;
}
```

---

## Фича 4: Typing Indicator

### Как работает в Matrix

SDK: `client.sendTyping(roomId, true, 5000)` — отправить "набирает", таймаут 5 сек.
Слушать: событие `RoomMemberEvent.Typing` или `RoomEvent.Typing`.

### MatrixService

`sendTyping` уже есть. Нужно добавить слушатель для входящих typing:

```typescript
private _typingListeners = new Set<Listener<(roomId: string, userIds: string[]) => void>>();

onTyping(fn: (roomId: string, userIds: string[]) => void): () => void {
    this._typingListeners.add(fn);
    return () => { this._typingListeners.delete(fn); };
}
```

В `initClient`, после подписки на timeline:
```typescript
this.client.on(sdk.RoomMemberEvent.Typing, (event: sdk.MatrixEvent, member: sdk.RoomMember) => {
    const room = this.client!.getRoom(member.roomId);
    if (!room) return;
    const typingMembers = room.currentState
        .getStateEvents('m.typing')  // не так — typing не state event
    // Правильный способ:
    const typingUserIds = (room as any).getTypingMembers?.() ||
        room.currentState.getMembers()
            .filter(m => (m as any).typing)
            .map(m => m.userId)
            .filter(id => id !== this.client!.getUserId());
    this._typingListeners.forEach(fn => fn(room.roomId, typingUserIds));
});
```

**Примечание:** matrix-js-sdk хранит typing status на уровне Room. Проверить: `room.currentState` может не иметь typing — нужно слушать `RoomEvent.Typing` напрямую и читать `event.getContent().user_ids`.

Правильный подход:
```typescript
this.client.on('RoomMember.typing' as any, (event: any, member: any) => {
    if (!this.client) return;
    const roomId = member.roomId;
    const room = this.client.getRoom(roomId);
    if (!room) return;
    // Получить список набирающих через Room API
    const members = room.getMembers();
    const typingIds = members
        .filter((m: any) => m.typing)
        .map((m: any) => m.userId)
        .filter((id: string) => id !== this.client!.getUserId());
    this._typingListeners.forEach(fn => fn(roomId, typingIds));
});
```

### useMessages — добавить typingUsers

```typescript
const [typingUsers, setTypingUsers] = useState<string[]>([]);

useEffect(() => {
    if (!roomId) return;
    const unsub = matrixService.onTyping((rid, userIds) => {
        if (rid === roomId) setTypingUsers(userIds);
    });
    return unsub;
}, [roomId]);
```

### MessageInput — отправка typing

В textarea `onChange`:
```typescript
const handleChange = (e) => {
    setText(e.target.value);
    matrixService.sendTyping(roomId, e.target.value.length > 0);
};
```

При отправке и при unmount — `sendTyping(roomId, false)`.

### UI — под MessageList

```tsx
{typingUsers.length > 0 && (
    <div className="typing-indicator">
        <span className="typing-indicator__dots">
            <span /><span /><span />
        </span>
        <span className="typing-indicator__text">
            {typingUsers.map(id => matrixService.getDisplayName(id)).join(', ')}
            {typingUsers.length === 1 ? ' набирает...' : ' набирают...'}
        </span>
    </div>
)}
```

### CSS

```css
.typing-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 16px 8px 72px;
    font-size: 12px;
    color: var(--uplink-text-muted);
    min-height: 24px;
}

.typing-indicator__dots {
    display: flex;
    gap: 3px;
}

.typing-indicator__dots span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--uplink-text-muted);
    animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-indicator__dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator__dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
}
```

---

## Фича 5: Закреплённые сообщения (Pinned)

### Как работает в Matrix

State event `m.room.pinned_events`:
```json
{
  "type": "m.room.pinned_events",
  "content": {
    "pinned": ["$event_id_1", "$event_id_2"]
  },
  "state_key": ""
}
```

Добавление — отправить обновлённый state с добавленным event_id. Удаление — то же без него.

### MatrixService

```typescript
async pinMessage(roomId: string, eventId: string): Promise<void> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    const room = this.client.getRoom(roomId);
    if (!room) return;
    const current = room.currentState
        .getStateEvents('m.room.pinned_events', '')
        ?.getContent()?.pinned || [];
    if (current.includes(eventId)) return;
    await this.client.sendStateEvent(roomId, 'm.room.pinned_events' as any, {
        pinned: [...current, eventId],
    }, '');
}

async unpinMessage(roomId: string, eventId: string): Promise<void> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    const room = this.client.getRoom(roomId);
    if (!room) return;
    const current = room.currentState
        .getStateEvents('m.room.pinned_events', '')
        ?.getContent()?.pinned || [];
    await this.client.sendStateEvent(roomId, 'm.room.pinned_events' as any, {
        pinned: current.filter((id: string) => id !== eventId),
    }, '');
}

getPinnedEventIds(roomId: string): string[] {
    if (!this.client) return [];
    const room = this.client.getRoom(roomId);
    if (!room) return [];
    return room.currentState
        .getStateEvents('m.room.pinned_events', '')
        ?.getContent()?.pinned || [];
}
```

### UI

**В action-bar** (hover на сообщение) — кнопка 📌 (pin/unpin). Доступна всем (или только админам — решить).

**В RoomHeader** — иконка 📌 с счётчиком. По клику — выпадающий список закреплённых сообщений. Каждый элемент — автор + текст + кнопка "Перейти" (скролл к сообщению) + кнопка "Открепить".

Отложить полный UI закреплённых на потом, если сложно. Минимум — pin/unpin кнопки и индикатор 📌 рядом с закреплённым сообщением в timeline.

---

## Общий action-bar на сообщении

Все три действия (реакция, ответ, закрепить) живут в одном hover-баре:

```tsx
<div className="message-bubble__action-bar">
    <button className="message-bubble__action-btn" onClick={openEmojiPicker} title="Реакция">😀</button>
    <button className="message-bubble__action-btn" onClick={() => setReplyTo(msg)} title="Ответить">↩</button>
    <button className="message-bubble__action-btn" onClick={() => togglePin(msg.eventId)} title="Закрепить">📌</button>
</div>
```

---

## Порядок реализации

Рекомендуемый порядок (каждый шаг — рабочий коммит):

1. **Markdown-рендер** — изолирован, не ломает ничего. Создать `utils/markdown.ts`, применить в MessageBubble.
2. **Action-bar** — hover-панель на сообщении (пустые кнопки). Инфраструктура для реакций, reply, pin.
3. **Reply** — кнопка в action-bar → state replyTo → превью в MessageInput → sendReply → цитата в MessageBubble.
4. **Реакции** — кнопка в action-bar → quick picker → sendReaction → агрегация → chips под сообщением.
5. **Typing indicator** — слушатель typing → UI под message list → отправка typing из MessageInput.
6. **Pinned messages** — pin/unpin через action-bar → индикатор 📌 в timeline. Панель закреплённых в RoomHeader — если успеваем.

## Файлы

Новые:
- `web/src/utils/markdown.ts`

Изменённые:
- `web/src/matrix/MatrixService.ts` — sendReaction, removeReaction, sendReply, pinMessage, unpinMessage, getPinnedEventIds, onTyping
- `web/src/hooks/useMessages.ts` — реакции агрегация, replyTo state, typingUsers
- `web/src/components/MessageBubble.tsx` — action-bar, реакции chips, reply цитата, markdown рендер, pin индикатор
- `web/src/components/MessageInput.tsx` — reply превью, typing отправка
- `web/src/components/MessageList.tsx` — typing indicator
- `web/src/components/RoomHeader.tsx` — pinned count (опционально)
- `web/src/styles/chat.css` — все новые стили

## Коммиты

```
[chat] Markdown-рендеринг в сообщениях (жирный, курсив, код, ссылки, цитаты)
[chat] Action-bar на сообщениях + ответ на сообщение (reply с цитатой)
[chat] Emoji-реакции на сообщения
[chat] Typing indicator (индикатор набора)
[chat] Закреплённые сообщения (pin/unpin)
```
