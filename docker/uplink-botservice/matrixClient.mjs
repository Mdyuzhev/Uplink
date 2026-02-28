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
        throw new Error(`Ошибка отправки (${resp.status}): ${err}`);
    }

    return (await resp.json()).event_id;
}

/**
 * Пригласить бота в комнату и автоматически принять инвайт.
 */
export async function inviteBotToRoom(botLocalpart, roomId) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;

    // Invite от имени botservice
    await fetch(`${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AS_TOKEN}`,
        },
        body: JSON.stringify({ user_id: userId }),
    });

    // Auto-join от имени бота
    await fetch(`${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join?user_id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AS_TOKEN}`,
        },
        body: JSON.stringify({}),
    });
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
