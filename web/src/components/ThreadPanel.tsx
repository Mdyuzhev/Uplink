import React, { useState, useRef, useEffect } from 'react';
import { useThread } from '../hooks/useThread';
import { Avatar } from './Avatar';
import { renderMarkdown } from '../utils/markdown';

interface ThreadPanelProps {
    roomId: string;
    threadRootId: string;
    onClose: () => void;
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function pluralReplies(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'ответ';
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'ответа';
    return 'ответов';
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({ roomId, threadRootId, onClose }) => {
    const { rootMessage, messages, sendMessage } = useThread(roomId, threadRootId);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Автоскролл к последнему сообщению
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // Сброс ввода при смене треда
    useEffect(() => {
        setInput('');
    }, [threadRootId]);

    const handleSend = async () => {
        if (!input.trim() || sending) return;
        setSending(true);
        try {
            await sendMessage(input.trim());
            setInput('');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="thread-panel">
            {/* Заголовок */}
            <div className="thread-panel__header">
                <span className="thread-panel__title">Тред</span>
                <button className="thread-panel__close" onClick={onClose}>✕</button>
            </div>

            {/* Корневое сообщение */}
            {rootMessage && (
                <div className="thread-panel__root">
                    <div className="thread-panel__root-header">
                        <Avatar name={rootMessage.senderDisplayName} size={24} imageUrl={rootMessage.senderAvatarUrl} />
                        <span className="thread-panel__root-sender">{rootMessage.senderDisplayName}</span>
                        <span className="thread-panel__root-time">{formatTime(rootMessage.timestamp)}</span>
                    </div>
                    <div
                        className="thread-panel__root-body"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(rootMessage.body) }}
                    />
                </div>
            )}

            <div className="thread-panel__divider">
                <span>{messages.length} {pluralReplies(messages.length)}</span>
            </div>

            {/* Сообщения треда */}
            <div className="thread-panel__messages">
                {messages.map(msg => (
                    <div key={msg.id} className="thread-panel__message">
                        <Avatar
                            name={msg.senderDisplayName}
                            size={24}
                            imageUrl={msg.senderAvatarUrl}
                        />
                        <div className="thread-panel__message-content">
                            <div className="thread-panel__message-header">
                                <span className="thread-panel__message-sender">{msg.senderDisplayName}</span>
                                <span className="thread-panel__message-time">{formatTime(msg.timestamp)}</span>
                            </div>
                            <div
                                className="thread-panel__message-body"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.body) }}
                            />
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Поле ввода */}
            <div className="thread-panel__input">
                <textarea
                    className="thread-panel__textarea"
                    placeholder="Ответить в тред..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                />
                <button
                    className="thread-panel__send"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                >
                    ➤
                </button>
            </div>
        </div>
    );
};
