import React, { useState } from 'react';
import { SpaceInfo } from '../../matrix/RoomsManager';
import { RoomItem } from './RoomItem';

interface SpaceItemProps {
    space: SpaceInfo;
    activeRoomId: string | null;
    isAdmin: boolean;
    onSelectRoom: (roomId: string) => void;
    onCreateRoom: (spaceId: string) => void;
}

export const SpaceItem: React.FC<SpaceItemProps> = ({ space, activeRoomId, isAdmin, onSelectRoom, onCreateRoom }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="sidebar-space">
            <div className="sidebar-space__header" onClick={() => setCollapsed(!collapsed)}>
                <span className={`sidebar-space__arrow ${collapsed ? 'sidebar-space__arrow--collapsed' : ''}`}>
                    &#x25BE;
                </span>
                <span className="sidebar-space__name">{space.name}</span>
                {isAdmin && (
                    <button className="sidebar-space__add-btn"
                        onClick={(e) => { e.stopPropagation(); onCreateRoom(space.id); }}
                        title="Создать комнату">+</button>
                )}
            </div>
            {!collapsed && space.rooms.map(room => (
                <RoomItem key={room.id} room={room} active={room.id === activeRoomId}
                    onClick={() => onSelectRoom(room.id)} indent />
            ))}
            {!collapsed && space.rooms.length === 0 && (
                <div className="sidebar-space__empty">Нет комнат</div>
            )}
        </div>
    );
};
