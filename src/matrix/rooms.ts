import * as sdk from 'matrix-js-sdk';
import { NotificationCountType } from 'matrix-js-sdk';

/**
 * Утилиты для работы с комнатами Matrix.
 * Разделяет комнаты на каналы и DM.
 */
export class RoomsManager {
    constructor(private client: sdk.MatrixClient) {}

    /** Получить комнаты, сгруппированные по типу. */
    getGroupedRooms(): { channels: RoomInfo[]; directs: RoomInfo[] } {
        const rooms = this.client.getRooms().filter(r =>
            r.getMyMembership() === 'join'
        );

        const directRoomIds = this.getDirectRoomIds();

        const channels: RoomInfo[] = [];
        const directs: RoomInfo[] = [];

        for (const room of rooms) {
            const info = this.toRoomInfo(room, directRoomIds);
            if (info.type === 'direct') {
                directs.push(info);
            } else {
                channels.push(info);
            }
        }

        channels.sort((a, b) => a.name.localeCompare(b.name));
        directs.sort((a, b) => (b.lastMessageTs || 0) - (a.lastMessageTs || 0));

        return { channels, directs };
    }

    private getDirectRoomIds(): Set<string> {
        const directMap = this.client.getAccountData('m.direct')?.getContent() || {};
        const ids = new Set<string>();
        for (const userId of Object.keys(directMap)) {
            for (const roomId of (directMap as Record<string, string[]>)[userId]) {
                ids.add(roomId);
            }
        }
        return ids;
    }

    private toRoomInfo(room: sdk.Room, directRoomIds: Set<string>): RoomInfo {
        const isDirect = directRoomIds.has(room.roomId);
        const lastEvent = room.getLiveTimeline().getEvents()
            .filter(e => e.getType() === 'm.room.message')
            .slice(-1)[0];

        let peerId: string | undefined;
        let peerPresence: 'online' | 'offline' | 'unavailable' = 'offline';
        if (isDirect) {
            const members = room.getJoinedMembers();
            const peer = members.find(m => m.userId !== this.client.getUserId());
            if (peer) {
                peerId = peer.userId;
                const user = this.client.getUser(peer.userId);
                peerPresence = (user?.presence as 'online' | 'offline' | 'unavailable') || 'offline';
            }
        }

        const isEncrypted = room.hasEncryptionStateEvent();

        return {
            id: room.roomId,
            name: isDirect && peerId
                ? this.getDisplayName(peerId)
                : room.name || 'Без названия',
            type: isDirect ? 'direct' : 'channel',
            encrypted: isEncrypted,
            unreadCount: room.getUnreadNotificationCount(NotificationCountType.Total) || 0,
            lastMessage: lastEvent ? lastEvent.getContent().body || '' : undefined,
            lastMessageSender: lastEvent ? this.getDisplayName(lastEvent.getSender()!) : undefined,
            lastMessageTs: lastEvent ? lastEvent.getTs() : undefined,
            peerId,
            peerPresence,
            topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic,
        };
    }

    private getDisplayName(userId: string): string {
        const user = this.client.getUser(userId);
        return user?.displayName || userId.split(':')[0].substring(1);
    }

    /** Создать DM-комнату с пользователем. */
    async createDirectMessage(userId: string): Promise<string> {
        const result = await this.client.createRoom({
            is_direct: true,
            invite: [userId],
            preset: sdk.Preset.TrustedPrivateChat,
            initial_state: [
                {
                    type: 'm.room.encryption',
                    state_key: '',
                    content: { algorithm: 'm.megolm.v1.aes-sha2' },
                },
            ],
        });
        return result.room_id;
    }

    /** Присоединиться к комнате по alias. */
    async joinRoom(roomAlias: string): Promise<string> {
        const result = await this.client.joinRoom(roomAlias);
        return result.roomId;
    }
}

/** Информация о комнате для UI. */
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
    peerPresence?: 'online' | 'offline' | 'unavailable';
    topic?: string;
}
