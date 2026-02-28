/**
 * Сервис поиска GIF через GIPHY API (проксируется через бот-сервис).
 */

import { config } from '../config';

export interface GifResult {
    id: string;
    title: string;
    gifUrl: string;
    previewUrl: string;
    width: number;
    height: number;
}

class GifService {
    private get baseUrl() { return config.gifApiUrl; }

    /** Поиск GIF по запросу */
    async search(query: string, limit = 20, pos?: string): Promise<{ results: GifResult[]; next: string }> {
        const params = new URLSearchParams({ q: query, limit: String(limit) });
        if (pos) params.set('pos', pos);
        const resp = await fetch(`${this.baseUrl}/search?${params}`, { cache: 'no-cache' });
        if (!resp.ok) throw new Error(`GIF API: ${resp.status}`);
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message || data.error);
        return {
            results: this.parseResults(data.results || []),
            next: data.next || '',
        };
    }

    /** Популярные GIF (trending) */
    async trending(limit = 20, pos?: string): Promise<{ results: GifResult[]; next: string }> {
        const params = new URLSearchParams({ limit: String(limit) });
        if (pos) params.set('pos', pos);
        const resp = await fetch(`${this.baseUrl}/trending?${params}`, { cache: 'no-cache' });
        if (!resp.ok) throw new Error(`GIF API: ${resp.status}`);
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message || data.error);
        return {
            results: this.parseResults(data.results || []),
            next: data.next || '',
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        }).filter((g: GifResult) => g.gifUrl);
    }
}

export const gifService = new GifService();
