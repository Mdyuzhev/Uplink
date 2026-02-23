import React from 'react';
import { ParsedMessage } from '../matrix/MessageFormatter';
import { Avatar } from './Avatar';
import { CodeSnippet } from './CodeSnippet';

interface MessageBubbleProps {
    message: ParsedMessage;
    showAuthor: boolean;
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showAuthor }) => {
    return (
        <div className={`message-bubble ${showAuthor ? 'message-bubble--full' : ''}`}>
            <div className={`message-bubble__avatar-col ${!showAuthor ? 'message-bubble__avatar-col--compact' : ''}`}>
                {showAuthor && <Avatar name={message.senderDisplayName} size={36} />}
            </div>
            <div className="message-bubble__content">
                {showAuthor && (
                    <div className="message-bubble__header">
                        <span className="message-bubble__sender">{message.senderDisplayName}</span>
                        <span className="message-bubble__time">{formatTime(message.timestamp)}</span>
                    </div>
                )}
                {message.type === 'code' ? (
                    <CodeSnippet body={message.body} codeContext={message.codeContext} />
                ) : message.type === 'encrypted' ? (
                    <div className="message-bubble__encrypted">{message.body}</div>
                ) : (
                    <div className="message-bubble__body">{message.body}</div>
                )}
            </div>
        </div>
    );
};
