import React, { useState, useEffect } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useMessages } from '../hooks/useMessages';
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
import { IncomingCallOverlay } from './IncomingCallOverlay';
import { OutgoingCallOverlay } from './OutgoingCallOverlay';
import '../styles/chat.css';

interface ChatLayoutProps {
    onLogout: () => void;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ onLogout }) => {
    const { channels, directs, refresh } = useRooms();
    const { users, loading: usersLoading } = useUsers();
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');
    const { messages, sendMessage, loadMore } = useMessages(activeRoomId);

    const {
        callState, participants, duration, isMuted,
        activeRoomName, error: callError, joinCall, leaveCall, toggleMute,
    } = useLiveKit();

    const {
        signalState, callInfo, startCall, acceptCall, rejectCall, cancelCall, resetSignaling,
    } = useCallSignaling();

    const allRooms = [...channels, ...directs];
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
        setMobileView('chat');
    };

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
                    channels={channels}
                    directs={directs}
                    users={users}
                    usersLoading={usersLoading}
                    activeRoomId={activeRoomId}
                    onSelectRoom={handleSelectRoom}
                    onOpenDM={handleOpenDM}
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
                            onLeaveCall={handleLeaveCall}
                        />

                        {callError && (
                            <div className="call-error">{callError}</div>
                        )}

                        {callState === 'connected' && activeRoomName === activeRoom.id && (
                            <CallBar
                                roomName={activeRoom.name}
                                participants={participants}
                                isMuted={isMuted}
                                duration={duration}
                                onToggleMute={toggleMute}
                                onLeave={handleLeaveCall}
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
        </div>
    );
};
