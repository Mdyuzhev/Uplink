import React, { useState, useRef, useCallback, useEffect } from 'react';
import { matrixService } from '../matrix/MatrixService';

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
}

export const MessageInput: React.FC<MessageInputProps> = ({
    onSend, onSendReply, onSendFile, roomId, roomName, replyTo, onCancelReply,
}) => {
    const [text, setText] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

    // Сброс typing при unmount
    useEffect(() => {
        return () => {
            if (roomId) matrixService.sendTyping(roomId, false).catch(() => {});
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
        if (roomId) matrixService.sendTyping(roomId, false).catch(() => {});
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        adjustHeight();

        // Typing indicator
        if (roomId && e.target.value.length > 0) {
            matrixService.sendTyping(roomId, true).catch(() => {});
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (roomId) matrixService.sendTyping(roomId, false).catch(() => {});
            }, 4000);
        } else if (roomId) {
            matrixService.sendTyping(roomId, false).catch(() => {});
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
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
            {uploading && (
                <div className="message-input__uploading">
                    Загрузка файла...
                </div>
            )}
            {replyTo && (
                <div className="message-input__reply-preview">
                    <div className="message-input__reply-line" />
                    <div className="message-input__reply-content">
                        <span className="message-input__reply-sender">{replyTo.sender}</span>
                        <span className="message-input__reply-text">{replyTo.body}</span>
                    </div>
                    <button className="message-input__reply-close" onClick={onCancelReply}>✕</button>
                </div>
            )}
            <div className="message-input__wrapper">
                <button
                    className="message-input__attach"
                    onClick={handleAttachClick}
                    disabled={uploading}
                    title="Прикрепить файл"
                >
                    +
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                />
                <textarea
                    ref={textareaRef}
                    className="message-input__textarea"
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={roomName ? `Написать в ${roomName}...` : 'Написать сообщение...'}
                    rows={1}
                />
                <button
                    className="message-input__send"
                    onClick={handleSend}
                    disabled={!text.trim() || uploading}
                >
                    &#8593;
                </button>
            </div>
        </div>
    );
};
