/**
 * CI/CD Bot — статусы сборок.
 * Обрабатывает webhook от GitHub Actions и GitLab CI.
 */

import { sendBotMessage } from '../matrixClient.mjs';
import { getStorage, setStorage, getAllStorageKeys } from '../storage.mjs';

const BOT = 'bot_ci';

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
    const history = getStorage(`ci:history:${roomId}`) || [];
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
    // GitHub Actions — workflow_run
    if (headers['x-github-event'] === 'workflow_run') {
        const run = body.workflow_run;
        const icon = run.conclusion === 'success' ? '[OK]' :
                     run.conclusion === 'failure' ? '[FAIL]' : '[...]';
        const text = `${icon} **${run.name}** — ${run.conclusion || run.status}\n` +
                     `Branch: \`${run.head_branch}\` | ${run.html_url}`;

        await sendToSubscribedRooms(text, {
            icon, name: run.name, status: run.conclusion || run.status, branch: run.head_branch,
        });
        return;
    }

    // GitLab CI — pipeline
    if (body.object_kind === 'pipeline') {
        const pipeline = body.object_attributes;
        const icon = pipeline.status === 'success' ? '[OK]' :
                     pipeline.status === 'failed' ? '[FAIL]' : '[...]';
        const text = `${icon} Pipeline #${pipeline.id} — ${pipeline.status}\n` +
                     `Project: **${body.project?.name}** | Branch: \`${pipeline.ref}\``;

        await sendToSubscribedRooms(text, {
            icon, name: `Pipeline #${pipeline.id}`, status: pipeline.status, branch: pipeline.ref,
        });
    }
}

async function sendToSubscribedRooms(text, historyEntry) {
    // CI-бот отправляет во все комнаты, где он активирован
    const { getBotRoomBindings } = await import('../registry.mjs');
    const bindings = getBotRoomBindings();

    for (const [roomId, bots] of Object.entries(bindings)) {
        if (!bots.includes('ci')) continue;

        // Сохранить в историю
        const history = getStorage(`ci:history:${roomId}`) || [];
        history.push(historyEntry);
        if (history.length > 20) history.splice(0, history.length - 20);
        setStorage(`ci:history:${roomId}`, history);

        await sendBotMessage(BOT, roomId, text);
    }
}
