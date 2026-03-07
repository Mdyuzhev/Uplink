import * as sdk from 'matrix-js-sdk';

export type SpaceRole = 'global_admin' | 'space_admin' | 'member';

export interface SpaceMember {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    role: SpaceRole;
    powerLevel: number;
}

export class SpaceService {
    constructor(
        private getClient: () => sdk.MatrixClient,
        private getMxcUrl: (mxcUrl: string, width: number, height: number) => string | null,
    ) {}

    getMyRoleInSpace(spaceId: string): SpaceRole {
        const client = this.getClient();
        const userId = client.getUserId()!;
        const room = client.getRoom(spaceId);
        if (!room) return 'member';

        const plEvent = room.currentState.getStateEvents('m.room.power_levels', '');
        const users: Record<string, number> = plEvent?.getContent()?.users || {};
        const level = users[userId] ?? 0;

        if (level >= 100) return 'global_admin';
        if (level >= 75) return 'space_admin';
        return 'member';
    }

    getSpaceMembers(spaceId: string): SpaceMember[] {
        const client = this.getClient();
        const room = client.getRoom(spaceId);
        if (!room) return [];

        const plEvent = room.currentState.getStateEvents('m.room.power_levels', '');
        const users: Record<string, number> = plEvent?.getContent()?.users || {};

        return room.getJoinedMembers().map(member => {
            const level = users[member.userId] ?? 0;
            let role: SpaceRole = 'member';
            if (level >= 100) role = 'global_admin';
            else if (level >= 75) role = 'space_admin';

            const mxcAvatarUrl = member.getMxcAvatarUrl();
            const avatarUrl = mxcAvatarUrl
                ? this.getMxcUrl(mxcAvatarUrl, 32, 32) ?? undefined
                : undefined;

            return {
                userId: member.userId,
                displayName: member.name || member.userId,
                avatarUrl,
                role,
                powerLevel: level,
            };
        });
    }

    async setMemberRole(spaceId: string, targetUserId: string, role: 'space_admin' | 'member'): Promise<void> {
        const client = this.getClient();
        const powerLevel = role === 'space_admin' ? 75 : 0;
        const room = client.getRoom(spaceId);
        if (!room) throw new Error('Space not found');

        const plEvent = room.currentState.getStateEvents('m.room.power_levels', '');
        const content = { ...(plEvent?.getContent() || {}) };
        content.users = { ...(content.users || {}) };
        content.users[targetUserId] = powerLevel;

        await client.sendStateEvent(spaceId, 'm.room.power_levels' as any, content, '');
    }

    async inviteMemberToSpace(spaceId: string, userId: string): Promise<void> {
        const client = this.getClient();
        await client.invite(spaceId, userId);

        const room = client.getRoom(spaceId);
        if (!room) return;

        const childEvents = room.currentState.getStateEvents('m.space.child');
        for (const ev of childEvents) {
            if (Object.keys(ev.getContent()).length === 0) continue;
            const childRoomId = ev.getStateKey();
            if (!childRoomId) continue;
            try {
                await client.invite(childRoomId, userId);
            } catch {
                // already in room or no access
            }
        }
    }

    async kickMemberFromSpace(spaceId: string, userId: string): Promise<void> {
        const client = this.getClient();
        const room = client.getRoom(spaceId);
        if (!room) return;

        const childEvents = room.currentState.getStateEvents('m.space.child');
        for (const ev of childEvents) {
            if (Object.keys(ev.getContent()).length === 0) continue;
            const childRoomId = ev.getStateKey();
            if (!childRoomId) continue;
            try {
                await client.kick(childRoomId, userId);
            } catch { /* ignore */ }
        }

        await client.kick(spaceId, userId);
    }
}
