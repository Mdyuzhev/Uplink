import React, { useState, useRef, useEffect } from 'react';
import { RoomInfo } from '../matrix/RoomsManager';
import { CallState } from '../livekit/LiveKitService';
interface PinnedMessageInfo {
    id: string;
    sender: string;
    body: string;
}

interface RoomHeaderProps {
    room: RoomInfo;
    onBack?: () => void;
    callState: CallState;
    activeCallRoomName: string | null;
    onJoinCall: () => void;
    onLeaveCall: () => void;
    pinnedMessages?: PinnedMessageInfo[];
    onScrollToMessage?: (eventId: string) => void;
    onUnpin?: (eventId: string) => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
    room, onBack, callState, activeCallRoomName, onJoinCall, onLeaveCall,
    pinnedMessages, onScrollToMessage, onUnpin,
}) => {
    const [showPinned, setShowPinned] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Закрыть панель при клике вне
    useEffect(() => {
        if (!showPinned) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setShowPinned(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPinned]);

    const isThisRoomInCall = activeCallRoomName === room.id;
    const isOtherRoomInCall = activeCallRoomName !== null && !isThisRoomInCall;
    const pinCount = pinnedMessages?.length || 0;

    return (
        <div className="room-header">
            {onBack && (
                <button className="room-header__back" onClick={onBack}>
                    &#8592;
                </button>
            )}
            <div className="room-header__info">
                <div className="room-header__name">
                    {room.type === 'channel' ? '# ' : ''}{room.name}
                    {room.encrypted && ' *'}
                </div>
                {room.topic && <div className="room-header__topic">{room.topic}</div>}
            </div>

            <div className="room-header__actions">
                {/* Кнопка закреплённых сообщений */}
                {pinCount > 0 && (
                    <div className="room-header__pin-wrapper" ref={panelRef}>
                        <button
                            className={`room-header__pin-btn ${showPinned ? 'room-header__pin-btn--active' : ''}`}
                            onClick={() => setShowPinned(!showPinned)}
                            title={`Закреплённые сообщения (${pinCount})`}
                        >
                            📌 {pinCount}
                        </button>

                        {showPinned && (
                            <div className="pinned-panel">
                                <div className="pinned-panel__header">
                                    Закреплённые сообщения
                                </div>
                                <div className="pinned-panel__list">
                                    {pinnedMessages!.map(msg => (
                                        <div
                                            key={msg.id}
                                            className="pinned-panel__item"
                                            onClick={() => {
                                                onScrollToMessage?.(msg.id);
                                                setShowPinned(false);
                                            }}
                                        >
                                            <div className="pinned-panel__sender">{msg.sender}</div>
                                            <div className="pinned-panel__body">{msg.body}</div>
                                            {onUnpin && (
                                                <button
                                                    className="pinned-panel__unpin"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUnpin(msg.id);
                                                    }}
                                                    title="Открепить"
                                                >✕</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Кнопка звонка */}
                <div className="room-header__call">
                    {isThisRoomInCall ? (
                            <button
                                className="room-header__call-btn room-header__call-btn--leave"
                                onClick={onLeaveCall}
                                title="Завершить звонок"
                            >
                                &#x2715;
                            </button>
                        ) : (
                            <button
                                className="room-header__call-btn room-header__call-btn--join"
                                onClick={onJoinCall}
                                disabled={isOtherRoomInCall || callState === 'connecting'}
                                title={isOtherRoomInCall ? 'Сначала завершите текущий звонок' : 'Начать звонок'}
                            >
                                {callState === 'connecting' ? '...' : '\u260E'}
                            </button>
                    )}
                </div>
            </div>
        </div>
    );
};
