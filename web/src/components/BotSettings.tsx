import React, { useState, useEffect } from 'react';
import { getConfig } from '../config';
import { fetchWithAuth } from '../utils/api';
import { BotManagePanel } from './BotManagePanel';
import { BotCreateModal } from './BotCreateModal';
import { commandRegistry } from '../bots/CommandRegistry';

interface BotInfo {
    id: string;
    displayName: string;
    description: string;
    commands: { command: string; description: string }[];
    enabledInRoom: boolean;
}

interface BotSettingsProps {
    roomId: string;
    currentUserId: string;
    onClose: () => void;
}

type Tab = 'builtin' | 'custom';

export const BotSettings: React.FC<BotSettingsProps> = ({ roomId, currentUserId, onClose }) => {
    const [tab, setTab] = useState<Tab>('builtin');
    const [bots, setBots] = useState<BotInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [warning, setWarning] = useState<string | null>(null);

    useEffect(() => {
        loadBots();
    }, [roomId]);

    const loadBots = async () => {
        try {
            const baseUrl = getConfig().botApiUrl;
            const resp = await fetchWithAuth(`${baseUrl}/bots?roomId=${encodeURIComponent(roomId)}`);
            if (resp.ok) setBots(await resp.json());
        } catch (err) {
            console.error('Ошибка загрузки ботов:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleBot = async (botId: string, enable: boolean) => {
        setWarning(null);
        const baseUrl = getConfig().botApiUrl;
        const action = enable ? 'enable' : 'disable';
        try {
            const resp = await fetchWithAuth(`${baseUrl}/bots/${botId}/${action}`, {
                method: 'POST',
                body: JSON.stringify({ roomId }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                setWarning(`Ошибка: ${data.error || 'Не удалось переключить бота'}`);
            } else {
                commandRegistry.invalidate(roomId);
                if (data.warning) setWarning(data.warning);
            }
            loadBots();
        } catch {
            setWarning('Ошибка подключения к бот-сервису');
        }
    };

    return (
        <>
            <div className="bot-settings">
                <div className="bot-settings__header">
                    <span className="bot-settings__title">Боты</span>
                    <button className="bot-settings__close" onClick={onClose}>✕</button>
                </div>

                <div className="bot-settings__tabs">
                    <button
                        className={`bot-settings__tab ${tab === 'builtin' ? 'active' : ''}`}
                        onClick={() => setTab('builtin')}
                    >
                        Встроенные
                    </button>
                    <button
                        className={`bot-settings__tab ${tab === 'custom' ? 'active' : ''}`}
                        onClick={() => setTab('custom')}
                    >
                        Мои боты
                    </button>
                </div>

                {warning && (
                    <div className="create-modal__toggle-warning" style={{ margin: '0 12px 8px' }}>
                        {warning}
                    </div>
                )}

                {tab === 'builtin' ? (
                    loading ? (
                        <div className="bot-settings__loading">Загрузка...</div>
                    ) : (
                        <div className="bot-settings__list">
                            {bots.map(bot => (
                                <div key={bot.id} className="bot-settings__item">
                                    <div className="bot-settings__item-header">
                                        <span className="bot-settings__item-name">{bot.displayName}</span>
                                        <label className="bot-settings__toggle">
                                            <input
                                                type="checkbox"
                                                checked={bot.enabledInRoom}
                                                onChange={e => toggleBot(bot.id, e.target.checked)}
                                            />
                                            <span className="bot-settings__toggle-slider" />
                                        </label>
                                    </div>
                                    <p className="bot-settings__item-desc">{bot.description}</p>
                                    {bot.enabledInRoom && bot.commands.length > 0 && (
                                        <div className="bot-settings__commands">
                                            {bot.commands.map(cmd => (
                                                <div key={cmd.command} className="bot-settings__command">
                                                    <code>{cmd.command}</code>
                                                    <span>{cmd.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <BotManagePanel
                        currentUserId={currentUserId}
                        currentRoomId={roomId}
                        onCreateBot={() => setShowCreateModal(true)}
                    />
                )}
            </div>

            {showCreateModal && (
                <BotCreateModal
                    currentUserId={currentUserId}
                    currentRoomId={roomId}
                    onCreated={() => setShowCreateModal(false)}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </>
    );
};
