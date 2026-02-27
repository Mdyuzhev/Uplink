import React, { useState } from 'react';
import { RoomInfo, SpaceInfo } from '../matrix/RoomsManager';
import { UserInfo } from '../hooks/useUsers';
import { SpaceItem } from './sidebar/SpaceItem';
import { RoomItem } from './sidebar/RoomItem';
import { UserItem } from './sidebar/UserItem';

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
    onAdminPanel: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    spaces, channels, directs, users, usersLoading,
    activeRoomId, userName, isAdmin, onSelectRoom, onOpenDM,
    onProfileClick, onLogout, onCreateSpace, onCreateRoom, onAdminPanel,
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
                {isAdmin && (
                    <button
                        className="chat-sidebar__admin-btn"
                        onClick={onAdminPanel}
                        title="Управление пользователями"
                    >
                        &#x2699;
                    </button>
                )}
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

