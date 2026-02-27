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

/** UUID v4 — fallback для HTTP (crypto.randomUUID требует secure context) */
function generateCallId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback: случайный hex-строка
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

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
    private _listening = false;
    private _timelineHandler: ((...args: any[]) => void) | null = null;

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
        if (this._listening) return;
        this._listening = true;

        try {
            const client = matrixService.getClient();

            // Слушаем ВСЕ timeline-события (включая кастомные).
            // 5-й аргумент (data) содержит liveEvent — true только для real-time событий,
            // false для initial sync / pagination. Без этой проверки старые invite
            // из initial sync ставят state в ringing-in и новый звонок сразу отклоняется.
            this._timelineHandler = (event: any, room: any, _toStart: any, _removed: any, data: any) => {
                try {
                    // Только live-события (не initial sync)
                    if (!data?.liveEvent) return;

                    const type = event?.getType?.();
                    if (!type || !type.startsWith('uplink.call.')) return;

                    const content = event.getContent();
                    const senderId = event.getSender();
                    const myUserId = matrixService.getUserId();

                    // Игнорируем свои собственные события
                    if (senderId === myUserId) return;

                    this.handleIncomingEvent(type, content, senderId, room.roomId);
                } catch (err) {
                    console.error('CallSignaling: ошибка обработки события', err);
                }
            };

            client.on('Room.timeline' as any, this._timelineHandler);
        } catch (err) {
            console.error('CallSignaling: не удалось запустить слушатель', err);
            this._listening = false;
        }
    }

    /**
     * Остановить слушание (при logout).
     */
    stopListening(): void {
        if (this._timelineHandler) {
            try {
                const client = matrixService.getClient();
                client.off('Room.timeline' as any, this._timelineHandler);
            } catch { /* клиент уже уничтожен */ }
            this._timelineHandler = null;
        }
        this._listening = false;
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

        const callId = generateCallId();
        const myUserId = matrixService.getUserId();

        const info: CallInfo = {
            callId,
            roomId,
            callerId: myUserId,
            callerName: calleeDisplayName,
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
                    callerName: matrixService.users.getDisplayName(senderId),
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
