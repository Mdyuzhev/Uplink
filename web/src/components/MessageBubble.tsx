import React, { useState, useRef, useCallback } from 'react';
import { ParsedMessage } from '../matrix/MessageFormatter';
import { Avatar } from './Avatar';
import { CodeSnippet } from './CodeSnippet';
import { renderMarkdown } from '../utils/markdown';
import { formatTime, formatFileSize, getSenderColor, pluralReplies } from './message/formatters';
export type { ReactionInfo, ThreadSummaryInfo } from './message/types';
import type { ReactionInfo, ThreadSummaryInfo } from './message/types';

const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🔥', '✅', '❌'];

interface MessageBubbleProps {
    message: ParsedMessage;
    showAuthor: boolean;
    reactions?: ReactionInfo[];
    isPinned?: boolean;
    threadSummary?: ThreadSummaryInfo | null;
    onReply?: (msg: ParsedMessage) => void;
    onReact?: (eventId: string, emoji: string) => void;
    onRemoveReaction?: (reactionEventId: string) => void;
    onPin?: (eventId: string) => void;
    onOpenThread?: (eventId: string) => void;
    onScrollToMessage?: (eventId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message, showAuthor, reactions, isPinned, threadSummary,
    onReply, onReact, onRemoveReaction, onPin, onOpenThread, onScrollToMessage,
}) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMobileActions, setShowMobileActions] = useState(false);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTouchStart = useCallback(() => {
        if (!isTouchDevice) return;
        longPressTimer.current = setTimeout(() => {
            setShowMobileActions(true);
            navigator.vibrate?.(30);
        }, 500);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleTouchMove = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

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
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
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
                    onClick={() => onOpenThread?.(message.id)}
                    title="Тред"
                >💬</button>
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
                        {message.sender.startsWith('@bot_') && (
                            <span className="message-bubble__bot-badge">БОТ</span>
                        )}
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

                {/* Индикатор треда */}
                {threadSummary && threadSummary.replyCount > 0 && (
                    <div className="thread-indicator" onClick={() => onOpenThread?.(message.id)}>
                        <span className="thread-indicator__icon">💬</span>
                        <span className="thread-indicator__count">
                            {threadSummary.replyCount} {pluralReplies(threadSummary.replyCount)}
                        </span>
                        {threadSummary.lastReply && (
                            <span className="thread-indicator__last">
                                {threadSummary.lastReply.sender} · {formatTime(threadSummary.lastReply.ts)}
                            </span>
                        )}
                        <span className="thread-indicator__arrow">→</span>
                    </div>
                )}
            </div>

            {/* Mobile action sheet (long-press на тач-устройствах) */}
            {showMobileActions && isTouchDevice && (
                <div className="mobile-action-sheet-overlay" onClick={() => setShowMobileActions(false)}>
                    <div className="mobile-action-sheet" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { onReply?.(message); setShowMobileActions(false); }}>↩ Ответить</button>
                        <button onClick={() => { setShowMobileActions(false); setShowEmojiPicker(true); }}>😀 Реакция</button>
                        <button onClick={() => { onOpenThread?.(message.id); setShowMobileActions(false); }}>💬 Тред</button>
                        <button onClick={() => { onPin?.(message.id); setShowMobileActions(false); }}>
                            📌 {isPinned ? 'Открепить' : 'Закрепить'}
                        </button>
                        <button className="mobile-action-sheet__cancel" onClick={() => setShowMobileActions(false)}>Отмена</button>
                    </div>
                </div>
            )}
        </div>
    );
};
