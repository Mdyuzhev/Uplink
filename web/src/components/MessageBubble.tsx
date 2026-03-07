import React, { useState, useRef, useCallback } from 'react';
import { SmilePlus, Reply, MessageSquare, Pin, ChevronRight, FileText, Download } from 'lucide-react';
import { MessageContextMenu } from './MessageContextMenu';
import { ParsedMessage } from '../matrix/MessageFormatter';
import { Avatar } from './Avatar';
import { CodeSnippet } from './CodeSnippet';
import { LottieSticker } from './LottieSticker';
import { VoiceMessage } from './VoiceMessage';
import { VideoNote } from './VideoNote';
import { renderMarkdown } from '../utils/markdown';
import { matrixService } from '../matrix/MatrixService';
import { formatTime, formatFileSize, getSenderColor, pluralReplies } from './message/formatters';
export type { ReactionInfo, ThreadSummaryInfo } from './message/types';
import type { ReactionInfo, ThreadSummaryInfo } from './message/types';

const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🔥', '✅', '❌'];

interface MessageBubbleProps {
    message: ParsedMessage;
    roomId?: string;
    showAuthor: boolean;
    reactions?: ReactionInfo[];
    isPinned?: boolean;
    threadSummary?: ThreadSummaryInfo | null;
    onReply?: (msg: ParsedMessage) => void;
    onReact?: (eventId: string, emoji: string) => void;
    onRemoveReaction?: (reactionEventId: string) => void;
    onPin?: (eventId: string) => void;
    onOpenThread?: (eventId: string) => void;
    onDelete?: (eventId: string) => void;
    onScrollToMessage?: (eventId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message, roomId, showAuthor, reactions, isPinned, threadSummary,
    onReply, onReact, onRemoveReaction, onPin, onOpenThread, onDelete, onScrollToMessage,
}) => {
    const myUserId = matrixService.getClient().getUserId();
    const mentionsMe = message.mentionedUserIds?.includes(myUserId ?? '') ?? false;

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMobileActions, setShowMobileActions] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
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

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
        setShowEmojiPicker(false);
    }, []);

    const isOwn = message.sender === myUserId;

    const handleCopyText = ['text', 'code'].includes(message.type)
        ? () => navigator.clipboard.writeText(message.body)
        : undefined;

    const handleDownloadFile = ['file', 'video', 'voice', 'video_note'].includes(message.type) && message.fileUrl
        ? () => {
            const a = document.createElement('a');
            a.href = message.fileUrl!;
            a.download = message.body;
            a.click();
        }
        : undefined;

    const handleOpenImage = ['image', 'gif', 'sticker'].includes(message.type) && (message.imageUrl || message.fileUrl)
        ? () => window.open(message.imageUrl || message.fileUrl || '', '_blank')
        : undefined;

    const handleDownloadImage = ['image', 'gif'].includes(message.type) && (message.imageUrl || message.fileUrl)
        ? () => {
            const a = document.createElement('a');
            a.href = message.imageUrl || message.fileUrl || '';
            a.download = message.body;
            a.click();
        }
        : undefined;

    const handleReactionClick = (reaction: ReactionInfo) => {
        if (reaction.myReactionEventId) {
            onRemoveReaction?.(reaction.myReactionEventId);
        } else {
            onReact?.(message.id, reaction.emoji);
        }
    };

    return (
        <div
            className={`message-bubble ${showAuthor ? 'message-bubble--full' : ''} ${message.type === 'sticker' ? 'message-bubble--sticker' : ''} ${message.type === 'video_note' ? 'message-bubble--video-note' : ''} ${mentionsMe ? 'message-bubble--mention' : ''}`}
            data-event-id={message.id}
            onContextMenu={handleContextMenu}
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
                ><SmilePlus size={16} /></button>
                <button
                    className="message-bubble__action-btn"
                    onClick={() => onReply?.(message)}
                    title="Ответить"
                ><Reply size={16} /></button>
                <button
                    className="message-bubble__action-btn"
                    onClick={() => onOpenThread?.(message.id)}
                    title="Тред"
                ><MessageSquare size={16} /></button>
                <button
                    className="message-bubble__action-btn"
                    onClick={() => onPin?.(message.id)}
                    title={isPinned ? 'Открепить' : 'Закрепить'}
                ><Pin size={16} /></button>
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
                        {isPinned && <span className="message-bubble__pin-badge" title="Закреплено"><Pin size={12} /></span>}
                    </div>
                )}
                {message.type === 'sticker' ? (
                    <div className="message-bubble__sticker-content">
                        {message.mimetype === 'application/json' && message.imageUrl ? (
                            <LottieSticker
                                url={message.imageUrl}
                                width={Math.min(message.imageWidth || 200, 200)}
                                height={Math.min(message.imageHeight || 200, 200)}
                            />
                        ) : message.imageUrl ? (
                            <img
                                src={message.imageUrl}
                                alt={message.body}
                                className="sticker-image"
                                style={{
                                    maxWidth: Math.min(message.imageWidth || 200, 200),
                                    maxHeight: 200,
                                }}
                            />
                        ) : (
                            <span>{message.body}</span>
                        )}
                    </div>
                ) : message.type === 'gif' ? (
                    <div className="message-bubble__gif">
                        <img
                            src={message.imageUrl || ''}
                            alt={message.body}
                            loading="lazy"
                            style={{
                                maxWidth: Math.min(message.imageWidth || 350, 350),
                            }}
                        />
                    </div>
                ) : message.type === 'code' ? (
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
                ) : message.type === 'voice' ? (
                    <VoiceMessage
                        fileUrl={message.fileUrl || null}
                        duration={message.duration || 0}
                        waveform={message.waveform}
                    />
                ) : message.type === 'video_note' ? (
                    <VideoNote
                        fileUrl={message.fileUrl || null}
                        thumbnailUrl={message.thumbnailUrl}
                        duration={message.duration || 0}
                    />
                ) : message.type === 'video' ? (
                    /* ─── Inline видео-плеер ─── */
                    <div className="message-bubble__video">
                        <video
                            className="message-bubble__video-player"
                            controls
                            preload="metadata"
                            poster={message.thumbnailUrl || undefined}
                            style={{
                                // Ограничиваем ширину: либо оригинальная, либо 480px max
                                maxWidth: Math.min(message.imageWidth || 480, 480),
                                // Высота пропорциональна или 270px max
                                maxHeight: 270,
                            }}
                        >
                            <source src={message.fileUrl || ''} type={message.mimetype || 'video/mp4'} />
                            Ваш браузер не поддерживает воспроизведение видео.
                        </video>
                        {/* Подпись: имя файла + размер + кнопка скачать */}
                        <div className="message-bubble__video-meta">
                            <span className="message-bubble__video-name">{message.body}</span>
                            {message.fileSize && (
                                <span className="message-bubble__video-size">
                                    {formatFileSize(message.fileSize)}
                                </span>
                            )}
                            {message.fileUrl && (
                                <a
                                    href={message.fileUrl}
                                    download={message.body}
                                    className="message-bubble__video-download"
                                    title="Скачать видео"
                                    // stopPropagation — чтобы клик по ссылке
                                    // не всплывал к action-bar
                                    onClick={e => e.stopPropagation()}
                                >
                                    <Download size={15} />
                                </a>
                            )}
                        </div>
                    </div>
                ) : message.type === 'file' ? (
                    <div className="message-bubble__file">
                        <span className="message-bubble__file-icon"><FileText size={24} /></span>
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
                                <Download size={18} />
                            </a>
                        )}
                    </div>
                ) : (
                    <div
                        className="message-bubble__body"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.body) }}
                    />
                )}

                {/* Inline-кнопки от SDK-бота */}
                {message.buttons && message.buttons.length > 0 && roomId && (
                    <div className="message-bubble__bot-buttons">
                        {message.buttons.map((row, rowIdx) => (
                            <div key={rowIdx} className="message-bubble__bot-buttons-row">
                                {row.map((btn, btnIdx) => (
                                    <button
                                        key={btnIdx}
                                        className="message-bubble__bot-btn"
                                        onClick={() =>
                                            matrixService.messages.sendBotCallback(
                                                roomId,
                                                message.id,
                                                btn.callback,
                                            )
                                        }
                                        title={btn.callback}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
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
                        <span className="thread-indicator__icon"><MessageSquare size={14} /></span>
                        <span className="thread-indicator__count">
                            {threadSummary.replyCount} {pluralReplies(threadSummary.replyCount)}
                        </span>
                        {threadSummary.lastReply && (
                            <span className="thread-indicator__last">
                                {threadSummary.lastReply.sender} · {formatTime(threadSummary.lastReply.ts)}
                            </span>
                        )}
                        <span className="thread-indicator__arrow"><ChevronRight size={12} /></span>
                    </div>
                )}
            </div>

            {/* Context menu (ПКМ на десктопе) */}
            {contextMenu && (
                <MessageContextMenu
                    position={contextMenu}
                    isPinned={isPinned ?? false}
                    isOwn={isOwn}
                    onClose={() => setContextMenu(null)}
                    onReply={() => onReply?.(message)}
                    onReact={(emoji) => onReact?.(message.id, emoji)}
                    onPin={() => onPin?.(message.id)}
                    onOpenThread={() => onOpenThread?.(message.id)}
                    onDelete={() => onDelete?.(message.id)}
                    onCopyText={handleCopyText}
                    onDownloadFile={handleDownloadFile}
                    onOpenImage={handleOpenImage}
                    onDownloadImage={handleDownloadImage}
                />
            )}

            {/* Mobile action sheet (long-press на тач-устройствах) */}
            {showMobileActions && isTouchDevice && (
                <div className="mobile-action-sheet-overlay" onClick={() => setShowMobileActions(false)}>
                    <div className="mobile-action-sheet" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { onReply?.(message); setShowMobileActions(false); }}><Reply size={18} /> Ответить</button>
                        <button onClick={() => { setShowMobileActions(false); setShowEmojiPicker(true); }}><SmilePlus size={18} /> Реакция</button>
                        <button onClick={() => { onOpenThread?.(message.id); setShowMobileActions(false); }}><MessageSquare size={18} /> Тред</button>
                        <button onClick={() => { onPin?.(message.id); setShowMobileActions(false); }}>
                            <Pin size={18} /> {isPinned ? 'Открепить' : 'Закрепить'}
                        </button>
                        <button className="mobile-action-sheet__cancel" onClick={() => setShowMobileActions(false)}>Отмена</button>
                    </div>
                </div>
            )}
        </div>
    );
};
