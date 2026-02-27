import React, { useState } from 'react';
import { matrixService } from '../matrix/MatrixService';

interface CreateSpaceModalProps {
    onClose: () => void;
    onCreated: () => void;
}

export const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({ onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        setError('');
        try {
            await matrixService.rooms.createSpace(name.trim(), topic.trim() || undefined);
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
                    <span className="profile-modal__title">Создать канал</span>
                    <button className="profile-modal__close" onClick={onClose}>&#x2715;</button>
                </div>
                <div className="profile-modal__section">
                    <label className="profile-modal__label">Название канала</label>
                    <input
                        className="profile-modal__input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Например: Разработка"
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
                        placeholder="О чём этот канал"
                    />
                </div>
                {error && <div className="profile-modal__error">{error}</div>}
                <button
                    className="profile-modal__btn profile-modal__btn--primary"
                    onClick={handleCreate}
                    disabled={loading || !name.trim()}
                >
                    {loading ? 'Создание...' : 'Создать канал'}
                </button>
            </div>
        </div>
    );
};
