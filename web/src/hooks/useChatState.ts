import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRooms } from './useRooms';
import { useMessages } from './useMessages';
import { useUsers } from './useUsers';
import { useNotifications } from './useNotifications';
import { matrixService } from '../matrix/MatrixService';
import { storageGet, storageSet } from '../utils/storage';
import { ParsedMessage } from '../matrix/MessageFormatter';
import { ReplyToInfo } from '../components/MessageInput';

export function useChatState() {
    const { spaces, channels, directs, isAdmin, refresh } = useRooms();
    const { users, loading: usersLoading } = useUsers();
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
    const [isDMsMode, setIsDMsMode] = useState(false);
    const [isThreadsMode, setIsThreadsMode] = useState(false);
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
    const [showProfile, setShowProfile] = useState(false);
    const [showCreateSpace, setShowCreateSpace] = useState(false);
    const [createRoomForSpace, setCreateRoomForSpace] = useState<{ id: string; name: string } | null>(null);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [showBotSettings, setShowBotSettings] = useState(false);
    const [replyTo, setReplyTo] = useState<ReplyToInfo | null>(null);
    const [scrollToEventId, setScrollToEventId] = useState<string | null>(null);
    const [activeThread, setActiveThread] = useState<{ roomId: string; threadRootId: string } | null>(null);

    const {
        messages, reactions, pinnedIds, threadSummaries, typingUsers,
        sendMessage, sendReply, sendFile, sendReaction, removeReaction, togglePin, loadMore,
    } = useMessages(activeRoomId);

    // Закреплённые сообщения для панели в шапке
    const pinnedMessages = useMemo(() => {
        if (!pinnedIds || pinnedIds.size === 0) return [];
        return messages
            .filter(m => pinnedIds.has(m.id))
            .map(m => ({
                id: m.id,
                sender: m.senderDisplayName,
                body: m.body.length > 120 ? m.body.substring(0, 120) + '...' : m.body,
            }));
    }, [messages, pinnedIds]);

    // Инициализация: выбрать первый Space или восстановить из localStorage
    useEffect(() => {
        if (spaces.length > 0 && !activeSpaceId) {
            const saved = storageGet('uplink_last_space');
            const found = saved && spaces.find(s => s.id === saved);
            setActiveSpaceId(found ? saved : spaces[0].id);
        }
    }, [spaces, activeSpaceId]);

    // Сброс reply при смене комнаты
    useEffect(() => { setReplyTo(null); }, [activeRoomId]);

    const handleReply = useCallback((msg: ParsedMessage) => {
        setReplyTo({
            eventId: msg.id,
            sender: msg.senderDisplayName,
            body: msg.body.length > 100 ? msg.body.substring(0, 100) + '...' : msg.body,
        });
    }, []);

    // Все комнаты (включая вложенные в Spaces)
    const allRooms = useMemo(() => [
        ...channels,
        ...directs,
        ...spaces.flatMap(s => s.rooms),
    ], [channels, directs, spaces]);

    const activeRoom = allRooms.find(r => r.id === activeRoomId) || null;

    const handleSelectRoom = useCallback((roomId: string) => {
        setActiveRoomId(roomId);
        setActiveThread(null);
        setMobileView('chat');
        matrixService.messages.markRoomAsRead(roomId).then(() => refresh());
    }, [refresh]);

    const handleSelectSpace = useCallback((spaceId: string) => {
        setActiveSpaceId(spaceId);
        setIsDMsMode(false);
        setIsThreadsMode(false);
        storageSet('uplink_last_space', spaceId);

        const space = spaces.find(s => s.id === spaceId);
        if (space?.rooms[0]) {
            handleSelectRoom(space.rooms[0].id);
        }
    }, [spaces, handleSelectRoom]);

    const handleOpenThread = useCallback((threadRootId: string) => {
        if (activeRoomId) {
            setActiveThread({ roomId: activeRoomId, threadRootId });
        }
    }, [activeRoomId]);

    const handleBack = useCallback(() => setMobileView('sidebar'), []);

    const handleOpenDM = useCallback(async (userId: string) => {
        try {
            const dmEncrypted = storageGet('uplink_dm_encrypted') === 'true';
            const roomId = await matrixService.rooms.getOrCreateDM(userId, dmEncrypted);
            refresh();
            setActiveRoomId(roomId);
            setMobileView('chat');
        } catch (err) {
            console.error('Ошибка открытия DM:', err);
        }
    }, [refresh]);

    // Push-уведомления
    useNotifications(activeRoomId, handleSelectRoom);

    // VS Code: отправлять unread-count для Activity Bar badge
    useEffect(() => {
        if (!(window as any).__VSCODE__) return;
        const totalUnread = allRooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
        (window as any).__VSCODE_API__?.postMessage({
            type: 'unread-count',
            count: totalUnread,
        });
    }, [allRooms]);

    return {
        // Данные
        spaces, channels, directs, users, usersLoading, isAdmin, refresh,
        activeRoomId, activeRoom, allRooms,
        activeSpaceId, isDMsMode, isThreadsMode,
        messages, reactions, pinnedIds, pinnedMessages, threadSummaries, typingUsers,
        replyTo, scrollToEventId, activeThread,
        mobileView,
        // Модалки
        showProfile, setShowProfile,
        showCreateSpace, setShowCreateSpace,
        createRoomForSpace, setCreateRoomForSpace,
        showAdminPanel, setShowAdminPanel,
        showBotSettings, setShowBotSettings,
        // Actions
        handleSelectRoom, handleSelectSpace, handleBack, handleOpenDM, handleOpenThread, handleReply,
        setIsDMsMode, setIsThreadsMode,
        setReplyTo, setScrollToEventId, setActiveThread,
        sendMessage, sendReply, sendFile, sendReaction, removeReaction, togglePin, loadMore,
    };
}
