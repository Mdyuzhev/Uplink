import React, { useState } from 'react';
import { getConfig } from '../config';

interface BotCommand {
    command: string;
    description: string;
}

interface BotCreateModalProps {
    currentUserId: string;
    onCreated: () => void;
    onClose: () => void;
}

export const BotCreateModal: React.FC<BotCreateModalProps> = ({ currentUserId, onCreated, onClose }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [mode, setMode] = useState<'sdk' | 'webhook'>('sdk');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [commands, setCommands] = useState<BotCommand[]>([{ command: '', description: '' }]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Результат создания — токен показывается один раз
    const [createdToken, setCreatedToken] = useState<string | null>(null);
    const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);

    const addCommand = () => {
        setCommands([...commands, { command: '', description: '' }]);
    };

    const removeCommand = (idx: number) => {
        setCommands(commands.filter((_, i) => i !== idx));
    };

    const updateCommand = (idx: number, field: keyof BotCommand, value: string) => {
        const updated = [...commands];
        updated[idx] = { ...updated[idx], [field]: value };
        setCommands(updated);
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            setError('Введите имя бота');
            return;
        }
        if (mode === 'webhook' && !webhookUrl.trim()) {
            setError('Введите Webhook URL');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const baseUrl = getConfig().botApiUrl;
            const validCommands = commands.filter(c => c.command.trim());
            // Добавить / если нет
            const normalizedCommands = validCommands.map(c => ({
                command: c.command.startsWith('/') ? c.command : `/${c.command}`,
                description: c.description,
            }));

            const resp = await fetch(`${baseUrl}/custom-bots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim(),
                    mode,
                    webhookUrl: mode === 'webhook' ? webhookUrl.trim() : undefined,
                    commands: normalizedCommands,
                    owner: currentUserId,
                }),
            });

            if (!resp.ok) {
                const data = await resp.json();
                throw new Error(data.error || 'Ошибка создания');
            }

            const data = await resp.json();
            setCreatedToken(data.token);
            if (data.webhookSecret) {
                setCreatedWebhookSecret(data.webhookSecret);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        } finally {
            setLoading(false);
        }
    };

    const handleDone = () => {
        onCreated();
        onClose();
    };

    // Экран после создания — показать токен
    if (createdToken) {
        return (
            <div className="bot-modal-overlay" onClick={onClose}>
                <div className="bot-modal" onClick={e => e.stopPropagation()}>
                    <div className="bot-modal__header">
                        <span className="bot-modal__title">Бот создан</span>
                    </div>
                    <div className="bot-modal__body">
                        <div className="bot-modal__success">
                            <p>Бот <strong>{name}</strong> успешно создан.</p>
                            <div className="bot-modal__token-block">
                                <label>Токен (сохраните — показывается один раз):</label>
                                <code className="bot-modal__token">{createdToken}</code>
                            </div>
                            {createdWebhookSecret && (
                                <div className="bot-modal__token-block">
                                    <label>Webhook Secret (для проверки подписи):</label>
                                    <code className="bot-modal__token">{createdWebhookSecret}</code>
                                </div>
                            )}
                            {mode === 'sdk' && (
                                <div className="bot-modal__hint">
                                    <p>Подключение через SDK:</p>
                                    <pre>{`import { UplinkBot } from '@uplink/bot-sdk';

const bot = new UplinkBot({
    url: '${window.location.origin}',
    token: '${createdToken}',
});

bot.onCommand('/ping', async (ctx) => {
    await ctx.reply('pong!');
});

bot.start();`}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bot-modal__footer">
                        <button className="bot-modal__btn bot-modal__btn--primary" onClick={handleDone}>Готово</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bot-modal-overlay" onClick={onClose}>
            <div className="bot-modal" onClick={e => e.stopPropagation()}>
                <div className="bot-modal__header">
                    <span className="bot-modal__title">Создать бота</span>
                    <button className="bot-modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="bot-modal__body">
                    {error && <div className="bot-modal__error">{error}</div>}

                    <div className="bot-modal__field">
                        <label>Имя бота</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Deploy Bot"
                            autoFocus
                        />
                    </div>

                    <div className="bot-modal__field">
                        <label>Описание</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Автоматизация деплоя"
                        />
                    </div>

                    <div className="bot-modal__field">
                        <label>Режим</label>
                        <div className="bot-modal__mode-toggle">
                            <button
                                className={`bot-modal__mode-btn ${mode === 'sdk' ? 'active' : ''}`}
                                onClick={() => setMode('sdk')}
                            >
                                SDK
                            </button>
                            <button
                                className={`bot-modal__mode-btn ${mode === 'webhook' ? 'active' : ''}`}
                                onClick={() => setMode('webhook')}
                            >
                                Webhook
                            </button>
                        </div>
                        <span className="bot-modal__mode-hint">
                            {mode === 'sdk'
                                ? 'Бот подключается через WebSocket (npm-пакет @uplink/bot-sdk)'
                                : 'Uplink отправляет HTTP POST на ваш URL'
                            }
                        </span>
                    </div>

                    {mode === 'webhook' && (
                        <div className="bot-modal__field">
                            <label>Webhook URL</label>
                            <input
                                type="url"
                                value={webhookUrl}
                                onChange={e => setWebhookUrl(e.target.value)}
                                placeholder="https://my-server.com/bot-hook"
                            />
                        </div>
                    )}

                    <div className="bot-modal__field">
                        <label>Команды</label>
                        {commands.map((cmd, idx) => (
                            <div key={idx} className="bot-modal__command-row">
                                <input
                                    type="text"
                                    value={cmd.command}
                                    onChange={e => updateCommand(idx, 'command', e.target.value)}
                                    placeholder="/команда"
                                    className="bot-modal__command-input"
                                />
                                <input
                                    type="text"
                                    value={cmd.description}
                                    onChange={e => updateCommand(idx, 'description', e.target.value)}
                                    placeholder="Описание"
                                    className="bot-modal__command-desc"
                                />
                                {commands.length > 1 && (
                                    <button className="bot-modal__command-remove" onClick={() => removeCommand(idx)}>✕</button>
                                )}
                            </div>
                        ))}
                        <button className="bot-modal__add-cmd" onClick={addCommand}>+ Добавить команду</button>
                    </div>
                </div>

                <div className="bot-modal__footer">
                    <button className="bot-modal__btn" onClick={onClose}>Отмена</button>
                    <button
                        className="bot-modal__btn bot-modal__btn--primary"
                        onClick={handleCreate}
                        disabled={loading}
                    >
                        {loading ? 'Создание...' : 'Создать'}
                    </button>
                </div>
            </div>
        </div>
    );
};
