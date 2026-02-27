import { useState, useEffect, useCallback } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { parseEvent, ParsedMessage } from '../matrix/MessageFormatter';

export function useThread(roomId: string | null, threadRootId: string | null) {
    const [messages, setMessages] = useState<ParsedMessage[]>([]);
    const [rootMessage, setRootMessage] = useState<ParsedMessage | null>(null);

    const refresh = useCallback(() => {
        if (!roomId || !threadRootId) {
            setMessages([]);
            setRootMessage(null);
            return;
        }

        const getDisplayName = (userId: string) => matrixService.users.getDisplayName(userId);
        const getAvatarUrl = (userId: string) => matrixService.users.getUserAvatarUrl(userId);
        const mxcToHttp = (url: string, size?: number) => matrixService.media.mxcToHttp(url, size);
        const mxcToHttpDownload = (url: string) => matrixService.media.mxcToHttpDownload(url);

        // Корневое сообщение
        const rootEvent = matrixService.messages.findEventInRoom(roomId, threadRootId);
        if (rootEvent) {
            const parsed = parseEvent(rootEvent, getDisplayName, getAvatarUrl, mxcToHttp, mxcToHttpDownload);
            setRootMessage(parsed);
        }

        // Сообщения треда
        const events = matrixService.threads.getThreadMessages(roomId, threadRootId);
        const parsed = events
            .map(e => parseEvent(e, getDisplayName, getAvatarUrl, mxcToHttp, mxcToHttpDownload))
            .filter((m): m is ParsedMessage => m !== null);
        setMessages(parsed);
    }, [roomId, threadRootId]);

    useEffect(() => {
        refresh();
        if (!roomId) return;

        const unsub = matrixService.onThreadUpdate((rid, tid) => {
            if (rid === roomId && tid === threadRootId) refresh();
        });
        const unsub2 = matrixService.onNewMessage((rid) => {
            if (rid === roomId) refresh();
        });
        return () => { unsub(); unsub2(); };
    }, [roomId, threadRootId, refresh]);

    const sendMessage = useCallback(async (body: string) => {
        if (!roomId || !threadRootId || !body.trim()) return;
        await matrixService.threads.sendThreadMessage(roomId, threadRootId, body.trim());
    }, [roomId, threadRootId]);

    return { rootMessage, messages, sendMessage, refresh };
}
