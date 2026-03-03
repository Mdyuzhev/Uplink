/**
 * GIF proxy — GIPHY API (API ключ не утекает на клиент).
 * Tenor sunset 30.06.2026, перешли на GIPHY.
 */

import { Router } from 'express';

const router = Router();

const GIPHY_KEY = process.env.GIPHY_API_KEY;
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

/** Преобразовать GIPHY response в формат, ожидаемый клиентом */
function mapGiphyResults(data) {
    const results = (data.data || []).map(g => ({
        id: g.id,
        title: g.title || '',
        media_formats: {
            gif: {
                url: g.images?.original?.url || '',
                dims: [
                    parseInt(g.images?.original?.width) || 300,
                    parseInt(g.images?.original?.height) || 200,
                ],
            },
            tinygif: {
                url: g.images?.fixed_width_small?.url || g.images?.preview_gif?.url || '',
                dims: [
                    parseInt(g.images?.fixed_width_small?.width) || 200,
                    parseInt(g.images?.fixed_width_small?.height) || 150,
                ],
            },
        },
    }));
    const offset = data.pagination?.offset || 0;
    const count = data.pagination?.count || 0;
    const next = (offset + count) < (data.pagination?.total_count || 0)
        ? String(offset + count) : '';
    return { results, next };
}

router.get('/search', async (req, res) => {
    if (!GIPHY_KEY) return res.status(503).json({ error: 'GIPHY API не настроен (GIPHY_API_KEY)' });
    const { q, limit = 20, pos } = req.query;
    if (!q) return res.status(400).json({ error: 'q required' });
    try {
        const offset = pos ? `&offset=${pos}` : '';
        const url = `${GIPHY_BASE}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g${offset}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json(data);
        res.json(mapGiphyResults(data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/trending', async (req, res) => {
    if (!GIPHY_KEY) return res.status(503).json({ error: 'GIPHY API не настроен (GIPHY_API_KEY)' });
    const { limit = 20, pos } = req.query;
    try {
        const offset = pos ? `&offset=${pos}` : '';
        const url = `${GIPHY_BASE}/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=g${offset}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json(data);
        res.json(mapGiphyResults(data));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
