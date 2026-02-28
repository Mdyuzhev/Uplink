import * as sdk from 'matrix-js-sdk';

/**
 * Сервис комнат — Spaces, DM, приглашения.
 * Получает клиент через getClient(), не владеет подключением.
 */
export class RoomService {
    constructor(
        private getClient: () => sdk.MatrixClient,
        private searchUsers: () => Promise<Array<{ userId: string }>>,
        private emitRoomsUpdated: () => void,
    ) {}

    /** Извлечь домен сервера из userId */
    private getServerDomain(): string {
        const userId = this.getClient().getUserId() || '';
        const match = userId.match(/:(.+)$/);
        return match ? match[1] : 'uplink.local';
    }

    /** Проверить, является ли комната Space */
    isSpace(roomId: string): boolean {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return false;
        const createEvent = room.currentState.getStateEvents('m.room.create', '');
        return createEvent?.getContent()?.type === 'm.space';
    }

    /**
     * Создать канал (Matrix Space).
     * Space — комната с типом m.space, в которую вложены обычные комнаты.
     */
    async createSpace(name: string, topic?: string, encrypted: boolean = false): Promise<string> {
        const client = this.getClient();

        const initial_state: Array<{ type: string; state_key: string; content: Record<string, string> }> = [
            {
                type: 'm.room.join_rules',
                state_key: '',
                content: { join_rule: 'public' },
            },
        ];

        if (encrypted) {
            initial_state.push({
                type: 'm.room.encryption',
                state_key: '',
                content: { algorithm: 'm.megolm.v1.aes-sha2' },
            });
        }

        const response = await client.createRoom({
            name,
            topic,
            visibility: sdk.Visibility.Private,
            preset: sdk.Preset.PublicChat,
            creation_content: { type: 'm.space' },
            initial_state,
            power_level_content_override: {
                events: { 'm.space.child': 100 },
            },
        } as Parameters<sdk.MatrixClient['createRoom']>[0]);

        await this.inviteAllUsersToRoom(response.room_id);
        this.emitRoomsUpdated();
        return response.room_id;
    }

    /**
     * Создать комнату внутри канала (Space).
     * Привязывает к Space через m.space.child / m.space.parent, включает E2E.
     */
    async createRoomInSpace(spaceId: string, name: string, topic?: string, encrypted: boolean = false): Promise<string> {
        const client = this.getClient();

        const initial_state: Array<{ type: string; state_key: string; content: Record<string, unknown> }> = [
            {
                type: 'm.room.join_rules',
                state_key: '',
                content: { join_rule: 'public' },
            },
            {
                type: 'm.space.parent',
                state_key: spaceId,
                content: { via: [this.getServerDomain()], canonical: true },
            },
        ];

        if (encrypted) {
            initial_state.push({
                type: 'm.room.encryption',
                state_key: '',
                content: { algorithm: 'm.megolm.v1.aes-sha2' },
            });
        }

        const response = await client.createRoom({
            name,
            topic,
            visibility: sdk.Visibility.Private,
            preset: sdk.Preset.PublicChat,
            initial_state,
        } as Parameters<sdk.MatrixClient['createRoom']>[0]);

        const roomId = response.room_id;

        await client.sendStateEvent(spaceId, 'm.space.child' as any, {
            via: [this.getServerDomain()],
        }, roomId);

        await this.inviteAllUsersToRoom(roomId);
        this.emitRoomsUpdated();
        return roomId;
    }

    /** Пригласить всех пользователей сервера в комнату */
    private async inviteAllUsersToRoom(roomId: string): Promise<void> {
        const client = this.getClient();
        try {
            const users = await this.searchUsers();
            const myUserId = client.getUserId();
            for (const user of users) {
                if (user.userId === myUserId) continue;
                try {
                    await client.invite(roomId, user.userId);
                } catch {
                    // Пользователь уже в комнате — пропускаем
                }
            }
        } catch (err) {
            console.warn('Не удалось пригласить пользователей:', (err as Error).message);
        }
    }

    /**
     * Найти существующую DM-комнату с пользователем.
     */
    findExistingDM(userId: string): string | null {
        const client = this.getClient();
        const directMap = client.getAccountData('m.direct')?.getContent() || {};
        const dmRoomIds: string[] = directMap[userId] || [];
        const myUserId = client.getUserId();

        const candidates: sdk.Room[] = [];

        // Из m.direct
        for (const roomId of dmRoomIds) {
            const room = client.getRoom(roomId);
            if (!room) continue;
            if (room.getMyMembership() !== 'join') continue;
            const member = room.getMember(userId);
            if (member && (member.membership === 'join' || member.membership === 'invite')) {
                candidates.push(room);
            }
        }

        // Scan всех joined-комнат
        const allRooms = client.getRooms().filter(r => r.getMyMembership() === 'join');
        for (const room of allRooms) {
            if (dmRoomIds.includes(room.roomId)) continue;
            if (candidates.some(c => c.roomId === room.roomId)) continue;
            const members = room.getJoinedMembers();
            if (members.length !== 2) continue;
            if (!members.some(m => m.userId === userId)) continue;
            if (!members.some(m => m.userId === myUserId)) continue;
            candidates.push(room);
        }

        if (candidates.length === 0) return null;

        const best = candidates.reduce((a, b) => {
            const tsA = this.getLastEventTs(a);
            const tsB = this.getLastEventTs(b);
            return tsB > tsA ? b : a;
        });

        if (!dmRoomIds.includes(best.roomId)) {
            console.log(`Найдена DM с ${userId} вне m.direct: ${best.roomId}, обновляю...`);
            this.updateDirectMap(userId, best.roomId);
        }

        return best.roomId;
    }

    /** Время последнего события в комнате */
    private getLastEventTs(room: sdk.Room): number {
        const events = room.getLiveTimeline().getEvents();
        if (events.length === 0) return 0;
        return events[events.length - 1].getTs();
    }

    /** Обновить m.direct account data */
    async updateDirectMap(userId: string, roomId: string): Promise<void> {
        const client = this.getClient();
        try {
            const directMap = client.getAccountData('m.direct')?.getContent() || {};
            if (!directMap[userId]) directMap[userId] = [];
            if (!directMap[userId].includes(roomId)) directMap[userId].push(roomId);
            await client.setAccountData('m.direct', directMap);
        } catch (err) {
            console.warn('Не удалось обновить m.direct:', (err as Error).message);
        }
    }

    /**
     * Создать DM-комнату с пользователем или вернуть существующую.
     */
    async getOrCreateDM(userId: string, encrypted: boolean = false): Promise<string> {
        const client = this.getClient();

        const existingRoomId = this.findExistingDM(userId);
        if (existingRoomId) return existingRoomId;

        const invitedRoom = this.findInviteFrom(userId);
        if (invitedRoom) {
            await client.joinRoom(invitedRoom.roomId);
            await this.updateDirectMap(userId, invitedRoom.roomId);
            console.log(`Принят invite от ${userId} вместо создания дубля: ${invitedRoom.roomId}`);
            this.emitRoomsUpdated();
            return invitedRoom.roomId;
        }

        const initial_state: Array<{ type: string; state_key: string; content: Record<string, string> }> = [];
        if (encrypted) {
            initial_state.push({
                type: 'm.room.encryption',
                state_key: '',
                content: { algorithm: 'm.megolm.v1.aes-sha2' },
            });
        }

        const response = await client.createRoom({
            is_direct: true,
            invite: [userId],
            preset: sdk.Preset.PrivateChat,
            initial_state,
        });

        const newRoomId = response.room_id;
        await this.updateDirectMap(userId, newRoomId);
        return newRoomId;
    }

    /**
     * Включить E2E шифрование в существующей комнате.
     * НЕОБРАТИМАЯ операция — после включения отключить нельзя.
     */
    async enableEncryption(roomId: string): Promise<void> {
        const client = this.getClient();
        await client.sendStateEvent(roomId, 'm.room.encryption' as never, {
            algorithm: 'm.megolm.v1.aes-sha2',
        }, '');
    }

    /** Проверить, зашифрована ли комната */
    isRoomEncrypted(roomId: string): boolean {
        const client = this.getClient();
        const room = client.getRoom(roomId);
        if (!room) return false;
        return room.hasEncryptionStateEvent();
    }

    /** Найти комнату, в которую нас пригласил указанный пользователь */
    private findInviteFrom(userId: string): sdk.Room | null {
        const client = this.getClient();
        const myUserId = client.getUserId()!;

        for (const room of client.getRooms()) {
            if (room.getMyMembership() !== 'invite') continue;
            const inviteEvent = room.currentState.getStateEvents('m.room.member', myUserId);
            if (inviteEvent?.getSender() === userId) return room;
        }
        return null;
    }
}
