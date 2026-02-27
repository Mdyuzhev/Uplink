import React, { useState } from 'react';
import { matrixService } from '../../matrix/MatrixService';

interface NameSectionProps {
    initialName: string;
}

export const NameSection: React.FC<NameSectionProps> = ({ initialName }) => {
    const [displayName, setDisplayName] = useState(initialName);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        const trimmed = displayName.trim();
        if (!trimmed) return;

        setSaving(true);
        setError('');
        setSuccess(false);
        try {
            await matrixService.users.setDisplayName(trimmed);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (err: any) {
            setError(err.message || 'Ошибка сохранения');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="profile-modal__section">
            <label className="profile-modal__label">Имя</label>
            <input
                className="profile-modal__input"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Введите имя"
                maxLength={100}
            />
            <button
                className="profile-modal__btn profile-modal__btn--primary"
                onClick={handleSave}
                disabled={saving || !displayName.trim()}
            >
                {saving ? 'Сохранение...' : success ? '\u2713 Сохранено' : 'Сохранить имя'}
            </button>
            {error && <div className="profile-modal__error">{error}</div>}
        </div>
    );
};
