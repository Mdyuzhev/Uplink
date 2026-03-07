import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Reply, MessageSquare, Pin, Copy, Download, ExternalLink, Trash2 } from 'lucide-react';
const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🔥', '✅', '❌'];

interface MessageContextMenuProps {
    position: { x: number; y: number };
    isPinned: boolean;
    isOwn: boolean;
    onClose: () => void;
    onReply: () => void;
    onReact: (emoji: string) => void;
    onPin: () => void;
    onOpenThread: () => void;
    onDelete: () => void;
    onCopyText?: () => void;
    onDownloadFile?: () => void;
    onOpenImage?: () => void;
    onDownloadImage?: () => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
    position,
    isPinned,
    isOwn,
    onClose,
    onReply,
    onReact,
    onPin,
    onOpenThread,
    onDelete,
    onCopyText,
    onDownloadFile,
    onOpenImage,
    onDownloadImage,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState(position);

    // Коррекция позиции если меню выходит за экран
    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const x = position.x + rect.width > window.innerWidth
            ? position.x - rect.width
            : position.x;
        const y = position.y + rect.height > window.innerHeight
            ? position.y - rect.height
            : position.y;
        setAdjustedPos({ x, y });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Закрытие по клику вне и Escape
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    const act = (fn: () => void) => {
        fn();
        onClose();
    };

    return createPortal(
        <div
            ref={menuRef}
            className="msg-context-menu"
            style={{ left: adjustedPos.x, top: adjustedPos.y }}
            onContextMenu={e => e.preventDefault()}
        >
            {/* Quick emoji strip */}
            <div className="msg-context-menu__emoji-strip">
                {QUICK_EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => act(() => onReact(emoji))}>
                        {emoji}
                    </button>
                ))}
            </div>

            <div className="msg-context-menu__divider" />

            <button onClick={() => act(onReply)}>
                <Reply size={16} /> Ответить
            </button>
            <button onClick={() => act(onOpenThread)}>
                <MessageSquare size={16} /> Открыть тред
            </button>
            <button onClick={() => act(onPin)}>
                <Pin size={16} /> {isPinned ? 'Открепить' : 'Закрепить'}
            </button>

            {onCopyText && (
                <button onClick={() => act(onCopyText)}>
                    <Copy size={16} /> Копировать текст
                </button>
            )}
            {onDownloadImage && (
                <button onClick={() => act(onDownloadImage)}>
                    <Download size={16} /> Скачать изображение
                </button>
            )}
            {onOpenImage && (
                <button onClick={() => act(onOpenImage)}>
                    <ExternalLink size={16} /> Открыть изображение
                </button>
            )}
            {onDownloadFile && (
                <button onClick={() => act(onDownloadFile)}>
                    <Download size={16} /> Скачать файл
                </button>
            )}

            {isOwn && (
                <>
                    <div className="msg-context-menu__divider" />
                    <button
                        className="msg-context-menu__item--danger"
                        onClick={() => act(onDelete)}
                    >
                        <Trash2 size={16} /> Удалить
                    </button>
                </>
            )}
        </div>,
        document.body,
    );
};
