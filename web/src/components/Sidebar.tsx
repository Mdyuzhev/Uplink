import React, { useState } from 'react';
import { RoomInfo } from '../matrix/RoomsManager';

interface SidebarProps {
    channels: RoomInfo[];
    directs: RoomInfo[];
    activeRoomId: string | null;
    onSelectRoom: (roomId: string) => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    channels, directs, activeRoomId, onSelectRoom, onLogout
}) => {
    const [filter, setFilter] = useState('');

    const filterRooms = (rooms: RoomInfo[]) => {
        if (!filter) return rooms;
        const q = filter.toLowerCase();
        return rooms.filter(r => r.name.toLowerCase().includes(q));
    };

    const filteredChannels = filterRooms(channels);
    const filteredDirects = filterRooms(directs);

    return (
        <>
            <div className="chat-sidebar__header">
                <span className="chat-sidebar__title">Uplink</span>
                <button className="chat-sidebar__logout" onClick={onLogout} title="Выйти">
                    &#x2192;
                </button>
            </div>

            <div className="chat-sidebar__search">
                <input
                    className="chat-sidebar__search-input"
                    type="text"
                    placeholder="Поиск..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
            </div>

            <div className="chat-sidebar__rooms">
                {filteredChannels.length > 0 && (
                    <div className="chat-sidebar__section">
                        <div className="chat-sidebar__section-title">Каналы</div>
                        {filteredChannels.map(room => (
                            <RoomItem
                                key={room.id}
                                room={room}
                                active={room.id === activeRoomId}
                                onClick={() => onSelectRoom(room.id)}
                            />
                        ))}
                    </div>
                )}

                {filteredDirects.length > 0 && (
                    <div className="chat-sidebar__section">
                        <div className="chat-sidebar__section-title">Личные сообщения</div>
                        {filteredDirects.map(room => (
                            <RoomItem
                                key={room.id}
                                room={room}
                                active={room.id === activeRoomId}
                                onClick={() => onSelectRoom(room.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

const RoomItem: React.FC<{ room: RoomInfo; active: boolean; onClick: () => void }> = ({
    room, active, onClick
}) => {
    return (
        <div
            className={`sidebar-room-item ${active ? 'sidebar-room-item--active' : ''}`}
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
};
