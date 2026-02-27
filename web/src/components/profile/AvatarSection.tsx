import React, { useState, useRef, useEffect } from 'react';
import { matrixService } from '../../matrix/MatrixService';
import { Avatar } from '../Avatar';
import { resizeImage } from './resizeImage';

interface AvatarSectionProps {
    displayName: string;
}

export const AvatarSection: React.FC<AvatarSectionProps> = ({ displayName }) => {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(matrixService.users.getMyAvatarUrl());
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        matrixService.users.fetchMyAvatarUrl().then(url => {
            if (url) setAvatarUrl(url);
        });
    }, []);

    const handleClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Выберите изображение (PNG, JPG, GIF)');
            return;
        }

        setUploading(true);
        try {
            const resized = await resizeImage(file);
            setAvatarUrl(URL.createObjectURL(resized));
            await matrixService.users.setAvatar(resized);
        } catch (err: any) {
            alert('Ошибка загрузки: ' + (err.message || 'Неизвестная ошибка'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="profile-modal__avatar-section">
            <div
                className={`profile-modal__avatar ${uploading ? 'profile-modal__avatar--uploading' : ''}`}
                onClick={handleClick}
                title="Нажмите чтобы сменить фото"
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt="Аватар" className="profile-modal__avatar-img" />
                ) : (
                    <Avatar name={displayName} size={80} />
                )}
                <div className="profile-modal__avatar-overlay">
                    {uploading ? '...' : '\uD83D\uDCF7'}
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
    );
};
