import React, { useState } from 'react';
import { GroupedRooms, Room } from './types';

interface SidebarProps {
    rooms: GroupedRooms;
    activeRoomId: string | null;
    onSelectRoom: (roomId: string) => void;
    connected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ rooms, activeRoomId, onSelectRoom, connected }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [channelsExpanded, setChannelsExpanded] = useState(true);
    const [directsExpanded, setDirectsExpanded] = useState(true);

    const filterRooms = (list: Room[]) => {
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(r => r.name.toLowerCase().includes(q));
    };

    const filteredChannels = filterRooms(rooms.channels);
    const filteredDirects = filterRooms(rooms.directs);

    return (
        <div className="uplink-sidebar">
            <div className="uplink-sidebar__header">
                <span className="uplink-sidebar__title">Uplink</span>
                <span className={`uplink-sidebar__status ${connected ? 'uplink-sidebar__status--online' : ''}`}>
                    {connected ? '●' : '○'}
                </span>
            </div>

            <div className="uplink-sidebar__search">
                <input
                    type="text"
                    className="uplink-sidebar__search-input"
                    placeholder="🔍 Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="uplink-sidebar__sections">
                {/* Каналы */}
                <div className="uplink-sidebar__section">
                    <div
                        className="uplink-sidebar__section-header"
                        onClick={() => setChannelsExpanded(!channelsExpanded)}
                    >
                        <span className="uplink-sidebar__caret">{channelsExpanded ? '▾' : '▸'}</span>
                        <span>Каналы</span>
                    </div>
                    {channelsExpanded && filteredChannels.map(room => (
                        <RoomItem
                            key={room.id}
                            room={room}
                            active={room.id === activeRoomId}
                            onClick={() => onSelectRoom(room.id)}
                        />
                    ))}
                </div>

                {/* Личные сообщения */}
                <div className="uplink-sidebar__section">
                    <div
                        className="uplink-sidebar__section-header"
                        onClick={() => setDirectsExpanded(!directsExpanded)}
                    >
                        <span className="uplink-sidebar__caret">{directsExpanded ? '▾' : '▸'}</span>
                        <span>Личные сообщения</span>
                    </div>
                    {directsExpanded && filteredDirects.map(room => (
                        <RoomItem
                            key={room.id}
                            room={room}
                            active={room.id === activeRoomId}
                            onClick={() => onSelectRoom(room.id)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const RoomItem: React.FC<{ room: Room; active: boolean; onClick: () => void }> = ({ room, active, onClick }) => {
    return (
        <div
            className={`uplink-room-item ${active ? 'uplink-room-item--active' : ''} ${room.unreadCount > 0 ? 'uplink-room-item--unread' : ''}`}
            onClick={onClick}
        >
            <span className="uplink-room-item__icon">
                {room.type === 'channel' ? (
                    room.encrypted ? '🔒' : '#'
                ) : (
                    <span className={`uplink-presence uplink-presence--${room.peerPresence || 'offline'}`}>●</span>
                )}
            </span>
            <span className="uplink-room-item__name">{room.name}</span>
            {room.unreadCount > 0 && (
                <span className="uplink-room-item__badge">{room.unreadCount}</span>
            )}
        </div>
    );
};
