/**
 * Middleware: добавляет X-Request-Id к каждому запросу.
 * Для корреляции логов между nginx → botservice.
 */

import crypto from 'node:crypto';
import logger from '../logger.mjs';

export function requestId(req, res, next) {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    req.log = logger.child({ reqId: req.id, method: req.method, url: req.url });
    next();
}
