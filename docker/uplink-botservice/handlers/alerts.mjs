/**
 * Alert Bot — Grafana, Alertmanager, Uptime Kuma.
 */

import { sendBotMessage } from '../matrixClient.mjs';
import { getStorage, setStorage } from '../storage.mjs';

const BOT = 'bot_alerts';

export async function handleCommand({ roomId, sender, subCommand, args }) {
    switch (subCommand) {
        case 'mute':
            return handleMute(roomId, args);
        case 'status':
            return handleStatus(roomId);
        default:
            await sendBotMessage(BOT, roomId,
                '**Alert Bot — команды:**\n' +
                '`/alerts mute 30m` — заглушить алерты\n' +
                '`/alerts status` — активные алерты'
            );
    }
}

async function handleMute(roomId, args) {
    const timeStr = args[0];
    if (!timeStr) {
        await sendBotMessage(BOT, roomId, 'Укажите время: `/alerts mute 30m`');
        return;
    }

    const match = timeStr.match(/^(\d+)(m|h|d)$/);
    if (!match) {
        await sendBotMessage(BOT, roomId, 'Формат: `5m`, `1h`, `2d`');
        return;
    }

    const amount = parseInt(match[1]);
    const unit = match[2];
    const ms = unit === 'm' ? amount * 60000 : unit === 'h' ? amount * 3600000 : amount * 86400000;
    const until = Date.now() + ms;

    setStorage(`alerts:mute:${roomId}`, until);
    await sendBotMessage(BOT, roomId, `Алерты заглушены на ${timeStr}.`);

    // Авто-размьют
    setTimeout(() => {
        const stored = getStorage(`alerts:mute:${roomId}`);
        if (stored === until) {
            setStorage(`alerts:mute:${roomId}`, null);
            sendBotMessage(BOT, roomId, 'Алерты снова активны.').catch(() => {});
        }
    }, ms);
}

async function handleStatus(roomId) {
    const active = getStorage(`alerts:active:${roomId}`) || [];
    if (active.length === 0) {
        await sendBotMessage(BOT, roomId, 'Нет активных алертов.');
        return;
    }
    let text = '**Активные алерты:**\n\n';
    for (const alert of active) {
        text += `  [${alert.status}] **${alert.name}** — ${alert.description}\n`;
    }
    await sendBotMessage(BOT, roomId, text);
}

/**
 * Обработка webhook от систем мониторинга.
 */
export async function handleWebhook(headers, body) {
    const { getBotRoomBindings } = await import('../registry.mjs');
    const bindings = getBotRoomBindings();

    const messages = [];

    // Grafana / Alertmanager формат
    if (body.alerts && Array.isArray(body.alerts)) {
        for (const alert of body.alerts) {
            const status = alert.status === 'firing' ? '[FIRING]' : '[RESOLVED]';
            const name = alert.labels?.alertname || 'Alert';
            const desc = alert.annotations?.description || alert.annotations?.summary || '';
            messages.push({
                text: `${status} **${name}** — ${alert.status}\n${desc}`,
                alert: { status: alert.status, name, description: desc },
            });
        }
    }

    // Uptime Kuma формат
    if (body.heartbeat) {
        const status = body.heartbeat.status === 1 ? 'UP' : 'DOWN';
        const name = body.monitor?.name || 'Monitor';
        const url = body.monitor?.url || '';
        messages.push({
            text: `[${status}] **${name}** (${url})`,
            alert: { status, name, description: url },
        });
    }

    // Отправить во все комнаты с alert-ботом
    for (const [roomId, bots] of Object.entries(bindings)) {
        if (!bots.includes('alerts')) continue;

        // Проверить мьют
        const muteUntil = getStorage(`alerts:mute:${roomId}`);
        if (muteUntil && Date.now() < muteUntil) continue;

        for (const msg of messages) {
            await sendBotMessage(BOT, roomId, msg.text);
        }

        // Обновить список активных
        const active = getStorage(`alerts:active:${roomId}`) || [];
        for (const msg of messages) {
            const existing = active.findIndex(a => a.name === msg.alert.name);
            if (msg.alert.status === 'resolved' || msg.alert.status === 'UP') {
                if (existing >= 0) active.splice(existing, 1);
            } else {
                if (existing >= 0) active[existing] = msg.alert;
                else active.push(msg.alert);
            }
        }
        setStorage(`alerts:active:${roomId}`, active);
    }
}
