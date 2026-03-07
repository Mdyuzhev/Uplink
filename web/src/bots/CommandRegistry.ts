/**
 * Реестр slash-команд ботов.
 * Загружается с бот-сервиса, используется для автокомплита в MessageInput.
 * Кэширует команды по roomId — показывает только команды активных ботов.
 */

import { getConfig } from '../config';
import { fetchWithAuth } from '../utils/api';

export interface BotCommand {
    command: string;
    description: string;
    usage: string;
    botId: string;
    botName: string;
}

const GLOBAL_KEY = '__global__';

class CommandRegistry {
    private cache = new Map<string, BotCommand[]>();
    private currentRoomId: string | null = null;

    async load(roomId?: string): Promise<void> {
        const cacheKey = roomId ?? GLOBAL_KEY;

        if (this.cache.has(cacheKey)) {
            this.currentRoomId = roomId ?? null;
            return;
        }

        try {
            const baseUrl = getConfig().botApiUrl;
            const url = roomId
                ? `${baseUrl}/commands?roomId=${encodeURIComponent(roomId)}`
                : `${baseUrl}/commands`;

            const resp = await fetchWithAuth(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const commands: BotCommand[] = await resp.json();
            this.cache.set(cacheKey, commands);
            this.currentRoomId = roomId ?? null;
        } catch (err) {
            console.warn('Не удалось загрузить команды ботов:', err);
            const fallback: BotCommand[] = [{
                command: '/help',
                description: 'Список доступных команд',
                usage: '/help [бот]',
                botId: 'helper',
                botName: 'Uplink Helper',
            }];
            this.cache.set(cacheKey, fallback);
        }
    }

    /**
     * Сбросить кэш для комнаты (после включения/отключения бота).
     */
    invalidate(roomId?: string): void {
        if (roomId) {
            this.cache.delete(roomId);
        } else {
            this.cache.clear();
        }
    }

    search(input: string): BotCommand[] {
        if (!input.startsWith('/')) return [];
        const cacheKey = this.currentRoomId ?? GLOBAL_KEY;
        const commands = this.cache.get(cacheKey) ?? [];
        const query = input.toLowerCase();
        return commands
            .filter(cmd => cmd.command.toLowerCase().startsWith(query))
            .slice(0, 8);
    }

    isCommand(text: string): boolean {
        const cacheKey = this.currentRoomId ?? GLOBAL_KEY;
        const commands = this.cache.get(cacheKey) ?? [];
        return text.startsWith('/') && commands.some(
            cmd => text.startsWith(cmd.command.split(' ')[0])
        );
    }

    getAll(): BotCommand[] {
        const cacheKey = this.currentRoomId ?? GLOBAL_KEY;
        return [...(this.cache.get(cacheKey) ?? [])];
    }

    isLoaded(roomId?: string): boolean {
        return this.cache.has(roomId ?? GLOBAL_KEY);
    }
}

export const commandRegistry = new CommandRegistry();
