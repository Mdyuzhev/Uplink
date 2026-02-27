# 024 — Треды (ветки обсуждений в сообщениях)

## Контекст

Треды — одна из ключевых фич, отличающих серьёзный мессенджер от простого чата. Позволяют обсуждать конкретное сообщение в боковой ветке, не засоряя основной timeline. Есть у Slack, Discord (forum channels), Element, Cinny (начальная поддержка).

Matrix поддерживает треды нативно с версии 1.4 (MSC3440). Synapse поддерживает. matrix-js-sdk имеет класс `Thread` с полным API. Наш стек готов — нужна только фронтенд-реализация.

**Зависимость:** задача 023 (action-bar на сообщениях). Кнопка "Создать тред" добавляется в тот же action-bar.

## Как работают треды в Matrix (MSC3440)

### Создание сообщения в треде

Сообщение в треде — это обычный `m.room.message` с `m.relates_to.rel_type: "m.thread"`:

```json
{
  "type": "m.room.message",
  "content": {
    "msgtype": "m.text",
    "body": "Текст ответа в треде",
    "m.relates_to": {
      "rel_type": "m.thread",
      "event_id": "$thread_root_event_id",
      "is_falling_back": true,
      "m.in_reply_to": {
        "event_id": "$thread_root_event_id"
      }
    }
  }
}
```

- `event_id` — **всегда** указывает на корневое сообщение треда (root), НЕ на предыдущее сообщение в ветке.
- `is_falling_back: true` — означает что `m.in_reply_to` используется как fallback для клиентов без поддержки тредов. Они увидят это как обычный reply.
- Если нужен reply внутри треда (ответ на конкретное сообщение в ветке): `is_falling_back: false`, `m.in_reply_to.event_id` → ID того сообщения.

### Вложенные треды

Вложенные треды **не поддерживаются**. Если пользователь пытается создать тред от сообщения, которое уже в треде, — создаётся ответ в том же треде.

### Агрегация на корневом сообщении

Synapse возвращает сводку треда в `unsigned.m.relations` корневого события:

```json
{
  "event_id": "$root_event",
  "unsigned": {
    "m.relations": {
      "m.thread": {
        "latest_event": { /* последнее сообщение в треде */ },
        "count": 7,
        "current_user_participated": true
      }
    }
  }
}
```

### matrix-js-sdk Thread API

SDK предоставляет класс `Thread`:
```typescript
// Получить треды комнаты
const threads = room.getThreads(); // Thread[]

// Каждый Thread имеет:
thread.id           // event_id корневого сообщения
thread.length       // количество сообщений
thread.events       // MatrixEvent[] — все события треда
thread.rootEvent    // корневое сообщение
thread.replyToEvent // последнее сообщение

// Подписка на обновления
room.on(ThreadEvent.New, (thread) => { ... });
room.on(ThreadEvent.Update, (thread) => { ... });
```

Для загрузки тредов серверная пагинация:
```typescript
// Загрузить события треда
await client.paginateEventTimeline(thread.liveTimeline, { backwards: true, limit: 50 });
```

### Фильтрация основного timeline

Важно: сообщения в тредах **по-прежнему приходят в основной timeline** комнаты. Клиент должен сам решить — показывать их или скрывать. Типичный подход:

- В основном timeline показывать только корневые сообщения тредов (с индикатором "N ответов").
- Сообщения с `rel_type: "m.thread"` скрывать из основного timeline.
- В панели треда — показывать все сообщения ветки.


## Архитектура UI

### Компоновка

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar │        Main Timeline        │  Thread Panel   │
│         │                              │  (опционально)  │
│         │  [msg] корень треда          │                 │
│         │    💬 3 ответа →             │  Тред           │
│         │                              │  ────────────── │
│         │  [msg] обычное               │  [root msg]     │
│         │  [msg] обычное               │  [reply 1]      │
│         │                              │  [reply 2]      │
│         │                              │  [reply 3]      │
│         │                              │  ────────────── │
│         │                              │  [input]        │
└─────────────────────────────────────────────────────────┘
```

Thread Panel — боковая панель справа, открывается при клике на тред. Перекрывает или сужает основной chat-main. На мобильных — полноэкранная, с кнопкой "Назад".

### UX-паттерн (как в Slack/Discord)

1. Пользователь видит сообщение в основном timeline.
2. Hover → action-bar → кнопка 💬 "Тред".
3. Клик → справа открывается Thread Panel с корневым сообщением наверху и ответами ниже.
4. Внизу панели — поле ввода для ответа в тред.
5. В основном timeline под корневым сообщением — компактный индикатор: "💬 3 ответа • Последний: Вася, 14:32".
6. Клик на индикатор → тоже открывает Thread Panel.
7. Закрытие панели — кнопка ✕ в заголовке Thread Panel.


## Шаг 1. MatrixService — методы для тредов

Файл: `web/src/matrix/MatrixService.ts`

### 1.1. Отправка сообщения в тред

```typescript
/**
 * Отправить сообщение в тред.
 * threadRootId — event_id корневого сообщения треда.
 * Если тред ещё не существует — первый вызов создаёт его.
 */
async sendThreadMessage(roomId: string, threadRootId: string, body: string): Promise<void> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    await this.client.sendEvent(roomId, 'm.room.message' as any, {
        msgtype: 'm.text',
        body,
        'm.relates_to': {
            rel_type: 'm.thread',
            event_id: threadRootId,
            is_falling_back: true,
            'm.in_reply_to': {
                event_id: threadRootId,
            },
        },
    });
}
```

### 1.2. Получение сводки тредов

```typescript
interface ThreadSummary {
    rootEventId: string;
    replyCount: number;
    lastReply?: {
        sender: string;
        body: string;
        ts: number;
    };
    participated: boolean;
}

/**
 * Получить сводку треда из bundled aggregations корневого события.
 */
getThreadSummary(roomId: string, eventId: string): ThreadSummary | null {
    if (!this.client) return null;
    const room = this.client.getRoom(roomId);
    if (!room) return null;

    const threads = room.getThreads();
    const thread = threads.find(t => t.id === eventId);
    if (!thread || thread.length === 0) return null;

    const lastEvent = thread.replyToEvent;

    return {
        rootEventId: eventId,
        replyCount: thread.length,
        lastReply: lastEvent ? {
            sender: this.getDisplayName(lastEvent.getSender()!),
            body: lastEvent.getContent()?.body || '',
            ts: lastEvent.getTs(),
        } : undefined,
        participated: thread.events.some(
            e => e.getSender() === this.client!.getUserId()
        ),
    };
}
```

### 1.3. Получение сообщений треда

```typescript
/**
 * Получить все сообщения треда.
 * Возвращает отсортированные по времени события.
 */
getThreadMessages(roomId: string, threadRootId: string): sdk.MatrixEvent[] {
    if (!this.client) return [];
    const room = this.client.getRoom(roomId);
    if (!room) return [];

    const thread = room.getThreads().find(t => t.id === threadRootId);
    if (!thread) return [];

    return thread.events
        .filter(e => e.getType() === 'm.room.message' || e.getType() === 'm.room.encrypted')
        .sort((a, b) => a.getTs() - b.getTs());
}

/**
 * Подписка на обновления тредов в комнате.
 */
private _threadListeners = new Set<Listener<(roomId: string, threadRootId: string) => void>>();

onThreadUpdate(fn: (roomId: string, threadRootId: string) => void): () => void {
    this._threadListeners.add(fn);
    return () => { this._threadListeners.delete(fn); };
}
```

В `initClient`, после существующих подписок:
```typescript
// Подписка на новые и обновлённые треды
this.client.on('Thread.update' as any, (thread: any) => {
    if (!thread?.roomId || !thread?.id) return;
    this._threadListeners.forEach(fn => fn(thread.roomId, thread.id));
    this.emitRoomsUpdated();
});

this.client.on('Thread.new' as any, (thread: any) => {
    if (!thread?.roomId || !thread?.id) return;
    this._threadListeners.forEach(fn => fn(thread.roomId, thread.id));
    this.emitRoomsUpdated();
});
```

### 1.4. Включение поддержки тредов в клиенте

При инициализации клиента (`startClient`) нужно включить поддержку тредов:

```typescript
await this.client.startClient({
    initialSyncLimit: 20,
    threadSupport: true,  // ДОБАВИТЬ
});
```

Без этого SDK не будет парсить `m.thread` relations и класс Thread не будет работать.


## Шаг 2. useThread — хук для работы с тредом

Файл: `web/src/hooks/useThread.ts` (новый)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { matrixService } from '../matrix/MatrixService';

interface ThreadMessage {
    eventId: string;
    sender: string;
    senderName: string;
    body: string;
    ts: number;
    type: string;
    content: any;
}

export function useThread(roomId: string | null, threadRootId: string | null) {
    const [messages, setMessages] = useState<ThreadMessage[]>([]);
    const [rootMessage, setRootMessage] = useState<ThreadMessage | null>(null);

    const refresh = useCallback(() => {
        if (!roomId || !threadRootId) {
            setMessages([]);
            setRootMessage(null);
            return;
        }

        // Корневое сообщение
        const client = matrixService.getClient();
        const room = client.getRoom(roomId);
        const rootEvent = room?.findEventById(threadRootId);
        if (rootEvent) {
            setRootMessage({
                eventId: threadRootId,
                sender: rootEvent.getSender()!,
                senderName: matrixService.getDisplayName(rootEvent.getSender()!),
                body: rootEvent.getContent()?.body || '',
                ts: rootEvent.getTs(),
                type: rootEvent.getType(),
                content: rootEvent.getContent(),
            });
        }

        // Сообщения треда
        const events = matrixService.getThreadMessages(roomId, threadRootId);
        setMessages(events.map(e => ({
            eventId: e.getId()!,
            sender: e.getSender()!,
            senderName: matrixService.getDisplayName(e.getSender()!),
            body: e.getContent()?.body || '',
            ts: e.getTs(),
            type: e.getType(),
            content: e.getContent(),
        })));
    }, [roomId, threadRootId]);

    useEffect(() => {
        refresh();
        if (!roomId) return;

        const unsub = matrixService.onThreadUpdate((rid, tid) => {
            if (rid === roomId && tid === threadRootId) refresh();
        });
        // Также слушать новые сообщения
        const unsub2 = matrixService.onNewMessage((rid) => {
            if (rid === roomId) refresh();
        });
        return () => { unsub(); unsub2(); };
    }, [roomId, threadRootId, refresh]);

    const sendMessage = useCallback(async (body: string) => {
        if (!roomId || !threadRootId || !body.trim()) return;
        await matrixService.sendThreadMessage(roomId, threadRootId, body.trim());
    }, [roomId, threadRootId]);

    return { rootMessage, messages, sendMessage, refresh };
}
```


## Шаг 3. ThreadPanel — компонент боковой панели

Файл: `web/src/components/ThreadPanel.tsx` (новый)

### Структура

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { useThread } from '../hooks/useThread';
import { MessageBubble } from './MessageBubble';
import { Avatar } from './Avatar';
import { matrixService } from '../matrix/MatrixService';

interface ThreadPanelProps {
    roomId: string;
    threadRootId: string;
    onClose: () => void;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({ roomId, threadRootId, onClose }) => {
    const { rootMessage, messages, sendMessage } = useThread(roomId, threadRootId);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Автоскролл к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        setSending(true);
        try {
            await sendMessage(input.trim());
            setInput('');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="thread-panel">
            {/* Заголовок */}
            <div className="thread-panel__header">
                <span className="thread-panel__title">Тред</span>
                <button className="thread-panel__close" onClick={onClose}>✕</button>
            </div>

            {/* Корневое сообщение */}
            {rootMessage && (
                <div className="thread-panel__root">
                    <div className="thread-panel__root-header">
                        <Avatar name={rootMessage.senderName} size={24} />
                        <span className="thread-panel__root-sender">{rootMessage.senderName}</span>
                        <span className="thread-panel__root-time">
                            {new Date(rootMessage.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className="thread-panel__root-body">{rootMessage.body}</div>
                </div>
            )}

            <div className="thread-panel__divider">
                <span>{messages.length} {pluralReplies(messages.length)}</span>
            </div>

            {/* Сообщения треда */}
            <div className="thread-panel__messages">
                {messages.map(msg => (
                    <div key={msg.eventId} className="thread-panel__message">
                        <Avatar
                            name={msg.senderName}
                            size={24}
                            imageUrl={matrixService.getUserAvatarUrl(msg.sender, 24) || undefined}
                        />
                        <div className="thread-panel__message-content">
                            <div className="thread-panel__message-header">
                                <span className="thread-panel__message-sender">{msg.senderName}</span>
                                <span className="thread-panel__message-time">
                                    {new Date(msg.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="thread-panel__message-body">{msg.body}</div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Поле ввода */}
            <div className="thread-panel__input">
                <textarea
                    className="thread-panel__textarea"
                    placeholder="Ответить в тред..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button
                    className="thread-panel__send"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                >
                    ➤
                </button>
            </div>
        </div>
    );
};

function pluralReplies(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'ответ';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'ответа';
    return 'ответов';
}
```


## Шаг 4. ThreadIndicator — индикатор под сообщением в основном timeline

Файл: обновить `web/src/components/MessageBubble.tsx`

Под текстом сообщения, если у события есть тред — показать компактный индикатор:

```tsx
{threadSummary && (
    <div className="thread-indicator" onClick={() => onOpenThread(eventId)}>
        <span className="thread-indicator__icon">💬</span>
        <span className="thread-indicator__count">
            {threadSummary.replyCount} {pluralReplies(threadSummary.replyCount)}
        </span>
        {threadSummary.lastReply && (
            <span className="thread-indicator__last">
                {threadSummary.lastReply.sender} • {formatTime(threadSummary.lastReply.ts)}
            </span>
        )}
        <span className="thread-indicator__arrow">→</span>
    </div>
)}
```

### Как получить threadSummary

В useMessages (или в MessageList) — для каждого сообщения вызывать `matrixService.getThreadSummary(roomId, eventId)`. Для оптимизации — кешировать и обновлять по событию `Thread.update`.

### Фильтрация timeline

Сообщения с `rel_type === "m.thread"` не показывать в основном timeline. Фильтровать в useMessages:

```typescript
const visibleMessages = messages.filter(msg => {
    const relation = msg.getRelation?.();
    // Скрыть сообщения, принадлежащие тредам (но показывать корневые)
    if (relation?.rel_type === 'm.thread') return false;
    return true;
});
```

### Кнопка в action-bar

В action-bar сообщения (из задачи 023) добавить кнопку "Тред":
```tsx
<button className="message-bubble__action-btn" onClick={() => onOpenThread(eventId)} title="Тред">
    💬
</button>
```


## Шаг 5. ChatLayout — интеграция Thread Panel

Файл: `web/src/components/ChatLayout.tsx`

### 5.1. Состояние

```typescript
const [activeThread, setActiveThread] = useState<{ roomId: string; threadRootId: string } | null>(null);
```

### 5.2. Колбэк

```typescript
const handleOpenThread = (threadRootId: string) => {
    if (activeRoomId) {
        setActiveThread({ roomId: activeRoomId, threadRootId });
    }
};
```

Передать `onOpenThread={handleOpenThread}` в MessageList → MessageBubble.

### 5.3. Layout

Thread Panel рендерится справа от chat-main:

```tsx
<div className="chat-layout">
    <div className="chat-sidebar">...</div>
    <div className={`chat-main ${activeThread ? 'chat-main--with-thread' : ''}`}>
        {/* ... существующий контент ... */}
    </div>
    {activeThread && (
        <ThreadPanel
            roomId={activeThread.roomId}
            threadRootId={activeThread.threadRootId}
            onClose={() => setActiveThread(null)}
        />
    )}
</div>
```

При смене комнаты — закрывать тред:
```typescript
const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setActiveThread(null); // закрыть тред при смене комнаты
    setMobileView('chat');
    matrixService.markRoomAsRead(roomId).then(() => refresh());
};
```


## Шаг 6. CSS-стили

Файл: `web/src/styles/chat.css`

```css
/* ═══════════════════════════════════
   THREAD PANEL
   ═══════════════════════════════════ */
.thread-panel {
    width: 380px;
    min-width: 380px;
    background: var(--uplink-bg-secondary);
    border-left: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.thread-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
    min-height: 52px;
}

.thread-panel__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--uplink-text-primary);
}

.thread-panel__close {
    background: none;
    border: none;
    color: var(--uplink-text-muted);
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--uplink-radius-sm);
    transition: background 0.15s, color 0.15s;
}

.thread-panel__close:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--uplink-text-primary);
}

/* Корневое сообщение */
.thread-panel__root {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.thread-panel__root-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.thread-panel__root-sender {
    font-size: 14px;
    font-weight: 600;
    color: var(--uplink-text-primary);
}

.thread-panel__root-time {
    font-size: 11px;
    color: var(--uplink-text-faint);
}

.thread-panel__root-body {
    font-size: 14px;
    color: var(--uplink-text-secondary);
    line-height: 1.4;
    word-break: break-word;
    padding-left: 32px;
}

/* Разделитель с количеством */
.thread-panel__divider {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    color: var(--uplink-text-muted);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

/* Сообщения треда */
.thread-panel__messages {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
}

.thread-panel__message {
    display: flex;
    gap: 8px;
    padding: 6px 16px;
    transition: background 0.1s;
}

.thread-panel__message:hover {
    background: rgba(0, 0, 0, 0.06);
}

.thread-panel__message-content {
    flex: 1;
    min-width: 0;
}

.thread-panel__message-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 2px;
}

.thread-panel__message-sender {
    font-size: 13px;
    font-weight: 600;
    color: var(--uplink-text-primary);
}

.thread-panel__message-time {
    font-size: 11px;
    color: var(--uplink-text-faint);
}

.thread-panel__message-body {
    font-size: 14px;
    color: var(--uplink-text-secondary);
    line-height: 1.375;
    word-break: break-word;
}

/* Поле ввода */
.thread-panel__input {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.thread-panel__textarea {
    flex: 1;
    background: var(--uplink-input-bg);
    border: none;
    border-radius: var(--uplink-radius-md);
    color: var(--uplink-text-primary);
    font-size: 14px;
    font-family: var(--uplink-font);
    padding: 10px 12px;
    resize: none;
    outline: none;
    max-height: 120px;
    min-height: 40px;
    line-height: 1.4;
}

.thread-panel__textarea::placeholder {
    color: var(--uplink-text-faint);
}

.thread-panel__send {
    background: var(--uplink-accent);
    border: none;
    color: #fff;
    width: 36px;
    height: 36px;
    border-radius: var(--uplink-radius-sm);
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
}

.thread-panel__send:hover {
    background: var(--uplink-accent-hover);
}

.thread-panel__send:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

/* ═══════════════════════════════════
   THREAD INDICATOR (под сообщением в timeline)
   ═══════════════════════════════════ */
.thread-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    margin-top: 4px;
    border-radius: var(--uplink-radius-sm);
    cursor: pointer;
    font-size: 12px;
    color: var(--uplink-accent);
    transition: background 0.1s;
    width: fit-content;
}

.thread-indicator:hover {
    background: rgba(88, 101, 242, 0.08);
}

.thread-indicator__icon {
    font-size: 14px;
}

.thread-indicator__count {
    font-weight: 600;
}

.thread-indicator__last {
    color: var(--uplink-text-muted);
    font-weight: 400;
}

.thread-indicator__arrow {
    font-size: 10px;
    opacity: 0;
    transition: opacity 0.15s;
}

.thread-indicator:hover .thread-indicator__arrow {
    opacity: 1;
}

/* chat-main сужается когда открыт тред */
.chat-main--with-thread {
    /* flex: 1 уже стоит, thread-panel займёт свои 380px */
}

/* ═══════════════════════════════════
   MOBILE — тред на весь экран
   ═══════════════════════════════════ */
@media (max-width: 768px) {
    .thread-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        width: 100%;
        min-width: 100%;
        z-index: 20;
        border-left: none;
    }
}

@media (max-width: 1024px) and (min-width: 769px) {
    .thread-panel {
        width: 320px;
        min-width: 320px;
    }
}
```


## Порядок реализации

1. **MatrixService** — `sendThreadMessage`, `getThreadSummary`, `getThreadMessages`, `onThreadUpdate`, включить `threadSupport: true` в `startClient`.
2. **useThread** — новый хук.
3. **ThreadPanel** — компонент боковой панели.
4. **MessageBubble** — ThreadIndicator (компактный "💬 3 ответа"), кнопка 💬 в action-bar.
5. **useMessages** — фильтрация thread-сообщений из основного timeline.
6. **ChatLayout** — state `activeThread`, рендер ThreadPanel, передача `onOpenThread` вниз.
7. **CSS** — все стили.
8. **Тест** — создать тред, ответить, проверить что в основном timeline видно только корень + индикатор, в панели — все ответы.


## Файлы

Новые:
- `web/src/components/ThreadPanel.tsx`
- `web/src/hooks/useThread.ts`

Изменённые:
- `web/src/matrix/MatrixService.ts` — методы тредов, threadSupport: true
- `web/src/hooks/useMessages.ts` — фильтрация thread-сообщений, threadSummary
- `web/src/components/MessageBubble.tsx` — ThreadIndicator, кнопка тред в action-bar
- `web/src/components/ChatLayout.tsx` — activeThread state, ThreadPanel рендер
- `web/src/styles/chat.css` — стили ThreadPanel и ThreadIndicator


## Коммит

```
[chat] Треды: боковая панель обсуждений, индикатор в timeline, фильтрация

- ThreadPanel: боковая панель с корневым сообщением, ответами и полем ввода
- useThread: хук для работы с тредом (загрузка, отправка, подписка)
- MatrixService: sendThreadMessage, getThreadSummary, getThreadMessages, threadSupport
- MessageBubble: индикатор "N ответов" под корневым сообщением, кнопка 💬
- useMessages: фильтрация thread-сообщений из основного timeline
- ChatLayout: интеграция ThreadPanel, закрытие при смене комнаты
- Адаптив: на мобильных тред открывается на весь экран
```
