/**
 * Auth middleware — проверка Matrix access token.
 * Кеш на 5 минут (избежать нагрузки на Synapse при каждом запросе).
 */

const HOMESERVER_URL = process.env.HOMESERVER_URL || 'http://synapse:8008';

// Кеш: token → { userId, expiresAt }
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут
const MAX_CACHE_SIZE = 1000;

/**
 * Проверить Matrix access token через Synapse whoami API.
 * @returns {string|null} userId или null если невалидный
 */
async function validateToken(token) {
    // Проверить кеш
    const cached = tokenCache.get(token);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.userId;
    }

    try {
        const resp = await fetch(`${HOMESERVER_URL}/_matrix/client/v3/account/whoami`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!resp.ok) return null;

        const data = await resp.json();
        const userId = data.user_id;

        // Сохранить в кеш
        if (tokenCache.size >= MAX_CACHE_SIZE) {
            // Удалить самую старую запись
            const oldest = tokenCache.keys().next().value;
            tokenCache.delete(oldest);
        }
        tokenCache.set(token, { userId, expiresAt: Date.now() + CACHE_TTL });

        return userId;
    } catch (err) {
        console.error('[auth] Ошибка валидации токена:', err.message);
        return null;
    }
}

/**
 * Express middleware: требует валидный Matrix access token.
 * Добавляет req.userId если успешно.
 */
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            errcode: 'M_MISSING_TOKEN',
            error: 'Требуется авторизация: Authorization: Bearer <matrix_access_token>',
        });
    }

    const token = authHeader.slice(7);

    validateToken(token).then(userId => {
        if (!userId) {
            return res.status(401).json({
                errcode: 'M_UNKNOWN_TOKEN',
                error: 'Невалидный или просроченный токен',
            });
        }
        req.userId = userId;
        next();
    }).catch(err => {
        console.error('[auth] Middleware ошибка:', err);
        res.status(500).json({ error: 'Ошибка авторизации' });
    });
}

/**
 * Очистить кеш (для тестов).
 */
export function clearAuthCache() {
    tokenCache.clear();
}
