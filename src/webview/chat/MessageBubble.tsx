import React from 'react';
import { Message } from './types';
import { CodeSnippet } from './CodeSnippet';

interface MessageBubbleProps {
    message: Message;
    showAuthor: boolean;
    isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showAuthor, isOwn }) => {
    const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const renderContent = () => {
        switch (message.type) {
            case 'code':
                if (message.codeContext) {
                    // Извлекаем код из body (между ```)
                    const codeMatch = message.body.match(/```\w*\n([\s\S]*?)```/);
                    const code = codeMatch ? codeMatch[1] : message.body;
                    return (
                        <CodeSnippet
                            code={code}
                            language={message.codeContext.language}
                            fileName={message.codeContext.fileName}
                            lineStart={message.codeContext.lineStart}
                            lineEnd={message.codeContext.lineEnd}
                            gitBranch={message.codeContext.gitBranch}
                        />
                    );
                }
                return <div className="uplink-msg__text">{message.body}</div>;

            case 'encrypted':
                return <div className="uplink-msg__text uplink-msg__encrypted">{message.body}</div>;

            case 'image':
                return <div className="uplink-msg__text">[Изображение] {message.body}</div>;

            case 'file':
                return <div className="uplink-msg__text">📎 {message.body}</div>;

            default:
                return <div className="uplink-msg__text">{message.body}</div>;
        }
    };

    return (
        <div className={`uplink-msg ${isOwn ? 'uplink-msg--own' : ''} ${showAuthor ? 'uplink-msg--with-author' : 'uplink-msg--grouped'}`}>
            {showAuthor && (
                <div className="uplink-msg__header">
                    <div className="uplink-msg__avatar">
                        {message.senderDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="uplink-msg__author">{message.senderDisplayName}</span>
                    <span className="uplink-msg__time">{time}</span>
                </div>
            )}
            <div className="uplink-msg__body">
                {!showAuthor && <span className="uplink-msg__time-inline">{time}</span>}
                {renderContent()}
            </div>
        </div>
    );
};
