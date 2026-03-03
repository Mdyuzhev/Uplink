/**
 * @typedef {Object} CustomBotDef
 * @property {string} id — уникальный ID (custom_xxxx)
 * @property {string} name — отображаемое имя
 * @property {string} description — описание
 * @property {'sdk' | 'webhook'} mode — режим работы
 * @property {string|null} webhookUrl — URL для webhook-режима
 * @property {string|null} webhookSecret — секрет для подписи webhook
 * @property {BotCommandDef[]} commands — доступные команды
 * @property {string[]} rooms — привязанные комнаты
 * @property {string} owner — Matrix userId владельца
 * @property {string} userId — Matrix userId бота (@bot_custom_xxx:domain)
 * @property {string} localpart — локальная часть userId
 * @property {string} tokenHash — SHA256-хеш токена
 * @property {'online' | 'offline'} status
 * @property {number} created — timestamp создания
 * @property {number|null} lastSeen — последняя активность
 */

/**
 * @typedef {Object} BotCommandDef
 * @property {string} command — команда (например /github subscribe)
 * @property {string} description — описание
 * @property {string} [usage] — пример использования
 */

/**
 * @typedef {Object} MatrixEvent
 * @property {string} type — тип события (m.room.message, etc)
 * @property {string} room_id
 * @property {string} sender — Matrix userId отправителя
 * @property {Record<string, any>} content — содержимое
 * @property {number} origin_server_ts — timestamp
 * @property {string} event_id
 */

/**
 * @typedef {Object} WebhookPayload
 * @property {string} roomId — куда отправить ответ
 * @property {MatrixEvent} event — исходное событие
 * @property {string} command — команда (без /)
 * @property {string[]} args — аргументы
 * @property {CustomBotDef} bot — определение бота
 */

export {};
