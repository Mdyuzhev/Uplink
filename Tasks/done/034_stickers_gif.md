# 034 — Стикерпаки и GIF-поиск в чатах

## Контекст

Стикеры и гифки — стандартная фича любого современного мессенджера. Без них чат ощущается как корпоративная переписка 2010-х. Цель — единая панель с двумя табами (Стикеры / GIF), вызываемая из MessageInput.

**Решения:**
- GIF: Tenor API (бесплатный, без лимитов, Google-backed)
- Стикеры: хранение на своём сервере через Matrix media API (mxc:// URL)
- Создание паков: любой пользователь
- Формат стикеров: PNG, WebP, анимированные Lottie (JSON)
- История использования: да, секция «Недавние»

**Зависимости:** нет жёстких. Кнопка добавляется в MessageInput рядом с attach/send.


## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        Uplink Web UI                             │
│                                                                   │
│  MessageInput: [attach] [стикер/GIF кнопка] [textarea] [send]   │
│                         ↓                                        │
│  ┌───────────────────────────────────────────┐                   │
│  │ StickerGifPanel                            │                   │
│  │ ┌──────────┐ ┌──────────┐                 │                   │
│  │ │ Стикеры  │ │   GIF    │  ← табы         │                   │
│  │ └──────────┘ └──────────┘                 │                   │
│  │ 🔍 Поиск...                               │                   │
│  │ ┌────────────────────────────────────┐    │                   │
│  │ │ Недавние (последние 20)            │    │                   │
│  │ ├────────────────────────────────────┤    │                   │
│  │ │ [sticker] [sticker] [sticker] ...  │    │  ← стикеры: grid  │
│  │ │ [sticker] [sticker] [sticker] ...  │    │  ← GIF: masonry   │
│  │ └────────────────────────────────────┘    │                   │
│  │ [Пак1] [Пак2] [Пак3] [＋]  ← навигация  │                   │
│  └───────────────────────────────────────────┘                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
    ┌──────────────────┐     ┌────────────────────┐
    │ Matrix Synapse    │     │ Tenor API          │
    │ mxc:// media      │     │ tenor.googleapis   │
    │ account data      │     │ .com/v2/           │
    │ m.sticker events  │     │                    │
    └──────────────────┘     └────────────────────┘
```


## Часть 1. GIF-поиск через Tenor API

### 1.1. Tenor API интеграция

Tenor API v2: `https://tenor.googleapis.com/v2/`

Нужен API ключ — получается бесплатно через Google Cloud Console. Добавить в `.env`:
```
TENOR_API_KEY=AIzaSy...
```

Прокинуть через nginx (чтобы не светить ключ на клиенте):

Файл: `docker/uplink-botservice/server.mjs` (или отдельный эндпоинт в nginx/web)

Добавить proxy-эндпоинты для Tenor:

```javascript
// ═══════════════════════════════════
// Tenor GIF proxy (чтобы API ключ не утёк на клиент)
// ═══════════════════════════════════

const TENOR_KEY = process.env.TENOR_API_KEY;
const TENOR_BASE = 'https://tenor.googleapis.com/v2';
const TENOR_CLIENT_KEY = 'uplink_messenger';

app.get('/api/gif/search', async (req, res) => {
    if (!TENOR_KEY) return res.status(503).json({ error: 'Tenor API не настроен' });
    const { q, limit = 20, pos } = req.query;
    if (!q) return res.status(400).json({ error: 'q required' });
    try {
        const url = `${TENOR_BASE}/search?key=${TENOR_KEY}&client_key=${TENOR_CLIENT_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&media_filter=gif,tinygif${pos ? `&pos=${pos}` : ''}`;
        const resp = await fetch(url);
        const data = await resp.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/gif/trending', async (req, res) => {
    if (!TENOR_KEY) return res.status(503).json({ error: 'Tenor API не настроен' });
    const { limit = 20, pos } = req.query;
    try {
        const url = `${TENOR_BASE}/featured?key=${TENOR_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=${limit}&media_filter=gif,tinygif${pos ? `&pos=${pos}` : ''}`;
        const resp = await fetch(url);
        const data = await resp.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/gif/categories', async (req, res) => {
    if (!TENOR_KEY) return res.status(503).json({ error: 'Tenor API не настроен' });
    try {
        const url = `${TENOR_BASE}/categories?key=${TENOR_KEY}&client_key=${TENOR_CLIENT_KEY}`;
        const resp = await fetch(url);
        const data = await resp.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
```

Nginx проксирование (добавить рядом с `/bot-api/`):
```nginx
location /gif-api/ {
    proxy_pass http://uplink-botservice:7891/api/gif/;
}
```

### 1.2. GifService — клиентский сервис

Файл: `web/src/services/GifService.ts` (новый)

```typescript
/**
 * Сервис поиска GIF через Tenor API (проксируется через бот-сервис).
 */

export interface GifResult {
    id: string;
    title: string;
    gifUrl: string;        // полноразмерный GIF
    previewUrl: string;    // уменьшенная превью (tinygif)
    width: number;
    height: number;
}

class GifService {
    private baseUrl = '/gif-api';

    /** Поиск GIF по запросу */
    async search(query: string, limit = 20, pos?: string): Promise<{ results: GifResult[]; next: string }> {
        const params = new URLSearchParams({ q: query, limit: String(limit) });
        if (pos) params.set('pos', pos);
        const resp = await fetch(`${this.baseUrl}/search?${params}`);
        const data = await resp.json();
        return {
            results: this.parseResults(data.results || []),
            next: data.next || '',
        };
    }

    /** Популярные GIF (trending) */
    async trending(limit = 20, pos?: string): Promise<{ results: GifResult[]; next: string }> {
        const params = new URLSearchParams({ limit: String(limit) });
        if (pos) params.set('pos', pos);
        const resp = await fetch(`${this.baseUrl}/trending?${params}`);
        const data = await resp.json();
        return {
            results: this.parseResults(data.results || []),
            next: data.next || '',
        };
    }

    /** Категории GIF */
    async categories(): Promise<Array<{ searchterm: string; image: string }>> {
        const resp = await fetch(`${this.baseUrl}/categories`);
        const data = await resp.json();
        return (data.tags || []).map((t: any) => ({
            searchterm: t.searchterm,
            image: t.image,
        }));
    }

    private parseResults(results: any[]): GifResult[] {
        return results.map(r => {
            const gif = r.media_formats?.gif || {};
            const tiny = r.media_formats?.tinygif || gif;
            return {
                id: r.id,
                title: r.title || '',
                gifUrl: gif.url || '',
                previewUrl: tiny.url || gif.url || '',
                width: gif.dims?.[0] || 300,
                height: gif.dims?.[1] || 200,
            };
        }).filter(g => g.gifUrl);
    }
}

export const gifService = new GifService();
```

### 1.3. Отправка GIF как сообщение

GIF отправляется как `m.image` с URL гифки. Для self-hosted можно скачать и перезалить через Matrix media, но это +трафик. Рекомендуемый подход — отправлять URL Tenor CDN напрямую:

В MatrixService (или MessageService):
```typescript
/**
 * Отправить GIF-сообщение.
 * Отправляет как m.image с внешним URL (Tenor CDN).
 */
async sendGif(roomId: string, gifUrl: string, width: number, height: number, body: string = 'GIF'): Promise<void> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    await this.client.sendEvent(roomId, 'm.room.message' as any, {
        msgtype: 'm.image',
        body,
        url: gifUrl, // внешний URL — Matrix клиенты умеют рендерить
        info: {
            mimetype: 'image/gif',
            w: width,
            h: height,
        },
        'dev.uplink.gif': true, // маркер что это GIF (для специального рендеринга)
    });
}
```

**Альтернатива (полная автономность):** скачать GIF → `matrixService.uploadFile()` → получить `mxc://` → отправить с `mxc://` URL. Это гарантирует работу без интернета (после первой загрузки), но увеличивает расход хранилища.

Реализовать оба варианта — через конфиг:
```typescript
const REUPLOAD_GIFS = false; // true = скачать и залить на свой сервер

async sendGif(roomId: string, gif: GifResult): Promise<void> {
    let url = gif.gifUrl;

    if (REUPLOAD_GIFS) {
        // Скачать GIF и загрузить через Matrix media
        const resp = await fetch(gif.gifUrl);
        const blob = await resp.blob();
        const file = new File([blob], 'gif.gif', { type: 'image/gif' });
        url = await matrixService.uploadFile(file); // → mxc://
    }

    await this.client.sendEvent(roomId, 'm.room.message' as any, {
        msgtype: 'm.image',
        body: gif.title || 'GIF',
        url,
        info: {
            mimetype: 'image/gif',
            w: gif.width,
            h: gif.height,
        },
        'dev.uplink.gif': true,
    });
}
```


## Часть 2. Стикерпаки

### 2.1. Структура стикерпака

Стикерпак — JSON-манифест + набор медиа-файлов, загруженных в Matrix media.

```typescript
interface StickerPack {
    id: string;                  // уникальный ID (uuid)
    name: string;                // "Офисные мемы"
    author: string;              // userId создателя
    authorName: string;          // display name
    thumbnail: string;           // mxc:// URL обложки
    stickers: Sticker[];
    createdAt: number;           // timestamp
}

interface Sticker {
    id: string;                  // уникальный ID внутри пака
    body: string;                // alt-текст / emoji описание "👍 лайк"
    url: string;                 // mxc:// URL картинки
    info: {
        mimetype: string;        // "image/png" | "image/webp" | "application/json" (Lottie)
        w: number;
        h: number;
        size?: number;
    };
}
```

### 2.2. Хранение стикерпаков

Стикерпаки хранятся в **Matrix account data** — серверное хранилище привязанное к аккаунту, синхронизируется между устройствами.

**Глобальный реестр паков** (доступен всем на сервере):
- Комната-каталог `#sticker-packs:uplink.local` с state events типа `dev.uplink.sticker_pack`
- Каждый пак — отдельный state event с ключом = pack ID

```json
{
    "type": "dev.uplink.sticker_pack",
    "state_key": "pack_abc123",
    "content": {
        "name": "Офисные мемы",
        "author": "@user:uplink.local",
        "authorName": "Вася",
        "thumbnail": "mxc://uplink.local/xxxxx",
        "stickers": [
            {
                "id": "s1",
                "body": "👍 одобряю",
                "url": "mxc://uplink.local/yyyyy",
                "info": { "mimetype": "image/webp", "w": 256, "h": 256 }
            }
        ],
        "created_at": 1709000000000
    }
}
```

**Пользовательские предпочтения** (какие паки включены у конкретного юзера):
- Account data `dev.uplink.sticker_prefs`:
```json
{
    "type": "dev.uplink.sticker_prefs",
    "content": {
        "enabled_packs": ["pack_abc123", "pack_def456"],
        "recent": [
            { "pack_id": "pack_abc123", "sticker_id": "s1", "ts": 1709000000 },
            { "pack_id": "pack_abc123", "sticker_id": "s3", "ts": 1709000100 }
        ]
    }
}
```

### 2.3. StickerService — серверная логика

Файл: `web/src/services/StickerService.ts` (новый)

```typescript
/**
 * Сервис стикерпаков.
 * Паки хранятся как state events в комнате-каталоге.
 * Предпочтения пользователя — в account data.
 */

import { matrixService } from '../matrix/MatrixService';

const STICKER_ROOM_ALIAS = '#sticker-packs:uplink.local';
const STICKER_PACK_EVENT = 'dev.uplink.sticker_pack';
const STICKER_PREFS_EVENT = 'dev.uplink.sticker_prefs';
const MAX_RECENT = 30;

class StickerService {
    private catalogRoomId: string | null = null;

    /** Получить или создать комнату-каталог стикерпаков */
    async getCatalogRoomId(): Promise<string> {
        if (this.catalogRoomId) return this.catalogRoomId;
        const client = matrixService.getClient();

        // Попробовать найти по алиасу
        try {
            const resp = await client.getRoomIdForAlias(STICKER_ROOM_ALIAS);
            this.catalogRoomId = resp.room_id;
            return this.catalogRoomId;
        } catch {
            // Комнаты нет — создать
        }

        const room = await client.createRoom({
            name: 'Стикерпаки',
            room_alias_name: 'sticker-packs',
            visibility: 'private' as any,
            preset: 'public_chat' as any,
            initial_state: [
                {
                    type: 'm.room.join_rules',
                    state_key: '',
                    content: { join_rule: 'public' },
                },
            ],
        });
        this.catalogRoomId = room.room_id;
        return this.catalogRoomId;
    }

    /** Загрузить все доступные стикерпаки */
    async getAllPacks(): Promise<StickerPack[]> {
        const roomId = await this.getCatalogRoomId();
        const client = matrixService.getClient();
        const room = client.getRoom(roomId);
        if (!room) return [];

        const events = room.currentState.getStateEvents(STICKER_PACK_EVENT);
        return events.map(e => ({
            id: e.getStateKey()!,
            ...e.getContent(),
        })) as StickerPack[];
    }

    /** Получить включённые паки текущего пользователя */
    async getEnabledPacks(): Promise<StickerPack[]> {
        const allPacks = await this.getAllPacks();
        const prefs = this.getPrefs();
        const enabledIds = prefs.enabled_packs || [];

        // Если у пользователя нет предпочтений — показать все
        if (enabledIds.length === 0) return allPacks;

        return allPacks.filter(p => enabledIds.includes(p.id));
    }

    /** Создать новый стикерпак */
    async createPack(name: string, stickers: Sticker[], thumbnailMxc: string): Promise<string> {
        const roomId = await this.getCatalogRoomId();
        const client = matrixService.getClient();
        const packId = `pack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        await client.sendStateEvent(roomId, STICKER_PACK_EVENT as any, {
            name,
            author: client.getUserId()!,
            authorName: matrixService.getDisplayName(client.getUserId()!),
            thumbnail: thumbnailMxc,
            stickers,
            created_at: Date.now(),
        }, packId);

        // Автоматически включить пак у создателя
        const prefs = this.getPrefs();
        prefs.enabled_packs = [...(prefs.enabled_packs || []), packId];
        await this.setPrefs(prefs);

        return packId;
    }

    /** Удалить стикерпак (только автор) */
    async deletePack(packId: string): Promise<void> {
        const roomId = await this.getCatalogRoomId();
        const client = matrixService.getClient();
        // Отправить пустой state event — удаляет пак
        await client.sendStateEvent(roomId, STICKER_PACK_EVENT as any, {}, packId);
    }

    /** Включить/выключить пак у текущего пользователя */
    async togglePack(packId: string, enabled: boolean): Promise<void> {
        const prefs = this.getPrefs();
        const packs = new Set(prefs.enabled_packs || []);
        if (enabled) packs.add(packId); else packs.delete(packId);
        prefs.enabled_packs = [...packs];
        await this.setPrefs(prefs);
    }

    /** Записать использование стикера (для "Недавних") */
    async recordUsage(packId: string, stickerId: string): Promise<void> {
        const prefs = this.getPrefs();
        const recent = prefs.recent || [];
        // Убрать дубликат
        const filtered = recent.filter(
            (r: any) => !(r.pack_id === packId && r.sticker_id === stickerId)
        );
        // Добавить в начало
        filtered.unshift({ pack_id: packId, sticker_id: stickerId, ts: Date.now() });
        // Лимит
        prefs.recent = filtered.slice(0, MAX_RECENT);
        await this.setPrefs(prefs);
    }

    /** Получить недавно использованные стикеры */
    getRecent(): Array<{ pack_id: string; sticker_id: string; ts: number }> {
        const prefs = this.getPrefs();
        return prefs.recent || [];
    }

    /** Отправить стикер в комнату */
    async sendSticker(roomId: string, sticker: Sticker): Promise<void> {
        const client = matrixService.getClient();
        await client.sendEvent(roomId, 'm.sticker' as any, {
            body: sticker.body,
            url: sticker.url,
            info: sticker.info,
        });
    }

    // --- Account data helpers ---

    private getPrefs(): any {
        const client = matrixService.getClient();
        const event = client.getAccountData(STICKER_PREFS_EVENT);
        return event?.getContent() || { enabled_packs: [], recent: [] };
    }

    private async setPrefs(prefs: any): Promise<void> {
        const client = matrixService.getClient();
        await client.setAccountData(STICKER_PREFS_EVENT, prefs);
    }
}

export const stickerService = new StickerService();
```

### 2.4. Загрузка стикеров (upload flow)

При создании пака пользователь загружает картинки. Каждая загружается через Matrix media API:

```typescript
async uploadSticker(file: File): Promise<{ url: string; info: StickerInfo }> {
    const mxcUrl = await matrixService.uploadFile(file);

    // Для Lottie — парсить JSON, получить размеры
    let width = 256, height = 256;
    let mimetype = file.type;

    if (file.name.endsWith('.json') || file.type === 'application/json') {
        mimetype = 'application/json'; // Lottie
        try {
            const text = await file.text();
            const lottie = JSON.parse(text);
            width = lottie.w || 256;
            height = lottie.h || 256;
        } catch {}
    } else {
        // Для изображений — получить размеры через Image
        const dims = await getImageDimensions(file);
        width = dims.width;
        height = dims.height;
    }

    return {
        url: mxcUrl,
        info: { mimetype, w: width, h: height, size: file.size },
    };
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 256, height: 256 });
        img.src = URL.createObjectURL(file);
    });
}
```


## Часть 3. Lottie-стикеры (анимированные)

### 3.1. Зависимость

```bash
npm install lottie-react
```

`lottie-react` — React-обёртка над lottie-web. Tree-shakeable, ~50KB gzip.

### 3.2. Компонент LottieSticker

Файл: `web/src/components/LottieSticker.tsx` (новый)

```tsx
import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { matrixService } from '../matrix/MatrixService';

interface LottieStickerProps {
    mxcUrl: string;
    width?: number;
    height?: number;
    loop?: boolean;
    className?: string;
}

export const LottieSticker: React.FC<LottieStickerProps> = ({
    mxcUrl, width = 200, height = 200, loop = true, className
}) => {
    const [animationData, setAnimationData] = useState<any>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const httpUrl = matrixService.mxcToHttp(mxcUrl);
                const resp = await fetch(httpUrl);
                const data = await resp.json();
                if (!cancelled) setAnimationData(data);
            } catch (err) {
                console.error('Ошибка загрузки Lottie:', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [mxcUrl]);

    if (!animationData) {
        return <div className="lottie-sticker__placeholder" style={{ width, height }} />;
    }

    return (
        <Lottie
            animationData={animationData}
            loop={loop}
            style={{ width, height }}
            className={className}
        />
    );
};
```

### 3.3. Рендеринг стикера в MessageBubble

В MessageBubble — обработка `m.sticker` event:

```tsx
// Определить тип стикера
if (message.type === 'm.sticker') {
    const mimetype = message.content?.info?.mimetype;
    const url = message.content?.url;
    const width = Math.min(message.content?.info?.w || 200, 200);
    const height = Math.min(message.content?.info?.h || 200, 200);

    if (mimetype === 'application/json' && url) {
        // Lottie анимированный стикер
        return <LottieSticker mxcUrl={url} width={width} height={height} />;
    } else if (url) {
        // PNG/WebP статичный стикер
        return (
            <img
                src={matrixService.mxcToHttp(url)}
                alt={message.content?.body || 'Стикер'}
                className="sticker-image"
                style={{ maxWidth: width, maxHeight: height }}
            />
        );
    }
}
```


## Часть 4. UI — StickerGifPanel

### 4.1. Единая панель

Файл: `web/src/components/StickerGifPanel.tsx` (новый)

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gifService, GifResult } from '../services/GifService';
import { stickerService, StickerPack, Sticker } from '../services/StickerService';
import { LottieSticker } from './LottieSticker';
import { matrixService } from '../matrix/MatrixService';

type Tab = 'stickers' | 'gif';

interface StickerGifPanelProps {
    roomId: string;
    onClose: () => void;
}

export const StickerGifPanel: React.FC<StickerGifPanelProps> = ({ roomId, onClose }) => {
    const [tab, setTab] = useState<Tab>('stickers');
    const [search, setSearch] = useState('');

    // === GIF state ===
    const [gifs, setGifs] = useState<GifResult[]>([]);
    const [gifNextPos, setGifNextPos] = useState('');
    const [gifLoading, setGifLoading] = useState(false);

    // === Sticker state ===
    const [packs, setPacks] = useState<StickerPack[]>([]);
    const [activePack, setActivePack] = useState<string | null>(null); // null = Недавние
    const [recentStickers, setRecentStickers] = useState<Array<{ sticker: Sticker; pack: StickerPack }>>([]);

    // Загрузка паков при открытии
    useEffect(() => {
        stickerService.getEnabledPacks().then(setPacks);
        loadRecent();
    }, []);

    // Загрузка GIF trending при переключении на таб
    useEffect(() => {
        if (tab === 'gif' && gifs.length === 0 && !search) {
            loadTrendingGifs();
        }
    }, [tab]);

    // Поиск с debounce
    const searchTimeout = useRef<NodeJS.Timeout>();
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
        // Для стикеров — фильтрация на клиенте
    }, [search, tab]);

    const loadTrendingGifs = async () => {
        setGifLoading(true);
        try {
            const data = await gifService.trending(30);
            setGifs(data.results);
            setGifNextPos(data.next);
        } finally {
            setGifLoading(false);
        }
    };

    const searchGifs = async (query: string) => {
        setGifLoading(true);
        try {
            const data = await gifService.search(query, 30);
            setGifs(data.results);
            setGifNextPos(data.next);
        } finally {
            setGifLoading(false);
        }
    };

    // Бесконечная прокрутка GIF
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
        const allPacks = await stickerService.getAllPacks();
        const resolved = recent.map(r => {
            const pack = allPacks.find(p => p.id === r.pack_id);
            const sticker = pack?.stickers.find(s => s.id === r.sticker_id);
            return pack && sticker ? { sticker, pack } : null;
        }).filter(Boolean) as Array<{ sticker: Sticker; pack: StickerPack }>;
        setRecentStickers(resolved);
    };

    // === Отправка ===

    const handleSendGif = async (gif: GifResult) => {
        await matrixService.sendGif(roomId, gif);
        onClose();
    };

    const handleSendSticker = async (sticker: Sticker, packId: string) => {
        await stickerService.sendSticker(roomId, sticker);
        await stickerService.recordUsage(packId, sticker.id);
        onClose();
    };

    // === Рендер ===

    const currentPack = packs.find(p => p.id === activePack);
    const visibleStickers = activePack === null
        ? recentStickers.map(r => ({ ...r.sticker, _packId: r.pack.id }))
        : (currentPack?.stickers || []).map(s => ({ ...s, _packId: activePack }));

    // Фильтрация стикеров по поиску
    const filteredStickers = search.trim()
        ? visibleStickers.filter(s => s.body.toLowerCase().includes(search.toLowerCase()))
        : visibleStickers;

    return (
        <div className="sticker-gif-panel">
            {/* Табы */}
            <div className="sticker-gif-panel__tabs">
                <button
                    className={`sticker-gif-panel__tab ${tab === 'stickers' ? 'sticker-gif-panel__tab--active' : ''}`}
                    onClick={() => setTab('stickers')}
                >
                    Стикеры
                </button>
                <button
                    className={`sticker-gif-panel__tab ${tab === 'gif' ? 'sticker-gif-panel__tab--active' : ''}`}
                    onClick={() => setTab('gif')}
                >
                    GIF
                </button>
            </div>

            {/* Поиск */}
            <div className="sticker-gif-panel__search">
                <input
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
                                        mxcUrl={sticker.url}
                                        width={80}
                                        height={80}
                                        loop={false}
                                    />
                                ) : (
                                    <img
                                        src={matrixService.mxcToHttp(sticker.url)}
                                        alt={sticker.body}
                                        loading="lazy"
                                    />
                                )}
                            </div>
                        ))}
                        {filteredStickers.length === 0 && (
                            <div className="sticker-gif-panel__empty">
                                {activePack === null ? 'Нет недавних стикеров' : 'Стикеры не найдены'}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Навигация по пакам (только для стикеров) */}
            {tab === 'stickers' && (
                <div className="sticker-gif-panel__packs">
                    <button
                        className={`sticker-gif-panel__pack-btn ${activePack === null ? 'sticker-gif-panel__pack-btn--active' : ''}`}
                        onClick={() => setActivePack(null)}
                        title="Недавние"
                    >
                        🕐
                    </button>
                    {packs.map(pack => (
                        <button
                            key={pack.id}
                            className={`sticker-gif-panel__pack-btn ${activePack === pack.id ? 'sticker-gif-panel__pack-btn--active' : ''}`}
                            onClick={() => setActivePack(pack.id)}
                            title={pack.name}
                        >
                            {pack.thumbnail ? (
                                <img src={matrixService.mxcToHttp(pack.thumbnail)} alt={pack.name} />
                            ) : (
                                pack.name.charAt(0)
                            )}
                        </button>
                    ))}
                    <button
                        className="sticker-gif-panel__pack-btn sticker-gif-panel__pack-btn--add"
                        onClick={() => {/* открыть CreateStickerPackModal */}}
                        title="Создать стикерпак"
                    >
                        ＋
                    </button>
                </div>
            )}

            {/* Tenor attribution (обязательно по ToS) */}
            {tab === 'gif' && (
                <div className="sticker-gif-panel__tenor-attr">
                    Powered by Tenor
                </div>
            )}
        </div>
    );
};
```


### 4.2. CreateStickerPackModal — создание пака

Файл: `web/src/components/CreateStickerPackModal.tsx` (новый)

```tsx
interface CreateStickerPackModalProps {
    onClose: () => void;
    onCreated: () => void;
}

// UI:
// 1. Название пака (input)
// 2. Зона загрузки файлов (drag-and-drop + кнопка)
//    Поддержка: PNG, WebP, JSON (Lottie)
//    Превью загруженных стикеров в виде сетки
//    Для каждого стикера — поле "alt-текст / описание"
// 3. Обложка — первый стикер автоматически или выбор
// 4. Кнопка "Создать пак"
//
// При создании:
// - Каждый файл → matrixService.uploadFile() → mxc://
// - Собрать массив Sticker[]
// - stickerService.createPack(name, stickers, thumbnailMxc)
```


### 4.3. StickerPackManager — управление паками

Файл: `web/src/components/StickerPackManager.tsx` (новый)

Доступна через кнопку ⚙ в панели стикеров или из ProfileModal. Показывает:
- Все доступные паки на сервере (с тоглом вкл/выкл)
- Мои паки (с кнопкой удалить)
- Кнопка «Создать пак»


## Часть 5. MessageInput — кнопка открытия панели

Файл: `web/src/components/MessageInput.tsx`

Кнопка между attach и textarea:

```tsx
<button
    className="message-input__sticker-btn"
    onClick={() => setShowStickerPanel(!showStickerPanel)}
    title="Стикеры и GIF"
>
    😊
</button>

{showStickerPanel && (
    <div className="message-input__sticker-panel-container">
        <StickerGifPanel
            roomId={roomId}
            onClose={() => setShowStickerPanel(false)}
        />
    </div>
)}
```

Панель позиционируется абсолютно, над полем ввода (аналогично emoji-picker или command-suggestions).


## Часть 6. MessageBubble — рендеринг стикеров и GIF

Файл: `web/src/components/MessageBubble.tsx`

### Стикеры (m.sticker)

Стикеры рендерятся без «пузыря» — просто картинка/анимация:

```tsx
if (eventType === 'm.sticker') {
    return (
        <div className="message-bubble message-bubble--sticker">
            {/* Только аватар + время, без фона пузыря */}
            <Avatar ... />
            <div className="message-bubble__sticker-content">
                {renderSticker(content)}
                <span className="message-bubble__time">{time}</span>
            </div>
        </div>
    );
}
```

### GIF (m.image с маркером dev.uplink.gif)

GIF рендерится в пузыре, но с бо́льшим размером и без padding:

```tsx
if (content?.['dev.uplink.gif'] || isGifUrl(content?.url)) {
    return (
        <div className="message-bubble__gif">
            <img src={imageUrl} alt="GIF" loading="lazy" />
        </div>
    );
}
```

### Lottie в timeline

Для Lottie-стикеров в timeline: автоплей loop при видимости, пауза при скролле за viewport (опционально, для экономии CPU). Intersection Observer:

```tsx
const [isVisible, setIsVisible] = useState(false);
const stickerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
    const observer = new IntersectionObserver(
        ([entry]) => setIsVisible(entry.isIntersecting),
        { threshold: 0.5 }
    );
    if (stickerRef.current) observer.observe(stickerRef.current);
    return () => observer.disconnect();
}, []);
```


## Часть 7. CSS

Файл: `web/src/styles/stickers.css` (новый)

```css
/* ═══════════════════════════════════
   STICKER & GIF PANEL
   ═══════════════════════════════════ */
.sticker-gif-panel {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    max-width: 420px;
    height: 380px;
    background: var(--uplink-bg-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--uplink-radius-lg);
    margin-bottom: 4px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 15;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
}

/* Табы */
.sticker-gif-panel__tabs {
    display: flex;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
}

.sticker-gif-panel__tab {
    flex: 1;
    padding: 10px;
    background: none;
    border: none;
    color: var(--uplink-text-muted);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
}

.sticker-gif-panel__tab--active {
    color: var(--uplink-accent);
    border-bottom-color: var(--uplink-accent);
}

/* Поиск */
.sticker-gif-panel__search {
    padding: 8px;
    flex-shrink: 0;
}

.sticker-gif-panel__search-input {
    width: 100%;
    background: var(--uplink-input-bg);
    border: none;
    border-radius: var(--uplink-radius-md);
    padding: 8px 12px;
    color: var(--uplink-text-primary);
    font-size: 14px;
    outline: none;
}

.sticker-gif-panel__search-input::placeholder {
    color: var(--uplink-text-faint);
}

/* Контент — скролл */
.sticker-gif-panel__content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px 8px;
}

/* GIF сетка — masonry через columns */
.sticker-gif-panel__gif-grid {
    columns: 2;
    column-gap: 4px;
}

.sticker-gif-panel__gif-item {
    break-inside: avoid;
    margin-bottom: 4px;
    border-radius: var(--uplink-radius-sm);
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.1s;
}

.sticker-gif-panel__gif-item:hover {
    transform: scale(1.03);
    opacity: 0.85;
}

.sticker-gif-panel__gif-item img {
    width: 100%;
    display: block;
}

/* Стикер сетка — ровный grid */
.sticker-gif-panel__sticker-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
}

.sticker-gif-panel__sticker-item {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: var(--uplink-radius-sm);
    padding: 4px;
    transition: background 0.1s, transform 0.1s;
}

.sticker-gif-panel__sticker-item:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: scale(1.1);
}

.sticker-gif-panel__sticker-item img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.sticker-gif-panel__empty {
    text-align: center;
    padding: 40px 20px;
    color: var(--uplink-text-faint);
    font-size: 13px;
}

.sticker-gif-panel__loading {
    text-align: center;
    padding: 12px;
    color: var(--uplink-text-faint);
    font-size: 12px;
}

/* Навигация по пакам */
.sticker-gif-panel__packs {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    overflow-x: auto;
    flex-shrink: 0;
}

.sticker-gif-panel__pack-btn {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: var(--uplink-radius-sm);
    cursor: pointer;
    font-size: 16px;
    color: var(--uplink-text-muted);
    transition: background 0.1s;
}

.sticker-gif-panel__pack-btn:hover {
    background: rgba(255, 255, 255, 0.06);
}

.sticker-gif-panel__pack-btn--active {
    background: rgba(88, 101, 242, 0.15);
    color: var(--uplink-accent);
}

.sticker-gif-panel__pack-btn img {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    object-fit: cover;
}

.sticker-gif-panel__pack-btn--add {
    color: var(--uplink-text-faint);
    font-size: 18px;
}

.sticker-gif-panel__tenor-attr {
    text-align: center;
    padding: 4px;
    font-size: 10px;
    color: var(--uplink-text-faint);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
}

/* ═══════════════════════════════════
   СТИКЕР в timeline (без пузыря)
   ═══════════════════════════════════ */
.message-bubble--sticker {
    background: none !important;
    border: none !important;
    box-shadow: none !important;
}

.message-bubble__sticker-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.sticker-image {
    max-width: 200px;
    max-height: 200px;
    border-radius: var(--uplink-radius-md);
}

.lottie-sticker__placeholder {
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--uplink-radius-md);
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
}

/* GIF в timeline */
.message-bubble__gif {
    border-radius: var(--uplink-radius-md);
    overflow: hidden;
    max-width: 350px;
}

.message-bubble__gif img {
    width: 100%;
    display: block;
}

/* Кнопка стикеров в MessageInput */
.message-input__sticker-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: var(--uplink-radius-sm);
    color: var(--uplink-text-faint);
    transition: color 0.15s;
}

.message-input__sticker-btn:hover {
    color: var(--uplink-text-primary);
}

/* Mobile */
@media (max-width: 768px) {
    .sticker-gif-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-width: 100%;
        height: 50vh;
        border-radius: var(--uplink-radius-lg) var(--uplink-radius-lg) 0 0;
        margin-bottom: 0;
    }

    .sticker-gif-panel__sticker-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}
```


## Порядок реализации

### Фаза 1: GIF (быстрая победа)
1. Получить Tenor API ключ, добавить в `.env`
2. **Tenor proxy** — эндпоинты в botservice (search, trending, categories)
3. **GifService.ts** — клиентский сервис поиска
4. **StickerGifPanel.tsx** — только таб GIF (стикеры — заглушка "скоро")
5. **MessageInput** — кнопка 😊, открытие панели
6. **MatrixService** — sendGif
7. **MessageBubble** — рендеринг GIF (m.image с маркером)
8. **CSS** — стили панели, GIF-сетка, GIF в timeline
9. **nginx** — проксирование `/gif-api/`
10. **Тест** — поиск, trending, отправка, отображение

### Фаза 2: Стикерпаки (PNG/WebP)
11. **StickerService.ts** — CRUD паков, account data preferences, recent
12. Комната-каталог `#sticker-packs:uplink.local` — автосоздание
13. **StickerGifPanel** — таб Стикеры: навигация по пакам, сетка, отправка
14. **CreateStickerPackModal** — загрузка файлов, создание пака
15. **StickerPackManager** — управление (вкл/выкл, удаление своих)
16. **MessageBubble** — рендеринг m.sticker (без пузыря, как в Telegram)
17. **Тест** — создать пак (3-5 PNG), отправить стикер, видно у другого юзера

### Фаза 3: Lottie (анимированные стикеры)
18. `npm install lottie-react`
19. **LottieSticker.tsx** — компонент с загрузкой JSON из mxc://
20. **MessageBubble** — обработка Lottie-стикеров (mimetype = application/json)
21. **CreateStickerPackModal** — поддержка загрузки .json файлов
22. **Intersection Observer** — пауза анимации вне viewport (оптимизация CPU)
23. **Тест** — загрузить Lottie-пак, отправить, анимация в timeline

### Фаза 4: Полировка
24. **Недавние** — секция 🕐 в стикерах (recordUsage + getRecent)
25. **GIF недавние** — localStorage, последние 20 отправленных
26. **Tenor attribution** — "Powered by Tenor" (обязательно по ToS)
27. **Keyboard** — Escape закрывает панель, стрелки навигация
28. **Lazy loading** — стикеры грузятся при скролле к паку


## Файлы

Новые:
- `web/src/services/GifService.ts` — поиск GIF через Tenor
- `web/src/services/StickerService.ts` — CRUD стикерпаков, preferences
- `web/src/components/StickerGifPanel.tsx` — единая панель с табами
- `web/src/components/LottieSticker.tsx` — рендер Lottie-анимаций
- `web/src/components/CreateStickerPackModal.tsx` — создание пака
- `web/src/components/StickerPackManager.tsx` — управление паками
- `web/src/styles/stickers.css` — все стили стикеров и GIF

Изменяемые:
- `docker/uplink-botservice/server.mjs` — Tenor proxy эндпоинты
- `docker/.env` — TENOR_API_KEY
- `web/nginx.conf` — /gif-api/ проксирование
- `web/src/components/MessageInput.tsx` — кнопка 😊, StickerGifPanel
- `web/src/components/MessageBubble.tsx` — рендеринг m.sticker, GIF
- `web/src/matrix/MessageService.ts` — sendGif, sendSticker
- `web/src/hooks/useMessages.ts` — обработка m.sticker events


## Зависимости (npm)

```
lottie-react    — рендеринг Lottie-анимаций (~50KB gzip)
```


## Коммиты

```
[chat] GIF-поиск: Tenor API proxy, GifService, панель поиска, отправка и рендеринг
[chat] Стикерпаки: StickerService, хранение в Matrix, панель навигации, отправка
[chat] Создание стикерпаков: upload flow, CreateStickerPackModal, управление паками
[chat] Lottie-стикеры: LottieSticker компонент, поддержка JSON-анимаций
[chat] Недавние стикеры/GIF, Tenor attribution, полировка UX
```
