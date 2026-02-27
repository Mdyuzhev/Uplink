import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { CallParticipant } from '../livekit/LiveKitService';

interface CallBarProps {
    roomName: string;
    participants: CallParticipant[];
    isMuted: boolean;
    isCameraOn: boolean;
    duration: number;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onLeave: () => void;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export const CallBar: React.FC<CallBarProps> = ({
    roomName, participants, isMuted, isCameraOn, duration, onToggleMute, onToggleCamera, onLeave,
}) => {
    return (
        <div className="call-bar">
            <div className="call-bar__info">
                <span className="call-bar__title">
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
                        {p.displayName}{p.isLocal ? ' (вы)' : ''}{p.isCameraOn ? ' cam' : ''}
                    </span>
                ))}
            </div>

            <div className="call-bar__controls">
                <button
                    className={`call-bar__btn call-bar__btn--mute ${isMuted ? 'call-bar__btn--active' : ''}`}
                    onClick={onToggleMute}
                    title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                >
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                    className={`call-bar__btn call-bar__btn--camera ${isCameraOn ? 'call-bar__btn--active' : ''}`}
                    onClick={onToggleCamera}
                    title={isCameraOn ? 'Выключить камеру' : 'Включить камеру'}
                >
                    {isCameraOn ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
                <button
                    className="call-bar__btn call-bar__btn--leave"
                    onClick={onLeave}
                    title="Завершить звонок"
                >
                    <PhoneOff size={16} />
                </button>
            </div>
        </div>
    );
};
