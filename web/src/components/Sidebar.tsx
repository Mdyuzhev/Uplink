import React, { useState } from 'react';
import { RoomInfo } from '../matrix/RoomsManager';
import { UserInfo } from '../hooks/useUsers';
import { Avatar } from './Avatar';

interface SidebarProps {
    channels: RoomInfo[];
    directs: RoomInfo[];
    users: UserInfo[];
    usersLoading: boolean;
    activeRoomId: string | null;
    userName: string;
    onSelectRoom: (roomId: string) => void;
    onOpenDM: (userId: string) => void;
    onProfileClick: () => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    channels, directs, users, usersLoading,
    activeRoomId, userName, onSelectRoom, onOpenDM, onProfileClick, onLogout,
}) => {
    const [filter, setFilter] = useState('');

    const filterRooms = (rooms: RoomInfo[]) => {
        if (!filter) return rooms;
        const q = filter.toLowerCase();
        return rooms.filter(r => r.name.toLowerCase().includes(q));
    };

    const filterUsers = (list: UserInfo[]) => {
        if (!filter) return list;
        const q = filter.toLowerCase();
        return list.filter(u =>
            u.displayName.toLowerCase().includes(q) ||
            u.userId.toLowerCase().includes(q)
        );
    };

    const filteredChannels = filterRooms(channels);
    const filteredDirects = filterRooms(directs);
    const filteredUsers = filterUsers(users);

    return (
        <>
            <div className="chat-sidebar__header">
                <span className="chat-sidebar__title">Uplink</span>
                <div className="chat-sidebar__header-actions">
                    <button
                        className="chat-sidebar__profile-btn"
                        onClick={onProfileClick}
                        title="Настройки профиля"
                    >
                        {userName}
                    </button>
                    <button className="chat-sidebar__logout" onClick={onLogout} title="Выйти">
                        &#x2192;
                    </button>
                </div>
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

                <div className="chat-sidebar__section">
                    <div className="chat-sidebar__section-title">
                        Пользователи{usersLoading ? ' ...' : ` (${filteredUsers.length})`}
                    </div>
                    {filteredUsers.map(user => (
                        <UserItem
                            key={user.userId}
                            user={user}
                            onClick={() => onOpenDM(user.userId)}
                        />
                    ))}
                    {!usersLoading && filteredUsers.length === 0 && (
                        <div className="chat-sidebar__empty">Нет пользователей</div>
                    )}
                </div>
            </div>
        </>
    );
};

const RoomItem: React.FC<{ room: RoomInfo; active: boolean; onClick: () => void }> = ({
    room, active, onClick,
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

const UserItem: React.FC<{ user: { userId: string; displayName: string }; onClick: () => void }> = ({
    user, onClick,
}) => {
    return (
        <div className="sidebar-room-item sidebar-user-item" onClick={onClick}>
            <span className="sidebar-room-item__icon">
                <Avatar name={user.displayName} size={20} />
            </span>
            <span className="sidebar-room-item__name">{user.displayName}</span>
        </div>
    );
};
