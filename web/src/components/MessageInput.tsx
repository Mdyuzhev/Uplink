import React, { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
    onSend: (body: string) => void;
    roomName?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, roomName }) => {
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    return (
        <div className="message-input">
            <div className="message-input__wrapper">
                <textarea
                    ref={textareaRef}
                    className="message-input__textarea"
                    value={text}
                    onChange={e => { setText(e.target.value); adjustHeight(); }}
                    onKeyDown={handleKeyDown}
                    placeholder={roomName ? `Написать в ${roomName}...` : 'Написать сообщение...'}
                    rows={1}
                />
                <button
                    className="message-input__send"
                    onClick={handleSend}
                    disabled={!text.trim()}
                >
                    &#8593;
                </button>
            </div>
        </div>
    );
};
