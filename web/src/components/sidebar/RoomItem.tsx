import React from 'react';
import { RoomInfo } from '../../matrix/RoomsManager';

interface RoomItemProps {
    room: RoomInfo;
    active: boolean;
    onClick: () => void;
    indent?: boolean;
}

export const RoomItem: React.FC<RoomItemProps> = ({ room, active, onClick, indent }) => (
    <div
        className={`sidebar-room-item ${active ? 'sidebar-room-item--active' : ''} ${indent ? 'sidebar-room-item--indent' : ''}`}
        onClick={onClick}
    >
        <span className="sidebar-room-item__icon">
            {room.type === 'channel' ? '#' : (
                <span className={`presence-dot presence-dot--${room.peerPresence || 'offline'}`} />
            )}
        </span>
        <span className="sidebar-room-item__name">{room.name}</span>
        {room.unreadCount > 0 && (
            <span className="sidebar-room-item__badge">{room.unreadCount}</span>
        )}
    </div>
);
