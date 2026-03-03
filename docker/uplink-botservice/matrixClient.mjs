/**
 * Matrix-клиент для бот-сервиса.
 * Отправляет сообщения от имени виртуальных бот-пользователей через AS API.
 */

import logger from './logger.mjs';

const HOMESERVER_URL = process.env.HOMESERVER_URL || 'http://synapse:8008';
const AS_TOKEN = process.env.AS_TOKEN;
const ADMIN_TOKEN = process.env.SYNAPSE_ADMIN_TOKEN;
const SERVER_NAME = process.env.SERVER_NAME || 'localhost';

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
            logger.info({ userId }, 'Бот зарегистрирован');
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
        logger.warn({ err, userId }, 'Не удалось установить displayname');
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
        logger.error({ botLocalpart, roomId, status: resp.status }, 'Ошибка отправки сообщения бота');
        throw new Error(`Ошибка отправки (${resp.status}): ${err}`);
    }

    const result = await resp.json();
    logger.debug({ botLocalpart, roomId, eventId: result.event_id }, 'Сообщение отправлено');
    return result.event_id;
}

/**
 * Присоединить бота к комнате.
 * Пробуем несколько стратегий, т.к. разные типы комнат требуют разный подход.
 */
export async function joinBotToRoom(botLocalpart, roomId) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;

    // Если бот уже в комнате — ничего делать не нужно
    if (await isBotInRoom(botLocalpart, roomId)) {
        logger.info({ userId, roomId }, 'Бот уже в комнате, join пропускается');
        return;
    }

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
            logger.info({ userId, roomId }, 'Бот присоединился (direct join)');
            return;
        }
        const err = await resp.text();
        logger.warn({ userId, roomId, status: resp.status }, 'Direct join не сработал');
    }

    // Стратегия 2: Invite от имени участника комнаты (через admin API + AS masquerading)
    if (ADMIN_TOKEN) {
        try {
            // Получить список участников через Admin API
            const membersResp = await fetch(
                `${HOMESERVER_URL}/_synapse/admin/v1/rooms/${encodeURIComponent(roomId)}/members`,
                { headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` } }
            );
            if (membersResp.ok) {
                const { members } = await membersResp.json();
                // Найти участника (не бота) для invite
                const inviter = members?.find(m => !m.startsWith('@bot_'));
                if (inviter) {
                    // Invite от имени участника через AS masquerading
                    const invResp = await fetch(
                        `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite?user_id=${encodeURIComponent(inviter)}`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${AS_TOKEN}`,
                            },
                            body: JSON.stringify({ user_id: userId }),
                        }
                    );
                    if (invResp.ok) {
                        // Accept invite — join от имени бота
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
                            logger.info({ userId, roomId, inviter }, 'Бот присоединился (invite from member)');
                            return;
                        }
                    }
                    const invErr = await invResp.text().catch(() => '');
                    logger.warn({ userId, roomId, invErr }, 'Invite via member не сработал');
                }
            }
        } catch (err) {
            logger.warn({ err }, 'joinBot strategy 2 error');
        }
    }

    logger.error({ userId, roomId }, 'Все стратегии join провалились');
    throw new Error(`Не удалось присоединить ${userId} к ${roomId}`);
}

/**
 * Проверить, является ли бот участником комнаты.
 */
export async function isBotInRoom(botLocalpart, roomId) {
    const userId = `@${botLocalpart}:${SERVER_NAME}`;
    try {
        // Masquerade as bot user — AS token без ?user_id= читает state только для своего ghost-user
        const resp = await fetch(
            `${HOMESERVER_URL}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.member/${encodeURIComponent(userId)}?user_id=${encodeURIComponent(userId)}`,
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
