import React from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { VoiceRoomInfo } from '../matrix/RoomsManager';

interface VoiceBarProps {
    channel: VoiceRoomInfo;
    isMuted: boolean;
    onToggleMute: () => void;
    onLeave: () => void;
}

export const VoiceBar: React.FC<VoiceBarProps> = ({
    channel, isMuted, onToggleMute, onLeave,
}) => {
    return (
        <div className="voice-bar">
            <div className="voice-bar__info">
                <span className="voice-bar__status">Голос подключён</span>
                <span className="voice-bar__room">{channel.name}</span>
            </div>
            <div className="voice-bar__actions">
                <button
                    className={`voice-bar__btn ${isMuted ? 'voice-bar__btn--muted' : ''}`}
                    onClick={onToggleMute}
                    title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
                >
                    {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                    className="voice-bar__btn voice-bar__btn--leave"
                    onClick={onLeave}
                    title="Выйти из голосового канала"
                >
                    <PhoneOff size={16} />
                </button>
            </div>
        </div>
    );
};
