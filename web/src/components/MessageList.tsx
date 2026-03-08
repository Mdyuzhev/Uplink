import React, { useRef, useEffect, useCallback } from 'react';
import { ParsedMessage } from '../matrix/MessageFormatter';
import { MessageBubble, ReactionInfo, ThreadSummaryInfo } from './MessageBubble';

interface MessageListProps {
    messages: ParsedMessage[];
    roomId?: string;
    reactions?: Map<string, ReactionInfo[]>;
    pinnedIds?: Set<string>;
    threadSummaries?: Map<string, ThreadSummaryInfo>;
    typingUsers?: string[];
    scrollToEventId?: string | null;
    onScrollComplete?: () => void;
    onLoadMore: () => void;
    onReply?: (msg: ParsedMessage) => void;
    onReact?: (eventId: string, emoji: string) => void;
    onRemoveReaction?: (reactionEventId: string) => void;
    onPin?: (eventId: string) => void;
    onOpenThread?: (eventId: string) => void;
    onDelete?: (eventId: string) => void;
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

export const MessageList: React.FC<MessageListProps> = ({
    messages, roomId, reactions, pinnedIds, threadSummaries, typingUsers,
    scrollToEventId, onScrollComplete,
    onLoadMore, onReply, onReact, onRemoveReaction, onPin, onOpenThread, onDelete,
}) => {
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

    const scrollToMessage = useCallback((eventId: string) => {
        const el = listRef.current;
        if (!el) return;
        const target = el.querySelector(`[data-event-id="${eventId}"]`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('message-bubble--highlight');
            setTimeout(() => target.classList.remove('message-bubble--highlight'), 2000);
        }
    }, []);

    // Удерживать позицию «внизу» при изменении высоты контейнера (мобильная клавиатура)
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;

        const observer = new ResizeObserver(() => {
            if (isAtBottom.current) {
                requestAnimationFrame(() => {
                    el.scrollTop = el.scrollHeight;
                });
            }
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Скролл к сообщению по внешнему запросу (напр. из панели закреплённых)
    useEffect(() => {
        if (scrollToEventId) {
            scrollToMessage(scrollToEventId);
            onScrollComplete?.();
        }
    }, [scrollToEventId, scrollToMessage, onScrollComplete]);

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
            <MessageBubble
                key={msg.id}
                message={msg}
                roomId={roomId}
                showAuthor={showAuthor}
                reactions={reactions?.get(msg.id)}
                isPinned={pinnedIds?.has(msg.id)}
                threadSummary={threadSummaries?.get(msg.id)}
                onReply={onReply}
                onReact={onReact}
                onRemoveReaction={onRemoveReaction}
                onPin={onPin}
                onOpenThread={onOpenThread}
                onDelete={onDelete}
                onScrollToMessage={scrollToMessage}
            />
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
            {typingUsers && typingUsers.length > 0 && (
                <div className="typing-indicator">
                    <span className="typing-indicator__dots">
                        <span /><span /><span />
                    </span>
                    <span className="typing-indicator__text">
                        {typingUsers.join(', ')}
                        {typingUsers.length === 1 ? ' набирает...' : ' набирают...'}
                    </span>
                </div>
            )}
        </div>
    );
};
