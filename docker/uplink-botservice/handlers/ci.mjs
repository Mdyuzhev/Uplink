/**
 * CI/CD Bot — статусы сборок.
 * Обрабатывает webhook от deploy-prod.sh, GitHub Actions и GitLab CI.
 */

import { sendBotMessage } from '../matrixClient.mjs';
import { getStorage, setStorage } from '../postgresStorage.mjs';

const BOT = 'bot_ci';

// Гарантированная комната для CI-уведомлений (без ручной подписки через /ci enable)
const CI_NOTIFY_ROOM_ID = process.env.CI_NOTIFY_ROOM_ID || '';

export async function handleCommand({ roomId, sender, subCommand, args }) {
    switch (subCommand) {
        case 'status':
            return handleStatus(roomId);
        case 'trigger':
            await sendBotMessage(BOT, roomId,
                'Запуск пайплайнов пока не реализован. Используйте GitHub Actions UI или GitLab CI.'
            );
            return;
        default:
            await sendBotMessage(BOT, roomId,
                '**CI/CD Bot — команды:**\n' +
                '`/ci status` — последние статусы сборок\n' +
                '`/ci trigger` — запустить пайплайн (скоро)'
            );
    }
}

async function handleStatus(roomId) {
    const history = (await getStorage(`ci:history:${roomId}`)) || [];
    if (history.length === 0) {
        await sendBotMessage(BOT, roomId, 'Нет данных о сборках. Webhook-события ещё не поступали.');
        return;
    }
    const recent = history.slice(-5).reverse();
    let text = '**Последние сборки:**\n\n';
    for (const entry of recent) {
        text += `${entry.icon} **${entry.name}** — ${entry.status} (\`${entry.branch}\`)\n`;
    }
    await sendBotMessage(BOT, roomId, text);
}

/**
 * Обработка webhook от CI-систем.
 */
export async function handleWebhook(headers, body) {
    // Деплой с сервера (deploy-prod.sh или GitHub Actions SSH failure)
    if (headers['x-deploy-event'] === 'deploy') {
        await handleDeployEvent(body);
        return;
    }

    // Check job провален в GitHub Actions (до запуска деплоя)
    if (headers['x-deploy-event'] === 'check-failed') {
        await handleCheckFailedEvent(body);
        return;
    }

    // GitHub Actions — workflow_run
    if (headers['x-github-event'] === 'workflow_run') {
        const run = body.workflow_run;
        const ok = run.conclusion === 'success';
        const icon = ok ? '✅' : run.conclusion === 'failure' ? '❌' : '🔄';
        const plain = `${icon} ${run.name} — ${run.conclusion || run.status} (${run.head_branch})`;
        const html =
            `<b>${icon} ${run.name}</b> — ${run.conclusion || run.status}<br/>` +
            `🌿 <code>${run.head_branch}</code> | <a href="${run.html_url}">Логи</a>`;

        await sendToSubscribedRooms(plain, html, {
            icon, name: run.name, status: run.conclusion || run.status, branch: run.head_branch,
        });
        return;
    }

    // GitLab CI — pipeline
    if (body.object_kind === 'pipeline') {
        const pipeline = body.object_attributes;
        const ok = pipeline.status === 'success';
        const icon = ok ? '✅' : pipeline.status === 'failed' ? '❌' : '🔄';
        const plain = `${icon} Pipeline #${pipeline.id} — ${pipeline.status} (${pipeline.ref})`;
        const html =
            `<b>${icon} Pipeline #${pipeline.id}</b> — ${pipeline.status}<br/>` +
            `📁 <b>${body.project?.name}</b> | 🌿 <code>${pipeline.ref}</code>`;

        await sendToSubscribedRooms(plain, html, {
            icon, name: `Pipeline #${pipeline.id}`, status: pipeline.status, branch: pipeline.ref,
        });
    }
}

/**
 * Деплой завершён (успешно или с ошибкой) — событие от deploy-prod.sh.
 */
async function handleDeployEvent(data) {
    const ok = data.status === 'success';
    const icon = ok ? '✅' : '❌';
    const commit = data.commit || {};
    const hashShort = commit.hash ? String(commit.hash).slice(0, 7) : null;
    const elapsed = data.elapsed != null ? `${data.elapsed}s` : null;

    // Plaintext
    let plain = `${icon} Деплой ${ok ? 'успешен' : 'провален'}`;
    if (elapsed) plain += ` (${elapsed})`;
    if (commit.message) plain += ` — ${commit.message}`;

    // HTML
    let html = `<b>${icon} Деплой ${ok ? 'успешен' : 'провален'}</b>`;
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

    await sendToSubscribedRooms(plain, html, {
        icon: ok ? '[OK]' : '[FAIL]',
        name: 'Deploy',
        status: data.status,
        branch: 'main',
    });
}

/**
 * Check job провален — TypeScript/lint/test/build упали до деплоя.
 */
async function handleCheckFailedEvent(data) {
    const run = data.run || '';
    const commit = data.commit || '';
    const url = data.url || '';

    const plain = `❌ Check #${run} провален — ${commit}`;
    let html = `<b>❌ Check #${run} провален</b><br/>`;
    if (commit) html += `📝 ${escapeHtml(commit)}<br/>`;
    if (url) html += `<a href="${url}">Открыть логи</a>`;

    await sendToSubscribedRooms(plain, html, {
        icon: '[FAIL]',
        name: `Check #${run}`,
        status: 'failed',
        branch: 'main',
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

async function sendToSubscribedRooms(body, html, historyEntry) {
    const { getBotRoomBindings } = await import('../registry.mjs');
    const bindings = await getBotRoomBindings();

    const rooms = new Set();
    for (const [roomId, bots] of Object.entries(bindings)) {
        if (bots.includes('ci')) rooms.add(roomId);
    }
    // Гарантированная комната из env (не требует ручной настройки в UI)
    if (CI_NOTIFY_ROOM_ID) rooms.add(CI_NOTIFY_ROOM_ID);

    for (const roomId of rooms) {
        const history = (await getStorage(`ci:history:${roomId}`)) || [];
        history.push(historyEntry);
        if (history.length > 20) history.splice(0, history.length - 20);
        await setStorage(`ci:history:${roomId}`, history);

        await sendBotMessage(BOT, roomId, body, html);
    }
}
