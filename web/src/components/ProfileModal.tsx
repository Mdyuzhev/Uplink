import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { matrixService } from '../matrix/MatrixService';
import { storageGet, storageSet } from '../utils/storage';
import { AvatarSection } from './profile/AvatarSection';
import { NameSection } from './profile/NameSection';
import { PasswordSection } from './profile/PasswordSection';

interface ProfileModalProps {
    onClose: () => void;
    onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, onLogout }) => {
    const displayName = matrixService.users.getMyDisplayName();
    const [dmEncrypted, setDmEncrypted] = useState(
        () => storageGet('uplink_dm_encrypted') === 'true'
    );

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleDmEncryptedToggle = () => {
        const newValue = !dmEncrypted;
        setDmEncrypted(newValue);
        storageSet('uplink_dm_encrypted', String(newValue));
    };

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
                    <label className="profile-modal__label">Безопасность</label>
                    <label className="create-modal__toggle-row" onClick={handleDmEncryptedToggle}>
                        <span className="create-modal__toggle-label">
                            {dmEncrypted ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                            Шифровать новые личные чаты
                        </span>
                        <div className={`create-modal__toggle ${dmEncrypted ? 'create-modal__toggle--on' : ''}`}>
                            <div className="create-modal__toggle-knob" />
                        </div>
                    </label>
                    {dmEncrypted ? (
                        <div className="create-modal__toggle-warning">
                            Новые личные чаты будут зашифрованы. Боты и интеграции в них не работают.
                        </div>
                    ) : (
                        <div className="create-modal__toggle-hint">
                            Новые личные чаты создаются без шифрования. Можно включить позже в заголовке чата.
                        </div>
                    )}
                </div>

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
