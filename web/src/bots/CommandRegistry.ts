/**
 * Реестр slash-команд ботов.
 * Загружается с бот-сервиса, используется для автокомплита в MessageInput.
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

class CommandRegistry {
    private commands: BotCommand[] = [];
    private loaded = false;

    /**
     * Загрузить команды с бот-сервиса.
     */
    async load(): Promise<void> {
        try {
            const baseUrl = getConfig().botApiUrl;
            const resp = await fetchWithAuth(`${baseUrl}/commands`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            this.commands = await resp.json();
            this.loaded = true;
        } catch (err) {
            console.warn('Не удалось загрузить команды ботов:', err);
            // Фолбэк — базовые команды, чтобы /help всегда работал
            this.commands = [{
                command: '/help',
                description: 'Список доступных команд',
                usage: '/help [бот]',
                botId: 'helper',
                botName: 'Uplink Helper',
            }];
        }
    }

    /**
     * Поиск команд по вводу.
     * "/" → все команды. "/git" → фильтр по префиксу.
     */
    search(input: string): BotCommand[] {
        if (!input.startsWith('/')) return [];
        const query = input.toLowerCase();
        return this.commands
            .filter(cmd => cmd.command.toLowerCase().startsWith(query))
            .slice(0, 8);
    }

    /**
     * Проверить, является ли текст slash-командой.
     */
    isCommand(text: string): boolean {
        return text.startsWith('/') && this.commands.some(
            cmd => text.startsWith(cmd.command.split(' ')[0])
        );
    }

    getAll(): BotCommand[] {
        return [...this.commands];
    }

    isLoaded(): boolean {
        return this.loaded;
    }
}

export const commandRegistry = new CommandRegistry();
