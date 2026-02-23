import React, { useRef, useEffect, useCallback } from 'react';
import { ParsedMessage } from '../matrix/MessageFormatter';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
    messages: ParsedMessage[];
    onLoadMore: () => void;
}

const SAME_AUTHOR_THRESHOLD = 5 * 60 * 1000; // 5 минут

function formatDayLabel(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = today.getTime() - msgDay.getTime();

    if (diff === 0) return 'Сегодня';
    if (diff === 86400000) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getDayKey(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onLoadMore }) => {
    const listRef = useRef<HTMLDivElement>(null);
    const isAtBottom = useRef(true);

    const checkBottom = useCallback(() => {
        const el = listRef.current;
        if (!el) return;
        isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    }, []);

    useEffect(() => {
        const el = listRef.current;
        if (el && isAtBottom.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages]);

    const items: React.ReactNode[] = [];
    let lastDay = '';
    let lastSender = '';
    let lastTs = 0;

    for (const msg of messages) {
        const day = getDayKey(msg.timestamp);
        if (day !== lastDay) {
            items.push(
                <div key={`day-${day}`} className="message-day-divider">
                    {formatDayLabel(msg.timestamp)}
                </div>
            );
            lastDay = day;
            lastSender = '';
            lastTs = 0;
        }

        const showAuthor = msg.sender !== lastSender
            || (msg.timestamp - lastTs > SAME_AUTHOR_THRESHOLD);

        items.push(
            <MessageBubble key={msg.id} message={msg} showAuthor={showAuthor} />
        );

        lastSender = msg.sender;
        lastTs = msg.timestamp;
    }

    return (
        <div className="message-list" ref={listRef} onScroll={checkBottom}>
            <div className="message-list__load-more">
                <button onClick={onLoadMore}>Загрузить ранее</button>
            </div>
            {items}
        </div>
    );
};
