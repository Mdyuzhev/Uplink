import React from 'react';
import { Message, Room } from './types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface MainAreaProps {
    messages: Message[];
    activeRoom: Room | null;
    currentUser: string;
    onSendMessage: (body: string) => void;
    onLoadMore: () => void;
}

export const MainArea: React.FC<MainAreaProps> = ({
    messages, activeRoom, currentUser, onSendMessage, onLoadMore
}) => {
    if (!activeRoom) {
        return (
            <div className="uplink-main">
                <div className="uplink-main__empty">
                    <div className="uplink-main__empty-icon">💬</div>
                    <div className="uplink-main__empty-text">Выберите канал для начала общения</div>
                </div>
            </div>
        );
    }

    const roomLabel = activeRoom.type === 'channel' ? `# ${activeRoom.name}` : activeRoom.name;

    return (
        <div className="uplink-main">
            <div className="uplink-main__header">
                <div className="uplink-main__header-info">
                    <span className="uplink-main__header-name">{roomLabel}</span>
                    {activeRoom.encrypted && <span className="uplink-main__header-lock" title="Зашифрован">🔒</span>}
                    {activeRoom.topic && <span className="uplink-main__header-topic">{activeRoom.topic}</span>}
                </div>
            </div>
            <MessageList
                messages={messages}
                currentUser={currentUser}
                onLoadMore={onLoadMore}
            />
            <MessageInput
                roomName={roomLabel}
                onSend={onSendMessage}
            />
        </div>
    );
};
