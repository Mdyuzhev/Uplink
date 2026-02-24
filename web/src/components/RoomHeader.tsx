import React from 'react';
import { RoomInfo } from '../matrix/RoomsManager';
import { CallState } from '../livekit/LiveKitService';

interface RoomHeaderProps {
    room: RoomInfo;
    onBack?: () => void;
    callState: CallState;
    activeCallRoomName: string | null;
    onJoinCall: () => void;
    onLeaveCall: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
    room, onBack, callState, activeCallRoomName, onJoinCall, onLeaveCall,
}) => {
    const isThisRoomInCall = activeCallRoomName === room.name;
    const isOtherRoomInCall = activeCallRoomName !== null && !isThisRoomInCall;

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
                    {room.encrypted && ' \uD83D\uDD12'}
                </div>
                {room.topic && <div className="room-header__topic">{room.topic}</div>}
            </div>

            <div className="room-header__call">
                {isThisRoomInCall ? (
                        <button
                            className="room-header__call-btn room-header__call-btn--leave"
                            onClick={onLeaveCall}
                            title="Завершить звонок"
                        >
                            &#128308;&#128222;
                        </button>
                    ) : (
                        <button
                            className="room-header__call-btn room-header__call-btn--join"
                            onClick={onJoinCall}
                            disabled={isOtherRoomInCall || callState === 'connecting'}
                            title={isOtherRoomInCall ? 'Сначала завершите текущий звонок' : 'Начать звонок'}
                        >
                            {callState === 'connecting' ? '...' : '\u{1F4DE}'}
                        </button>
                )}
            </div>
        </div>
    );
};
