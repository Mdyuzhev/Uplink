import React, { useState } from 'react';
import { Settings, LogOut, Plus } from 'lucide-react';
import { RoomInfo, SpaceInfo, VoiceRoomInfo } from '../matrix/RoomsManager';
import { UserInfo } from '../hooks/useUsers';
import { SpaceItem } from './sidebar/SpaceItem';
import { RoomItem } from './sidebar/RoomItem';
import { UserItem } from './sidebar/UserItem';
import { VoiceChannelItem } from './sidebar/VoiceChannelItem';

function getAbbr(name: string): string {
    return name
        .split(/[\s_-]+/)
        .map(w => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2);
}

interface SidebarProps {
    spaces: SpaceInfo[];
    channels: RoomInfo[];
    directs: RoomInfo[];
    users: UserInfo[];
    usersLoading: boolean;
    activeRoomId: string | null;
    userName: string;
    isAdmin: boolean;
    activeSpaceId: string | null;
    isDMsMode: boolean;
    onSelectRoom: (roomId: string) => void;
    onOpenDM: (userId: string) => void;
    onProfileClick: () => void;
    onLogout: () => void;
    onCreateSpace: () => void;
    onCreateRoom: (spaceId: string) => void;
    onAdminPanel: () => void;
    onRoomSettings: (roomId: string, isSpace: boolean) => void;
    onSelectSpace: (spaceId: string) => void;
    onSelectDMs: () => void;
    isThreadsActive: boolean;
    onSelectThreads: () => void;
    voiceChannels: VoiceRoomInfo[];
    activeVoiceRoomId: string | null;
    isVoiceConnecting: boolean;
    onJoinVoiceChannel: (roomId: string) => void;
    onLeaveVoiceChannel: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    spaces, channels, directs, users, usersLoading,
    activeRoomId, userName, isAdmin, activeSpaceId, isDMsMode,
    onSelectRoom, onOpenDM,
    onProfileClick, onLogout, onCreateSpace, onCreateRoom, onAdminPanel, onRoomSettings,
    onSelectSpace, onSelectDMs, isThreadsActive, onSelectThreads,
    voiceChannels, activeVoiceRoomId, isVoiceConnecting, onJoinVoiceChannel, onLeaveVoiceChannel,
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

    const activeSpace = spaces.find(s => s.id === activeSpaceId);
    const sidebarTitle = isDMsMode ? 'Личные сообщения' : activeSpace?.name || 'Uplink';
    const canManageSpace = activeSpace && activeSpace.myRole !== 'member';

    // In DM mode: show only directs and users
    // In Space mode: show only the active space's rooms + orphan channels
    const filteredDirects = filterRooms(directs);
    const filteredChannels = filterRooms(channels);
    const filteredUsers = filterUsers(users);

    return (
        <>
            <div className="chat-sidebar__header">
                <span className="chat-sidebar__title">{sidebarTitle}</span>
                {isAdmin && !isDMsMode && (
                    <button
                        className="chat-sidebar__admin-btn"
                        onClick={onAdminPanel}
                        title="Управление пользователями"
                    >
                        <Settings size={16} />
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
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {/* Мобильный переключатель пространств (CSS показывает только на <=768px) */}
            {(spaces.length > 0 || isDMsMode || isThreadsActive) && (
                <div className="sidebar-space-tabs">
                    {spaces.map(space => (
                        <button
                            key={space.id}
                            className={`sidebar-space-tab ${space.id === activeSpaceId && !isDMsMode && !isThreadsActive ? 'sidebar-space-tab--active' : ''}`}
                            onClick={() => onSelectSpace(space.id)}
                            title={space.name}
                        >
                            {getAbbr(space.name)}
                        </button>
                    ))}
                    <button
                        className={`sidebar-space-tab ${isThreadsActive ? 'sidebar-space-tab--active' : ''}`}
                        onClick={onSelectThreads}
                        title="Треды"
                    >
                        Тр
                    </button>
                    <button
                        className={`sidebar-space-tab ${isDMsMode ? 'sidebar-space-tab--active' : ''}`}
                        onClick={onSelectDMs}
                        title="Личные сообщения"
                    >
                        ЛС
                    </button>
                </div>
            )}

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
                {isDMsMode ? (
                    <>
                        {/* DM mode: directs + users */}
                        {filteredDirects.length > 0 && (
                            <div className="chat-sidebar__section">
                                <div className="chat-sidebar__section-title">Диалоги</div>
                                {filteredDirects.map(room => (
                                    <RoomItem
                                        key={room.id}
                                        room={room}
                                        active={room.id === activeRoomId}
                                        onClick={() => onSelectRoom(room.id)}
                                        onSettings={(id) => onRoomSettings(id, false)}
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
                    </>
                ) : activeSpace ? (
                    <>
                        {/* Space mode: only active space rooms */}
                        <div className="chat-sidebar__section">
                            <SpaceItem
                                space={activeSpace}
                                activeRoomId={activeRoomId}
                                isAdmin={isAdmin || !!canManageSpace}
                                onSelectRoom={onSelectRoom}
                                onCreateRoom={onCreateRoom}
                                onSettings={(id) => onRoomSettings(id, true)}
                            />
                        </div>

                        {/* Orphan channels */}
                        {filteredChannels.length > 0 && (
                            <div className="chat-sidebar__section">
                                <div className="chat-sidebar__section-title">Другие комнаты</div>
                                {filteredChannels.map(room => (
                                    <RoomItem
                                        key={room.id}
                                        room={room}
                                        active={room.id === activeRoomId}
                                        onClick={() => onSelectRoom(room.id)}
                                        onSettings={(id) => onRoomSettings(id, false)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Голосовые каналы */}
                        {voiceChannels.length > 0 && (
                            <div className="chat-sidebar__section">
                                <div className="chat-sidebar__section-title">Голосовые каналы</div>
                                {voiceChannels.map(ch => (
                                    <VoiceChannelItem
                                        key={ch.id}
                                        channel={ch}
                                        isActive={ch.id === activeVoiceRoomId}
                                        isConnecting={isVoiceConnecting}
                                        onJoin={onJoinVoiceChannel}
                                        onLeave={onLeaveVoiceChannel}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Fallback: show all spaces (no active space yet) */}
                        {spaces.length > 0 && (
                            <div className="chat-sidebar__section">
                                <div className="chat-sidebar__section-title-row">
                                    <span className="chat-sidebar__section-title chat-sidebar__section-title--inline">Каналы</span>
                                    {isAdmin && (
                                        <button
                                            className="chat-sidebar__section-add-btn"
                                            onClick={onCreateSpace}
                                            title="Создать канал"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    )}
                                </div>
                                {spaces.map(space => (
                                    <SpaceItem
                                        key={space.id}
                                        space={space}
                                        activeRoomId={activeRoomId}
                                        isAdmin={isAdmin}
                                        onSelectRoom={onSelectRoom}
                                        onCreateRoom={onCreateRoom}
                                        onSettings={(id) => onRoomSettings(id, true)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Голосовые каналы */}
                        {voiceChannels.length > 0 && (
                            <div className="chat-sidebar__section">
                                <div className="chat-sidebar__section-title">Голосовые каналы</div>
                                {voiceChannels.map(ch => (
                                    <VoiceChannelItem
                                        key={ch.id}
                                        channel={ch}
                                        isActive={ch.id === activeVoiceRoomId}
                                        isConnecting={isVoiceConnecting}
                                        onJoin={onJoinVoiceChannel}
                                        onLeave={onLeaveVoiceChannel}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};
