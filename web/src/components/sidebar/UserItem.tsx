import React from 'react';
import { Avatar } from '../Avatar';

interface UserItemProps {
    user: { userId: string; displayName: string; avatarUrl?: string };
    onClick: () => void;
}

export const UserItem: React.FC<UserItemProps> = ({ user, onClick }) => (
    <div className="sidebar-room-item sidebar-user-item" onClick={onClick}>
        <span className="sidebar-room-item__icon">
            <Avatar name={user.displayName} size={20} imageUrl={user.avatarUrl} />
        </span>
        <span className="sidebar-room-item__name">{user.displayName}</span>
    </div>
);
