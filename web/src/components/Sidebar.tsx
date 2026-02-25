import React, { useState } from 'react';
import { RoomInfo, SpaceInfo } from '../matrix/RoomsManager';
import { UserInfo } from '../hooks/useUsers';
import { Avatar } from './Avatar';

interface SidebarProps {
    spaces: SpaceInfo[];
    channels: RoomInfo[];
    directs: RoomInfo[];
    users: UserInfo[];
    usersLoading: boolean;
    activeRoomId: string | null;
    userName: string;
    isAdmin: boolean;
    onSelectRoom: (roomId: string) => void;
    onOpenDM: (userId: string) => void;
    onProfileClick: () => void;
    onLogout: () => void;
    onCreateSpace: () => void;
    onCreateRoom: (spaceId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    spaces, channels, directs, users, usersLoading,
    activeRoomId, userName, isAdmin, onSelectRoom, onOpenDM,
    onProfileClick, onLogout, onCreateSpace, onCreateRoom,
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

    const filterSpaces = (list: SpaceInfo[]) => {
        if (!filter) return list;
        const q = filter.toLowerCase();
        return list.map(s => ({
            ...s,
            rooms: s.rooms.filter(r => r.name.toLowerCase().includes(q)),
        })).filter(s => s.name.toLowerCase().includes(q) || s.rooms.length > 0);
    };

    const filteredSpaces = filterSpaces(spaces);
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
                {/* Каналы (Spaces) */}
                {(filteredSpaces.length > 0 || isAdmin) && (
                    <div className="chat-sidebar__section">
                        <div className="chat-sidebar__section-title-row">
                            <span className="chat-sidebar__section-title chat-sidebar__section-title--inline">Каналы</span>
                            {isAdmin && (
                                <button
                                    className="chat-sidebar__section-add-btn"
                                    onClick={onCreateSpace}
                                    title="Создать канал"
                                >
                                    +
                                </button>
                            )}
                        </div>
                        {filteredSpaces.map(space => (
                            <SpaceItem
                                key={space.id}
                                space={space}
                                activeRoomId={activeRoomId}
                                isAdmin={isAdmin}
                                onSelectRoom={onSelectRoom}
                                onCreateRoom={onCreateRoom}
                            />
                        ))}
                    </div>
                )}

                {/* Другие комнаты (не привязанные к каналам) */}
                {filteredChannels.length > 0 && (
                    <div className="chat-sidebar__section">
                        <div className="chat-sidebar__section-title">Другие комнаты</div>
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

                {/* Личные сообщения */}
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

                {/* Пользователи */}
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

const SpaceItem: React.FC<{
    space: SpaceInfo;
    activeRoomId: string | null;
    isAdmin: boolean;
    onSelectRoom: (roomId: string) => void;
    onCreateRoom: (spaceId: string) => void;
}> = ({ space, activeRoomId, isAdmin, onSelectRoom, onCreateRoom }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="sidebar-space">
            <div className="sidebar-space__header" onClick={() => setCollapsed(!collapsed)}>
                <span className={`sidebar-space__arrow ${collapsed ? 'sidebar-space__arrow--collapsed' : ''}`}>
                    &#x25BE;
                </span>
                <span className="sidebar-space__name">{space.name}</span>
                {isAdmin && (
                    <button
                        className="sidebar-space__add-btn"
                        onClick={(e) => { e.stopPropagation(); onCreateRoom(space.id); }}
                        title="Создать комнату"
                    >
                        +
                    </button>
                )}
            </div>
            {!collapsed && space.rooms.map(room => (
                <RoomItem
                    key={room.id}
                    room={room}
                    active={room.id === activeRoomId}
                    onClick={() => onSelectRoom(room.id)}
                    indent
                />
            ))}
            {!collapsed && space.rooms.length === 0 && (
                <div className="sidebar-space__empty">Нет комнат</div>
            )}
        </div>
    );
};

const RoomItem: React.FC<{
    room: RoomInfo;
    active: boolean;
    onClick: () => void;
    indent?: boolean;
}> = ({ room, active, onClick, indent }) => {
    return (
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
};

const UserItem: React.FC<{ user: { userId: string; displayName: string; avatarUrl?: string }; onClick: () => void }> = ({
    user, onClick,
}) => {
    return (
        <div className="sidebar-room-item sidebar-user-item" onClick={onClick}>
            <span className="sidebar-room-item__icon">
                <Avatar name={user.displayName} size={20} imageUrl={user.avatarUrl} />
            </span>
            <span className="sidebar-room-item__name">{user.displayName}</span>
        </div>
    );
};
