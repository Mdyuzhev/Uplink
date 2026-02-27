/**
 * WebSocket-транспорт с автоматическим реконнектом.
 */
import WebSocket from 'ws';

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

export class WebSocketTransport {
    /**
     * @param {string} url - WebSocket URL (wss://uplink/bot-ws/<token>)
     */
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.onMessage = null;
        this.onConnected = null;
        this.onDisconnected = null;
        this._reconnectAttempt = 0;
        this._shouldReconnect = false;
        this._reconnectTimer = null;
        this._pendingActions = new Map();
        this._actionCounter = 0;
    }

    connect() {
        this._shouldReconnect = true;
        this._doConnect();
    }

    _doConnect() {
        if (this.ws) {
            try { this.ws.close(); } catch {}
        }

        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
            this._reconnectAttempt = 0;
            console.log('[bot-sdk] Подключён к Uplink');
        });

        this.ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());

                if (msg.type === 'connected') {
                    if (this.onConnected) this.onConnected(msg);
                    return;
                }

                if (msg.type === 'ack') {
                    const resolve = this._pendingActions.get(msg.action_id);
                    if (resolve) {
                        resolve(msg.event_id || null);
                        this._pendingActions.delete(msg.action_id);
                    }
                    return;
                }

                if (msg.type === 'error') {
                    const resolve = this._pendingActions.get(msg.action_id);
                    if (resolve) {
                        this._pendingActions.delete(msg.action_id);
                    }
                    console.error('[bot-sdk] Ошибка:', msg.error);
                    return;
                }

                if (msg.type === 'event' && this.onMessage) {
                    this.onMessage(msg.event);
                }
            } catch (err) {
                console.error('[bot-sdk] Ошибка парсинга:', err);
            }
        });

        this.ws.on('close', () => {
            if (this.onDisconnected) this.onDisconnected();
            if (this._shouldReconnect) this._scheduleReconnect();
        });

        this.ws.on('error', (err) => {
            console.error('[bot-sdk] WebSocket ошибка:', err.message);
        });
    }

    _scheduleReconnect() {
        const delay = RECONNECT_DELAYS[Math.min(this._reconnectAttempt, RECONNECT_DELAYS.length - 1)];
        this._reconnectAttempt++;
        console.log(`[bot-sdk] Реконнект через ${delay / 1000}с (попытка ${this._reconnectAttempt})`);
        this._reconnectTimer = setTimeout(() => this._doConnect(), delay);
    }

    /**
     * Отправить действие и дождаться ack.
     * @param {object} action
     * @returns {Promise<string|null>}
     */
    sendAction(action) {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('Нет подключения'));
                return;
            }

            const actionId = `sdk_${++this._actionCounter}_${Date.now()}`;
            action.action_id = actionId;

            this._pendingActions.set(actionId, resolve);

            // Таймаут на ack
            setTimeout(() => {
                if (this._pendingActions.has(actionId)) {
                    this._pendingActions.delete(actionId);
                    reject(new Error('Таймаут ожидания ack'));
                }
            }, 10000);

            this.ws.send(JSON.stringify(action));
        });
    }

    disconnect() {
        this._shouldReconnect = false;
        if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
