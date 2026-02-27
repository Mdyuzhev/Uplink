/**
 * GitHub Bot — подписки на репозитории, webhook handler.
 */

import { sendBotMessage } from '../matrixClient.mjs';
import { getStorage, setStorage, getAllStorageKeys } from '../storage.mjs';

const BOT = 'bot_github';

export async function handleCommand({ roomId, sender, subCommand, args }) {
    switch (subCommand) {
        case 'subscribe':
            return handleSubscribe(roomId, sender, args);
        case 'unsubscribe':
            return handleUnsubscribe(roomId, args);
        case 'list':
            return handleList(roomId);
        default:
            await sendBotMessage(BOT, roomId,
                '**GitHub Bot — команды:**\n' +
                '`/github subscribe owner/repo` — подписаться на репозиторий\n' +
                '`/github unsubscribe owner/repo` — отписаться\n' +
                '`/github list` — список подписок'
            );
    }
}

async function handleSubscribe(roomId, sender, args) {
    const repo = args[0];
    if (!repo || !repo.includes('/')) {
        await sendBotMessage(BOT, roomId,
            'Укажите репозиторий: `/github subscribe owner/repo`'
        );
        return;
    }

    const subs = getStorage(`github:${roomId}`) || [];
    if (subs.includes(repo)) {
        await sendBotMessage(BOT, roomId, `Канал уже подписан на **${repo}**.`);
        return;
    }
    subs.push(repo);
    setStorage(`github:${roomId}`, subs);

    await sendBotMessage(BOT, roomId,
        `Подписка на **${repo}** оформлена.\n` +
        `Настройте webhook в GitHub:\n` +
        '```\nURL: <ваш-домен>/hooks/github\nContent type: application/json\n```'
    );
}

async function handleUnsubscribe(roomId, args) {
    const repo = args[0];
    if (!repo) {
        await sendBotMessage(BOT, roomId, 'Укажите репозиторий: `/github unsubscribe owner/repo`');
        return;
    }
    const subs = getStorage(`github:${roomId}`) || [];
    const filtered = subs.filter(r => r !== repo);
    setStorage(`github:${roomId}`, filtered);
    await sendBotMessage(BOT, roomId, `Отписка от **${repo}** выполнена.`);
}

async function handleList(roomId) {
    const subs = getStorage(`github:${roomId}`) || [];
    if (subs.length === 0) {
        await sendBotMessage(BOT, roomId, 'В этом канале нет подписок на репозитории.');
        return;
    }
    await sendBotMessage(BOT, roomId,
        '**Подписки:**\n' + subs.map(r => `  • ${r}`).join('\n')
    );
}

/**
 * Обработка входящего webhook от GitHub.
 */
export async function handleWebhook(headers, body) {
    const event = headers['x-github-event'];
    const repo = body.repository?.full_name;
    if (!repo) return;

    // Найти комнаты, подписанные на этот репозиторий
    const allKeys = getAllStorageKeys().filter(k => k.startsWith('github:'));
    for (const key of allKeys) {
        const roomId = key.replace('github:', '');
        const subs = getStorage(key) || [];
        if (!subs.includes(repo)) continue;

        const message = formatGitHubEvent(event, body);
        if (message) {
            await sendBotMessage(BOT, roomId, message.text, message.html);
        }
    }
}

function formatGitHubEvent(event, body) {
    switch (event) {
        case 'push': {
            const branch = body.ref?.replace('refs/heads/', '');
            const commits = body.commits || [];
            const pusher = body.pusher?.name;
            const repo = body.repository?.full_name;
            const text =
                `**${pusher}** pushed ${commits.length} commit(s) to \`${branch}\` in **${repo}**\n` +
                commits.slice(0, 5).map(c => `  \`${c.id.slice(0, 7)}\` ${c.message.split('\n')[0]}`).join('\n');
            return { text };
        }
        case 'pull_request': {
            const pr = body.pull_request;
            const action = body.action;
            const text = `PR ${action}: **${pr.title}** (#${pr.number}) by ${pr.user.login}\n${pr.html_url}`;
            return { text };
        }
        case 'issues': {
            const issue = body.issue;
            const action = body.action;
            const text = `Issue ${action}: **${issue.title}** (#${issue.number}) by ${issue.user.login}\n${issue.html_url}`;
            return { text };
        }
        case 'workflow_run': {
            const run = body.workflow_run;
            const icon = run.conclusion === 'success' ? 'OK' : run.conclusion === 'failure' ? 'FAIL' : 'PENDING';
            const text = `[${icon}] Workflow **${run.name}**: ${run.conclusion || run.status} (${run.head_branch})\n${run.html_url}`;
            return { text };
        }
        default:
            return null;
    }
}
