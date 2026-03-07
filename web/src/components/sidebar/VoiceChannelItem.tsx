import React from 'react';
import { Volume2 } from 'lucide-react';
import { VoiceRoomInfo } from '../../matrix/RoomsManager';
import { getDisplayName } from '../../matrix/RoomsManager';
import { matrixService } from '../../matrix/MatrixService';

interface VoiceChannelItemProps {
    channel: VoiceRoomInfo;
    isActive: boolean;
    isConnecting: boolean;
    onJoin: (roomId: string) => void;
    onLeave: () => void;
}

export const VoiceChannelItem: React.FC<VoiceChannelItemProps> = ({
    channel, isActive, isConnecting, onJoin, onLeave,
}) => {
    const handleClick = () => {
        if (isActive) {
            onLeave();
        } else {
            onJoin(channel.id);
        }
    };

    return (
        <div
            className={`voice-channel-item ${isActive ? 'voice-channel-item--active' : ''}`}
            onClick={handleClick}
            title={isActive ? 'Выйти из канала' : `Войти в ${channel.name}`}
        >
            <div className="voice-channel-item__row">
                <Volume2 size={14} className="voice-channel-item__icon" />
                <span className="voice-channel-item__name">
                    {isConnecting && !isActive ? '...' : channel.name}
                </span>
                {isActive && (
                    <span className="voice-channel-item__badge">&#x25CF;</span>
                )}
            </div>

            {channel.voiceMembers.length > 0 && (
                <div className="voice-channel-item__members">
                    {channel.voiceMembers.map(userId => {
                        const client = matrixService.getClient();
                        const name = getDisplayName(client, userId);
                        return (
                            <div key={userId} className="voice-channel-item__member">
                                <span className="voice-channel-item__member-dot" />
                                <span className="voice-channel-item__member-name">{name}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
