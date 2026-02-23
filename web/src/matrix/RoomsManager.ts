import * as sdk from 'matrix-js-sdk';

export interface RoomInfo {
    id: string;
    name: string;
    type: 'channel' | 'direct';
    encrypted: boolean;
    unreadCount: number;
    lastMessage?: string;
    lastMessageSender?: string;
    lastMessageTs?: number;
    peerId?: string;
    peerPresence?: string;
    topic?: string;
}

export function getGroupedRooms(client: sdk.MatrixClient): {
    channels: RoomInfo[];
    directs: RoomInfo[];
} {
    const rooms = client.getRooms().filter(r => r.getMyMembership() === 'join');
    const directMap = client.getAccountData('m.direct')?.getContent() || {};
    const directIds = new Set<string>();
    for (const userId of Object.keys(directMap)) {
        for (const roomId of directMap[userId]) {
            directIds.add(roomId);
        }
    }

    const channels: RoomInfo[] = [];
    const directs: RoomInfo[] = [];

    for (const room of rooms) {
        const isDirect = directIds.has(room.roomId);
        const lastEvent = room.getLiveTimeline().getEvents()
            .filter(e => e.getType() === 'm.room.message')
            .slice(-1)[0];

        let peerId: string | undefined;
        let peerPresence = 'offline';
        if (isDirect) {
            const members = room.getJoinedMembers();
            const peer = members.find(m => m.userId !== client.getUserId());
            if (peer) {
                peerId = peer.userId;
                const user = client.getUser(peer.userId);
                peerPresence = (user as any)?.presence || 'offline';
            }
        }

        const info: RoomInfo = {
            id: room.roomId,
            name: isDirect && peerId
                ? getDisplayName(client, peerId)
                : room.name || 'Без названия',
            type: isDirect ? 'direct' : 'channel',
            encrypted: room.hasEncryptionStateEvent(),
            unreadCount: room.getUnreadNotificationCount(sdk.NotificationCountType.Total) || 0,
            lastMessage: lastEvent?.getContent().body,
            lastMessageSender: lastEvent ? getDisplayName(client, lastEvent.getSender()!) : undefined,
            lastMessageTs: lastEvent?.getTs(),
            peerId,
            peerPresence,
            topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
        };

        if (isDirect) directs.push(info);
        else channels.push(info);
    }

    channels.sort((a, b) => a.name.localeCompare(b.name));
    directs.sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));

    return { channels, directs };
}

export function getDisplayName(client: sdk.MatrixClient, userId: string): string {
    const user = client.getUser(userId);
    return user?.displayName || userId.split(':')[0].substring(1);
}
