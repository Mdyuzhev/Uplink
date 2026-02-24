import React, { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
    onSend: (body: string) => void;
    onSendFile: (file: File) => void;
    roomName?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, onSendFile, roomName }) => {
    const [text, setText] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const adjustHeight = useCallback(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
    }, []);

    const handleSend = () => {
        const trimmed = text.trim();
        if (!trimmed) return;
        onSend(trimmed);
        setText('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
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
            <div className="message-input__wrapper">
                <button
                    className="message-input__attach"
                    onClick={handleAttachClick}
                    disabled={uploading}
                    title="Прикрепить файл"
                >
                    📎
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
                    onChange={e => { setText(e.target.value); adjustHeight(); }}
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
