import React, { useState, useEffect, useCallback } from 'react';
import { X, UserMinus } from 'lucide-react';
import { matrixService } from '../../matrix/MatrixService';
import { fetchWithAuth } from '../../utils/api';
import { config } from '../../config';

interface RoomSettingsModalProps {
    roomId: string;
    roomName: string;
    isSpace: boolean;
    isAdmin: boolean;
    onClose: () => void;
}

type Tab = 'info' | 'members' | 'bots';

interface MemberInfo {
    userId: string;
    displayName: string;
}

interface BotInfo {
    id: string;
    displayName: string;
    description: string;
    enabledInRoom: boolean;
}

function avatarColor(userId: string): string {
    const colors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245', '#9B59B6', '#1ABC9C'];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
    roomId, roomName, isSpace, isAdmin, onClose,
}) => {
    const [tab, setTab] = useState<Tab>('info');
    const [copied, setCopied] = useState(false);

    // Участники
    const [members, setMembers] = useState<MemberInfo[]>([]);
    const [membersLoaded, setMembersLoaded] = useState(false);
    const [membersLoading, setMembersLoading] = useState(false);

    // Боты
    const [bots, setBots] = useState<BotInfo[]>([]);
    const [botsLoaded, setBotsLoaded] = useState(false);
    const [botsLoading, setBotsLoading] = useState(false);
    const [botsError, setBotsError] = useState('');

    // Приглашение
    const [inviteId, setInviteId] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviting, setInviting] = useState(false);

    // Тоггл ботов в процессе
    const [togglingBot, setTogglingBot] = useState<string | null>(null);

    // Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Копирование Room ID
    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard может быть недоступен */ }
    }, [roomId]);

    // Загрузка участников
    const loadMembers = useCallback(() => {
        const room = matrixService.getClient().getRoom(roomId);
        const joined = room?.getJoinedMembers() ?? [];
        setMembers(joined.map(m => ({
            userId: m.userId,
            displayName: m.name || m.userId,
        })));
        setMembersLoaded(true);
        setMembersLoading(false);
    }, [roomId]);

    // Загрузка ботов
    const loadBots = useCallback(async () => {
        setBotsLoading(true);
        setBotsError('');
        try {
            const res = await fetchWithAuth(`${config.botApiUrl}/bots?roomId=${encodeURIComponent(roomId)}`);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data: BotInfo[] = await res.json();
            setBots(data);
        } catch {
            setBotsError('Не удалось загрузить список ботов. Проверьте подключение к botservice.');
        }
        setBotsLoaded(true);
        setBotsLoading(false);
    }, [roomId]);

    // При переключении вкладок — ленивая загрузка
    useEffect(() => {
        if (tab === 'members' && !membersLoaded) {
            setMembersLoading(true);
            loadMembers();
        }
        if (tab === 'bots' && !botsLoaded) {
            loadBots();
        }
    }, [tab, membersLoaded, botsLoaded, loadMembers, loadBots]);

    // Исключение участника
    const handleKick = async (userId: string) => {
        if (!window.confirm('Исключить пользователя?')) return;
        try {
            await matrixService.getClient().kick(roomId, userId, 'Исключён администратором');
            loadMembers();
        } catch { /* ошибка кика */ }
    };

    // Приглашение
    const handleInvite = async () => {
        const uid = inviteId.trim();
        if (!uid) return;
        setInviting(true);
        setInviteError('');
        try {
            await matrixService.getClient().invite(roomId, uid);
            setInviteId('');
            loadMembers();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Ошибка приглашения';
            setInviteError(msg);
        }
        setInviting(false);
    };

    // Тоггл бота
    const handleToggleBot = async (bot: BotInfo) => {
        setTogglingBot(bot.id);
        const prev = bot.enabledInRoom;
        // Оптимистичное обновление
        setBots(bs => bs.map(b => b.id === bot.id ? { ...b, enabledInRoom: !prev } : b));
        try {
            if (prev) {
                const res = await fetchWithAuth(`${config.botApiUrl}/bots/${bot.id}/rooms`, {
                    method: 'DELETE',
                    body: JSON.stringify({ roomId }),
                });
                if (!res.ok) throw new Error();
            } else {
                const res = await fetchWithAuth(`${config.botApiUrl}/bots/${bot.id}/rooms`, {
                    method: 'POST',
                    body: JSON.stringify({ roomId }),
                });
                if (!res.ok) throw new Error();
            }
        } catch {
            // Откат
            setBots(bs => bs.map(b => b.id === bot.id ? { ...b, enabledInRoom: prev } : b));
        }
        setTogglingBot(null);
    };

    // Удаление комнаты
    const handleDelete = async () => {
        const confirmed = window.confirm(`Удалить «${roomName}»? Это действие необратимо.`);
        if (!confirmed) return;
        try {
            await matrixService.getClient().leave(roomId);
            onClose();
        } catch { /* ошибка удаления */ }
    };

    // Данные для вкладки «Информация»
    const room = matrixService.getClient().getRoom(roomId);
    const topic = room?.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic ?? '—';
    const encrypted = room?.hasEncryptionStateEvent() ?? false;

    return (
        <div className="room-settings-overlay" onClick={onClose}>
            <div className="room-settings-modal" onClick={e => e.stopPropagation()}>
                {/* Заголовок */}
                <div className="room-settings-modal__header">
                    <span className="room-settings-modal__title">
                        Настройки: {roomName}
                    </span>
                    <button className="room-settings-modal__close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Вкладки */}
                <div className="room-settings-modal__tabs">
                    <button
                        className={`room-settings-modal__tab ${tab === 'info' ? 'room-settings-modal__tab--active' : ''}`}
                        onClick={() => setTab('info')}
                    >Информация</button>
                    <button
                        className={`room-settings-modal__tab ${tab === 'members' ? 'room-settings-modal__tab--active' : ''}`}
                        onClick={() => setTab('members')}
                    >Участники</button>
                    <button
                        className={`room-settings-modal__tab ${tab === 'bots' ? 'room-settings-modal__tab--active' : ''}`}
                        onClick={() => setTab('bots')}
                    >Боты</button>
                </div>

                {/* Контент */}
                <div className="room-settings-modal__content">
                    {/* Вкладка «Информация» */}
                    {tab === 'info' && (
                        <>
                            <div className="room-settings-modal__section">
                                <div className="room-settings-modal__section-label">Internal Room ID</div>
                                <div className="room-settings-modal__id-row">
                                    <code className="room-settings-modal__id-code">{roomId}</code>
                                    <button
                                        className={`room-settings-modal__copy-btn ${copied ? 'room-settings-modal__copy-btn--copied' : ''}`}
                                        onClick={handleCopy}
                                    >
                                        {copied ? 'Скопировано' : 'Скопировать'}
                                    </button>
                                </div>
                            </div>
                            <div className="room-settings-modal__section">
                                <div className="room-settings-modal__section-label">Название</div>
                                <div className="room-settings-modal__section-value">{roomName}</div>
                            </div>
                            <div className="room-settings-modal__section">
                                <div className="room-settings-modal__section-label">Тема</div>
                                <div className="room-settings-modal__section-value">{topic}</div>
                            </div>
                            <div className="room-settings-modal__section">
                                <div className="room-settings-modal__section-label">Тип</div>
                                <div className="room-settings-modal__section-value">{isSpace ? 'Канал' : 'Комната'}</div>
                            </div>
                            <div className="room-settings-modal__section">
                                <div className="room-settings-modal__section-label">Шифрование</div>
                                <div className="room-settings-modal__section-value">
                                    {encrypted ? '🔒 Включено' : 'Выключено'}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Вкладка «Участники» */}
                    {tab === 'members' && (
                        <>
                            {membersLoading && (
                                <div className="room-settings-modal__loading">Загрузка...</div>
                            )}
                            {!membersLoading && members.length === 0 && (
                                <div className="room-settings-modal__empty">Нет участников</div>
                            )}
                            {members.map(m => {
                                const myId = matrixService.getUserId();
                                return (
                                    <div key={m.userId} className="room-settings-modal__member-row">
                                        <div
                                            className="room-settings-modal__member-avatar"
                                            style={{ background: avatarColor(m.userId) }}
                                        >
                                            {(m.displayName || m.userId)[0].toUpperCase()}
                                        </div>
                                        <div className="room-settings-modal__member-info">
                                            <div className="room-settings-modal__member-name">{m.displayName}</div>
                                            <div className="room-settings-modal__member-id">{m.userId}</div>
                                        </div>
                                        {isAdmin && m.userId !== myId && (
                                            <button
                                                className="room-settings-modal__kick-btn"
                                                onClick={() => handleKick(m.userId)}
                                                title="Исключить"
                                            >
                                                <UserMinus size={16} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            {isAdmin && (
                                <>
                                    <div className="room-settings-modal__invite-row">
                                        <input
                                            className="room-settings-modal__invite-input"
                                            placeholder="@user:server"
                                            value={inviteId}
                                            onChange={e => setInviteId(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
                                        />
                                        <button
                                            className="room-settings-modal__invite-btn"
                                            onClick={handleInvite}
                                            disabled={inviting}
                                        >
                                            Добавить
                                        </button>
                                    </div>
                                    {inviteError && (
                                        <div className="room-settings-modal__error">{inviteError}</div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* Вкладка «Боты» */}
                    {tab === 'bots' && (
                        <>
                            {botsLoading && (
                                <div className="room-settings-modal__loading">Загрузка...</div>
                            )}
                            {botsError && (
                                <div className="room-settings-modal__error">{botsError}</div>
                            )}
                            {!botsLoading && !botsError && bots.length === 0 && (
                                <div className="room-settings-modal__empty">Нет ботов</div>
                            )}
                            {bots.map(bot => (
                                <div key={bot.id} className="room-settings-modal__bot-row">
                                    <div className="room-settings-modal__bot-info">
                                        <div className="room-settings-modal__bot-name">{bot.displayName}</div>
                                        <div className="room-settings-modal__bot-desc">{bot.description}</div>
                                    </div>
                                    <button
                                        className={`room-settings-modal__toggle ${bot.enabledInRoom ? 'room-settings-modal__toggle--on' : ''}`}
                                        onClick={() => handleToggleBot(bot)}
                                        disabled={togglingBot === bot.id}
                                    >
                                        <div className="room-settings-modal__toggle-knob" />
                                    </button>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Опасная зона */}
                {isAdmin && (
                    <div className="room-settings-modal__danger-zone">
                        <div className="room-settings-modal__danger-title">Опасная зона</div>
                        <button className="room-settings-modal__danger-btn" onClick={handleDelete}>
                            Удалить {isSpace ? 'канал' : 'комнату'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
