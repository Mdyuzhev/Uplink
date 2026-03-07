import * as sdk from 'matrix-js-sdk';

export interface ThreadPreview {
    threadRootId: string;
    roomId: string;
    roomName: string;
    rootBody: string;
    rootSender: string;
    lastReplyBody: string;
    lastReplySender: string;
    lastReplyTs: number;
    replyCount: number;
    participated: boolean;
    hasUnread: boolean;
}

export class ThreadIndexService {
    constructor(
        private getClient: () => sdk.MatrixClient,
        private getDisplayName: (userId: string) => string,
    ) {}

    getAllMyThreads(): ThreadPreview[] {
        const client = this.getClient();
        const myUserId = client.getUserId()!;
        const result: ThreadPreview[] = [];

        for (const room of client.getRooms()) {
            if (room.getMyMembership() !== 'join') continue;

            for (const thread of room.getThreads()) {
                const rootEvent = thread.rootEvent;
                if (!rootEvent) continue;

                const iAmRoot = rootEvent.getSender() === myUserId;
                const iReplied = thread.events.some(e => e.getSender() === myUserId);
                if (!iAmRoot && !iReplied) continue;

                const lastEvent = thread.replyToEvent;
                const lastTs = lastEvent?.getTs() ?? rootEvent.getTs();

                result.push({
                    threadRootId: thread.id,
                    roomId: room.roomId,
                    roomName: room.name || '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f',
                    rootBody: (rootEvent.getContent()?.body || '').slice(0, 120),
                    rootSender: this.getDisplayName(rootEvent.getSender()!),
                    lastReplyBody: (lastEvent?.getContent()?.body || '').slice(0, 80),
                    lastReplySender: lastEvent ? this.getDisplayName(lastEvent.getSender()!) : '',
                    lastReplyTs: lastTs,
                    replyCount: thread.length,
                    participated: iReplied,
                    hasUnread: false,
                });
            }
        }

        return result.sort((a, b) => b.lastReplyTs - a.lastReplyTs);
    }
}
