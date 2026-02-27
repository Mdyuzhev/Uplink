/**
 * Rate limiter для кастомных ботов.
 * Скользящее окно — 1 минута.
 */

const limits = {
    message: 30,  // сообщений в минуту
    reaction: 5,  // реакций в минуту
};

/** botId → { message: [timestamps], reaction: [timestamps] } */
const counters = new Map();

const WINDOW_MS = 60000;

/**
 * Проверить лимит. Возвращает true если действие разрешено.
 */
export function checkRateLimit(botId, actionType) {
    const key = actionType === 'react' ? 'reaction' : 'message';
    const limit = limits[key];
    if (!limit) return true;

    if (!counters.has(botId)) {
        counters.set(botId, { message: [], reaction: [] });
    }

    const counter = counters.get(botId);
    const now = Date.now();

    // Убрать устаревшие записи
    counter[key] = counter[key].filter(ts => now - ts < WINDOW_MS);

    if (counter[key].length >= limit) {
        return false;
    }

    counter[key].push(now);
    return true;
}

/**
 * Получить оставшийся лимит.
 */
export function getRemainingLimit(botId, actionType) {
    const key = actionType === 'react' ? 'reaction' : 'message';
    const limit = limits[key] || 0;

    if (!counters.has(botId)) return limit;

    const counter = counters.get(botId);
    const now = Date.now();
    const active = counter[key].filter(ts => now - ts < WINDOW_MS);
    return Math.max(0, limit - active.length);
}
