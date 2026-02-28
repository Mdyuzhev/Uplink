import React, { useState, useRef } from 'react';
import { X, Upload, Trash2, Image } from 'lucide-react';
import { stickerService, Sticker, StickerInfo } from '../services/StickerService';

interface StickerDraft {
    file: File;
    previewUrl: string;
    body: string;
    uploading: boolean;
    uploaded?: { url: string; info: StickerInfo };
}

interface CreateStickerPackModalProps {
    onClose: () => void;
    onCreated: () => void;
}

export const CreateStickerPackModal: React.FC<CreateStickerPackModalProps> = ({ onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [stickers, setStickers] = useState<StickerDraft[]>([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const accepted = Array.from(files).filter(f =>
            f.type.startsWith('image/') || f.type === 'application/json' || f.name.endsWith('.json')
        );
        const drafts: StickerDraft[] = accepted.map(file => ({
            file,
            previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
            body: file.name.replace(/\.[^.]+$/, ''),
            uploading: false,
        }));
        setStickers(prev => [...prev, ...drafts]);
    };

    const removeSticker = (idx: number) => {
        setStickers(prev => {
            const next = [...prev];
            if (next[idx].previewUrl) URL.revokeObjectURL(next[idx].previewUrl);
            next.splice(idx, 1);
            return next;
        });
    };

    const updateBody = (idx: number, body: string) => {
        setStickers(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], body };
            return next;
        });
    };

    const handleCreate = async () => {
        if (!name.trim()) { setError('Введите название пака'); return; }
        if (stickers.length === 0) { setError('Добавьте хотя бы один стикер'); return; }

        setCreating(true);
        setError('');

        try {
            // Загрузить все стикеры
            const uploadedStickers: Sticker[] = [];
            for (let i = 0; i < stickers.length; i++) {
                const draft = stickers[i];
                setStickers(prev => {
                    const next = [...prev];
                    next[i] = { ...next[i], uploading: true };
                    return next;
                });

                const result = await stickerService.uploadSticker(draft.file);

                const sticker: Sticker = {
                    id: `s${i}_${Date.now()}`,
                    body: draft.body || draft.file.name,
                    url: result.url,
                    info: result.info,
                };
                uploadedStickers.push(sticker);

                setStickers(prev => {
                    const next = [...prev];
                    next[i] = { ...next[i], uploading: false, uploaded: result };
                    return next;
                });
            }

            // Обложка — первый стикер
            const thumbnail = uploadedStickers[0]?.url || '';

            await stickerService.createPack(name.trim(), uploadedStickers, thumbnail);
            onCreated();
            onClose();
        } catch (err) {
            setError(`Ошибка: ${(err as Error).message}`);
            setCreating(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="create-sticker-modal" onClick={e => e.stopPropagation()}>
                <div className="create-sticker-modal__header">
                    <h3>Создать стикерпак</h3>
                    <button className="create-sticker-modal__close" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="create-sticker-modal__body">
                    <input
                        type="text"
                        className="create-sticker-modal__name-input"
                        placeholder="Название пака..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={50}
                    />

                    {/* Зона загрузки */}
                    <div
                        className="create-sticker-modal__dropzone"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('create-sticker-modal__dropzone--active'); }}
                        onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('create-sticker-modal__dropzone--active'); }}
                        onDrop={e => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('create-sticker-modal__dropzone--active');
                            handleFiles(e.dataTransfer.files);
                        }}
                    >
                        <Upload size={24} />
                        <span>PNG, WebP, Lottie JSON — до 256x256</span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/webp,image/gif,application/json,.json"
                            multiple
                            style={{ display: 'none' }}
                            onChange={e => { handleFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        />
                    </div>

                    {/* Превью стикеров */}
                    {stickers.length > 0 && (
                        <div className="create-sticker-modal__stickers">
                            {stickers.map((s, i) => (
                                <div key={i} className="create-sticker-modal__sticker-item">
                                    <div className="create-sticker-modal__sticker-preview">
                                        {s.previewUrl ? (
                                            <img src={s.previewUrl} alt={s.body} />
                                        ) : (
                                            <div className="create-sticker-modal__lottie-placeholder">
                                                <Image size={24} />
                                                <span>Lottie</span>
                                            </div>
                                        )}
                                        {s.uploading && <div className="create-sticker-modal__uploading" />}
                                    </div>
                                    <input
                                        type="text"
                                        className="create-sticker-modal__sticker-body"
                                        value={s.body}
                                        onChange={e => updateBody(i, e.target.value)}
                                        placeholder="Описание"
                                    />
                                    <button
                                        className="create-sticker-modal__sticker-remove"
                                        onClick={() => removeSticker(i)}
                                        disabled={creating}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && <div className="create-sticker-modal__error">{error}</div>}
                </div>

                <div className="create-sticker-modal__footer">
                    <button className="create-sticker-modal__cancel" onClick={onClose} disabled={creating}>
                        Отмена
                    </button>
                    <button className="create-sticker-modal__submit" onClick={handleCreate} disabled={creating || stickers.length === 0}>
                        {creating ? 'Создание...' : `Создать (${stickers.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
};
