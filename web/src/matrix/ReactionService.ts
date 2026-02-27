import * as sdk from 'matrix-js-sdk';

/**
 * Сервис реакций — отправка/удаление emoji-реакций, агрегация по timeline.
 * Получает клиент через getClient(), не владеет подключением.
 */
export class ReactionService {
    constructor(private getClient: () => sdk.MatrixClient) {}

    /** Отправить реакцию на сообщение */
    async sendReaction(roomId: string, eventId: string, emoji: string): Promise<string> {
        const client = this.getClient();
        const resp = await client.sendEvent(roomId, 'm.reaction' as any, {
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
        const client = this.getClient();
        await client.redactEvent(roomId, reactionEventId);
    }

    /** Получить все реакции для событий в timeline комнаты */
    getReactionsForRoom(roomId: string): Map<string, Array<{ emoji: string; userId: string; eventId: string }>> {
        const result = new Map<string, Array<{ emoji: string; userId: string; eventId: string }>>();
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return result;

        const events = room.getLiveTimeline().getEvents();
        for (const event of events) {
            if (event.getType() !== 'm.reaction') continue;
            if (event.isRedacted()) continue;
            const relation = event.getContent()['m.relates_to'];
            if (!relation || relation.rel_type !== 'm.annotation') continue;

            const targetId = relation.event_id as string | undefined;
            const emoji = relation.key as string | undefined;
            const userId = event.getSender();
            const eid = event.getId();
            if (!targetId || !emoji || !userId || !eid) continue;

            if (!result.has(targetId)) result.set(targetId, []);
            result.get(targetId)!.push({ emoji, userId, eventId: eid });
        }
        return result;
    }
}
