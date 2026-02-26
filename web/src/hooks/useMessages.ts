import { useState, useEffect, useCallback, useMemo } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { parseEvent, ParsedMessage } from '../matrix/MessageFormatter';
import { ReactionInfo } from '../components/MessageBubble';

export function useMessages(roomId: string | null) {
    const [messages, setMessages] = useState<ParsedMessage[]>([]);
    const [rawReactions, setRawReactions] = useState<Map<string, Array<{ emoji: string; userId: string; eventId: string }>>>(new Map());
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    const loadMessages = useCallback(() => {
        if (!roomId || !matrixService.isConnected) {
            setMessages([]);
            setRawReactions(new Map());
            setPinnedIds(new Set());
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

        // Заполнить reply info
        for (const msg of parsed) {
            if (msg.replyToEventId && !msg.replyToSender) {
                const origEvent = matrixService.findEventInRoom(roomId, msg.replyToEventId);
                if (origEvent) {
                    msg.replyToSender = getDisplayName(origEvent.getSender()!);
                    let origBody = origEvent.getContent()?.body || '';
                    if (origBody.length > 100) origBody = origBody.substring(0, 100) + '...';
                    msg.replyToBody = origBody;
                }
            }
        }

        setMessages(parsed);

        // Реакции
        setRawReactions(matrixService.getReactionsForRoom(roomId));

        // Pinned
        setPinnedIds(new Set(matrixService.getPinnedEventIds(roomId)));
    }, [roomId]);

    // Агрегировать реакции в Map<eventId, ReactionInfo[]>
    const reactions = useMemo(() => {
        const myUserId = matrixService.getUserId();
        const result = new Map<string, ReactionInfo[]>();

        for (const [targetId, entries] of rawReactions) {
            const byEmoji = new Map<string, ReactionInfo>();
            for (const { emoji, userId, eventId } of entries) {
                if (!byEmoji.has(emoji)) {
                    byEmoji.set(emoji, { emoji, count: 0, users: [] });
                }
                const info = byEmoji.get(emoji)!;
                info.count++;
                info.users.push(matrixService.getDisplayName(userId));
                if (userId === myUserId) {
                    info.myReactionEventId = eventId;
                }
            }
            result.set(targetId, Array.from(byEmoji.values()));
        }
        return result;
    }, [rawReactions]);

    useEffect(() => {
        loadMessages();
        if (roomId) matrixService.markRoomAsRead(roomId);

        const unsub = matrixService.onNewMessage((msgRoomId) => {
            if (msgRoomId === roomId) {
                loadMessages();
                matrixService.markRoomAsRead(roomId);
            }
        });
        return unsub;
    }, [roomId, loadMessages]);

    // Typing listener
    useEffect(() => {
        if (!roomId) return;
        const unsub = matrixService.onTyping((rid, names) => {
            if (rid === roomId) setTypingUsers(names);
        });
        return () => {
            unsub();
            setTypingUsers([]);
        };
    }, [roomId]);

    const sendMessage = useCallback(async (body: string) => {
        if (!roomId) return;
        await matrixService.sendMessage(roomId, body);
    }, [roomId]);

    const sendReply = useCallback(async (replyToEventId: string, body: string) => {
        if (!roomId) return;
        await matrixService.sendReply(roomId, replyToEventId, body);
    }, [roomId]);

    const sendFile = useCallback(async (file: File) => {
        if (!roomId) return;
        await matrixService.sendFile(roomId, file);
    }, [roomId]);

    const sendReaction = useCallback(async (eventId: string, emoji: string) => {
        if (!roomId) return;
        await matrixService.sendReaction(roomId, eventId, emoji);
    }, [roomId]);

    const removeReaction = useCallback(async (reactionEventId: string) => {
        if (!roomId) return;
        await matrixService.removeReaction(roomId, reactionEventId);
    }, [roomId]);

    const togglePin = useCallback(async (eventId: string) => {
        if (!roomId) return;
        try {
            if (pinnedIds.has(eventId)) {
                await matrixService.unpinMessage(roomId, eventId);
                setPinnedIds(prev => { const next = new Set(prev); next.delete(eventId); return next; });
            } else {
                await matrixService.pinMessage(roomId, eventId);
                setPinnedIds(prev => new Set(prev).add(eventId));
            }
        } catch (e) {
            console.error('Ошибка закрепления сообщения:', e);
        }
    }, [roomId, pinnedIds]);

    const loadMore = useCallback(async () => {
        if (!roomId) return;
        await matrixService.loadMoreMessages(roomId);
        loadMessages();
    }, [roomId, loadMessages]);

    return {
        messages, reactions, pinnedIds, typingUsers,
        sendMessage, sendReply, sendFile, sendReaction, removeReaction, togglePin, loadMore,
    };
}
