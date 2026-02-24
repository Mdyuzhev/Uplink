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

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showAuthor }) => {
    return (
        <div className={`message-bubble ${showAuthor ? 'message-bubble--full' : ''}`}>
            <div className={`message-bubble__avatar-col ${!showAuthor ? 'message-bubble__avatar-col--compact' : ''}`}>
                {showAuthor && <Avatar name={message.senderDisplayName} size={36} imageUrl={message.senderAvatarUrl} />}
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
                ) : message.type === 'image' ? (
                    <div className="message-bubble__image">
                        <a href={message.imageUrl || '#'} target="_blank" rel="noopener noreferrer">
                            <img
                                src={message.thumbnailUrl || message.imageUrl || ''}
                                alt={message.body}
                                className="message-bubble__image-img"
                                loading="lazy"
                                style={{
                                    maxWidth: Math.min(message.imageWidth || 400, 400),
                                    maxHeight: 300,
                                }}
                            />
                        </a>
                    </div>
                ) : message.type === 'file' ? (
                    <div className="message-bubble__file">
                        <span className="message-bubble__file-icon">📄</span>
                        <div className="message-bubble__file-info">
                            <span className="message-bubble__file-name">{message.body}</span>
                            <span className="message-bubble__file-size">
                                {message.fileSize ? formatFileSize(message.fileSize) : ''}
                            </span>
                        </div>
                        {message.fileUrl && (
                            <a
                                href={message.fileUrl}
                                download={message.body}
                                className="message-bubble__file-download"
                                title="Скачать"
                            >
                                ⬇
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="message-bubble__body">{message.body}</div>
                )}
            </div>
        </div>
    );
};
