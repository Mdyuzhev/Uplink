import React from 'react';
import { MessageCircle, MessageSquare, Plus } from 'lucide-react';
import { SpaceInfo } from '../matrix/RoomsManager';

interface SpaceSwitcherProps {
    spaces: SpaceInfo[];
    activeSpaceId: string | null;
    currentUserId: string;
    isGlobalAdmin: boolean;
    onSelectSpace: (spaceId: string) => void;
    onSelectDMs: () => void;
    onSelectThreads: () => void;
    onCreateSpace: () => void;
    isDMsActive: boolean;
    isThreadsActive: boolean;
}

const COLORS = ['#5865f2', '#3ba55d', '#9b59b6', '#e67e22', '#e91e63'];

function getAbbr(name: string): string {
    return name
        .split(/[\s_-]+/)
        .map(w => w[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2);
}

function getColor(name: string): string {
    const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length;
    return COLORS[idx];
}

const SpaceIcon: React.FC<{
    space: SpaceInfo;
    active: boolean;
    onClick: () => void;
}> = ({ space, active, onClick }) => {
    const hasUnread = space.rooms.some(r => r.unreadCount > 0);

    return (
        <div className="space-switcher__item-wrapper">
            <div className={`space-switcher__indicator ${active ? 'space-switcher__indicator--active' : hasUnread ? 'space-switcher__indicator--unread' : ''}`} />
            <div
                className={`space-switcher__icon ${active ? 'space-switcher__icon--active' : ''}`}
                style={{ background: getColor(space.name) }}
                onClick={onClick}
                title={space.name}
            >
                {getAbbr(space.name)}
            </div>
        </div>
    );
};

export const SpaceSwitcher: React.FC<SpaceSwitcherProps> = ({
    spaces, activeSpaceId, isGlobalAdmin,
    onSelectSpace, onSelectDMs, onSelectThreads, onCreateSpace,
    isDMsActive, isThreadsActive,
}) => {
    return (
        <div className="space-switcher">
            {/* Logo */}
            <div
                className="space-switcher__logo"
                onClick={() => spaces[0] && onSelectSpace(spaces[0].id)}
                title="Uplink"
            >
                U
            </div>

            <div className="space-switcher__divider" />

            {/* Space list */}
            <div className="space-switcher__list">
                {spaces.map(space => (
                    <SpaceIcon
                        key={space.id}
                        space={space}
                        active={space.id === activeSpaceId && !isDMsActive && !isThreadsActive}
                        onClick={() => onSelectSpace(space.id)}
                    />
                ))}
            </div>

            <div className="space-switcher__divider" />

            {/* Threads */}
            <div className="space-switcher__item-wrapper">
                <div className={`space-switcher__indicator ${isThreadsActive ? 'space-switcher__indicator--active' : ''}`} />
                <button
                    className={`space-switcher__action ${isThreadsActive ? 'space-switcher__action--active' : ''}`}
                    onClick={onSelectThreads}
                    title="Треды"
                >
                    <MessageSquare size={20} />
                </button>
            </div>

            {/* DMs */}
            <div className="space-switcher__item-wrapper">
                <div className={`space-switcher__indicator ${isDMsActive ? 'space-switcher__indicator--active' : ''}`} />
                <button
                    className={`space-switcher__action ${isDMsActive ? 'space-switcher__action--active' : ''}`}
                    onClick={onSelectDMs}
                    title="Личные сообщения"
                >
                    <MessageCircle size={20} />
                </button>
            </div>

            <div className="space-switcher__spacer" />

            {/* Create Space (admin only) */}
            {isGlobalAdmin && (
                <button
                    className="space-switcher__action space-switcher__action--create"
                    onClick={onCreateSpace}
                    title="Создать канал"
                >
                    <Plus size={20} />
                </button>
            )}
        </div>
    );
};
