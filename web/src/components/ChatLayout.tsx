import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useMessages } from '../hooks/useMessages';
import { ParsedMessage } from '../matrix/MessageFormatter';
import { ReplyToInfo } from './MessageInput';
import { useUsers } from '../hooks/useUsers';
import { useLiveKit } from '../hooks/useLiveKit';
import { useCallSignaling } from '../hooks/useCallSignaling';
import { callSignalingService } from '../livekit/CallSignalingService';
import { matrixService } from '../matrix/MatrixService';
import { Sidebar } from './Sidebar';
import { RoomHeader } from './RoomHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { CallBar } from './CallBar';
import { VideoGrid } from './VideoGrid';
import { ProfileModal } from './ProfileModal';
import { IncomingCallOverlay } from './IncomingCallOverlay';
import { OutgoingCallOverlay } from './OutgoingCallOverlay';
import { CreateSpaceModal } from './CreateSpaceModal';
import { CreateRoomModal } from './CreateRoomModal';
import { AdminPanel } from './AdminPanel';
import { ThreadPanel } from './ThreadPanel';
import { useNotifications } from '../hooks/useNotifications';
import '../styles/chat.css';

interface ChatLayoutProps {
    onLogout: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ onLogout }) => {
    const { spaces, channels, directs, isAdmin, refresh } = useRooms();
    const { users, loading: usersLoading } = useUsers();
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
    const [showProfile, setShowProfile] = useState(false);
    const [showCreateSpace, setShowCreateSpace] = useState(false);
    const [createRoomForSpace, setCreateRoomForSpace] = useState<{ id: string; name: string } | null>(null);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
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

    // Сброс reply при смене комнаты
    useEffect(() => { setReplyTo(null); }, [activeRoomId]);

    const handleReply = useCallback((msg: ParsedMessage) => {
        setReplyTo({
            eventId: msg.id,
            sender: msg.senderDisplayName,
            body: msg.body.length > 100 ? msg.body.substring(0, 100) + '...' : msg.body,
        });
    }, []);

    const {
        callState, participants, duration, isMuted, isCameraOn,
        activeRoomName, error: callError, joinCall, leaveCall, toggleMute, toggleCamera,
    } = useLiveKit();

    const {
        signalState, callInfo, startCall, acceptCall, rejectCall, cancelCall, resetSignaling,
    } = useCallSignaling();

    // Собрать все комнаты для поиска activeRoom (включая вложенные в Spaces)
    const allRooms = [
        ...channels,
        ...directs,
        ...spaces.flatMap(s => s.rooms),
    ];
    const activeRoom = allRooms.find(r => r.id === activeRoomId) || null;

    // Запуск слушателя сигнализации звонков
    useEffect(() => {
        callSignalingService.startListening();
        return () => callSignalingService.stopListening();
    }, []);

    // Когда signalState → accepted у звонящего → подключиться к LiveKit
    useEffect(() => {
        if (signalState === 'accepted' && callInfo?.direction === 'outgoing') {
            joinCall(callInfo.roomId);
        }
    }, [signalState, callInfo, joinCall]);

    // При завершении LiveKit-звонка → сбросить сигнализацию
    useEffect(() => {
        if (callState === 'idle' && signalState === 'accepted') {
            resetSignaling();
        }
    }, [callState, signalState, resetSignaling]);

    const handleSelectRoom = (roomId: string) => {
        setActiveRoomId(roomId);
        setActiveThread(null);
        setMobileView('chat');
        // Сбросить счётчик непрочитанных при открытии чата
        matrixService.markRoomAsRead(roomId).then(() => refresh());
    };

    const handleOpenThread = useCallback((threadRootId: string) => {
        if (activeRoomId) {
            setActiveThread({ roomId: activeRoomId, threadRootId });
        }
    }, [activeRoomId]);

    // Push-уведомления о новых сообщениях в других чатах
    useNotifications(activeRoomId, handleSelectRoom);

    const handleBack = () => {
        setMobileView('sidebar');
    };

    const handleOpenDM = async (userId: string) => {
        try {
            const roomId = await matrixService.getOrCreateDM(userId);
            refresh();
            setActiveRoomId(roomId);
            setMobileView('chat');
        } catch (err) {
            console.error('Ошибка открытия DM:', err);
        }
    };

    // Кнопка «Позвонить» — DM: invite, канал: сразу LiveKit
    const handleJoinCall = () => {
        if (!activeRoom) return;

        if (activeRoom.type === 'direct') {
            // DM → отправить invite, ждать ответа
            startCall(activeRoom.id, activeRoom.name);
        } else {
            // Канал → сразу подключиться (как раньше)
            joinCall(activeRoom.id);
        }
    };

    // Принять входящий → подключиться к LiveKit
    const handleAcceptCall = async () => {
        await acceptCall();
        if (callInfo) {
            joinCall(callInfo.roomId);
        }
    };

    // Завершить звонок — отправить hangup + отключиться от LiveKit
    const handleLeaveCall = async () => {
        await leaveCall();
        await callSignalingService.cancelOrHangup();
    };

    // Показывать оверлей исходящего звонка
    const showOutgoing = signalState === 'ringing-out' || signalState === 'rejected' || signalState === 'no-answer';

    return (
        <div className="chat-layout">
            <div className={`chat-sidebar ${mobileView === 'chat' ? 'chat-sidebar--hidden' : ''}`}>
                <Sidebar
                    spaces={spaces}
                    channels={channels}
                    directs={directs}
                    users={users}
                    usersLoading={usersLoading}
                    activeRoomId={activeRoomId}
                    userName={matrixService.getMyDisplayName()}
                    isAdmin={isAdmin}
                    onSelectRoom={handleSelectRoom}
                    onOpenDM={handleOpenDM}
                    onProfileClick={() => setShowProfile(true)}
                    onLogout={onLogout}
                    onCreateSpace={() => setShowCreateSpace(true)}
                    onCreateRoom={(spaceId) => {
                        const space = spaces.find(s => s.id === spaceId);
                        setCreateRoomForSpace({ id: spaceId, name: space?.name || '' });
                    }}
                    onAdminPanel={() => setShowAdminPanel(true)}
                />
            </div>

            <div className={`chat-main ${activeThread ? 'chat-main--with-thread' : ''}`}>
                {activeRoom ? (
                    <>
                        <RoomHeader
                            room={activeRoom}
                            onBack={handleBack}
                            callState={callState}
                            activeCallRoomName={activeRoomName}
                            onJoinCall={handleJoinCall}
                            onLeaveCall={handleLeaveCall}
                            pinnedMessages={pinnedMessages}
                            onScrollToMessage={setScrollToEventId}
                            onUnpin={togglePin}
                        />

                        {callError && (
                            <div className="call-error">{callError}</div>
                        )}

                        {callState === 'connected' && activeRoomName === activeRoom.id && (
                            <>
                                <CallBar
                                    roomName={activeRoom.name}
                                    participants={participants}
                                    isMuted={isMuted}
                                    isCameraOn={isCameraOn}
                                    duration={duration}
                                    onToggleMute={toggleMute}
                                    onToggleCamera={toggleCamera}
                                    onLeave={handleLeaveCall}
                                />
                                <VideoGrid participants={participants} />
                            </>
                        )}

                        <MessageList
                            messages={messages}
                            reactions={reactions}
                            pinnedIds={pinnedIds}
                            threadSummaries={threadSummaries}
                            typingUsers={typingUsers}
                            scrollToEventId={scrollToEventId}
                            onScrollComplete={() => setScrollToEventId(null)}
                            onLoadMore={loadMore}
                            onReply={handleReply}
                            onReact={sendReaction}
                            onRemoveReaction={removeReaction}
                            onPin={togglePin}
                            onOpenThread={handleOpenThread}
                        />
                        <MessageInput
                            onSend={sendMessage}
                            onSendReply={sendReply}
                            onSendFile={sendFile}
                            roomId={activeRoomId || undefined}
                            roomName={activeRoom.name}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                        />
                    </>
                ) : (
                    <div className="chat-main__empty">
                        Выберите канал или чат
                    </div>
                )}
            </div>

            {/* Панель треда */}
            {activeThread && (
                <ThreadPanel
                    roomId={activeThread.roomId}
                    threadRootId={activeThread.threadRootId}
                    onClose={() => setActiveThread(null)}
                />
            )}

            {/* Оверлей исходящего звонка */}
            {showOutgoing && callInfo && (
                <OutgoingCallOverlay
                    calleeName={callInfo.callerName}
                    signalState={signalState}
                    onCancel={cancelCall}
                />
            )}

            {/* Оверлей входящего звонка */}
            {signalState === 'ringing-in' && callInfo && (
                <IncomingCallOverlay
                    callInfo={callInfo}
                    onAccept={handleAcceptCall}
                    onReject={rejectCall}
                />
            )}

            {/* Модалка профиля */}
            {showProfile && (
                <ProfileModal
                    onClose={() => setShowProfile(false)}
                    onLogout={onLogout}
                />
            )}

            {/* Модалка создания канала */}
            {showCreateSpace && (
                <CreateSpaceModal
                    onClose={() => setShowCreateSpace(false)}
                    onCreated={refresh}
                />
            )}

            {/* Модалка создания комнаты в канале */}
            {createRoomForSpace && (
                <CreateRoomModal
                    spaceId={createRoomForSpace.id}
                    spaceName={createRoomForSpace.name}
                    onClose={() => setCreateRoomForSpace(null)}
                    onCreated={refresh}
                />
            )}

            {/* Админ-панель */}
            {showAdminPanel && (
                <AdminPanel onClose={() => setShowAdminPanel(false)} />
            )}
        </div>
    );
};
