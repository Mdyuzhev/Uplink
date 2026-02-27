import React, { useEffect, useCallback } from 'react';
import { useChatState } from '../hooks/useChatState';
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
import { BotSettings } from './BotSettings';
import '../styles/chat.css';
import '../styles/sidebar.css';
import '../styles/room-header.css';
import '../styles/messages.css';
import '../styles/message-input.css';
import '../styles/call.css';
import '../styles/profile.css';
import '../styles/admin.css';
import '../styles/thread.css';
import '../styles/bots.css';

interface ChatLayoutProps {
    onLogout: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ onLogout }) => {
    const chat = useChatState();

    const {
        callState, participants, duration, isMuted, isCameraOn,
        activeRoomName, error: callError, joinCall, leaveCall, toggleMute, toggleCamera,
    } = useLiveKit();

    const {
        signalState, callInfo, startCall, acceptCall, rejectCall, cancelCall, resetSignaling,
    } = useCallSignaling();

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

    // Кнопка «Позвонить» — DM: invite, канал: сразу LiveKit
    const handleJoinCall = useCallback(() => {
        if (!chat.activeRoom) return;
        if (chat.activeRoom.type === 'direct') {
            startCall(chat.activeRoom.id, chat.activeRoom.name);
        } else {
            joinCall(chat.activeRoom.id);
        }
    }, [chat.activeRoom, startCall, joinCall]);

    // Принять входящий → подключиться к LiveKit
    const handleAcceptCall = useCallback(async () => {
        await acceptCall();
        if (callInfo) joinCall(callInfo.roomId);
    }, [acceptCall, callInfo, joinCall]);

    // Завершить звонок — отправить hangup + отключиться от LiveKit
    const handleLeaveCall = useCallback(async () => {
        await leaveCall();
        await callSignalingService.cancelOrHangup();
    }, [leaveCall]);

    const showOutgoing = signalState === 'ringing-out' || signalState === 'rejected' || signalState === 'no-answer';

    return (
        <div className="chat-layout">
            <div className={`chat-sidebar ${chat.mobileView === 'chat' ? 'chat-sidebar--hidden' : ''}`}>
                <Sidebar
                    spaces={chat.spaces}
                    channels={chat.channels}
                    directs={chat.directs}
                    users={chat.users}
                    usersLoading={chat.usersLoading}
                    activeRoomId={chat.activeRoomId}
                    userName={matrixService.users.getMyDisplayName()}
                    isAdmin={chat.isAdmin}
                    onSelectRoom={chat.handleSelectRoom}
                    onOpenDM={chat.handleOpenDM}
                    onProfileClick={() => chat.setShowProfile(true)}
                    onLogout={onLogout}
                    onCreateSpace={() => chat.setShowCreateSpace(true)}
                    onCreateRoom={(spaceId) => {
                        const space = chat.spaces.find(s => s.id === spaceId);
                        chat.setCreateRoomForSpace({ id: spaceId, name: space?.name || '' });
                    }}
                    onAdminPanel={() => chat.setShowAdminPanel(true)}
                />
            </div>

            <div className={`chat-main ${chat.activeThread ? 'chat-main--with-thread' : ''}`}>
                {chat.activeRoom ? (
                    <>
                        <div style={{ position: 'relative' }}>
                            <RoomHeader
                                room={chat.activeRoom}
                                onBack={chat.handleBack}
                                callState={callState}
                                activeCallRoomName={activeRoomName}
                                onJoinCall={handleJoinCall}
                                onLeaveCall={handleLeaveCall}
                                pinnedMessages={chat.pinnedMessages}
                                onScrollToMessage={chat.setScrollToEventId}
                                onUnpin={chat.togglePin}
                                showBotSettings={chat.showBotSettings}
                                onToggleBotSettings={() => chat.setShowBotSettings(!chat.showBotSettings)}
                            />
                            {chat.showBotSettings && chat.activeRoomId && (
                                <BotSettings
                                    roomId={chat.activeRoomId}
                                    currentUserId={matrixService.getUserId()}
                                    onClose={() => chat.setShowBotSettings(false)}
                                />
                            )}
                        </div>

                        {callError && (
                            <div className="call-error">{callError}</div>
                        )}

                        {callState === 'connected' && activeRoomName === chat.activeRoom.id && (
                            <>
                                <CallBar
                                    roomName={chat.activeRoom.name}
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
                            messages={chat.messages}
                            reactions={chat.reactions}
                            pinnedIds={chat.pinnedIds}
                            threadSummaries={chat.threadSummaries}
                            typingUsers={chat.typingUsers}
                            scrollToEventId={chat.scrollToEventId}
                            onScrollComplete={() => chat.setScrollToEventId(null)}
                            onLoadMore={chat.loadMore}
                            onReply={chat.handleReply}
                            onReact={chat.sendReaction}
                            onRemoveReaction={chat.removeReaction}
                            onPin={chat.togglePin}
                            onOpenThread={chat.handleOpenThread}
                        />
                        <MessageInput
                            onSend={chat.sendMessage}
                            onSendReply={chat.sendReply}
                            onSendFile={chat.sendFile}
                            roomId={chat.activeRoomId || undefined}
                            roomName={chat.activeRoom.name}
                            replyTo={chat.replyTo}
                            onCancelReply={() => chat.setReplyTo(null)}
                        />
                    </>
                ) : (
                    <div className="chat-main__empty">
                        Выберите канал или чат
                    </div>
                )}
            </div>

            {/* Панель треда */}
            {chat.activeThread && (
                <ThreadPanel
                    roomId={chat.activeThread.roomId}
                    threadRootId={chat.activeThread.threadRootId}
                    onClose={() => chat.setActiveThread(null)}
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
            {chat.showProfile && (
                <ProfileModal
                    onClose={() => chat.setShowProfile(false)}
                    onLogout={onLogout}
                />
            )}

            {/* Модалка создания канала */}
            {chat.showCreateSpace && (
                <CreateSpaceModal
                    onClose={() => chat.setShowCreateSpace(false)}
                    onCreated={chat.refresh}
                />
            )}

            {/* Модалка создания комнаты в канале */}
            {chat.createRoomForSpace && (
                <CreateRoomModal
                    spaceId={chat.createRoomForSpace.id}
                    spaceName={chat.createRoomForSpace.name}
                    onClose={() => chat.setCreateRoomForSpace(null)}
                    onCreated={chat.refresh}
                />
            )}

            {/* Админ-панель */}
            {chat.showAdminPanel && (
                <AdminPanel onClose={() => chat.setShowAdminPanel(false)} />
            )}
        </div>
    );
};
