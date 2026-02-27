import React, { useState, useEffect } from 'react';
import type { UpdateInfo } from '../utils/updater';
import '../styles/update-dialog.css';

/**
 * Модальное окно "Доступно обновление".
 * Показывается только в Tauri при наличии новой версии.
 */
export const UpdateDialog: React.FC = () => {
    const [update, setUpdate] = useState<UpdateInfo | null>(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const onAvailable = (e: Event) => {
            setUpdate((e as CustomEvent).detail);
        };
        const onProgress = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail.status === 'downloading' || detail.status === 'installing') {
                setDownloading(true);
            }
        };

        window.addEventListener('uplink:update-available', onAvailable);
        window.addEventListener('uplink:update-progress', onProgress);
        return () => {
            window.removeEventListener('uplink:update-available', onAvailable);
            window.removeEventListener('uplink:update-progress', onProgress);
        };
    }, []);

    if (!update) return null;

    const handleAccept = () => {
        window.dispatchEvent(new CustomEvent('uplink:update-response', {
            detail: { accepted: true },
        }));
    };

    const handleDecline = () => {
        window.dispatchEvent(new CustomEvent('uplink:update-response', {
            detail: { accepted: false },
        }));
        setUpdate(null);
    };

    return (
        <div className="update-dialog-overlay">
            <div className="update-dialog">
                <div className="update-dialog__icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--uplink-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </div>
                <h3 className="update-dialog__title">
                    {downloading ? 'Обновление...' : 'Доступно обновление'}
                </h3>
                <p className="update-dialog__version">Версия {update.version}</p>
                <p className="update-dialog__notes">{update.notes}</p>
                {downloading ? (
                    <div className="update-dialog__progress">
                        <div className="update-dialog__progress-bar" />
                    </div>
                ) : (
                    <div className="update-dialog__actions">
                        <button className="update-dialog__btn update-dialog__btn--later" onClick={handleDecline}>
                            Позже
                        </button>
                        <button className="update-dialog__btn update-dialog__btn--update" onClick={handleAccept}>
                            Обновить
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
