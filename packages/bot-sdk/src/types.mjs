/**
 * @typedef {Object} BotConfig
 * @property {string} url - URL Uplink-сервера (https://uplink.example.com)
 * @property {string} token - Токен бота (получен при создании)
 */

/**
 * @typedef {Object} BotEvent
 * @property {string} type - "command" | "message" | "reaction" | "room_join" | "room_leave"
 * @property {string} room_id
 * @property {string} sender
 * @property {string} sender_name
 * @property {string} body
 * @property {string} [command] - только для type: "command"
 * @property {string[]} [args]
 * @property {string} event_id
 * @property {number} ts
 */

/**
 * @typedef {Object} BotAction
 * @property {string} type - "action"
 * @property {string} action - "send_message" | "react"
 * @property {string} room_id
 * @property {string} [body]
 * @property {string} [event_id]
 * @property {string} [emoji]
 * @property {string} [reply_to]
 */

export {};
