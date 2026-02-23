import React, { useRef, useEffect, useCallback } from 'react';
import { Message } from './types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
    messages: Message[];
    currentUser: string;
    onLoadMore: () => void;
}

const GROUPING_THRESHOLD_MS = 5 * 60 * 1000; // 5 минут

export const MessageList: React.FC<MessageListProps> = ({ messages, currentUser, onLoadMore }) => {
    const listRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const isNearBottom = useRef(true);

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // Auto-scroll при новых сообщениях (если пользователь внизу)
    useEffect(() => {
        if (isNearBottom.current) {
            scrollToBottom();
        }
    }, [messages, scrollToBottom]);

    const handleScroll = () => {
        if (!listRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        isNearBottom.current = scrollHeight - scrollTop - clientHeight < 100;

        // Загрузка истории при скролле вверх
        if (scrollTop < 50) {
            onLoadMore();
        }
    };

    const formatDateSeparator = (ts: number): string => {
        const date = new Date(ts);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Сегодня';
        if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    };

    const shouldShowDateSeparator = (idx: number): boolean => {
        if (idx === 0) return true;
        const prev = new Date(messages[idx - 1].timestamp).toDateString();
        const curr = new Date(messages[idx].timestamp).toDateString();
        return prev !== curr;
    };

    const shouldShowAuthor = (idx: number): boolean => {
        if (idx === 0) return true;
        const prev = messages[idx - 1];
        const curr = messages[idx];
        if (prev.sender !== curr.sender) return true;
        if (curr.timestamp - prev.timestamp > GROUPING_THRESHOLD_MS) return true;
        return false;
    };

    if (messages.length === 0) {
        return (
            <div className="uplink-messages uplink-messages--empty" ref={listRef}>
                <div className="uplink-messages__placeholder">Нет сообщений</div>
            </div>
        );
    }

    return (
        <div className="uplink-messages" ref={listRef} onScroll={handleScroll}>
            {messages.map((msg, idx) => (
                <React.Fragment key={msg.id}>
                    {shouldShowDateSeparator(idx) && (
                        <div className="uplink-date-separator">
                            <span>{formatDateSeparator(msg.timestamp)}</span>
                        </div>
                    )}
                    <MessageBubble
                        message={msg}
                        showAuthor={shouldShowAuthor(idx)}
                        isOwn={msg.sender === currentUser}
                    />
                </React.Fragment>
            ))}
            <div ref={bottomRef} />
        </div>
    );
};
