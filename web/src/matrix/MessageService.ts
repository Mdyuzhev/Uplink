import * as sdk from 'matrix-js-sdk';
import type { GifResult } from '../services/GifService';

/**
 * Сервис сообщений — отправка, ответы, загрузка истории, прочитанные, timeline.
 * Получает клиент через getClient(), не владеет подключением.
 */
export class MessageService {
    constructor(private getClient: () => sdk.MatrixClient) {}

    async sendMessage(roomId: string, body: string): Promise<void> {
        await this.getClient().sendTextMessage(roomId, body);
    }

    /** Отправить ответ на сообщение (reply) */
    async sendReply(roomId: string, replyToEventId: string, body: string): Promise<void> {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        const replyEvent = room?.findEventById(replyToEventId);
        const originalBody = replyEvent?.getContent()?.body || '';
        const originalSender = replyEvent?.getSender() || '';

        const fallbackBody = `> <${originalSender}> ${originalBody}\n\n${body}`;

        await client.sendEvent(roomId, 'm.room.message' as any, {
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

    /** Отправить сообщение с упоминаниями (Matrix m.mentions) */
    async sendMessageWithMentions(roomId: string, body: string, mentionedUserIds: string[]): Promise<void> {
        const client = this.getClient();

        let formattedBody = body
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');

        for (const userId of mentionedUserIds) {
            const room = client.getRoom(roomId);
            const member = room?.getMember(userId);
            const displayName = member?.name || userId;
            const escaped = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`@${escaped}`, 'g');
            const link = `<a href="https://matrix.to/#/${userId}">@${displayName}</a>`;
            formattedBody = formattedBody.replace(re, link);
        }

        await client.sendEvent(roomId, 'm.room.message' as sdk.EventType, {
            msgtype: 'm.text',
            body,
            format: 'org.matrix.custom.html',
            formatted_body: formattedBody,
            'm.mentions': {
                user_ids: mentionedUserIds,
            },
        });
    }

    /** Отправить ответ с упоминаниями */
    async sendReplyWithMentions(roomId: string, replyToEventId: string, body: string, mentionedUserIds: string[]): Promise<void> {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        const replyEvent = room?.findEventById(replyToEventId);
        const originalBody = replyEvent?.getContent()?.body || '';
        const originalSender = replyEvent?.getSender() || '';

        const fallbackBody = `> <${originalSender}> ${originalBody}\n\n${body}`;

        let formattedBody = body
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');

        for (const userId of mentionedUserIds) {
            const member = room?.getMember(userId);
            const displayName = member?.name || userId;
            const escaped = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`@${escaped}`, 'g');
            const link = `<a href="https://matrix.to/#/${userId}">@${displayName}</a>`;
            formattedBody = formattedBody.replace(re, link);
        }

        await client.sendEvent(roomId, 'm.room.message' as sdk.EventType, {
            msgtype: 'm.text',
            body: fallbackBody,
            format: 'org.matrix.custom.html',
            formatted_body: `<mx-reply><blockquote><a href="https://matrix.to/#/${roomId}/${replyToEventId}">In reply to</a> <a href="https://matrix.to/#/${originalSender}">${originalSender}</a><br>${originalBody}</blockquote></mx-reply>${formattedBody}`,
            'm.relates_to': {
                'm.in_reply_to': { event_id: replyToEventId },
            },
            'm.mentions': {
                user_ids: mentionedUserIds,
            },
        });
    }

    async loadMoreMessages(roomId: string, limit: number = 30): Promise<boolean> {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return false;
        try {
            return (await client.scrollback(room, limit)) !== null;
        } catch { return false; }
    }

    async markRoomAsRead(roomId: string): Promise<void> {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return;
        const lastEvent = room.getLiveTimeline().getEvents().slice(-1)[0];
        if (lastEvent) {
            await client.sendReadReceipt(lastEvent);
        }
    }

    /** Отправить GIF-сообщение (GIPHY CDN URL) */
    async sendGif(roomId: string, gif: GifResult): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.getClient().sendEvent(roomId, 'm.room.message' as any, {
            msgtype: 'm.image',
            body: gif.title || 'GIF',
            url: gif.gifUrl,
            info: {
                mimetype: 'image/gif',
                w: gif.width,
                h: gif.height,
            },
            'dev.uplink.gif': true,
        });
    }

    getRoomTimeline(roomId: string): sdk.MatrixEvent[] {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return [];
        return room.getLiveTimeline().getEvents().filter(e => {
            const t = e.getType();
            return t === 'm.room.message' || t === 'm.room.encrypted' || t === 'm.sticker';
        });
    }

    /** Отправить callback от нажатия inline-кнопки бота */
    async sendBotCallback(roomId: string, originalEventId: string, callbackData: string): Promise<void> {
        await this.getClient().sendEvent(roomId, 'uplink.bot.callback' as sdk.EventType, {
            original_event_id: originalEventId,
            callback_data: callbackData,
            room_id: roomId,
        });
    }

    /** Найти событие по ID в timeline комнаты */
    findEventInRoom(roomId: string, eventId: string): sdk.MatrixEvent | undefined {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return undefined;
        return room.findEventById(eventId);
    }
}
