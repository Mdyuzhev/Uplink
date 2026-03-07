import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Paperclip, Send, Smile, Mic, Video } from 'lucide-react';
import { matrixService } from '../matrix/MatrixService';
import { StickerGifPanel } from './StickerGifPanel';
import { CreateStickerPackModal } from './CreateStickerPackModal';
import { VoiceRecordBar } from './VoiceRecordBar';
import { VideoNoteRecordOverlay } from './VideoNoteRecordOverlay';
import { useSlashCommands } from '../hooks/useSlashCommands';
import { useMentions } from '../hooks/useMentions';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { useFileUpload } from '../hooks/useFileUpload';
import type { VoiceRecording } from '../services/VoiceRecorder';
import type { VideoNoteRecording } from '../services/VideoNoteRecorder';
import type { GifResult } from '../services/GifService';
import type { Sticker } from '../services/StickerService';
import { stickerService } from '../services/StickerService';

export interface ReplyToInfo {
    eventId: string;
    sender: string;
    body: string;
}

interface MessageInputProps {
    onSend: (body: string) => void;
    onSendReply?: (replyToEventId: string, body: string) => void;
    onSendFile: (file: File, onProgress?: (percent: number) => void) => void;
    roomId?: string;
    roomName?: string;
    replyTo?: ReplyToInfo | null;
    onCancelReply?: () => void;
    /** Текст для вставки (например, код из VS Code) */
    pendingText?: string | null;
    onPendingTextConsumed?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSend, onSendReply, onSendFile, roomId, roomName, replyTo, onCancelReply,
    pendingText, onPendingTextConsumed,
}) => {
    const [text, setText] = useState('');
    const [showStickerPanel, setShowStickerPanel] = useState(false);
    const [showCreatePack, setShowCreatePack] = useState(false);
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [showVideoNoteRecorder, setShowVideoNoteRecorder] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [cursorPos, setCursorPos] = useState(0);

    const { suggestions, selectedIndex, setSelectedIndex, selectSuggestion, clearSuggestions } = useSlashCommands(text, roomId);
    const {
        suggestions: mentionSuggestions,
        selectedIndex: mentionIndex,
        setSelectedIndex: setMentionIndex,
        insertMention,
        clearSuggestions: clearMentions,
    } = useMentions(text, cursorPos, roomId);
    useTypingIndicator(roomId, text);
    const {
        isDragOver, uploading, uploadProgress, fileInputRef,
        handleDragOver, handleDragLeave, handleDrop, handlePaste, handleFileInputChange, openFilePicker,
    } = useFileUpload(onSendFile);

    const adjustHeight = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
    }, []);

    // Фокус на textarea при выборе reply
    useEffect(() => {
        if (replyTo) {
            textareaRef.current?.focus();
        }
    }, [replyTo]);

    // VS Code: вставка текста (snippet) извне
    useEffect(() => {
        if (pendingText) {
            setText(prev => prev ? prev + '\n' + pendingText : pendingText);
            textareaRef.current?.focus();
            onPendingTextConsumed?.();
        }
    }, [pendingText, onPendingTextConsumed]);

    /** Извлечь userId упомянутых пользователей из текста */
    const extractMentionedUserIds = (messageText: string): string[] => {
        if (!roomId) return [];
        const room = matrixService.getClient().getRoom(roomId);
        if (!room) return [];
        const result: string[] = [];
        for (const member of room.getJoinedMembers()) {
            const displayName = member.name || member.userId;
            if (messageText.includes(`@${displayName}`)) {
                result.push(member.userId);
            }
        }
        return result;
    };

    const handleSend = async () => {
        const trimmed = text.trim();
        if (!trimmed) return;

        clearMentions();

        const mentionedIds = extractMentionedUserIds(trimmed);
        const hasMentions = mentionedIds.length > 0;

        try {
            if (replyTo && onSendReply) {
                if (hasMentions && roomId) {
                    await matrixService.messages.sendReplyWithMentions(roomId, replyTo.eventId, trimmed, mentionedIds);
                } else {
                    onSendReply(replyTo.eventId, trimmed);
                }
                onCancelReply?.();
            } else {
                if (hasMentions && roomId) {
                    await matrixService.messages.sendMessageWithMentions(roomId, trimmed, mentionedIds);
                } else {
                    onSend(trimmed);
                }
            }
        } catch (e) {
            console.error('[MessageInput] Ошибка отправки:', e);
        }

        setText('');
        setCursorPos(0);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        if (roomId) matrixService.users.sendTyping(roomId, false).catch(() => {});
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        setCursorPos(e.target.selectionStart ?? e.target.value.length);
        adjustHeight();
    };

    const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        setCursorPos((e.target as HTMLTextAreaElement).selectionStart ?? 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Навигация по подсказкам упоминаний
        if (mentionSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex(i => Math.min(i + 1, mentionSuggestions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex(i => Math.max(i - 1, 0));
                return;
            }
            if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault();
                const { newText, newCursor } = insertMention(mentionIndex);
                setText(newText);
                setCursorPos(newCursor);
                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.selectionStart = newCursor;
                        textareaRef.current.selectionEnd = newCursor;
                    }
                }, 0);
                return;
            }
            if (e.key === 'Escape') {
                clearMentions();
                return;
            }
        }

        // Навигация по подсказкам команд
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                return;
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                setText(selectSuggestion(selectedIndex));
                return;
            }
            if (e.key === 'Escape') {
                clearSuggestions();
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            clearSuggestions();
            handleSend();
        }
        if (e.key === 'Escape' && replyTo) {
            onCancelReply?.();
        }
    };

    const handleSendGif = useCallback(async (gif: GifResult) => {
        if (!roomId) return;
        await matrixService.messages.sendGif(roomId, gif);
    }, [roomId]);

    const handleSendSticker = useCallback(async (sticker: Sticker, _packId: string) => {
        if (!roomId) return;
        await stickerService.sendSticker(roomId, sticker);
    }, [roomId]);

    const handleVoiceSend = async (recording: VoiceRecording) => {
        setIsRecordingVoice(false);
        if (!roomId) return;
        try {
            await matrixService.media.sendVoiceMessage(roomId, recording);
        } catch (e) {
            console.error('[Voice] Ошибка отправки:', e);
        }
    };

    const handleVideoNoteSend = async (recording: VideoNoteRecording) => {
        setShowVideoNoteRecorder(false);
        if (!roomId) return;
        try {
            await matrixService.media.sendVideoNote(roomId, recording);
        } catch (e) {
            console.error('[VideoNote] Ошибка отправки:', e);
        }
    };

    return (
        <div
            className={`message-input ${isDragOver ? 'message-input--drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragOver && (
                <div className="message-input__drop-overlay">
                    Отпустите чтобы отправить файл
                </div>
            )}
            <div className="message-input__wrapper">
                {showStickerPanel && roomId && (
                    <StickerGifPanel
                        roomId={roomId}
                        onClose={() => setShowStickerPanel(false)}
                        onSendGif={handleSendGif}
                        onSendSticker={handleSendSticker}
                        onOpenCreatePack={() => { setShowStickerPanel(false); setShowCreatePack(true); }}
                    />
                )}
                {mentionSuggestions.length > 0 && (
                    <div className="mention-suggestions">
                        {mentionSuggestions.map((member, i) => (
                            <div
                                key={member.userId}
                                className={`mention-suggestions__item ${i === mentionIndex ? 'mention-suggestions__item--active' : ''}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const { newText, newCursor } = insertMention(i);
                                    setText(newText);
                                    setCursorPos(newCursor);
                                    setTimeout(() => {
                                        textareaRef.current?.focus();
                                        if (textareaRef.current) {
                                            textareaRef.current.selectionStart = newCursor;
                                            textareaRef.current.selectionEnd = newCursor;
                                        }
                                    }, 0);
                                }}
                            >
                                <span className="mention-suggestions__avatar">
                                    {member.displayName[0]?.toUpperCase() || '?'}
                                </span>
                                <span className="mention-suggestions__name">{member.displayName}</span>
                                <span className="mention-suggestions__id">{member.userId}</span>
                            </div>
                        ))}
                    </div>
                )}
                {suggestions.length > 0 && (
                    <div className="command-suggestions">
                        {suggestions.map((cmd, i) => (
                            <div
                                key={cmd.command}
                                className={`command-suggestions__item ${i === selectedIndex ? 'command-suggestions__item--active' : ''}`}
                                onClick={() => {
                                    setText(selectSuggestion(i));
                                    textareaRef.current?.focus();
                                }}
                            >
                                <span className="command-suggestions__command">{cmd.command}</span>
                                <span className="command-suggestions__bot">{cmd.botName}</span>
                                <span className="command-suggestions__desc">{cmd.description}</span>
                            </div>
                        ))}
                    </div>
                )}
                {replyTo && (
                    <div className="message-input__reply-preview">
                        <div className="message-input__reply-line" />
                        <div className="message-input__reply-content">
                            <span className="message-input__reply-sender">{replyTo.sender}</span>
                            <span className="message-input__reply-text">{replyTo.body}</span>
                        </div>
                        <button className="message-input__reply-close" onClick={onCancelReply}><X size={14} /></button>
                    </div>
                )}
                {uploading && (
                    <div className="message-input__uploading">
                        <div className="message-input__upload-info">
                            Загрузка файла… {uploadProgress > 0 && `${uploadProgress}%`}
                        </div>
                        <div className="message-input__upload-track">
                            <div
                                className="message-input__upload-bar"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}
                <div className="message-input__row">
                    {isRecordingVoice ? (
                        <VoiceRecordBar
                            onSend={handleVoiceSend}
                            onCancel={() => setIsRecordingVoice(false)}
                        />
                    ) : (
                        <>
                            <textarea
                                ref={textareaRef}
                                className="message-input__textarea"
                                value={text}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                onSelect={handleSelect}
                                onPaste={handlePaste}
                                onFocus={() => {
                                    setTimeout(() => {
                                        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                    }, 300);
                                }}
                                placeholder={roomName ? `Написать в ${roomName}...` : 'Написать сообщение...'}
                                rows={1}
                            />
                            <div className="message-input__actions">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    style={{ display: 'none' }}
                                    onChange={handleFileInputChange}
                                />
                                <button
                                    className="message-input__action-btn"
                                    onClick={() => setShowStickerPanel(!showStickerPanel)}
                                    title="Стикеры и GIF"
                                >
                                    <Smile size={18} />
                                </button>
                                <button
                                    className="message-input__action-btn"
                                    onClick={openFilePicker}
                                    disabled={uploading}
                                    title="Прикрепить файл"
                                >
                                    <Paperclip size={18} />
                                </button>
                                {text.trim() ? (
                                    <button
                                        className="message-input__send-btn"
                                        onClick={handleSend}
                                        disabled={uploading}
                                        title="Отправить"
                                    >
                                        <Send size={16} />
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            className="message-input__mic-btn"
                                            onClick={() => setIsRecordingVoice(true)}
                                            title="Голосовое сообщение"
                                        >
                                            <Mic size={18} />
                                        </button>
                                        <button
                                            className="message-input__video-note-btn"
                                            onClick={() => setShowVideoNoteRecorder(true)}
                                            title="Видеосообщение"
                                        >
                                            <Video size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {showCreatePack && (
                <CreateStickerPackModal
                    onClose={() => setShowCreatePack(false)}
                    onCreated={() => setShowCreatePack(false)}
                />
            )}
            {showVideoNoteRecorder && (
                <VideoNoteRecordOverlay
                    onSend={handleVideoNoteSend}
                    onCancel={() => setShowVideoNoteRecorder(false)}
                />
            )}
        </div>
    );
};
