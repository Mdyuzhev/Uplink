import React, { useEffect } from 'react';
import { matrixService } from '../matrix/MatrixService';
import { AvatarSection } from './profile/AvatarSection';
import { NameSection } from './profile/NameSection';
import { PasswordSection } from './profile/PasswordSection';

interface ProfileModalProps {
    onClose: () => void;
    onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, onLogout }) => {
    const displayName = matrixService.users.getMyDisplayName();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="profile-modal-overlay" onClick={onClose}>
            <div className="profile-modal" onClick={e => e.stopPropagation()}>
                <div className="profile-modal__header">
                    <span className="profile-modal__title">Настройки профиля</span>
                    <button className="profile-modal__close" onClick={onClose}>✕</button>
                </div>

                <AvatarSection displayName={displayName} />
                <NameSection initialName={displayName} />

                <div className="profile-modal__divider" />
                <PasswordSection />

                <div className="profile-modal__divider" />
                <div className="profile-modal__section">
                    <button className="profile-modal__btn profile-modal__btn--danger" onClick={onLogout}>
                        Выйти из аккаунта
                    </button>
                </div>
            </div>
        </div>
    );
};
