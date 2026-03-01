import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Paperclip, Send, Smile, Mic, Video } from 'lucide-react';
import { matrixService } from '../matrix/MatrixService';
import { commandRegistry, BotCommand } from '../bots/CommandRegistry';
import { StickerGifPanel } from './StickerGifPanel';
import { CreateStickerPackModal } from './CreateStickerPackModal';
import { VoiceRecordBar } from './VoiceRecordBar';
import { VideoNoteRecordOverlay } from './VideoNoteRecordOverlay';
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
    onSendFile: (file: File) => void;
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
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [suggestions, setSuggestions] = useState<BotCommand[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [showStickerPanel, setShowStickerPanel] = useState(false);
    const [showCreatePack, setShowCreatePack] = useState(false);
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [showVideoNoteRecorder, setShowVideoNoteRecorder] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    // Загрузить команды ботов при монтировании
    useEffect(() => {
        if (!commandRegistry.isLoaded()) {
            commandRegistry.load();
        }
    }, []);

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

    // Сброс typing при unmount
    useEffect(() => {
        return () => {
            if (roomId) matrixService.users.sendTyping(roomId, false).catch(() => {});
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [roomId]);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed) return;

        if (replyTo && onSendReply) {
            onSendReply(replyTo.eventId, trimmed);
            onCancelReply?.();
        } else {
            onSend(trimmed);
        }

        setText('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Сбросить typing
        if (roomId) matrixService.users.sendTyping(roomId, false).catch(() => {});
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setText(value);
        adjustHeight();

        // Автокомплит slash-команд
        if (value.startsWith('/') && !value.includes('\n')) {
            const matches = commandRegistry.search(value);
            setSuggestions(matches);
            setSelectedSuggestion(0);
        } else {
            setSuggestions([]);
        }

        // Typing indicator
        if (roomId && e.target.value.length > 0) {
            matrixService.users.sendTyping(roomId, true).catch(() => {});
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (roomId) matrixService.users.sendTyping(roomId, false).catch(() => {});
            }, 4000);
        } else if (roomId) {
            matrixService.users.sendTyping(roomId, false).catch(() => {});
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Навигация по подсказкам команд
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestion(i => Math.min(i + 1, suggestions.length - 1));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestion(i => Math.max(i - 1, 0));
                return;
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                const cmd = suggestions[selectedSuggestion];
                setText(cmd.command + ' ');
                setSuggestions([]);
                return;
            }
            if (e.key === 'Escape') {
                setSuggestions([]);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            setSuggestions([]);
            handleSend();
        }
        if (e.key === 'Escape' && replyTo) {
            onCancelReply?.();
        }
    };

    const handleFileSelect = async (file: File) => {
        if (uploading) return;
        if (file.size > 50 * 1024 * 1024) {
            alert('Максимальный размер файла — 50 МБ');
            return;
        }
        setUploading(true);
        try {
            await onSendFile(file);
        } catch (err) {
            console.error('Ошибка отправки файла:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
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
        if (roomId) await matrixService.media.sendVoiceMessage(roomId, recording);
    };

    const handleVideoNoteSend = async (recording: VideoNoteRecording) => {
        setShowVideoNoteRecorder(false);
        if (roomId) await matrixService.media.sendVideoNote(roomId, recording);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) handleFileSelect(file);
                return;
            }
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
                {suggestions.length > 0 && (
                    <div className="command-suggestions">
                        {suggestions.map((cmd, i) => (
                            <div
                                key={cmd.command}
                                className={`command-suggestions__item ${i === selectedSuggestion ? 'command-suggestions__item--active' : ''}`}
                                onClick={() => {
                                    setText(cmd.command + ' ');
                                    setSuggestions([]);
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
                        Загрузка файла...
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
                                    onClick={handleAttachClick}
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
