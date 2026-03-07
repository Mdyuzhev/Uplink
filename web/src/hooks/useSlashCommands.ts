/**
 * Автокомплит slash-команд.
 * Возвращает suggestions и handlers для навигации/выбора.
 */

import { useState, useEffect, useCallback } from 'react';
import { commandRegistry, BotCommand } from '../bots/CommandRegistry';

export function useSlashCommands(text: string, roomId?: string) {
    const [suggestions, setSuggestions] = useState<BotCommand[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Перезагружать команды при смене комнаты
    useEffect(() => {
        if (roomId) {
            commandRegistry.load(roomId);
        } else if (!commandRegistry.isLoaded()) {
            commandRegistry.load();
        }
    }, [roomId]);

    // Обновлять suggestions при изменении текста
    useEffect(() => {
        if (text.startsWith('/') && !text.includes('\n')) {
            const matches = commandRegistry.search(text);
            setSuggestions(matches);
            setSelectedIndex(0);
        } else {
            setSuggestions([]);
        }
    }, [text]);

    const selectSuggestion = useCallback((index: number): string => {
        const cmd = suggestions[index];
        setSuggestions([]);
        return cmd ? cmd.command + ' ' : '';
    }, [suggestions]);

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
    }, []);

    return { suggestions, selectedIndex, setSelectedIndex, selectSuggestion, clearSuggestions };
}
