import React from 'react';
import { Settings } from 'lucide-react';
import { RoomInfo } from '../../matrix/RoomsManager';

interface RoomItemProps {
    room: RoomInfo;
    active: boolean;
    onClick: () => void;
    onSettings?: (roomId: string) => void;
    indent?: boolean;
}

export const RoomItem: React.FC<RoomItemProps> = ({ room, active, onClick, onSettings, indent }) => (
    <div className="sidebar-room-item__wrapper">
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
        {onSettings && (
            <button
                className="sidebar-room-item__settings-btn"
                onClick={(e) => { e.stopPropagation(); onSettings(room.id); }}
                title="Настройки комнаты"
            >
                <Settings size={12} />
            </button>
        )}
    </div>
);
