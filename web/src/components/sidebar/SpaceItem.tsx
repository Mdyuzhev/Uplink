import React, { useState } from 'react';
import { ChevronDown, Plus, Settings } from 'lucide-react';
import { SpaceInfo } from '../../matrix/RoomsManager';
import { RoomItem } from './RoomItem';

interface SpaceItemProps {
    space: SpaceInfo;
    activeRoomId: string | null;
    isAdmin: boolean;
    onSelectRoom: (roomId: string) => void;
    onCreateRoom: (spaceId: string) => void;
    onSettings: (id: string) => void;
}

export const SpaceItem: React.FC<SpaceItemProps> = ({ space, activeRoomId, isAdmin, onSelectRoom, onCreateRoom, onSettings }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="sidebar-space">
            <div className="sidebar-space__header" onClick={() => setCollapsed(!collapsed)}>
                <span className={`sidebar-space__arrow ${collapsed ? 'sidebar-space__arrow--collapsed' : ''}`}>
                    <ChevronDown size={14} />
                </span>
                <span className="sidebar-space__name">{space.name}</span>
                {isAdmin && (
                    <button className="sidebar-space__add-btn"
                        onClick={(e) => { e.stopPropagation(); onCreateRoom(space.id); }}
                        title="Создать комнату"><Plus size={14} /></button>
                )}
                <button className="sidebar-space__settings-btn"
                    onClick={(e) => { e.stopPropagation(); onSettings(space.id); }}
                    title="Настройки канала"><Settings size={14} /></button>
            </div>
            {!collapsed && space.rooms.map(room => (
                <RoomItem key={room.id} room={room} active={room.id === activeRoomId}
                    onClick={() => onSelectRoom(room.id)} onSettings={(id) => onSettings(id)} indent />
            ))}
            {!collapsed && space.rooms.length === 0 && (
                <div className="sidebar-space__empty">Нет комнат</div>
            )}
        </div>
    );
};
