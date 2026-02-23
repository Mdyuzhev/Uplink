import React from 'react';
import { RoomInfo } from '../matrix/RoomsManager';

interface RoomHeaderProps {
    room: RoomInfo;
    onBack?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({ room, onBack }) => {
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
        </div>
    );
};
