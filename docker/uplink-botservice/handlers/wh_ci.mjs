/**
 * WarehouseHub CI Bot — уведомления о пайплайнах и деплоях WarehouseHub.
 * Webhook endpoint: POST /hooks/wh_ci
 * Бот: @bot_wh_ci:uplink.wh-lab.ru
 */

import logger from '../logger.mjs';
import { sendBotMessage } from '../matrixClient.mjs';
import { getStorage, setStorage } from '../postgresStorage.mjs';

const BOT = 'bot_wh_ci';

const NOTIFY_ROOM_ID = process.env.WH_CI_NOTIFY_ROOM_ID || '';

/**
 * Основной обработчик webhook.
 */
export async function handleWebhook(headers, body) {
    if (!NOTIFY_ROOM_ID) {
        console.warn('[bot_wh_ci] WH_CI_NOTIFY_ROOM_ID не задан, уведомление пропущено');
        return;
    }

    if (headers['x-deploy-event'] === 'deploy') {
        await handleDeployEvent(body);
        return;
    }

    if (headers['x-deploy-event'] === 'check-failed') {
        await handleCheckFailedEvent(body);
        return;
    }

    if (headers['x-github-event'] === 'workflow_run') {
        const run = body.workflow_run;
        const ok = run.conclusion === 'success';
        const icon = ok ? '✅' : run.conclusion === 'failure' ? '❌' : '🔄';
        const plain = `${icon} ${run.name} — ${run.conclusion || run.status} (${run.head_branch})`;
        const html =
            `<b>${icon} ${run.name}</b> — ${run.conclusion || run.status}<br/>` +
            `🌿 <code>${run.head_branch}</code> | <a href="${run.html_url}">Логи</a>`;
        await sendToRoom(plain, html, {
            icon, name: run.name, status: run.conclusion || run.status, branch: run.head_branch,
        });
        return;
    }

    if (body.object_kind === 'pipeline') {
        const pipeline = body.object_attributes;
        const ok = pipeline.status === 'success';
        const icon = ok ? '✅' : pipeline.status === 'failed' ? '❌' : '🔄';
        const plain = `${icon} Pipeline #${pipeline.id} — ${pipeline.status} (${pipeline.ref})`;
        const html =
            `<b>${icon} Pipeline #${pipeline.id}</b> — ${pipeline.status}<br/>` +
            `📁 <b>${body.project?.name || 'WarehouseHub'}</b> | 🌿 <code>${pipeline.ref}</code>`;
        await sendToRoom(plain, html, {
            icon, name: `Pipeline #${pipeline.id}`, status: pipeline.status, branch: pipeline.ref,
        });
        return;
    }

    // Произвольное уведомление (object_kind: "notify" или просто text/html)
    if (body.text || body.html) {
        await sendToRoom(body.text || body.html, body.html || body.text, {
            icon: '📢', name: 'Notify', status: 'sent', branch: '-',
        });
        return;
    }
}

async function handleDeployEvent(data) {
    const ok = data.status === 'success';
    const icon = ok ? '✅' : '❌';
    const commit = data.commit || {};
    const hashShort = commit.hash ? String(commit.hash).slice(0, 7) : null;
    const elapsed = data.elapsed != null ? `${data.elapsed}s` : null;

    let plain = `${icon} Деплой WarehouseHub ${ok ? 'успешен' : 'провален'}`;
    if (elapsed) plain += ` (${elapsed})`;
    if (commit.message) plain += ` — ${commit.message}`;

    let html = `<b>${icon} Деплой WarehouseHub ${ok ? 'успешен' : 'провален'}</b>`;
    if (elapsed) html += ` <i>(${elapsed})</i>`;
    html += '<br/>';
    if (hashShort) {
        html += `📦 <code>${hashShort}</code> ${escapeHtml(commit.message || '')}`;
        if (commit.author) html += ` <i>(${escapeHtml(commit.author)})</i>`;
        html += '<br/>';
    }
    if (!ok && data.error) {
        const short = data.error.length > 300 ? data.error.slice(0, 300) + '…' : data.error;
        html += `<pre>${escapeHtml(short)}</pre>`;
    }

    await sendToRoom(plain, html, {
        icon: ok ? '[OK]' : '[FAIL]', name: 'Deploy WarehouseHub', status: data.status, branch: 'main',
    });
}

async function handleCheckFailedEvent(data) {
    const plain = `❌ Check #${data.run || ''} провален — ${data.commit || ''}`;
    let html = `<b>❌ Check #${data.run || ''} провален</b><br/>`;
    if (data.commit) html += `📝 ${escapeHtml(data.commit)}<br/>`;
    if (data.url) html += `<a href="${data.url}">Открыть логи</a>`;
    await sendToRoom(plain, html, { icon: '[FAIL]', name: `Check #${data.run}`, status: 'failed', branch: 'main' });
}

async function sendToRoom(body, html, historyEntry) {
    const history = (await getStorage(`wh_ci:history:${NOTIFY_ROOM_ID}`)) || [];
    history.push(historyEntry);
    if (history.length > 20) history.splice(0, history.length - 20);
    await setStorage(`wh_ci:history:${NOTIFY_ROOM_ID}`, history);

    await sendBotMessage(BOT, NOTIFY_ROOM_ID, body, html);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
