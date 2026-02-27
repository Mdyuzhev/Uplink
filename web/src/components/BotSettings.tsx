import React, { useState, useEffect } from 'react';
import { getConfig } from '../config';

interface BotInfo {
    id: string;
    displayName: string;
    description: string;
    commands: { command: string; description: string }[];
    enabledInRoom: boolean;
}

interface BotSettingsProps {
    roomId: string;
    onClose: () => void;
}

export const BotSettings: React.FC<BotSettingsProps> = ({ roomId, onClose }) => {
    const [bots, setBots] = useState<BotInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBots();
    }, [roomId]);

    const loadBots = async () => {
        try {
            const baseUrl = getConfig().botApiUrl;
            const resp = await fetch(`${baseUrl}/bots?roomId=${encodeURIComponent(roomId)}`);
            if (resp.ok) setBots(await resp.json());
        } catch (err) {
            console.error('Ошибка загрузки ботов:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleBot = async (botId: string, enable: boolean) => {
        const baseUrl = getConfig().botApiUrl;
        const action = enable ? 'enable' : 'disable';
        try {
            await fetch(`${baseUrl}/bots/${botId}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId }),
            });
            loadBots();
        } catch (err) {
            console.error('Ошибка переключения бота:', err);
        }
    };

    return (
        <div className="bot-settings">
            <div className="bot-settings__header">
                <span className="bot-settings__title">Боты</span>
                <button className="bot-settings__close" onClick={onClose}>✕</button>
            </div>

            {loading ? (
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
            )}
        </div>
    );
};
