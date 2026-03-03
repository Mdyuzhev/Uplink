/**
 * Структурированный логгер на pino.
 * JSON-формат, level + timestamp + service name.
 */

import pino from 'pino';

const logger = pino({
    name: 'botservice',
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    ...(process.env.LOG_PRETTY === '1' ? { transport: { target: 'pino-pretty' } } : {}),
});

export default logger;

/**
 * Создать дочерний логгер с контекстом (requestId, botId, roomId).
 */
export function childLogger(bindings) {
    return logger.child(bindings);
}
