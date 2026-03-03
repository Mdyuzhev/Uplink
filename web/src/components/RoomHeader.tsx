import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pin, X, ArrowLeft, Phone, PhoneOff, Bot, Lock, Unlock } from 'lucide-react';
import { matrixService } from '../matrix/MatrixService';
import { RoomInfo } from '../matrix/RoomsManager';
import { useCall } from '../contexts/CallContext';

interface PinnedMessageInfo {
    id: string;
    sender: string;
    body: string;
}

interface RoomHeaderProps {
    room: RoomInfo;
    onBack?: () => void;
    pinnedMessages?: PinnedMessageInfo[];
    onScrollToMessage?: (eventId: string) => void;
    onUnpin?: (eventId: string) => void;
    showBotSettings?: boolean;
    onToggleBotSettings?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
    room, onBack, pinnedMessages, onScrollToMessage, onUnpin, showBotSettings, onToggleBotSettings,
}) => {
    const { callState, activeRoomName, handleJoinCall, handleLeaveCall } = useCall();
    const [showPinned, setShowPinned] = useState(false);
    const [showEncryptConfirm, setShowEncryptConfirm] = useState(false);
    const [isEncrypted, setIsEncrypted] = useState(room.encrypted);
    const panelRef = useRef<HTMLDivElement>(null);

    // Синхронизировать при смене комнаты
    useEffect(() => {
        setIsEncrypted(room.encrypted);
    }, [room.id, room.encrypted]);

    // Закрыть панель при клике вне
    useEffect(() => {
        if (!showPinned) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setShowPinned(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPinned]);

    const isThisRoomInCall = activeRoomName === room.id;
    const isOtherRoomInCall = activeRoomName !== null && !isThisRoomInCall;
    const pinCount = pinnedMessages?.length || 0;

    const onJoinCall = useCallback(() => {
        handleJoinCall(room.id, room.name, room.type);
    }, [handleJoinCall, room.id, room.name, room.type]);

    const handleEnableEncryption = async () => {
        try {
            await matrixService.rooms.enableEncryption(room.id);
            setIsEncrypted(true);
        } catch (err) {
            console.error('Ошибка включения шифрования:', err);
        }
        setShowEncryptConfirm(false);
    };

    return (
        <div className="room-header">
            {onBack && (
                <button className="room-header__back" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
            )}
            <div className="room-header__info">
                <div className="room-header__name">
                    {room.type === 'channel' ? '# ' : ''}{room.name}
                </div>
                {room.topic && <div className="room-header__topic">{room.topic}</div>}
            </div>

            <div className="room-header__actions">
                {/* Индикатор/кнопка шифрования */}
                {isEncrypted ? (
                    <span className="room-header__encryption-badge" title="Сквозное шифрование включено">
                        <Lock size={14} />
                    </span>
                ) : (
                    <button
                        className="room-header__btn"
                        onClick={() => setShowEncryptConfirm(true)}
                        title="Включить сквозное шифрование"
                    >
                        <Unlock size={14} />
                    </button>
                )}

                {/* Кнопка закреплённых сообщений */}
                {pinCount > 0 && (
                    <div className="room-header__pin-wrapper" ref={panelRef}>
                        <button
                            className={`room-header__pin-btn ${showPinned ? 'room-header__pin-btn--active' : ''}`}
                            onClick={() => setShowPinned(!showPinned)}
                            title={`Закреплённые сообщения (${pinCount})`}
                        >
                            <Pin size={14} /> {pinCount}
                        </button>

                        {showPinned && (
                            <div className="pinned-panel">
                                <div className="pinned-panel__header">
                                    Закреплённые сообщения
                                </div>
                                <div className="pinned-panel__list">
                                    {pinnedMessages!.map(msg => (
                                        <div
                                            key={msg.id}
                                            className="pinned-panel__item"
                                            onClick={() => {
                                                onScrollToMessage?.(msg.id);
                                                setShowPinned(false);
                                            }}
                                        >
                                            <div className="pinned-panel__sender">{msg.sender}</div>
                                            <div className="pinned-panel__body">{msg.body}</div>
                                            {onUnpin && (
                                                <button
                                                    className="pinned-panel__unpin"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUnpin(msg.id);
                                                    }}
                                                    title="Открепить"
                                                ><X size={12} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Кнопка ботов */}
                {onToggleBotSettings && (
                    <button
                        className={`room-header__btn ${showBotSettings ? 'room-header__btn--active' : ''}`}
                        onClick={onToggleBotSettings}
                        title="Боты"
                    >
                        <Bot size={16} />
                    </button>
                )}

                {/* Кнопка звонка */}
                <div className="room-header__call">
                    {isThisRoomInCall ? (
                            <button
                                className="room-header__call-btn room-header__call-btn--leave"
                                onClick={handleLeaveCall}
                                title="Завершить звонок"
                            >
                                <PhoneOff size={16} />
                            </button>
                        ) : (
                            <button
                                className="room-header__call-btn room-header__call-btn--join"
                                onClick={onJoinCall}
                                disabled={isOtherRoomInCall || callState === 'connecting'}
                                title={isOtherRoomInCall ? 'Сначала завершите текущий звонок' : 'Начать звонок'}
                            >
                                {callState === 'connecting' ? '...' : <Phone size={16} />}
                            </button>
                    )}
                </div>
            </div>

            {/* Модалка подтверждения включения шифрования */}
            {showEncryptConfirm && (
                <div className="profile-modal-overlay" onClick={() => setShowEncryptConfirm(false)}>
                    <div className="profile-modal" onClick={e => e.stopPropagation()}>
                        <div className="profile-modal__header">
                            <span className="profile-modal__title">Включить шифрование?</span>
                            <button className="profile-modal__close" onClick={() => setShowEncryptConfirm(false)}>
                                &#x2715;
                            </button>
                        </div>
                        <div className="profile-modal__section">
                            <p style={{ color: 'var(--uplink-text-secondary)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                                Сквозное шифрование (E2E) защитит все новые сообщения в этой комнате.
                                Только участники смогут их прочитать.
                            </p>
                            <div className="create-modal__toggle-warning" style={{ marginTop: 8 }}>
                                Это действие необратимо — шифрование нельзя отключить после активации.
                                Встроенные боты перестанут работать в этой комнате.
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '0 20px 20px' }}>
                            <button className="profile-modal__btn" onClick={() => setShowEncryptConfirm(false)}>
                                Отмена
                            </button>
                            <button
                                className="profile-modal__btn profile-modal__btn--primary"
                                onClick={handleEnableEncryption}
                            >
                                Включить шифрование
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
