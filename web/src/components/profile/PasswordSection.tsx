import React, { useState } from 'react';
import { matrixService } from '../../matrix/MatrixService';

export const PasswordSection: React.FC = () => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleChange = async () => {
        setError('');
        setSuccess(false);

        if (!oldPassword || !newPassword) { setError('Заполните все поля'); return; }
        if (newPassword !== confirmPassword) { setError('Пароли не совпадают'); return; }
        if (newPassword.length < 6) { setError('Минимум 6 символов'); return; }

        setSaving(true);
        try {
            await matrixService.admin.changePassword(oldPassword, newPassword);
            setSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            if (err.httpStatus === 401 || err.errcode === 'M_FORBIDDEN') {
                setError('Неверный текущий пароль');
            } else {
                setError(err.message || 'Ошибка смены пароля');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="profile-modal__section">
            <label className="profile-modal__label">Сменить пароль</label>
            <input className="profile-modal__input" type="password" value={oldPassword}
                onChange={e => setOldPassword(e.target.value)} placeholder="Текущий пароль" />
            <input className="profile-modal__input" type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} placeholder="Новый пароль" />
            <input className="profile-modal__input" type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} placeholder="Повторите новый пароль" />
            <button className="profile-modal__btn profile-modal__btn--primary"
                onClick={handleChange} disabled={saving}>
                {saving ? 'Сохранение...' : success ? '\u2713 Пароль изменён' : 'Сменить пароль'}
            </button>
            {error && <div className="profile-modal__error">{error}</div>}
        </div>
    );
};
