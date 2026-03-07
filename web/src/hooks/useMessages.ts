import { useState, useEffect, useCallback, useMemo } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { parseEvent, ParsedMessage } from '../matrix/MessageFormatter';
import { ReactionInfo, ThreadSummaryInfo } from '../components/MessageBubble';

export function useMessages(roomId: string | null) {
    const [messages, setMessages] = useState<ParsedMessage[]>([]);
    const [rawReactions, setRawReactions] = useState<Map<string, Array<{ emoji: string; userId: string; eventId: string }>>>(new Map());
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [threadSummaries, setThreadSummaries] = useState<Map<string, ThreadSummaryInfo>>(new Map());
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    const loadMessages = useCallback(() => {
        if (!roomId || !matrixService.isConnected) {
            setMessages([]);
            setRawReactions(new Map());
            setPinnedIds(new Set());
            setThreadSummaries(new Map());
            return;
        }
        const events = matrixService.messages.getRoomTimeline(roomId);
        const getDisplayName = (userId: string) => matrixService.users.getDisplayName(userId);
        const getAvatarUrl = (userId: string) => matrixService.users.getUserAvatarUrl(userId);
        const mxcToHttp = (url: string, size?: number) => matrixService.media.mxcToHttp(url, size);
        const mxcToHttpDownload = (url: string) => matrixService.media.mxcToHttpDownload(url);

        // Фильтрация: скрыть сообщения, принадлежащие тредам (но показывать корневые)
        const filteredEvents = events.filter(e => {
            const content = e.getContent();
            const relation = content?.['m.relates_to'];
            if (relation?.rel_type === 'm.thread') return false;
            return true;
        });

        const parsed = filteredEvents
            .map(e => parseEvent(e, getDisplayName, getAvatarUrl, mxcToHttp, mxcToHttpDownload))
            .filter((m): m is ParsedMessage => m !== null);

        // Заполнить reply info
        for (const msg of parsed) {
            if (msg.replyToEventId && !msg.replyToSender) {
                const origEvent = matrixService.messages.findEventInRoom(roomId, msg.replyToEventId);
                if (origEvent) {
                    msg.replyToSender = getDisplayName(origEvent.getSender()!);
                    let origBody = origEvent.getContent()?.body || '';
                    if (origBody.length > 100) origBody = origBody.substring(0, 100) + '...';
                    msg.replyToBody = origBody;
                }
            }
        }

        setMessages(parsed);

        // Thread summaries для корневых сообщений
        const summaries = new Map<string, ThreadSummaryInfo>();
        for (const msg of parsed) {
            const summary = matrixService.threads.getThreadSummary(roomId, msg.id);
            if (summary && summary.replyCount > 0) {
                summaries.set(msg.id, {
                    replyCount: summary.replyCount,
                    lastReply: summary.lastReply,
                });
            }
        }
        setThreadSummaries(summaries);

        // Реакции
        setRawReactions(matrixService.reactions.getReactionsForRoom(roomId));

        // Pinned
        setPinnedIds(new Set(matrixService.pins.getPinnedEventIds(roomId)));
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
                info.users.push(matrixService.users.getDisplayName(userId));
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
        if (roomId) matrixService.messages.markRoomAsRead(roomId);

        const unsub = matrixService.onNewMessage((msgRoomId) => {
            if (msgRoomId === roomId) {
                loadMessages();
                matrixService.messages.markRoomAsRead(roomId);
            }
        });
        const unsubThread = matrixService.onThreadUpdate((rid) => {
            if (rid === roomId) loadMessages();
        });
        return () => { unsub(); unsubThread(); };
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
        await matrixService.messages.sendMessage(roomId, body);
    }, [roomId]);

    const sendReply = useCallback(async (replyToEventId: string, body: string) => {
        if (!roomId) return;
        await matrixService.messages.sendReply(roomId, replyToEventId, body);
    }, [roomId]);

    const sendFile = useCallback(async (file: File) => {
        if (!roomId) return;
        await matrixService.media.sendFile(roomId, file);
    }, [roomId]);

    const sendReaction = useCallback(async (eventId: string, emoji: string) => {
        if (!roomId) return;
        await matrixService.reactions.sendReaction(roomId, eventId, emoji);
    }, [roomId]);

    const removeReaction = useCallback(async (reactionEventId: string) => {
        if (!roomId) return;
        await matrixService.reactions.removeReaction(roomId, reactionEventId);
    }, [roomId]);

    const togglePin = useCallback(async (eventId: string) => {
        if (!roomId) return;
        try {
            if (pinnedIds.has(eventId)) {
                await matrixService.pins.unpinMessage(roomId, eventId);
                setPinnedIds(prev => { const next = new Set(prev); next.delete(eventId); return next; });
            } else {
                await matrixService.pins.pinMessage(roomId, eventId);
                setPinnedIds(prev => new Set(prev).add(eventId));
            }
        } catch (e) {
            console.error('Ошибка закрепления сообщения:', e);
        }
    }, [roomId, pinnedIds]);

    const deleteMessage = useCallback(async (eventId: string) => {
        if (!roomId) return;
        try {
            await matrixService.getClient().redactEvent(roomId, eventId);
        } catch (err) {
            console.error('Ошибка удаления сообщения:', err);
        }
    }, [roomId]);

    const loadMore = useCallback(async () => {
        if (!roomId) return;
        await matrixService.messages.loadMoreMessages(roomId);
        loadMessages();
    }, [roomId, loadMessages]);

    return {
        messages, reactions, pinnedIds, threadSummaries, typingUsers,
        sendMessage, sendReply, sendFile, sendReaction, removeReaction, togglePin, deleteMessage, loadMore,
    };
}
