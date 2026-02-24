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
        const mxcToHttp = (url: string, size?: number) => matrixService.mxcToHttp(url, size);
        const mxcToHttpDownload = (url: string) => matrixService.mxcToHttpDownload(url);
        const parsed = events
            .map(e => parseEvent(e, getDisplayName, getAvatarUrl, mxcToHttp, mxcToHttpDownload))
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

    const sendFile = useCallback(async (file: File) => {
        if (!roomId) return;
        await matrixService.sendFile(roomId, file);
    }, [roomId]);

    const loadMore = useCallback(async () => {
        if (!roomId) return;
        await matrixService.loadMoreMessages(roomId);
        loadMessages();
    }, [roomId, loadMessages]);

    return { messages, sendMessage, sendFile, loadMore };
}
