import * as sdk from 'matrix-js-sdk';

/**
 * Сервис тредов — отправка в тред, сводка, список сообщений.
 * Получает клиент через getClient(), не владеет подключением.
 */
export class ThreadService {
    constructor(
        private getClient: () => sdk.MatrixClient,
        private getDisplayName: (userId: string) => string,
    ) {}

    /** Отправить сообщение в тред */
    async sendThreadMessage(roomId: string, threadRootId: string, body: string): Promise<void> {
        const client = this.getClient();
        await client.sendEvent(roomId, 'm.room.message' as any, {
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

    /** Получить сводку треда из bundled aggregations корневого события */
    getThreadSummary(roomId: string, eventId: string): {
        rootEventId: string;
        replyCount: number;
        lastReply?: { sender: string; body: string; ts: number };
        participated: boolean;
    } | null {
        const client = this.getClient();
        const room = client.getRoom(roomId);
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
                e => e.getSender() === client.getUserId()
            ),
        };
    }

    /** Получить все сообщения треда */
    getThreadMessages(roomId: string, threadRootId: string): sdk.MatrixEvent[] {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return [];

        const thread = room.getThreads().find(t => t.id === threadRootId);
        if (!thread) return [];

        return thread.events
            .filter(e => e.getType() === 'm.room.message' || e.getType() === 'm.room.encrypted')
            .sort((a, b) => a.getTs() - b.getTs());
    }
}
