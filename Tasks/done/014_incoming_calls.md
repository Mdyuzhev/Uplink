# 014: Входящие звонки — рингтон, принять/отклонить

## Цель

Сделать полноценный flow звонка: вызов → рингтон у собеседника → принять/отклонить → таймер с момента соединения.

### Сейчас (сломано)

1. Nastya нажимает «Позвонить» в DM с Misha
2. Nastya сразу попадает в LiveKit-комнату, таймер тикает
3. Misha **ничего не видит** — никакого уведомления
4. Если Misha сам нажмёт «Позвонить» — попадёт в ту же комнату, но это не UX звонка

### Как должно быть

1. Nastya нажимает «Позвонить» в DM с Misha
2. У Nastya: **«Вызов... Misha»** (кнопка «Отмена»). Nastya ещё НЕ в LiveKit
3. У Misha: **«Входящий звонок от Nastya»** (кнопки «Принять» / «Отклонить»)
4. Misha нажимает **«Принять»** → оба подключаются к LiveKit → таймер стартует
5. Если Misha нажимает **«Отклонить»** → Nastya видит «Звонок отклонён»
6. Если Misha не отвечает 30 сек → автоотмена, Nastya видит «Нет ответа»

## Архитектура

Сигнализация звонков через **Matrix room events** (кастомные типы). Это переиспользует существующий real-time sync — не нужен отдельный сигнальный сервер.

### Кастомные события

```
uplink.call.invite    — «Я звоню тебе» (отправляет звонящий)
uplink.call.answer    — «Я принял звонок» (отправляет принимающий)
uplink.call.reject    — «Я отклонил звонок» (отправляет принимающий)
uplink.call.hangup    — «Я завершил/отменил» (отправляет любой)
```

Содержимое события:

```json
{
    "call_id": "uuid-v4",
    "party_id": "@nastya:uplink.local",
    "lifetime": 30000
}
```

- `call_id` — уникальный ID звонка (UUID), связывает invite/answer/reject/hangup
- `party_id` — кто отправил событие
- `lifetime` — сколько мс ждать ответа (30 сек)

### Flow

```
Nastya                        Matrix                         Misha
  |                             |                              |
  |-- uplink.call.invite ------>|---------------------------->>|
  |   UI: "Вызов Misha..."     |                    UI: "Входящий от Nastya"
  |                             |                              |
  |                             |<<-- uplink.call.answer ------|
  |<<---------------------------|                              |
  |                             |                              |
  | Оба подключаются к LiveKit                                 |
  | Таймер стартует                                            |
```

## Зависимости

- Задача 005 (LiveKit звонки) — **выполнена** ✅
- Задача 013 (Звонки в DM, room.id) — **выполнена** ✅

## Текущие файлы

```
web/src/
├── livekit/
│   └── LiveKitService.ts       # joinCall, leaveCall, fetchToken — НЕ МЕНЯТЬ CORE
├── hooks/
│   └── useLiveKit.ts           # React-обёртка LiveKitService
├── components/
│   ├── ChatLayout.tsx          # handleJoinCall → joinCall(activeRoom.id)
│   ├── RoomHeader.tsx          # кнопка звонка
│   └── CallBar.tsx             # панель активного звонка (участники, mute, таймер)
└── matrix/
    └── MatrixService.ts        # sendMessage, getClient, onNewMessage
```

---

## ЧАСТЬ 1: Сервис сигнализации звонков

### ШАГ 1.1. Создать CallSignalingService

Файл: `E:\Uplink\web\src\livekit\CallSignalingService.ts`

Отдельный сервис (singleton) — отвечает только за сигнализацию (invite/answer/reject/hangup) через Matrix events. Не трогает LiveKitService.

```typescript
/**
 * Сигнализация звонков через Matrix room events.
 *
 * Отправляет и слушает кастомные события:
 * - uplink.call.invite  — исходящий вызов
 * - uplink.call.answer  — принятие звонка
 * - uplink.call.reject  — отклонение звонка
 * - uplink.call.hangup  — завершение/отмена звонка
 *
 * НЕ управляет LiveKit-подключением — только сигнализация.
 */

import { matrixService } from '../matrix/MatrixService';

export type CallDirection = 'outgoing' | 'incoming';
export type CallSignalState =
    | 'idle'           // нет звонка
    | 'ringing-out'    // исходящий, ждём ответа
    | 'ringing-in'     // входящий, решаем принять/отклонить
    | 'accepted'       // звонок принят, подключаемся к LiveKit
    | 'rejected'       // отклонён
    | 'no-answer'      // не ответили (таймаут)
    | 'ended';         // завершён (hangup)

export interface CallInfo {
    callId: string;
    roomId: string;          // Matrix room ID
    callerId: string;        // кто звонит
    callerName: string;      // display name звонящего
    direction: CallDirection;
}

type CallSignalListener = (state: CallSignalState, info: CallInfo | null) => void;

const CALL_LIFETIME_MS = 30_000; // 30 секунд на ответ

class CallSignalingService {
    private _state: CallSignalState = 'idle';
    private _currentCall: CallInfo | null = null;
    private _timeoutId: ReturnType<typeof setTimeout> | null = null;
    private _listeners = new Set<CallSignalListener>();
    private _matrixListenerUnsub: (() => void) | null = null;

    get state(): CallSignalState { return this._state; }
    get currentCall(): CallInfo | null { return this._currentCall; }

    /** Подписка на изменения состояния */
    onStateChange(fn: CallSignalListener): () => void {
        this._listeners.add(fn);
        return () => { this._listeners.delete(fn); };
    }

    /**
     * Начать слушать Matrix-события звонков.
     * Вызывать после успешного логина.
     */
    startListening(): void {
        if (this._matrixListenerUnsub) return;

        const client = matrixService.getClient();
        const handler = (_event: any, room: any) => {
            // Обработка через onNewMessage не подходит — нужен Timeline listener
            // напрямую, т.к. кастомные события не проходят фильтр m.room.message
        };

        // Слушаем ВСЕ timeline-события (включая кастомные)
        client.on('Room.timeline' as any, (event: any, room: any) => {
            const type = event.getType();
            if (!type.startsWith('uplink.call.')) return;

            const content = event.getContent();
            const senderId = event.getSender();
            const myUserId = matrixService.getUserId();

            // Игнорируем свои собственные события
            if (senderId === myUserId) return;

            // Игнорируем старые события (при initial sync)
            const eventAge = Date.now() - event.getTs();
            if (eventAge > CALL_LIFETIME_MS + 5000) return;

            this.handleIncomingEvent(type, content, senderId, room.roomId);
        });
    }

    /**
     * Остановить слушание (при logout).
     */
    stopListening(): void {
        if (this._matrixListenerUnsub) {
            this._matrixListenerUnsub();
            this._matrixListenerUnsub = null;
        }
        this.clearTimeout();
        this.setState('idle', null);
    }

    /**
     * Инициировать исходящий звонок.
     */
    async startCall(roomId: string, calleeDisplayName: string): Promise<void> {
        if (this._state !== 'idle') {
            console.warn('Уже в звонке/вызове');
            return;
        }

        const callId = crypto.randomUUID();
        const myUserId = matrixService.getUserId();

        const info: CallInfo = {
            callId,
            roomId,
            callerId: myUserId,
            callerName: matrixService.getDisplayName(myUserId),
            direction: 'outgoing',
        };

        // Отправить invite в Matrix-комнату
        await this.sendCallEvent(roomId, 'uplink.call.invite', {
            call_id: callId,
            party_id: myUserId,
            lifetime: CALL_LIFETIME_MS,
        });

        this._currentCall = info;
        this.setState('ringing-out', info);

        // Таймаут — нет ответа
        this._timeoutId = setTimeout(() => {
            if (this._state === 'ringing-out') {
                this.sendCallEvent(roomId, 'uplink.call.hangup', {
                    call_id: callId,
                    party_id: myUserId,
                    reason: 'no_answer',
                });
                this.setState('no-answer', info);
                // Через 2 сек вернуть в idle
                setTimeout(() => this.setState('idle', null), 2000);
            }
        }, CALL_LIFETIME_MS);
    }

    /**
     * Принять входящий звонок.
     */
    async acceptCall(): Promise<void> {
        if (this._state !== 'ringing-in' || !this._currentCall) return;

        const { callId, roomId } = this._currentCall;
        const myUserId = matrixService.getUserId();

        await this.sendCallEvent(roomId, 'uplink.call.answer', {
            call_id: callId,
            party_id: myUserId,
        });

        this.clearTimeout();
        this.setState('accepted', this._currentCall);
    }

    /**
     * Отклонить входящий звонок.
     */
    async rejectCall(): Promise<void> {
        if (this._state !== 'ringing-in' || !this._currentCall) return;

        const { callId, roomId } = this._currentCall;
        const myUserId = matrixService.getUserId();

        await this.sendCallEvent(roomId, 'uplink.call.reject', {
            call_id: callId,
            party_id: myUserId,
        });

        this.clearTimeout();
        this.setState('rejected', this._currentCall);
        setTimeout(() => this.setState('idle', null), 2000);
    }

    /**
     * Отменить исходящий звонок / завершить принятый.
     */
    async cancelOrHangup(): Promise<void> {
        if (!this._currentCall) return;

        const { callId, roomId } = this._currentCall;
        const myUserId = matrixService.getUserId();

        await this.sendCallEvent(roomId, 'uplink.call.hangup', {
            call_id: callId,
            party_id: myUserId,
        });

        this.clearTimeout();
        this.setState('ended', this._currentCall);
        setTimeout(() => this.setState('idle', null), 1000);
    }

    /**
     * Сброс состояния в idle (вызывать после leaveCall в LiveKit).
     */
    reset(): void {
        this.clearTimeout();
        this.setState('idle', null);
    }

    // === Внутренние методы ===

    private handleIncomingEvent(type: string, content: any, senderId: string, roomId: string): void {
        const callId = content.call_id;
        if (!callId) return;

        switch (type) {
            case 'uplink.call.invite': {
                // Входящий звонок — показать UI
                if (this._state !== 'idle') {
                    // Уже в звонке — автоматически отклонить
                    this.sendCallEvent(roomId, 'uplink.call.reject', {
                        call_id: callId,
                        party_id: matrixService.getUserId(),
                        reason: 'busy',
                    });
                    return;
                }

                const info: CallInfo = {
                    callId,
                    roomId,
                    callerId: senderId,
                    callerName: matrixService.getDisplayName(senderId),
                    direction: 'incoming',
                };

                this._currentCall = info;
                this.setState('ringing-in', info);

                // Таймаут — автоотклонение
                this._timeoutId = setTimeout(() => {
                    if (this._state === 'ringing-in') {
                        this.setState('idle', null);
                    }
                }, CALL_LIFETIME_MS);
                break;
            }

            case 'uplink.call.answer': {
                // Собеседник принял — переходим в accepted
                if (this._state === 'ringing-out' && this._currentCall?.callId === callId) {
                    this.clearTimeout();
                    this.setState('accepted', this._currentCall);
                }
                break;
            }

            case 'uplink.call.reject': {
                // Собеседник отклонил
                if (this._state === 'ringing-out' && this._currentCall?.callId === callId) {
                    this.clearTimeout();
                    const reason = content.reason === 'busy' ? 'Занят' : 'Отклонено';
                    this.setState('rejected', this._currentCall);
                    setTimeout(() => this.setState('idle', null), 2000);
                }
                break;
            }

            case 'uplink.call.hangup': {
                // Собеседник повесил трубку / отменил
                if (this._currentCall?.callId === callId) {
                    this.clearTimeout();
                    this.setState('ended', this._currentCall);
                    setTimeout(() => this.setState('idle', null), 1000);
                }
                break;
            }
        }
    }

    private async sendCallEvent(roomId: string, eventType: string, content: object): Promise<void> {
        try {
            const client = matrixService.getClient();
            await client.sendEvent(roomId, eventType as any, content);
        } catch (err) {
            console.error(`Ошибка отправки ${eventType}:`, err);
        }
    }

    private setState(state: CallSignalState, info: CallInfo | null): void {
        this._state = state;
        this._currentCall = info;
        this._listeners.forEach(fn => fn(state, info));
    }

    private clearTimeout(): void {
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
    }
}

export const callSignalingService = new CallSignalingService();
```

---

## ЧАСТЬ 2: React Hook — useCallSignaling

### ШАГ 2.1. Создать хук

Файл: `E:\Uplink\web\src\hooks\useCallSignaling.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { callSignalingService, CallSignalState, CallInfo } from '../livekit/CallSignalingService';

/**
 * React-хук для сигнализации звонков.
 * Слушает изменения состояния и предоставляет методы управления.
 */
export function useCallSignaling() {
    const [signalState, setSignalState] = useState<CallSignalState>(callSignalingService.state);
    const [callInfo, setCallInfo] = useState<CallInfo | null>(callSignalingService.currentCall);

    useEffect(() => {
        const unsub = callSignalingService.onStateChange((state, info) => {
            setSignalState(state);
            setCallInfo(info);
        });
        return unsub;
    }, []);

    const startCall = useCallback(async (roomId: string, calleeName: string) => {
        await callSignalingService.startCall(roomId, calleeName);
    }, []);

    const acceptCall = useCallback(async () => {
        await callSignalingService.acceptCall();
    }, []);

    const rejectCall = useCallback(async () => {
        await callSignalingService.rejectCall();
    }, []);

    const cancelCall = useCallback(async () => {
        await callSignalingService.cancelOrHangup();
    }, []);

    const resetSignaling = useCallback(() => {
        callSignalingService.reset();
    }, []);

    return {
        signalState,
        callInfo,
        startCall,
        acceptCall,
        rejectCall,
        cancelCall,
        resetSignaling,
    };
}
```

---

## ЧАСТЬ 3: Компонент входящего звонка

### ШАГ 3.1. Создать IncomingCallOverlay

Файл: `E:\Uplink\web\src\components\IncomingCallOverlay.tsx`

```tsx
import React from 'react';
import { CallInfo } from '../livekit/CallSignalingService';

interface IncomingCallOverlayProps {
    callInfo: CallInfo;
    onAccept: () => void;
    onReject: () => void;
}

/**
 * Оверлей входящего звонка.
 * Показывается поверх UI когда кто-то звонит.
 */
export const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
    callInfo, onAccept, onReject,
}) => {
    return (
        <div className="incoming-call-overlay">
            <div className="incoming-call-overlay__card">
                <div className="incoming-call-overlay__icon">📞</div>
                <div className="incoming-call-overlay__title">Входящий звонок</div>
                <div className="incoming-call-overlay__caller">{callInfo.callerName}</div>
                <div className="incoming-call-overlay__actions">
                    <button
                        className="incoming-call-overlay__btn incoming-call-overlay__btn--reject"
                        onClick={onReject}
                    >
                        Отклонить
                    </button>
                    <button
                        className="incoming-call-overlay__btn incoming-call-overlay__btn--accept"
                        onClick={onAccept}
                    >
                        Принять
                    </button>
                </div>
            </div>
        </div>
    );
};
```

### ШАГ 3.2. Создать OutgoingCallOverlay

Файл: `E:\Uplink\web\src\components\OutgoingCallOverlay.tsx`

```tsx
import React from 'react';

interface OutgoingCallOverlayProps {
    calleeName: string;
    onCancel: () => void;
}

/**
 * Оверлей исходящего звонка.
 * Показывается пока ждём ответа собеседника.
 */
export const OutgoingCallOverlay: React.FC<OutgoingCallOverlayProps> = ({
    calleeName, onCancel,
}) => {
    return (
        <div className="incoming-call-overlay">
            <div className="incoming-call-overlay__card">
                <div className="incoming-call-overlay__icon">📱</div>
                <div className="incoming-call-overlay__title">Вызов...</div>
                <div className="incoming-call-overlay__caller">{calleeName}</div>
                <div className="incoming-call-overlay__actions">
                    <button
                        className="incoming-call-overlay__btn incoming-call-overlay__btn--reject"
                        onClick={onCancel}
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
};
```

---

## ЧАСТЬ 4: Обновить ChatLayout — связать сигнализацию и LiveKit

### ШАГ 4.1. Обновить ChatLayout.tsx

Файл: `E:\Uplink\web\src\components\ChatLayout.tsx`

Это ключевое изменение. Нажатие кнопки звонка теперь **не подключает к LiveKit сразу**, а отправляет invite. Подключение к LiveKit происходит только когда оба в `accepted`.

Добавить импорты:

```tsx
import { useCallSignaling } from '../hooks/useCallSignaling';
import { callSignalingService } from '../livekit/CallSignalingService';
import { IncomingCallOverlay } from './IncomingCallOverlay';
import { OutgoingCallOverlay } from './OutgoingCallOverlay';
```

Добавить хук и обработчики внутри компонента:

```tsx
const {
    signalState, callInfo, startCall, acceptCall, rejectCall, cancelCall, resetSignaling,
} = useCallSignaling();
```

**Заменить** `handleJoinCall`:

```tsx
    // Кнопка «Позвонить» → отправить invite (НЕ подключаться к LiveKit)
    const handleJoinCall = () => {
        if (activeRoom) {
            const calleeName = activeRoom.type === 'direct'
                ? activeRoom.name
                : activeRoom.name;
            startCall(activeRoom.id, calleeName);
        }
    };
```

**Добавить** обработчик принятия входящего звонка:

```tsx
    // Принять входящий → подключиться к LiveKit
    const handleAcceptCall = async () => {
        await acceptCall();
        // callInfo.roomId = Matrix room ID → используем как LiveKit room name
        if (callInfo) {
            joinCall(callInfo.roomId);
        }
    };
```

**Добавить** эффект: когда signalState переходит в `accepted` у звонящего → подключиться к LiveKit:

```tsx
    useEffect(() => {
        if (signalState === 'accepted' && callInfo?.direction === 'outgoing') {
            joinCall(callInfo.roomId);
        }
    }, [signalState, callInfo, joinCall]);
```

**Добавить** эффект: при завершении LiveKit-звонка сбросить сигнализацию:

```tsx
    useEffect(() => {
        if (callState === 'idle' && signalState === 'accepted') {
            resetSignaling();
        }
    }, [callState, signalState, resetSignaling]);
```

**Обновить** обработчик leaveCall — отправить hangup:

```tsx
    const handleLeaveCall = async () => {
        await leaveCall();
        await callSignalingService.cancelOrHangup();
    };
```

**Добавить** в JSX (перед `</div>` корневого `chat-layout`):

```tsx
    {/* Оверлей исходящего звонка */}
    {signalState === 'ringing-out' && callInfo && (
        <OutgoingCallOverlay
            calleeName={callInfo.callerName}
            onCancel={cancelCall}
        />
    )}

    {/* Оверлей входящего звонка */}
    {signalState === 'ringing-in' && callInfo && (
        <IncomingCallOverlay
            callInfo={callInfo}
            onAccept={handleAcceptCall}
            onReject={rejectCall}
        />
    )}
```

### ШАГ 4.2. Инициализировать слушатель после логина

В `ChatLayout.tsx` добавить эффект для запуска слушателя:

```tsx
    useEffect(() => {
        callSignalingService.startListening();
        return () => callSignalingService.stopListening();
    }, []);
```

---

## ЧАСТЬ 5: Стили

### ШАГ 5.1. Добавить стили в chat.css

Файл: `E:\Uplink\web\src\styles\chat.css`

```css
/* === Incoming/Outgoing Call Overlay === */
.incoming-call-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
}

.incoming-call-overlay__card {
    background: var(--uplink-bg-secondary, #2a2d35);
    border-radius: 16px;
    padding: 32px 40px;
    text-align: center;
    min-width: 280px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.incoming-call-overlay__icon {
    font-size: 48px;
    margin-bottom: 12px;
    animation: pulse 1.5s ease-in-out infinite;
}

.incoming-call-overlay__title {
    font-size: 14px;
    color: var(--uplink-text-muted, #888);
    margin-bottom: 8px;
}

.incoming-call-overlay__caller {
    font-size: 22px;
    font-weight: 600;
    color: var(--uplink-text-primary, #fff);
    margin-bottom: 24px;
}

.incoming-call-overlay__actions {
    display: flex;
    gap: 16px;
    justify-content: center;
}

.incoming-call-overlay__btn {
    padding: 12px 24px;
    border: none;
    border-radius: 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
}

.incoming-call-overlay__btn:hover {
    opacity: 0.85;
}

.incoming-call-overlay__btn--accept {
    background: #4caf50;
    color: white;
}

.incoming-call-overlay__btn--reject {
    background: #f44336;
    color: white;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

---

## ЧАСТЬ 6: Проверка

### ШАГ 6.1. Базовый flow — DM-звонок

1. Открыть http://192.168.1.74:5174
2. Вкладка 1: `@nastya:uplink.local` → DM с Misha
3. Вкладка 2: `@misha:uplink.local` → DM с Nastya
4. Nastya нажимает «Позвонить»
5. У Nastya: оверлей «Вызов... Misha» с кнопкой «Отмена»
6. У Misha: оверлей «Входящий звонок от Nastya» с кнопками «Принять» / «Отклонить»
7. Misha нажимает «Принять»
8. Оба видят CallBar, таймер тикает, аудио работает
9. Nastya нажимает «Завершить» → оба возвращаются в чат

### ШАГ 6.2. Отклонение

1. Nastya звонит Misha
2. Misha нажимает «Отклонить»
3. У Nastya: оверлей показывает «Отклонено» на 2 сек, потом исчезает
4. Никто не подключён к LiveKit

### ШАГ 6.3. Таймаут (нет ответа)

1. Nastya звонит Misha
2. Misha не нажимает ничего 30 секунд
3. У Nastya: «Нет ответа», оверлей исчезает
4. У Misha: оверлей входящего тоже исчезает

### ШАГ 6.4. Отмена звонящим

1. Nastya звонит Misha
2. Nastya нажимает «Отмена» (передумала)
3. У Misha: оверлей входящего исчезает
4. Никто не подключён к LiveKit

### ШАГ 6.5. Звонок в канале (регрессия)

1. Alice → #general → звонок
2. Bob → #general → звонок
3. Оба в CallBar, аудио работает
4. (В каналах — прежний flow: нажал «Позвонить» → сразу подключился. Сигнализация invite/answer — только для DM)

**ВАЖНО:** Для каналов (#general и т.д.) оставить прежнее поведение — нажал кнопку → сразу подключился к LiveKit. Сигнализация invite/answer нужна **только для DM** (room.type === 'direct'). В `handleJoinCall` проверять:

```tsx
const handleJoinCall = () => {
    if (!activeRoom) return;

    if (activeRoom.type === 'direct') {
        // DM → отправить invite, ждать ответа
        startCall(activeRoom.id, activeRoom.name);
    } else {
        // Канал → сразу подключиться (как раньше)
        joinCall(activeRoom.id);
    }
};
```

---

## Критерии приёмки

- [ ] `CallSignalingService` создан — отправляет/слушает Matrix-события
- [ ] `useCallSignaling` hook создан
- [ ] `IncomingCallOverlay` — оверлей входящего звонка (Принять/Отклонить)
- [ ] `OutgoingCallOverlay` — оверлей исходящего звонка (Отмена)
- [ ] DM: звонок → рингтон у собеседника → принять → оба в LiveKit → таймер
- [ ] DM: отклонение → звонящий видит «Отклонено»
- [ ] DM: нет ответа 30 сек → автоотмена
- [ ] DM: отмена звонящим → оверлей у собеседника исчезает
- [ ] Каналы: прежнее поведение (нажал → сразу в LiveKit, без сигнализации)
- [ ] Таймер стартует с момента подключения обоих (не с момента нажатия «Позвонить»)
- [ ] Стили оверлея: тёмный фон, анимация pulse иконки, кнопки accept/reject
- [ ] Задеплоено на сервер

## Коммит

```
[livekit] Входящие звонки: invite/answer/reject через Matrix events

- CallSignalingService: сигнализация через кастомные Matrix-события
- IncomingCallOverlay: UI входящего звонка (Принять/Отклонить)
- OutgoingCallOverlay: UI исходящего звонка (Вызов.../Отмена)
- DM: invite → ringing → accept → LiveKit. Каналы: без изменений
- Таймаут 30 сек, автоотклонение при busy
```
