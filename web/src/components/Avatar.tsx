import React from 'react';

interface AvatarProps {
    name: string;
    size?: number;
    online?: boolean;
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

export const Avatar: React.FC<AvatarProps> = ({ name, size = 36, online }) => {
    const letter = (name[0] || '?').toUpperCase();
    const bg = hashColor(name);

    return (
        <div
            className="avatar"
            style={{ width: size, height: size, fontSize: size * 0.4, background: bg }}
        >
            {letter}
            {online && <span className="avatar__online-dot" />}
        </div>
    );
};
