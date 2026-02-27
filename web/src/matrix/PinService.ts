import * as sdk from 'matrix-js-sdk';

/**
 * Сервис закреплённых сообщений — pin/unpin через m.room.pinned_events state event.
 * Получает клиент через getClient(), не владеет подключением.
 */
export class PinService {
    constructor(private getClient: () => sdk.MatrixClient) {}

    /** Закрепить сообщение */
    async pinMessage(roomId: string, eventId: string): Promise<void> {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return;
        const current = room.currentState
            .getStateEvents('m.room.pinned_events', '')
            ?.getContent()?.pinned || [];
        if (current.includes(eventId)) return;
        await client.sendStateEvent(roomId, 'm.room.pinned_events' as any, {
            pinned: [...current, eventId],
        }, '');
    }

    /** Открепить сообщение */
    async unpinMessage(roomId: string, eventId: string): Promise<void> {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return;
        const current = room.currentState
            .getStateEvents('m.room.pinned_events', '')
            ?.getContent()?.pinned || [];
        await client.sendStateEvent(roomId, 'm.room.pinned_events' as any, {
            pinned: current.filter((id: string) => id !== eventId),
        }, '');
    }

    /** Получить IDs закреплённых сообщений */
    getPinnedEventIds(roomId: string): string[] {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return [];
        return room.currentState
            .getStateEvents('m.room.pinned_events', '')
            ?.getContent()?.pinned || [];
    }
}
