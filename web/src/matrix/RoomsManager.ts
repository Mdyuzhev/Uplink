import * as sdk from 'matrix-js-sdk';
import type { SpaceRole } from './SpaceService';

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

export interface VoiceRoomInfo {
    id: string;
    name: string;
    topic?: string;
    voiceMembers: string[];
}

export interface SpaceInfo {
    id: string;
    name: string;
    topic?: string;
    rooms: RoomInfo[];
    myRole: SpaceRole;
}

function buildRoomInfo(client: sdk.MatrixClient, room: sdk.Room, type: 'channel' | 'direct'): RoomInfo {
    const lastEvent = room.getLiveTimeline().getEvents()
        .filter(e => e.getType() === 'm.room.message')
        .slice(-1)[0];

    let peerId: string | undefined;
    let peerPresence = 'offline';
    if (type === 'direct') {
        const members = room.getJoinedMembers();
        const peer = members.find(m => m.userId !== client.getUserId());
        if (peer) {
            peerId = peer.userId;
            const user = client.getUser(peer.userId);
            peerPresence = (user as any)?.presence || 'offline';
        }
    }

    return {
        id: room.roomId,
        name: type === 'direct' && peerId
            ? getDisplayName(client, peerId)
            : room.name || 'Без названия',
        type,
        encrypted: room.hasEncryptionStateEvent(),
        unreadCount: room.getUnreadNotificationCount(sdk.NotificationCountType.Total) || 0,
        lastMessage: lastEvent?.getContent().body,
        lastMessageSender: lastEvent ? getDisplayName(client, lastEvent.getSender()!) : undefined,
        lastMessageTs: lastEvent?.getTs(),
        peerId,
        peerPresence,
        topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
    };
}

export function getGroupedRooms(client: sdk.MatrixClient): {
    spaces: SpaceInfo[];
    channels: RoomInfo[];
    directs: RoomInfo[];
    voiceChannels: VoiceRoomInfo[];
} {
    const rooms = client.getRooms().filter(r => r.getMyMembership() === 'join');
    const directMap = client.getAccountData('m.direct')?.getContent() || {};
    const directIds = new Set<string>();
    for (const userId of Object.keys(directMap)) {
        for (const roomId of directMap[userId]) {
            directIds.add(roomId);
        }
    }

    const spaces: SpaceInfo[] = [];
    const channels: RoomInfo[] = [];
    const directs: RoomInfo[] = [];
    const childRoomIds = new Set<string>();

    // Первый проход: найти Spaces и их дочерние комнаты
    for (const room of rooms) {
        const createEvent = room.currentState.getStateEvents('m.room.create', '');
        if (createEvent?.getContent()?.type === 'm.space') {
            const childEvents = room.currentState.getStateEvents('m.space.child');
            const childIds = childEvents
                .filter(e => Object.keys(e.getContent()).length > 0)
                .map(e => e.getStateKey()!)
                .filter(Boolean);

            childIds.forEach(id => childRoomIds.add(id));

            const plEvent = room.currentState.getStateEvents('m.room.power_levels', '');
            const plUsers: Record<string, number> = plEvent?.getContent()?.users || {};
            const myPl = plUsers[client.getUserId()!] ?? 0;
            const myRole: SpaceRole = myPl >= 100 ? 'global_admin' : myPl >= 75 ? 'space_admin' : 'member';

            spaces.push({
                id: room.roomId,
                name: room.name || 'Без названия',
                topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
                rooms: [],
                myRole,
            });
        }
    }

    // Голосовые каналы
    const voiceChannels: VoiceRoomInfo[] = [];
    const voiceRoomIds = new Set<string>();

    for (const room of rooms) {
        if (directIds.has(room.roomId)) continue;
        const createEv = room.currentState.getStateEvents('m.room.create', '');
        if (createEv?.getContent()?.type === 'm.space') continue;

        const typeEv = room.currentState.getStateEvents('uplink.room.type' as any, '');
        if (typeEv?.getContent()?.type !== 'voice') continue;

        voiceRoomIds.add(room.roomId);

        const memberEvents = room.currentState.getStateEvents('uplink.voice.member' as any);
        const voiceMembers: string[] = [];
        const eventsArray = Array.isArray(memberEvents) ? memberEvents : (memberEvents ? [memberEvents] : []);
        for (const ev of eventsArray) {
            if (ev.getContent()?.joined === true) {
                const userId = ev.getStateKey();
                if (userId) voiceMembers.push(userId);
            }
        }

        voiceChannels.push({
            id: room.roomId,
            name: room.name || 'Без названия',
            topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
            voiceMembers,
        });
    }

    // Второй проход: распределить комнаты
    // Space child имеет приоритет над m.direct (m.direct может быть stale)
    for (const room of rooms) {
        if (directIds.has(room.roomId) && !childRoomIds.has(room.roomId)) {
            directs.push(buildRoomInfo(client, room, 'direct'));
            continue;
        }

        // Пропускаем сами Spaces
        const createEvent = room.currentState.getStateEvents('m.room.create', '');
        if (createEvent?.getContent()?.type === 'm.space') continue;

        // Пропускаем голосовые каналы (у них своя секция)
        if (voiceRoomIds.has(room.roomId)) continue;

        const info = buildRoomInfo(client, room, 'channel');

        // Найти, к какому Space принадлежит комната
        let assigned = false;
        if (childRoomIds.has(room.roomId)) {
            for (const space of spaces) {
                const spaceRoom = client.getRoom(space.id);
                if (!spaceRoom) continue;
                const childEvent = spaceRoom.currentState.getStateEvents('m.space.child', room.roomId);
                if (childEvent && Object.keys(childEvent.getContent()).length > 0) {
                    space.rooms.push(info);
                    assigned = true;
                    break;
                }
            }
        }

        if (!assigned) {
            channels.push(info);
        }
    }

    // Сортировка
    spaces.sort((a, b) => a.name.localeCompare(b.name));
    spaces.forEach(s => s.rooms.sort((a, b) => a.name.localeCompare(b.name)));
    channels.sort((a, b) => a.name.localeCompare(b.name));
    directs.sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));
    voiceChannels.sort((a, b) => a.name.localeCompare(b.name));

    return { spaces, channels, directs, voiceChannels };
}

export function getDisplayName(client: sdk.MatrixClient, userId: string): string {
    const user = client.getUser(userId);
    return user?.displayName || userId.split(':')[0].substring(1);
}
