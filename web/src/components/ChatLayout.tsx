import React, { useState, useEffect, useCallback } from 'react';
import { ChatProvider, useChat } from '../contexts/ChatContext';
import { CallProvider, useCall } from '../contexts/CallContext';
import { useVSCodeBridge, base64ToFile } from '../hooks/useVSCodeBridge';
import { useViewportResize } from '../hooks/useViewportResize';
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
import { initDeepLinkHandler } from '../utils/deepLink';
import { storageSet } from '../utils/storage';
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
import '../styles/mobile.css';
import '../styles/stickers.css';
import '../styles/voice-video.css';

interface ChatLayoutProps {
    onLogout: () => void;
}

function ChatLayoutInner({ onLogout }: ChatLayoutProps) {
    const chat = useChat();
    const call = useCall();
    useViewportResize();

    // VS Code bridge: snippet для вставки в MessageInput
    const [pendingSnippet, setPendingSnippet] = useState<string | null>(null);

    const handleJoinCall = useCallback(() => {
        if (!chat.activeRoom) return;
        call.handleJoinCall(chat.activeRoom.id, chat.activeRoom.name, chat.activeRoom.type);
    }, [chat.activeRoom, call.handleJoinCall]);

    useVSCodeBridge({
        onNavigateRoom: chat.handleSelectRoom,
        onSnippet: (code, language, fileName, lineRange) => {
            const codeBlock = `\`\`\`${language}\n// ${fileName}:${lineRange}\n${code}\n\`\`\``;
            setPendingSnippet(codeBlock);
        },
        onFilePicked: (name, base64, mimeType) => {
            const file = base64ToFile(base64, name, mimeType);
            chat.sendFile(file);
        },
        onStartCall: handleJoinCall,
    });

    // Deep links (uplink:// протокол) — только Tauri
    useEffect(() => {
        let cleanup: (() => void) | undefined;
        initDeepLinkHandler({
            onNavigateRoom: (roomId) => chat.handleSelectRoom(roomId),
            onStartCall: (roomId) => {
                chat.handleSelectRoom(roomId);
                setTimeout(() => handleJoinCall(), 500);
            },
            onSetServer: (serverUrl) => {
                storageSet('uplink_preset_server', serverUrl);
            },
        }).then(fn => { cleanup = fn; });

        return () => cleanup?.();
    }, [chat.handleSelectRoom, handleJoinCall]);

    const showOutgoing = call.signalState === 'ringing-out' || call.signalState === 'rejected' || call.signalState === 'no-answer';

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

            {chat.mobileView === 'sidebar' && chat.activeRoomId && (
                <div className="chat-sidebar-overlay" onClick={chat.handleBack} />
            )}

            <div className={`chat-main ${chat.activeThread ? 'chat-main--with-thread' : ''}`}>
                {chat.activeRoom ? (
                    <>
                        <div style={{ position: 'relative' }}>
                            <RoomHeader
                                room={chat.activeRoom}
                                onBack={chat.handleBack}
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

                        {call.callError && (
                            <div className="call-error">{call.callError}</div>
                        )}

                        {call.callState === 'connecting' && (
                            <div className="call-connecting">
                                <div className="call-connecting__spinner" />
                                <span>Подключение к звонку...</span>
                            </div>
                        )}

                        {call.callState === 'connected' && call.activeRoomName === chat.activeRoom.id && (
                            <>
                                <CallBar roomName={chat.activeRoom.name} />
                                <VideoGrid participants={call.participants} />
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
                            pendingText={pendingSnippet}
                            onPendingTextConsumed={() => setPendingSnippet(null)}
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
            {showOutgoing && call.callInfo && (
                <OutgoingCallOverlay
                    calleeName={call.callInfo.callerName}
                    signalState={call.signalState}
                    onCancel={call.cancelCall}
                />
            )}

            {/* Оверлей входящего звонка */}
            {call.signalState === 'ringing-in' && call.callInfo && (
                <IncomingCallOverlay
                    callInfo={call.callInfo}
                    onAccept={call.handleAcceptCall}
                    onReject={call.rejectCall}
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
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ onLogout }) => {
    return (
        <ChatProvider>
            <CallProvider>
                <ChatLayoutInner onLogout={onLogout} />
            </CallProvider>
        </ChatProvider>
    );
};
