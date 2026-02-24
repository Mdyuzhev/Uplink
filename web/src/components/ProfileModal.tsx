import React, { useState, useRef, useEffect } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { Avatar } from './Avatar';

interface ProfileModalProps {
    onClose: () => void;
    onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, onLogout }) => {
    // === Display Name ===
    const [displayName, setDisplayName] = useState(matrixService.getMyDisplayName());
    const [nameSaving, setNameSaving] = useState(false);
    const [nameSuccess, setNameSuccess] = useState(false);
    const [nameError, setNameError] = useState('');

    // === Avatar ===
    const [avatarUrl, setAvatarUrl] = useState<string | null>(matrixService.getMyAvatarUrl());
    const [avatarUploading, setAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // === Password ===
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdSaving, setPwdSaving] = useState(false);
    const [pwdSuccess, setPwdSuccess] = useState(false);
    const [pwdError, setPwdError] = useState('');

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSaveName = async () => {
        const trimmed = displayName.trim();
        if (!trimmed) return;

        setNameSaving(true);
        setNameError('');
        setNameSuccess(false);
        try {
            await matrixService.setDisplayName(trimmed);
            setNameSuccess(true);
            setTimeout(() => setNameSuccess(false), 2000);
        } catch (err: any) {
            setNameError(err.message || 'Ошибка сохранения');
        } finally {
            setNameSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Выберите изображение (PNG, JPG, GIF)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Максимальный размер — 5 МБ');
            return;
        }

        setAvatarUploading(true);
        try {
            await matrixService.setAvatar(file);
            setTimeout(() => {
                setAvatarUrl(matrixService.getMyAvatarUrl());
            }, 1000);
        } catch (err: any) {
            alert('Ошибка загрузки: ' + (err.message || 'Неизвестная ошибка'));
        } finally {
            setAvatarUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleChangePassword = async () => {
        setPwdError('');
        setPwdSuccess(false);

        if (!oldPassword || !newPassword) {
            setPwdError('Заполните все поля');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwdError('Пароли не совпадают');
            return;
        }
        if (newPassword.length < 6) {
            setPwdError('Минимум 6 символов');
            return;
        }

        setPwdSaving(true);
        try {
            await matrixService.changePassword(oldPassword, newPassword);
            setPwdSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPwdSuccess(false), 3000);
        } catch (err: any) {
            if (err.httpStatus === 401 || err.errcode === 'M_FORBIDDEN') {
                setPwdError('Неверный текущий пароль');
            } else {
                setPwdError(err.message || 'Ошибка смены пароля');
            }
        } finally {
            setPwdSaving(false);
        }
    };

    return (
        <div className="profile-modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-modal__header">
                    <span className="profile-modal__title">Настройки профиля</span>
                    <button className="profile-modal__close" onClick={onClose}>✕</button>
                </div>

                {/* Аватар */}
                <div className="profile-modal__avatar-section">
                    <div
                        className={`profile-modal__avatar ${avatarUploading ? 'profile-modal__avatar--uploading' : ''}`}
                        onClick={handleAvatarClick}
                        title="Нажмите чтобы сменить фото"
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Аватар" className="profile-modal__avatar-img" />
                        ) : (
                            <Avatar name={displayName} size={80} />
                        )}
                        <div className="profile-modal__avatar-overlay">
                            {avatarUploading ? '...' : '\uD83D\uDCF7'}
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <div className="profile-modal__avatar-hint">Нажмите чтобы сменить фото</div>
                </div>

                {/* Имя */}
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
                        onClick={handleSaveName}
                        disabled={nameSaving || !displayName.trim()}
                    >
                        {nameSaving ? 'Сохранение...' : nameSuccess ? '\u2713 Сохранено' : 'Сохранить имя'}
                    </button>
                    {nameError && <div className="profile-modal__error">{nameError}</div>}
                </div>

                <div className="profile-modal__divider" />

                {/* Смена пароля */}
                <div className="profile-modal__section">
                    <label className="profile-modal__label">Сменить пароль</label>
                    <input
                        className="profile-modal__input"
                        type="password"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder="Текущий пароль"
                    />
                    <input
                        className="profile-modal__input"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Новый пароль"
                    />
                    <input
                        className="profile-modal__input"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Повторите новый пароль"
                    />
                    <button
                        className="profile-modal__btn profile-modal__btn--primary"
                        onClick={handleChangePassword}
                        disabled={pwdSaving}
                    >
                        {pwdSaving ? 'Сохранение...' : pwdSuccess ? '\u2713 Пароль изменён' : 'Сменить пароль'}
                    </button>
                    {pwdError && <div className="profile-modal__error">{pwdError}</div>}
                </div>

                <div className="profile-modal__divider" />

                {/* Выход */}
                <div className="profile-modal__section">
                    <button
                        className="profile-modal__btn profile-modal__btn--danger"
                        onClick={onLogout}
                    >
                        Выйти из аккаунта
                    </button>
                </div>
            </div>
        </div>
    );
};
