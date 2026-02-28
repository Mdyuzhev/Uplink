import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Clock, Plus, Settings } from 'lucide-react';
import { gifService, GifResult } from '../services/GifService';
import { stickerService, StickerPack, Sticker } from '../services/StickerService';
import { LottieSticker } from './LottieSticker';
import { matrixService } from '../matrix/MatrixService';

type Tab = 'stickers' | 'gif';

interface StickerGifPanelProps {
    roomId: string;
    onClose: () => void;
    onSendGif: (gif: GifResult) => void;
    onSendSticker: (sticker: Sticker, packId: string) => void;
    onOpenCreatePack?: () => void;
    onOpenPackManager?: () => void;
}

export const StickerGifPanel: React.FC<StickerGifPanelProps> = ({
    onClose, onSendGif, onSendSticker, onOpenCreatePack, onOpenPackManager,
}) => {
    const [tab, setTab] = useState<Tab>('gif');
    const [search, setSearch] = useState('');

    // GIF state
    const [gifs, setGifs] = useState<GifResult[]>([]);
    const [gifNextPos, setGifNextPos] = useState('');
    const [gifLoading, setGifLoading] = useState(false);

    // Sticker state
    const [packs, setPacks] = useState<StickerPack[]>([]);
    const [activePack, setActivePack] = useState<string | null>(null); // null = Недавние
    const [recentStickers, setRecentStickers] = useState<Array<{ sticker: Sticker; pack: StickerPack }>>([]);

    const [gifError, setGifError] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Закрытие при клике вне панели
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                // Не закрывать если кликнули по кнопке Smile (она сама toggle)
                const smilebtn = (e.target as HTMLElement).closest('.message-input__action-btn');
                if (!smilebtn) onClose();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Загрузка паков при открытии
    useEffect(() => {
        stickerService.getEnabledPacks().then(setPacks).catch(() => {});
        loadRecent();
    }, []);

    // Загрузка trending GIF при переключении на таб
    useEffect(() => {
        if (tab === 'gif' && gifs.length === 0 && !search) {
            loadTrendingGifs();
        }
    }, [tab]);

    // Поиск с debounce
    const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        clearTimeout(searchTimeout.current);
        if (tab === 'gif') {
            searchTimeout.current = setTimeout(() => {
                if (search.trim()) {
                    searchGifs(search);
                } else {
                    loadTrendingGifs();
                }
            }, 300);
        }
        return () => clearTimeout(searchTimeout.current);
    }, [search, tab]);

    // Escape закрывает панель
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const loadTrendingGifs = async () => {
        setGifLoading(true);
        setGifError(null);
        try {
            const data = await gifService.trending(30);
            setGifs(data.results);
            setGifNextPos(data.next);
            if (data.results.length === 0) {
                setGifError('GIF-сервис временно недоступен');
            }
        } catch {
            setGifError('Не удалось загрузить GIF');
        } finally {
            setGifLoading(false);
        }
    };

    const searchGifs = async (query: string) => {
        setGifLoading(true);
        setGifError(null);
        try {
            const data = await gifService.search(query, 30);
            setGifs(data.results);
            setGifNextPos(data.next);
        } catch {
            setGifError('Ошибка поиска GIF');
        } finally {
            setGifLoading(false);
        }
    };

    const loadMoreGifs = useCallback(async () => {
        if (!gifNextPos || gifLoading) return;
        setGifLoading(true);
        try {
            const data = search.trim()
                ? await gifService.search(search, 20, gifNextPos)
                : await gifService.trending(20, gifNextPos);
            setGifs(prev => [...prev, ...data.results]);
            setGifNextPos(data.next);
        } finally {
            setGifLoading(false);
        }
    }, [gifNextPos, gifLoading, search]);

    const loadRecent = async () => {
        const recent = stickerService.getRecent();
        try {
            const allPacks = await stickerService.getAllPacks();
            const resolved = recent.map(r => {
                const pack = allPacks.find(p => p.id === r.pack_id);
                const sticker = pack?.stickers.find(s => s.id === r.sticker_id);
                return pack && sticker ? { sticker, pack } : null;
            }).filter(Boolean) as Array<{ sticker: Sticker; pack: StickerPack }>;
            setRecentStickers(resolved);
        } catch { /* нет паков */ }
    };

    const handleSendGif = (gif: GifResult) => {
        onSendGif(gif);
        onClose();
    };

    const handleSendSticker = async (sticker: Sticker, packId: string) => {
        onSendSticker(sticker, packId);
        await stickerService.recordUsage(packId, sticker.id).catch(() => {});
        onClose();
    };

    // Стикеры для отображения
    const currentPack = packs.find(p => p.id === activePack);
    const visibleStickers: Array<Sticker & { _packId: string }> = activePack === null
        ? recentStickers.map(r => ({ ...r.sticker, _packId: r.pack.id }))
        : (currentPack?.stickers || []).map(s => ({ ...s, _packId: activePack }));

    const filteredStickers = search.trim()
        ? visibleStickers.filter(s => s.body.toLowerCase().includes(search.toLowerCase()))
        : visibleStickers;

    return (
        <div className="sticker-gif-panel" ref={panelRef}>
            {/* Табы */}
            <div className="sticker-gif-panel__tabs">
                <button
                    className={`sticker-gif-panel__tab ${tab === 'gif' ? 'sticker-gif-panel__tab--active' : ''}`}
                    onClick={() => { setTab('gif'); setSearch(''); }}
                >
                    GIF
                </button>
                <button
                    className={`sticker-gif-panel__tab ${tab === 'stickers' ? 'sticker-gif-panel__tab--active' : ''}`}
                    onClick={() => { setTab('stickers'); setSearch(''); }}
                >
                    Стикеры
                </button>
                <button className="sticker-gif-panel__close" onClick={onClose} title="Закрыть">
                    <X size={16} />
                </button>
            </div>

            {/* Поиск */}
            <div className="sticker-gif-panel__search">
                <Search size={14} className="sticker-gif-panel__search-icon" />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={tab === 'gif' ? 'Поиск GIF...' : 'Поиск стикеров...'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="sticker-gif-panel__search-input"
                />
            </div>

            {/* Контент */}
            <div
                className="sticker-gif-panel__content"
                onScroll={tab === 'gif' ? (e) => {
                    const el = e.currentTarget;
                    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
                        loadMoreGifs();
                    }
                } : undefined}
            >
                {tab === 'gif' ? (
                    <div className="sticker-gif-panel__gif-grid">
                        {gifs.map(gif => (
                            <div
                                key={gif.id}
                                className="sticker-gif-panel__gif-item"
                                onClick={() => handleSendGif(gif)}
                            >
                                <img
                                    src={gif.previewUrl}
                                    alt={gif.title}
                                    loading="lazy"
                                    style={{ aspectRatio: `${gif.width}/${gif.height}` }}
                                />
                            </div>
                        ))}
                        {gifLoading && <div className="sticker-gif-panel__loading">Загрузка...</div>}
                        {gifError && (
                            <div className="sticker-gif-panel__empty">{gifError}</div>
                        )}
                        {!gifLoading && !gifError && gifs.length === 0 && (
                            <div className="sticker-gif-panel__empty">
                                {search ? 'Ничего не найдено' : 'Загрузка GIF...'}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="sticker-gif-panel__sticker-grid">
                        {filteredStickers.map(sticker => (
                            <div
                                key={`${sticker._packId}-${sticker.id}`}
                                className="sticker-gif-panel__sticker-item"
                                onClick={() => handleSendSticker(sticker, sticker._packId)}
                                title={sticker.body}
                            >
                                {sticker.info.mimetype === 'application/json' ? (
                                    <LottieSticker
                                        url={matrixService.media.mxcToHttpDownload(sticker.url) || ''}
                                        width={72}
                                        height={72}
                                        loop={false}
                                    />
                                ) : (
                                    <img
                                        src={matrixService.media.mxcToHttp(sticker.url, 96) || ''}
                                        alt={sticker.body}
                                        loading="lazy"
                                    />
                                )}
                            </div>
                        ))}
                        {filteredStickers.length === 0 && (
                            <div className="sticker-gif-panel__empty">
                                {activePack === null
                                    ? 'Нет недавних стикеров. Выберите пак снизу.'
                                    : search ? 'Стикеры не найдены' : 'В этом паке нет стикеров'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Навигация по пакам (только стикеры) */}
            {tab === 'stickers' && (
                <div className="sticker-gif-panel__packs">
                    <button
                        className={`sticker-gif-panel__pack-btn ${activePack === null ? 'sticker-gif-panel__pack-btn--active' : ''}`}
                        onClick={() => setActivePack(null)}
                        title="Недавние"
                    >
                        <Clock size={16} />
                    </button>
                    {packs.map(pack => (
                        <button
                            key={pack.id}
                            className={`sticker-gif-panel__pack-btn ${activePack === pack.id ? 'sticker-gif-panel__pack-btn--active' : ''}`}
                            onClick={() => setActivePack(pack.id)}
                            title={pack.name}
                        >
                            {pack.thumbnail ? (
                                <img src={matrixService.media.mxcToHttp(pack.thumbnail, 48) || ''} alt={pack.name} />
                            ) : (
                                <span>{pack.name.charAt(0)}</span>
                            )}
                        </button>
                    ))}
                    <button
                        className="sticker-gif-panel__pack-btn sticker-gif-panel__pack-btn--add"
                        onClick={onOpenCreatePack}
                        title="Создать стикерпак"
                    >
                        <Plus size={16} />
                    </button>
                    {onOpenPackManager && (
                        <button
                            className="sticker-gif-panel__pack-btn"
                            onClick={onOpenPackManager}
                            title="Управление паками"
                        >
                            <Settings size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Tenor attribution */}
            {tab === 'gif' && (
                <div className="sticker-gif-panel__tenor-attr">
                    Powered by Tenor
                </div>
            )}
        </div>
    );
};
