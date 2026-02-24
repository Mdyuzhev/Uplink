import React from 'react';
import { CallParticipant } from '../livekit/LiveKitService';

interface CallBarProps {
    roomName: string;
    participants: CallParticipant[];
    isMuted: boolean;
    duration: number;
    onToggleMute: () => void;
    onLeave: () => void;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export const CallBar: React.FC<CallBarProps> = ({
    roomName, participants, isMuted, duration, onToggleMute, onLeave,
}) => {
    return (
        <div className="call-bar">
            <div className="call-bar__info">
                <span className="call-bar__title">
                    <span className="call-bar__icon">&#128266;</span>
                    #{roomName}
                </span>
                <span className="call-bar__duration">{formatDuration(duration)}</span>
            </div>

            <div className="call-bar__participants">
                {participants.map(p => (
                    <span
                        key={p.identity}
                        className={`call-bar__participant ${p.isSpeaking ? 'call-bar__participant--speaking' : ''} ${p.isMuted ? 'call-bar__participant--muted' : ''}`}
                    >
                        {p.displayName}{p.isLocal ? ' (вы)' : ''}
                    </span>
                ))}
            </div>

            <div className="call-bar__controls">
                <button
                    className={`call-bar__btn call-bar__btn--mute ${isMuted ? 'call-bar__btn--active' : ''}`}
                    onClick={onToggleMute}
                    title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                >
                    {isMuted ? '\u{1F509} Unmute' : '\u{1F3A4} Mute'}
                </button>
                <button
                    className="call-bar__btn call-bar__btn--leave"
                    onClick={onLeave}
                    title="Завершить звонок"
                >
                    &#128222; Завершить
                </button>
            </div>
        </div>
    );
};
