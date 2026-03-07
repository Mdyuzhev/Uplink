import { useState, useEffect, useCallback } from 'react';
import { matrixService } from '../matrix/MatrixService';

export interface MentionSuggestion {
    userId: string;
    displayName: string;
}

/**
 * Хук автокомплита упоминаний через @.
 *
 * Сканирует назад от cursorPos чтобы найти `@`.
 * Если между `@` и cursorPos нет пробелов — это активный запрос.
 */
export function useMentions(text: string, cursorPos: number, roomId: string | undefined) {
    const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState(-1);

    useEffect(() => {
        if (!roomId) {
            setSuggestions([]);
            return;
        }

        const textBeforeCursor = text.slice(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf('@');

        if (atIndex === -1) {
            setSuggestions([]);
            setMentionStart(-1);
            return;
        }

        const queryPart = textBeforeCursor.slice(atIndex + 1);

        // Если в query есть пробел — триггер неактивен
        if (queryPart.includes(' ') || queryPart.includes('\n')) {
            setSuggestions([]);
            setMentionStart(-1);
            return;
        }

        const room = matrixService.getClient().getRoom(roomId);
        if (!room) {
            setSuggestions([]);
            return;
        }

        const myUserId = matrixService.getClient().getUserId();
        const members = room.getJoinedMembers()
            .filter(m => m.userId !== myUserId)
            .map(m => ({
                userId: m.userId,
                displayName: m.name || m.userId,
            }));

        const q = queryPart.toLowerCase();
        const filtered = q === ''
            ? members.slice(0, 8)
            : members.filter(m =>
                m.displayName.toLowerCase().includes(q) ||
                m.userId.toLowerCase().includes(q)
            ).slice(0, 8);

        setSuggestions(filtered);
        setMentionStart(atIndex);
        setSelectedIndex(0);
    }, [text, cursorPos, roomId]);

    const insertMention = useCallback((index: number): { newText: string; newCursor: number } => {
        const member = suggestions[index];
        if (!member || mentionStart === -1) return { newText: text, newCursor: cursorPos };

        const before = text.slice(0, mentionStart);
        const after = text.slice(cursorPos);
        const insert = `@${member.displayName} `;
        const newText = before + insert + after;
        const newCursor = mentionStart + insert.length;

        setSuggestions([]);
        setMentionStart(-1);
        return { newText, newCursor };
    }, [suggestions, mentionStart, text, cursorPos]);

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
        setMentionStart(-1);
    }, []);

    return {
        suggestions,
        selectedIndex,
        setSelectedIndex,
        insertMention,
        clearSuggestions,
        mentionStart,
    };
}
