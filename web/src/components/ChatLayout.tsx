import React, { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useMessages } from '../hooks/useMessages';
import { useLiveKit } from '../hooks/useLiveKit';
import { Sidebar } from './Sidebar';
import { RoomHeader } from './RoomHeader';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { CallBar } from './CallBar';
import '../styles/chat.css';

interface ChatLayoutProps {
    onLogout: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ onLogout }) => {
    const { channels, directs } = useRooms();
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
    const { messages, sendMessage, loadMore } = useMessages(activeRoomId);

    const {
        callState, participants, duration, isMuted,
        activeRoomName, error: callError, joinCall, leaveCall, toggleMute,
    } = useLiveKit();

    const allRooms = [...channels, ...directs];
    const activeRoom = allRooms.find(r => r.id === activeRoomId) || null;

    const handleSelectRoom = (roomId: string) => {
        setActiveRoomId(roomId);
        setMobileView('chat');
    };

    const handleBack = () => {
        setMobileView('sidebar');
    };

    const handleJoinCall = () => {
        if (activeRoom) {
            joinCall(activeRoom.name);
        }
    };

    return (
        <div className="chat-layout">
            <div className={`chat-sidebar ${mobileView === 'chat' ? 'chat-sidebar--hidden' : ''}`}>
                <Sidebar
                    channels={channels}
                    directs={directs}
                    activeRoomId={activeRoomId}
                    onSelectRoom={handleSelectRoom}
                    onLogout={onLogout}
                />
            </div>

            <div className="chat-main">
                {activeRoom ? (
                    <>
                        <RoomHeader
                            room={activeRoom}
                            onBack={handleBack}
                            callState={callState}
                            activeCallRoomName={activeRoomName}
                            onJoinCall={handleJoinCall}
                            onLeaveCall={leaveCall}
                        />

                        {callError && (
                            <div className="call-error">{callError}</div>
                        )}

                        {callState === 'connected' && activeRoomName === activeRoom.name && (
                            <CallBar
                                roomName={activeRoomName}
                                participants={participants}
                                isMuted={isMuted}
                                duration={duration}
                                onToggleMute={toggleMute}
                                onLeave={leaveCall}
                            />
                        )}

                        <MessageList messages={messages} onLoadMore={loadMore} />
                        <MessageInput
                            onSend={sendMessage}
                            roomName={activeRoom.name}
                        />
                    </>
                ) : (
                    <div className="chat-main__empty">
                        Выберите канал или чат
                    </div>
                )}
            </div>
        </div>
    );
};
