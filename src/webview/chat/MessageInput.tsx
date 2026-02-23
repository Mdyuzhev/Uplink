import React, { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
    roomName: string;
    onSend: (body: string) => void;
    disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ roomName, onSend, disabled }) => {
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) {
                onSend(text.trim());
                setText('');
                if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                }
            }
        }
    }, [text, onSend]);

    const handleInput = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    };

    return (
        <div className="uplink-input">
            <textarea
                ref={textareaRef}
                className="uplink-input__textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder={`Сообщение в ${roomName}...`}
                disabled={disabled}
                rows={1}
            />
            <button
                className="uplink-input__send"
                onClick={() => {
                    if (text.trim()) {
                        onSend(text.trim());
                        setText('');
                    }
                }}
                disabled={disabled || !text.trim()}
                title="Отправить (Enter)"
            >
                ▶
            </button>
        </div>
    );
};
