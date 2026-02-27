/**
 * UplinkBot — главный класс SDK.
 *
 * Пример использования:
 *   const bot = new UplinkBot({ url: 'https://uplink.example.com', token: 'bot_xxx' });
 *   bot.onCommand('/ping', async (ctx) => { await ctx.reply('pong!'); });
 *   bot.start();
 */

import { WebSocketTransport } from './WebSocketTransport.mjs';
import { BotContext } from './BotContext.mjs';

export class UplinkBot {
    /**
     * @param {{ url: string, token: string }} config
     */
    constructor(config) {
        if (!config.url || !config.token) {
            throw new Error('url и token обязательны');
        }

        // Построить WebSocket URL
        const wsProtocol = config.url.startsWith('https') ? 'wss' : 'ws';
        const host = config.url.replace(/^https?:\/\//, '');
        this._wsUrl = `${wsProtocol}://${host}/bot-ws/${config.token}`;

        this._transport = null;
        this._commandHandlers = new Map();
        this._messageHandler = null;
        this._reactionHandler = null;
        this._rooms = [];
    }

    /**
     * Зарегистрировать обработчик команды.
     * @param {string} command - например "/deploy"
     * @param {function(BotContext): Promise<void>} handler
     */
    onCommand(command, handler) {
        const normalized = command.startsWith('/') ? command : `/${command}`;
        this._commandHandlers.set(normalized.toLowerCase(), handler);
    }

    /**
     * Обработчик всех сообщений (не команд).
     * @param {function(BotContext): Promise<void>} handler
     */
    onMessage(handler) {
        this._messageHandler = handler;
    }

    /**
     * Обработчик реакций.
     * @param {function(BotContext): Promise<void>} handler
     */
    onReaction(handler) {
        this._reactionHandler = handler;
    }

    /**
     * Подключиться к Uplink и начать слушать события.
     */
    async start() {
        this._transport = new WebSocketTransport(this._wsUrl);

        this._transport.onConnected = (msg) => {
            this._rooms = msg.rooms || [];
            console.log(`[bot-sdk] Бот ${msg.bot_id} подключён, комнат: ${this._rooms.length}`);
        };

        this._transport.onDisconnected = () => {
            console.log('[bot-sdk] Отключён от Uplink');
        };

        this._transport.onMessage = (event) => {
            this._handleEvent(event).catch(err => {
                console.error('[bot-sdk] Ошибка обработки события:', err);
            });
        };

        this._transport.connect();

        // Держим процесс живым
        return new Promise(() => {});
    }

    /**
     * Отключиться.
     */
    async stop() {
        if (this._transport) {
            this._transport.disconnect();
            this._transport = null;
        }
    }

    /**
     * Обработка входящего события.
     */
    async _handleEvent(event) {
        const sendAction = (action) => this._transport.sendAction(action);
        const ctx = new BotContext(event, sendAction);

        if (event.type === 'command' && event.command) {
            const handler = this._commandHandlers.get(event.command.toLowerCase());
            if (handler) {
                await handler(ctx);
                return;
            }
        }

        if (event.type === 'message' && this._messageHandler) {
            await this._messageHandler(ctx);
            return;
        }

        if (event.type === 'reaction' && this._reactionHandler) {
            await this._reactionHandler(ctx);
        }
    }
}
