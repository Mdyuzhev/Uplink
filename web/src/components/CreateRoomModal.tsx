import React, { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { matrixService } from '../matrix/MatrixService';

interface CreateRoomModalProps {
    spaceId: string;
    spaceName: string;
    onClose: () => void;
    onCreated: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ spaceId, spaceName, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [encrypted, setEncrypted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        try {
            await matrixService.rooms.createRoomInSpace(spaceId, name.trim(), topic.trim() || undefined, encrypted);
            onCreated();
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-modal__header">
                    <span className="profile-modal__title">Создать комнату в {spaceName}</span>
                    <button className="profile-modal__close" onClick={onClose}>&#x2715;</button>
                </div>
                <div className="profile-modal__section">
                    <label className="profile-modal__label">Название комнаты</label>
                    <input
                        className="profile-modal__input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Например: общее"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                </div>
                <div className="profile-modal__section">
                    <label className="profile-modal__label">Описание (необязательно)</label>
                    <input
                        className="profile-modal__input"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="О чём эта комната"
                    />
                </div>
                <div className="profile-modal__section">
                    <label className="create-modal__toggle-row" onClick={() => setEncrypted(!encrypted)}>
                        <span className="create-modal__toggle-label">
                            {encrypted ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                            Сквозное шифрование (E2E)
                        </span>
                        <div className={`create-modal__toggle ${encrypted ? 'create-modal__toggle--on' : ''}`}>
                            <div className="create-modal__toggle-knob" />
                        </div>
                    </label>
                    {encrypted ? (
                        <div className="create-modal__toggle-warning">
                            В зашифрованных комнатах встроенные боты не работают.
                            Шифрование нельзя отключить после создания комнаты.
                        </div>
                    ) : (
                        <div className="create-modal__toggle-hint">
                            Сообщения не шифруются. Боты и интеграции работают.
                        </div>
                    )}
                </div>
                {error && <div className="profile-modal__error">{error}</div>}
                <button
                    className="profile-modal__btn profile-modal__btn--primary"
                    onClick={handleCreate}
                    disabled={loading || !name.trim()}
                >
                    {loading ? 'Создание...' : 'Создать комнату'}
                </button>
            </div>
        </div>
    );
};
