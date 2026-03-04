import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useCall } from '../contexts/CallContext';

interface CallBarProps {
    roomName: string;
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export const CallBar: React.FC<CallBarProps> = ({ roomName }) => {
    const { participants, isMuted, isCameraOn, duration, toggleMute, toggleCamera, handleLeaveCall } = useCall();

    return (
        <div className="call-bar">
            {/* Левая часть: инфо */}
            <div className="call-bar__left">
                <div className="call-bar__status">
                    <span className="call-bar__dot" />
                    <span className="call-bar__room-name">#{roomName}</span>
                </div>
                <span className="call-bar__duration">{formatDuration(duration)}</span>
                <div className="call-bar__participants-count">
                    {participants.length} {participants.length === 1 ? 'участник' : 'участника'}
                </div>
            </div>

            {/* Центр: контролы */}
            <div className="call-bar__controls">
                <button
                    className={`call-bar__control-btn ${isMuted ? 'call-bar__control-btn--danger' : ''}`}
                    onClick={toggleMute}
                    title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    <span className="call-bar__control-label">{isMuted ? 'Вкл. микро' : 'Микрофон'}</span>
                </button>

                <button
                    className={`call-bar__control-btn ${isCameraOn ? 'call-bar__control-btn--active' : ''}`}
                    onClick={toggleCamera}
                    title={isCameraOn ? 'Выключить камеру' : 'Включить камеру'}
                >
                    {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                    <span className="call-bar__control-label">{isCameraOn ? 'Камера' : 'Вкл. камеру'}</span>
                </button>

                <button
                    className="call-bar__control-btn call-bar__control-btn--hangup"
                    onClick={handleLeaveCall}
                    title="Завершить звонок"
                >
                    <PhoneOff size={20} />
                    <span className="call-bar__control-label">Завершить</span>
                </button>
            </div>

            {/* Правая часть: список участников */}
            <div className="call-bar__right">
                {participants.map(p => (
                    <span
                        key={p.identity}
                        className={`call-bar__participant ${p.isSpeaking ? 'call-bar__participant--speaking' : ''}`}
                    >
                        {p.displayName}{p.isLocal ? ' (вы)' : ''}
                    </span>
                ))}
            </div>
        </div>
    );
};
