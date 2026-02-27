/**
 * BotContext — контекст события, передаётся в хендлеры.
 * Предоставляет методы для ответа, реакций и т.д.
 */
export class BotContext {
    /**
     * @param {import('./types.mjs').BotEvent} event
     * @param {function} sendAction - функция отправки действия на сервер
     */
    constructor(event, sendAction) {
        this.roomId = event.room_id;
        this.sender = event.sender;
        this.senderName = event.sender_name;
        this.body = event.body;
        this.command = event.command || null;
        this.args = event.args || [];
        this.eventId = event.event_id;
        this.ts = event.ts;
        this._sendAction = sendAction;
    }

    /**
     * Ответить текстом в комнату события.
     * @param {string} text
     * @returns {Promise<string>} event_id
     */
    async reply(text) {
        return this._sendAction({
            type: 'action',
            action: 'send_message',
            room_id: this.roomId,
            body: text,
        });
    }

    /**
     * Поставить реакцию на исходное сообщение.
     * @param {string} emoji
     */
    async react(emoji) {
        return this._sendAction({
            type: 'action',
            action: 'react',
            room_id: this.roomId,
            event_id: this.eventId,
            emoji,
        });
    }

    /**
     * Отправить сообщение в произвольную комнату.
     * @param {string} roomId
     * @param {string} text
     */
    async sendMessage(roomId, text) {
        return this._sendAction({
            type: 'action',
            action: 'send_message',
            room_id: roomId,
            body: text,
        });
    }
}
