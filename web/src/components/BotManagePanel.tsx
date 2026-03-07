import React, { useState, useEffect } from 'react';
import { getConfig } from '../config';
import { fetchWithAuth } from '../utils/api';

interface CustomBot {
    id: string;
    name: string;
    description: string;
    mode: 'sdk' | 'webhook';
    webhookUrl: string | null;
    commands: { command: string; description: string }[];
    rooms: string[];
    status: 'online' | 'offline';
    created: number;
    lastSeen: number | null;
}

interface BotManagePanelProps {
    currentUserId: string;
    currentRoomId?: string;
    onCreateBot: () => void;
}

export const BotManagePanel: React.FC<BotManagePanelProps> = ({ currentUserId, currentRoomId, onCreateBot }) => {
    const [bots, setBots] = useState<CustomBot[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedBot, setExpandedBot] = useState<string | null>(null);

    useEffect(() => {
        loadBots();
    }, [currentUserId]);

    const loadBots = async () => {
        try {
            const baseUrl = getConfig().botApiUrl;
            const resp = await fetchWithAuth(`${baseUrl}/custom-bots?owner=${encodeURIComponent(currentUserId)}`);
            if (resp.ok) setBots(await resp.json());
        } catch (err) {
            console.error('Ошибка загрузки кастомных ботов:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (botId: string) => {
        try {
            const baseUrl = getConfig().botApiUrl;
            await fetchWithAuth(`${baseUrl}/custom-bots/${botId}`, { method: 'DELETE' });
            loadBots();
        } catch (err) {
            console.error('Ошибка удаления бота:', err);
        }
    };

    const handleRegenerateToken = async (botId: string) => {
        try {
            const baseUrl = getConfig().botApiUrl;
            const resp = await fetchWithAuth(`${baseUrl}/custom-bots/${botId}/regenerate-token`, {
                method: 'POST',
            });
            if (resp.ok) {
                const data = await resp.json();
                alert(`Новый токен (сохраните!):\n\n${data.token}`);
            }
        } catch (err) {
            console.error('Ошибка перевыпуска токена:', err);
        }
    };

    const addToCurrentRoom = async (botId: string) => {
        if (!currentRoomId) return;
        const baseUrl = getConfig().botApiUrl;
        await fetchWithAuth(`${baseUrl}/custom-bots/${botId}/rooms`, {
            method: 'POST',
            body: JSON.stringify({ roomId: currentRoomId }),
        });
        loadBots();
    };

    const removeFromRoom = async (botId: string, roomId: string) => {
        const baseUrl = getConfig().botApiUrl;
        await fetchWithAuth(`${baseUrl}/custom-bots/${botId}/rooms`, {
            method: 'DELETE',
            body: JSON.stringify({ roomId }),
        });
        loadBots();
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    if (loading) {
        return <div className="bot-manage__loading">Загрузка...</div>;
    }

    return (
        <div className="bot-manage">
            {bots.length === 0 ? (
                <div className="bot-manage__empty">
                    <p>У вас пока нет кастомных ботов</p>
                    <button className="bot-manage__create-btn" onClick={onCreateBot}>
                        + Создать бота
                    </button>
                </div>
            ) : (
                <>
                    <div className="bot-manage__list">
                        {bots.map(bot => (
                            <div key={bot.id} className="bot-manage__item">
                                <div className="bot-manage__item-header" onClick={() => setExpandedBot(expandedBot === bot.id ? null : bot.id)}>
                                    <div className="bot-manage__item-info">
                                        <span className={`bot-manage__status bot-manage__status--${bot.status}`} />
                                        <span className="bot-manage__item-name">{bot.name}</span>
                                        <span className="bot-manage__item-mode">{bot.mode}</span>
                                    </div>
                                    <span className="bot-manage__expand">{expandedBot === bot.id ? '▾' : '▸'}</span>
                                </div>

                                {bot.description && (
                                    <p className="bot-manage__item-desc">{bot.description}</p>
                                )}

                                {expandedBot === bot.id && (
                                    <div className="bot-manage__details">
                                        {bot.commands.length > 0 && (
                                            <div className="bot-manage__commands">
                                                <span className="bot-manage__label">Команды:</span>
                                                {bot.commands.map(cmd => (
                                                    <div key={cmd.command} className="bot-manage__command">
                                                        <code>{cmd.command}</code>
                                                        <span>{cmd.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="bot-manage__rooms">
                                            <span className="bot-manage__label">Активен в каналах:</span>
                                            {bot.rooms.length === 0 ? (
                                                <span className="bot-manage__rooms-empty">Не добавлен ни в один канал</span>
                                            ) : (
                                                bot.rooms.map(roomId => (
                                                    <div key={roomId} className="bot-manage__room-row">
                                                        <code className="bot-manage__room-id">{roomId}</code>
                                                        <button
                                                            className="bot-manage__room-remove"
                                                            onClick={() => removeFromRoom(bot.id, roomId)}
                                                            title="Убрать из канала"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                            {currentRoomId && !bot.rooms.includes(currentRoomId) && (
                                                <button
                                                    className="bot-manage__add-to-room"
                                                    onClick={() => addToCurrentRoom(bot.id)}
                                                >
                                                    + Добавить в этот канал
                                                </button>
                                            )}
                                            {currentRoomId && bot.rooms.includes(currentRoomId) && (
                                                <span className="bot-manage__in-room">✓ Уже в этом канале</span>
                                            )}
                                        </div>

                                        <div className="bot-manage__meta">
                                            <span>Создан: {formatDate(bot.created)}</span>
                                            {bot.mode === 'webhook' && bot.webhookUrl && (
                                                <span className="bot-manage__webhook-url" title={bot.webhookUrl}>
                                                    URL: {bot.webhookUrl.length > 40 ? bot.webhookUrl.slice(0, 40) + '...' : bot.webhookUrl}
                                                </span>
                                            )}
                                        </div>

                                        <div className="bot-manage__actions">
                                            <button className="bot-manage__action-btn" onClick={() => handleRegenerateToken(bot.id)}>
                                                Перевыпустить токен
                                            </button>
                                            <button className="bot-manage__action-btn bot-manage__action-btn--danger" onClick={() => handleDelete(bot.id)}>
                                                Удалить
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button className="bot-manage__create-btn" onClick={onCreateBot}>
                        + Создать бота
                    </button>
                </>
            )}
        </div>
    );
};
