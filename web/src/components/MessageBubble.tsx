import React, { useState } from 'react';
import { ParsedMessage } from '../matrix/MessageFormatter';
import { Avatar } from './Avatar';
import { CodeSnippet } from './CodeSnippet';
import { renderMarkdown } from '../utils/markdown';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🔥', '✅', '❌'];

export interface ReactionInfo {
    emoji: string;
    count: number;
    users: string[];
    myReactionEventId?: string;
}

interface MessageBubbleProps {
    message: ParsedMessage;
    showAuthor: boolean;
    reactions?: ReactionInfo[];
    isPinned?: boolean;
    onReply?: (msg: ParsedMessage) => void;
    onReact?: (eventId: string, emoji: string) => void;
    onRemoveReaction?: (reactionEventId: string) => void;
    onPin?: (eventId: string) => void;
    onScrollToMessage?: (eventId: string) => void;
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

const SENDER_COLORS = [
    '#f47067', '#c678dd', '#e5c07b', '#61afef',
    '#56b6c2', '#98c379', '#e06c75', '#d19a66',
];

function getSenderColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message, showAuthor, reactions, isPinned,
    onReply, onReact, onRemoveReaction, onPin, onScrollToMessage,
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleEmojiSelect = (emoji: string) => {
        setShowEmojiPicker(false);
        onReact?.(message.id, emoji);
    };

    const handleReactionClick = (reaction: ReactionInfo) => {
        if (reaction.myReactionEventId) {
            onRemoveReaction?.(reaction.myReactionEventId);
        } else {
            onReact?.(message.id, reaction.emoji);
        }
    };

    return (
        <div
            className={`message-bubble ${showAuthor ? 'message-bubble--full' : ''}`}
            data-event-id={message.id}
        >
            {/* Action-bar — появляется при hover */}
            <div className="message-bubble__action-bar">
                <button
                    className="message-bubble__action-btn"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Реакция"
                >😀</button>
                <button
                    className="message-bubble__action-btn"
                    onClick={() => onReply?.(message)}
                    title="Ответить"
                >↩</button>
                <button
                    className="message-bubble__action-btn"
                    onClick={() => onPin?.(message.id)}
                    title={isPinned ? 'Открепить' : 'Закрепить'}
                >📌</button>
            </div>

            {/* Quick emoji picker */}
            {showEmojiPicker && (
                <div className="message-bubble__emoji-picker">
                    {QUICK_EMOJIS.map(emoji => (
                        <button
                            key={emoji}
                            className="message-bubble__emoji-picker-btn"
                            onClick={() => handleEmojiSelect(emoji)}
                        >{emoji}</button>
                    ))}
                </div>
            )}

            <div className={`message-bubble__avatar-col ${!showAuthor ? 'message-bubble__avatar-col--compact' : ''}`}>
                {showAuthor && <Avatar name={message.senderDisplayName} size={40} imageUrl={message.senderAvatarUrl} />}
            </div>
            <div className="message-bubble__content">
                {/* Reply цитата */}
                {message.replyToEventId && message.replyToSender && (
                    <div
                        className="message-bubble__reply-quote"
                        onClick={() => onScrollToMessage?.(message.replyToEventId!)}
                    >
                        <span className="message-bubble__reply-sender">{message.replyToSender}</span>
                        <span className="message-bubble__reply-text">{message.replyToBody || '...'}</span>
                    </div>
                )}

                {showAuthor && (
                    <div className="message-bubble__header">
                        <span className="message-bubble__sender" style={{ color: getSenderColor(message.sender) }}>{message.senderDisplayName}</span>
                        <span className="message-bubble__time">{formatTime(message.timestamp)}</span>
                        {isPinned && <span className="message-bubble__pin-badge" title="Закреплено">📌</span>}
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
                        <span className="message-bubble__file-icon">&#9741;</span>
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
                                &#8595;
                            </a>
                        )}
                    </div>
                ) : (
                    <div
                        className="message-bubble__body"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.body) }}
                    />
                )}

                {/* Реакции */}
                {reactions && reactions.length > 0 && (
                    <div className="message-bubble__reactions">
                        {reactions.map(r => (
                            <button
                                key={r.emoji}
                                className={`reaction-chip ${r.myReactionEventId ? 'reaction-chip--active' : ''}`}
                                onClick={() => handleReactionClick(r)}
                                title={r.users.join(', ')}
                            >
                                <span className="reaction-chip__emoji">{r.emoji}</span>
                                <span className="reaction-chip__count">{r.count}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
