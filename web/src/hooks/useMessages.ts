import { useState, useEffect, useCallback } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { parseEvent, ParsedMessage } from '../matrix/MessageFormatter';

export function useMessages(roomId: string | null) {
    const [messages, setMessages] = useState<ParsedMessage[]>([]);

    const loadMessages = useCallback(() => {
        if (!roomId || !matrixService.isConnected) {
            setMessages([]);
            return;
        }
        const events = matrixService.getRoomTimeline(roomId);
        const getDisplayName = (userId: string) => matrixService.getDisplayName(userId);
        const getAvatarUrl = (userId: string) => matrixService.getUserAvatarUrl(userId);
        const parsed = events
            .map(e => parseEvent(e, getDisplayName, getAvatarUrl))
            .filter((m): m is ParsedMessage => m !== null);
        setMessages(parsed);
    }, [roomId]);

    useEffect(() => {
        loadMessages();
        const unsub = matrixService.onNewMessage((msgRoomId) => {
            if (msgRoomId === roomId) {
                loadMessages();
            }
        });
        return unsub;
    }, [roomId, loadMessages]);

    const sendMessage = useCallback(async (body: string) => {
        if (!roomId) return;
        await matrixService.sendMessage(roomId, body);
    }, [roomId]);

    const loadMore = useCallback(async () => {
        if (!roomId) return;
        await matrixService.loadMoreMessages(roomId);
        loadMessages();
    }, [roomId, loadMessages]);

    return { messages, sendMessage, loadMore };
}
