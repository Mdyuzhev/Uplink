/**
 * Сервис стикерпаков.
 * Паки хранятся как state events в комнате-каталоге.
 * Предпочтения пользователя — в account data.
 */

import { matrixService } from '../matrix/MatrixService';

const STICKER_ROOM_ALIAS = '#sticker-packs:uplink.local';
const STICKER_PACK_EVENT = 'dev.uplink.sticker_pack';
const STICKER_PREFS_EVENT = 'dev.uplink.sticker_prefs';
const MAX_RECENT = 30;

export interface StickerInfo {
    mimetype: string;
    w: number;
    h: number;
    size?: number;
}

export interface Sticker {
    id: string;
    body: string;
    url: string;
    info: StickerInfo;
}

export interface StickerPack {
    id: string;
    name: string;
    author: string;
    authorName: string;
    thumbnail: string;
    stickers: Sticker[];
    created_at: number;
}

interface StickerPrefs {
    enabled_packs: string[];
    recent: Array<{ pack_id: string; sticker_id: string; ts: number }>;
}

class StickerService {
    private catalogRoomId: string | null = null;

    /** Получить или создать комнату-каталог стикерпаков */
    async getCatalogRoomId(): Promise<string> {
        if (this.catalogRoomId) return this.catalogRoomId;
        const client = matrixService.getClient();

        try {
            const resp = await client.getRoomIdForAlias(STICKER_ROOM_ALIAS);
            this.catalogRoomId = resp.room_id;
            // Присоединиться к комнате если ещё нет
            try { await client.joinRoom(this.catalogRoomId); } catch { /* уже в комнате */ }
            return this.catalogRoomId;
        } catch {
            // Комнаты нет — создать
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const room = await client.createRoom({
            name: 'Стикерпаки',
            room_alias_name: 'sticker-packs',
            visibility: 'private' as any,
            preset: 'public_chat' as any,
            initial_state: [
                {
                    type: 'm.room.join_rules',
                    state_key: '',
                    content: { join_rule: 'public' },
                },
            ],
        });
        this.catalogRoomId = room.room_id;
        return this.catalogRoomId;
    }

    /** Загрузить все доступные стикерпаки */
    async getAllPacks(): Promise<StickerPack[]> {
        const roomId = await this.getCatalogRoomId();
        const client = matrixService.getClient();
        const room = client.getRoom(roomId);
        if (!room) return [];

        const events = room.currentState.getStateEvents(STICKER_PACK_EVENT);
        return events
            .filter(e => e.getContent()?.name) // фильтр удалённых (пустых)
            .map(e => ({
                ...e.getContent(),
                id: e.getStateKey()!,
            })) as StickerPack[];
    }

    /** Получить включённые паки текущего пользователя */
    async getEnabledPacks(): Promise<StickerPack[]> {
        const allPacks = await this.getAllPacks();
        const prefs = this.getPrefs();
        const enabledIds = prefs.enabled_packs || [];

        if (enabledIds.length === 0) return allPacks;
        return allPacks.filter(p => enabledIds.includes(p.id));
    }

    /** Создать новый стикерпак */
    async createPack(name: string, stickers: Sticker[], thumbnailMxc: string): Promise<string> {
        const roomId = await this.getCatalogRoomId();
        const client = matrixService.getClient();
        const packId = `pack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.sendStateEvent(roomId, STICKER_PACK_EVENT as any, {
            name,
            author: client.getUserId()!,
            authorName: matrixService.users.getDisplayName(client.getUserId()!),
            thumbnail: thumbnailMxc,
            stickers,
            created_at: Date.now(),
        }, packId);

        // Автоматически включить у создателя
        const prefs = this.getPrefs();
        prefs.enabled_packs = [...(prefs.enabled_packs || []), packId];
        await this.setPrefs(prefs);

        return packId;
    }

    /** Удалить стикерпак (только автор) */
    async deletePack(packId: string): Promise<void> {
        const roomId = await this.getCatalogRoomId();
        const client = matrixService.getClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.sendStateEvent(roomId, STICKER_PACK_EVENT as any, {}, packId);
    }

    /** Включить/выключить пак у текущего пользователя */
    async togglePack(packId: string, enabled: boolean): Promise<void> {
        const prefs = this.getPrefs();
        const packs = new Set(prefs.enabled_packs || []);
        if (enabled) packs.add(packId); else packs.delete(packId);
        prefs.enabled_packs = [...packs];
        await this.setPrefs(prefs);
    }

    /** Записать использование стикера (для "Недавних") */
    async recordUsage(packId: string, stickerId: string): Promise<void> {
        const prefs = this.getPrefs();
        const recent = prefs.recent || [];
        const filtered = recent.filter(
            r => !(r.pack_id === packId && r.sticker_id === stickerId)
        );
        filtered.unshift({ pack_id: packId, sticker_id: stickerId, ts: Date.now() });
        prefs.recent = filtered.slice(0, MAX_RECENT);
        await this.setPrefs(prefs);
    }

    /** Получить недавно использованные стикеры */
    getRecent(): Array<{ pack_id: string; sticker_id: string; ts: number }> {
        return this.getPrefs().recent || [];
    }

    /** Отправить стикер в комнату */
    async sendSticker(roomId: string, sticker: Sticker): Promise<void> {
        const client = matrixService.getClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await client.sendEvent(roomId, 'm.sticker' as any, {
            body: sticker.body,
            url: sticker.url,
            info: sticker.info,
        });
    }

    /** Загрузить файл как стикер и получить данные */
    async uploadSticker(file: File): Promise<{ url: string; info: StickerInfo }> {
        const client = matrixService.getClient();
        const uploadResponse = await client.uploadContent(file, { type: file.type });
        const mxcUrl = uploadResponse.content_uri;

        let width = 256, height = 256;
        let mimetype = file.type;

        if (file.name.endsWith('.json') || file.type === 'application/json') {
            mimetype = 'application/json';
            try {
                const text = await file.text();
                const lottie = JSON.parse(text);
                width = lottie.w || 256;
                height = lottie.h || 256;
            } catch { /* fallback */ }
        } else {
            const dims = await matrixService.media.getImageDimensions(file);
            width = dims.width || 256;
            height = dims.height || 256;
        }

        return {
            url: mxcUrl,
            info: { mimetype, w: width, h: height, size: file.size },
        };
    }

    // --- Account data helpers ---

    private getPrefs(): StickerPrefs {
        const client = matrixService.getClient();
        const event = client.getAccountData(STICKER_PREFS_EVENT);
        return (event?.getContent() as StickerPrefs) || { enabled_packs: [], recent: [] };
    }

    private async setPrefs(prefs: StickerPrefs): Promise<void> {
        const client = matrixService.getClient();
        await client.setAccountData(STICKER_PREFS_EVENT, prefs);
    }
}

export const stickerService = new StickerService();
