import React from 'react';

interface AvatarProps {
    name: string;
    size?: number;
    online?: boolean;
    imageUrl?: string | null;
    /** userId — для определения бота (@bot_*) */
    userId?: string;
}

const COLORS = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
    '#3498db', '#9b59b6', '#e84393', '#00b894', '#6c5ce7',
];

function hashColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 36, online, imageUrl, userId }) => {
    const letter = (name[0] || '?').toUpperCase();
    const bg = hashColor(name);
    const isBot = userId?.startsWith('@bot_');

    return (
        <div
            className="avatar"
            style={{ width: size, height: size, fontSize: size * 0.4, background: imageUrl ? 'transparent' : bg }}
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
            ) : (
                letter
            )}
            {online && <span className="avatar__online-dot" />}
            {isBot && <span className="avatar__bot-indicator" title="Бот">B</span>}
        </div>
    );
};
