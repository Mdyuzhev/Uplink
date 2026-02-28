/**
 * Matrix-клиент для бот-сервиса.
 * Отправляет сообщения от имени виртуальных бот-пользователей через AS API.
 */

const HOMESERVER_URL = process.env.HOMESERVER_URL || 'http://synapse:8008';
const AS_TOKEN = process.env.AS_TOKEN;
const SERVER_NAME = process.env.SERVER_NAME || 'uplink.local';

/**
 * Зарегистрировать виртуального пользователя бота в Synapse.
 * Идемпотентно — если уже существует, игнорируем ошибку.
 */
export async function ensureBotUser(localpart, displayName) {
    const userId = `@${localpart}:${SERVER_NAME}`;

    // Регистрация через AS API
    try {
        const resp = await fetch(`${HOMESERVER_URL}/_matrix/client/v3/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AS_TOKEN}`,
            },
            body: JSON.stringify({
                type: 'm.login.application_service',
                username: localpart,
            }),
        });
        if (resp.ok) {
            console.log(`Бот ${userId} зарегистрирован`);
        }
    } catch {
        // Пользователь уже существует — нормально
    }

    // Установить display name
    try {
        await fetch(`${HOMESERVER_URL}/_matrix/client/v3/profile/${encodeURIComponent(userId)}/displayname`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AS_TOKEN}`,
            },
            body: JSON.stringify({ displayname: displayName }),
        });
    } catch (err) {
        console.warn(`Не удалось установить displayname для ${userId}:`, err.message);
    }
}

/**
 * Отправить сообщение от имени бота.
 */
export async function sendBotMessage(botLocalpart, roomId, body, formatted) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;
    const txnId = `bot_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const content = {
        msgtype: 'm.text',
        body,
    };

    if (formatted) {
        content.format = 'org.matrix.custom.html';
        content.formatted_body = formatted;
    }

    // Маркер бота для UI
    content['dev.uplink.bot'] = {
        bot_id: botLocalpart.replace('bot_', ''),
        is_bot: true,
    };

    const url = `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}?user_id=${encodeURIComponent(userId)}`;
    const resp = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AS_TOKEN}`,
        },
        body: JSON.stringify(content),
    });

    if (!resp.ok) {
        const err = await resp.text();
        console.error(`[sendBotMessage] ОШИБКА от ${botLocalpart} в ${roomId}: ${resp.status} ${err}`);
        throw new Error(`Ошибка отправки (${resp.status}): ${err}`);
    }

    const result = await resp.json();
    console.log(`[sendBotMessage] ${botLocalpart} → ${roomId}: "${body.slice(0, 50)}..." (${result.event_id})`);
    return result.event_id;
}

/**
 * Присоединить бота к комнате.
 * Пробуем несколько стратегий, т.к. разные типы комнат требуют разный подход.
 */
export async function joinBotToRoom(botLocalpart, roomId) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;

    // Стратегия 1: Прямой join от имени бота (работает для public rooms)
    {
        const resp = await fetch(
            `${HOMESERVER_URL}/_matrix/client/v3/join/${encodeURIComponent(roomId)}?user_id=${encodeURIComponent(userId)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AS_TOKEN}`,
                },
                body: JSON.stringify({}),
            }
        );
        if (resp.ok) {
            console.log(`[joinBot] ${userId} joined ${roomId} (direct join)`);
            return;
        }
        const err = await resp.text();
        console.warn(`[joinBot] Direct join failed for ${userId} in ${roomId}: ${resp.status} ${err}`);
    }

    // Стратегия 2: Synapse Admin API — force-join (работает для любых комнат)
    {
        const resp = await fetch(
            `${HOMESERVER_URL}/_synapse/admin/v1/join/${encodeURIComponent(roomId)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AS_TOKEN}`,
                },
                body: JSON.stringify({ user_id: userId }),
            }
        );
        if (resp.ok) {
            console.log(`[joinBot] ${userId} joined ${roomId} (admin API)`);
            return;
        }
        const err = await resp.text();
        console.warn(`[joinBot] Admin join failed for ${userId} in ${roomId}: ${resp.status} ${err}`);
    }

    // Стратегия 3: Invite через AS sender, затем join (legacy)
    {
        const inviteResp = await fetch(
            `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AS_TOKEN}`,
                },
                body: JSON.stringify({ user_id: userId }),
            }
        );
        if (inviteResp.ok) {
            const joinResp = await fetch(
                `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join?user_id=${encodeURIComponent(userId)}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AS_TOKEN}`,
                    },
                    body: JSON.stringify({}),
                }
            );
            if (joinResp.ok) {
                console.log(`[joinBot] ${userId} joined ${roomId} (invite+join)`);
                return;
            }
        }
    }

    console.error(`[joinBot] Все стратегии join провалились для ${userId} в ${roomId}`);
    throw new Error(`Не удалось присоединить ${userId} к ${roomId}`);
}

/**
 * Проверить, является ли бот участником комнаты.
 */
export async function isBotInRoom(botLocalpart, roomId) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;
    try {
        const resp = await fetch(
            `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.member/${encodeURIComponent(userId)}`,
            {
                headers: { 'Authorization': `Bearer ${AS_TOKEN}` },
            }
        );
        if (!resp.ok) return false;
        const data = await resp.json();
        return data.membership === 'join';
    } catch {
        return false;
    }
}

/**
 * Проверить, зашифрована ли комната (есть ли m.room.encryption state event).
 */
export async function isRoomEncrypted(roomId) {
    try {
        const resp = await fetch(
            `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.encryption`,
            {
                headers: { 'Authorization': `Bearer ${AS_TOKEN}` },
            }
        );
        return resp.ok;
    } catch {
        return false;
    }
}

/**
 * Отправить реакцию от имени бота.
 */
export async function sendBotReaction(botLocalpart, roomId, eventId, emoji) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;
    const txnId = `react_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const url = `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.reaction/${txnId}?user_id=${encodeURIComponent(userId)}`;
    await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AS_TOKEN}`,
        },
        body: JSON.stringify({
            'm.relates_to': {
                rel_type: 'm.annotation',
                event_id: eventId,
                key: emoji,
            },
        }),
    });
}
