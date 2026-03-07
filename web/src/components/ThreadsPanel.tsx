import React from 'react';
import { MessageSquare, Hash } from 'lucide-react';
import { useAllThreads } from '../hooks/useAllThreads';

interface ThreadsPanelProps {
    onOpenThread: (roomId: string, threadRootId: string) => void;
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export const ThreadsPanel: React.FC<ThreadsPanelProps> = ({ onOpenThread }) => {
    const { threads } = useAllThreads();

    return (
        <div className="threads-panel">
            <div className="threads-panel__header">
                <span>Треды</span>
                <MessageSquare size={18} />
            </div>

            {threads.length === 0 ? (
                <div className="threads-panel__empty">
                    <MessageSquare size={32} />
                    <span>Нет активных тредов</span>
                </div>
            ) : (
                <div className="threads-panel__list">
                    {threads.map(t => (
                        <div
                            key={`${t.roomId}-${t.threadRootId}`}
                            className={`threads-panel__item ${t.hasUnread ? 'threads-panel__item--unread' : ''}`}
                            onClick={() => onOpenThread(t.roomId, t.threadRootId)}
                        >
                            <div className="threads-panel__room">
                                <Hash size={11} />
                                <span>{t.roomName}</span>
                                <span style={{ marginLeft: 'auto' }}>{formatTime(t.lastReplyTs)}</span>
                            </div>
                            <div className="threads-panel__root-text">
                                <strong>{t.rootSender}:</strong> {t.rootBody}
                            </div>
                            {t.lastReplySender && (
                                <div className="threads-panel__last-reply">
                                    <span className="threads-panel__reply-text">
                                        {t.lastReplySender}: {t.lastReplyBody}
                                    </span>
                                    <span className="threads-panel__count">
                                        {t.replyCount}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
