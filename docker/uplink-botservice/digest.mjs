/**
 * Периодическая сводка системы в #ops.
 * Каждые 12 часов отправляет отчёт: CPU, RAM, диск, статусы сервисов.
 */

import logger from './logger.mjs';
import { sendBotMessage } from './matrixClient.mjs';
import { getBotRoomBindings } from './registry.mjs';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
const DIGEST_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 часов

/**
 * Запросить одно значение из Prometheus.
 * Возвращает число или null при ошибке.
 */
async function queryPrometheus(expr) {
    try {
        const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(expr)}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!resp.ok) return null;
        const data = await resp.json();
        const result = data?.data?.result?.[0]?.value?.[1];
        return result !== undefined ? parseFloat(result) : null;
    } catch {
        return null;
    }
}

/**
 * Собрать метрики и отправить сводку во все комнаты с Alert Bot.
 */
export async function sendDigest() {
    // Найти комнаты где включён alerts бот
    const bindings = getBotRoomBindings();
    const rooms = Object.entries(bindings)
        .filter(([, bots]) => bots.includes('alerts'))
        .map(([roomId]) => roomId);

    if (rooms.length === 0) {
        logger.warn('digest: нет комнат с alerts ботом');
        return;
    }

    // Собрать метрики
    const [cpu, ram, disk, synapseUp, postgresUp] = await Promise.all([
        queryPrometheus('100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'),
        queryPrometheus('(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100'),
        queryPrometheus('(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100'),
        queryPrometheus('up{job="synapse"}'),
        queryPrometheus('up{job="postgres"}'),
    ]);

    const fmt = (v) => v !== null ? `${v.toFixed(1)}%` : '—';
    const status = (v) => v === 1 ? '✅ UP' : v === 0 ? '🔴 DOWN' : '❓';

    const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', hour12: false });

    const text =
        `📊 Сводка системы — ${now} МСК\n\n` +
        `🖥️ Ресурсы:\n` +
        `  CPU: ${fmt(cpu)}\n` +
        `  RAM: ${fmt(ram)}\n` +
        `  Диск /: ${fmt(disk)}\n\n` +
        `⚡ Сервисы:\n` +
        `  Synapse: ${status(synapseUp)}\n` +
        `  PostgreSQL: ${status(postgresUp)}`;

    const html =
        `<b>📊 Сводка системы</b> — ${now} МСК<br><br>` +
        `<b>🖥️ Ресурсы</b><br>` +
        `  CPU: <code>${fmt(cpu)}</code><br>` +
        `  RAM: <code>${fmt(ram)}</code><br>` +
        `  Диск /: <code>${fmt(disk)}</code><br><br>` +
        `<b>⚡ Сервисы</b><br>` +
        `  Synapse: ${status(synapseUp)}<br>` +
        `  PostgreSQL: ${status(postgresUp)}`;

    for (const roomId of rooms) {
        try {
            await sendBotMessage('bot_alerts', roomId, text, html);
            logger.info({ roomId }, 'digest отправлен');
        } catch (err) {
            logger.error({ err, roomId }, 'Ошибка отправки digest');
        }
    }
}

/**
 * Запустить scheduler: сразу + каждые 12 часов.
 */
export function scheduleDigest() {
    // Первая сводка через 5 секунд после старта (дать время Prometheus подняться)
    setTimeout(() => {
        sendDigest().catch(err => logger.error({ err }, 'digest error'));
    }, 5000);

    setInterval(() => {
        sendDigest().catch(err => logger.error({ err }, 'digest error'));
    }, DIGEST_INTERVAL_MS);

    logger.info({ intervalHours: 12 }, 'Digest scheduler запущен');
}
