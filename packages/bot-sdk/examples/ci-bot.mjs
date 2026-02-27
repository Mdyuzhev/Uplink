/**
 * CI-бот — отслеживает команды /deploy, /status.
 * Демонстрирует работу с несколькими командами и реакциями.
 *
 * Запуск:
 *   UPLINK_URL=https://uplink.example.com UPLINK_TOKEN=bot_xxx node ci-bot.mjs
 */

import { UplinkBot } from '../src/index.mjs';

const bot = new UplinkBot({
    url: process.env.UPLINK_URL || 'http://localhost:5174',
    token: process.env.UPLINK_TOKEN || 'bot_test',
});

// Имитация состояния деплоя
let lastDeploy = null;

bot.onCommand('/deploy', async (ctx) => {
    const target = ctx.args[0] || 'production';
    await ctx.react('🚀');
    await ctx.reply(`Запускаю деплой на **${target}**...`);

    // Имитация деплоя
    lastDeploy = {
        target,
        status: 'in_progress',
        startedBy: ctx.senderName,
        startedAt: new Date().toISOString(),
    };

    // "Деплой" через 3 секунды
    setTimeout(async () => {
        lastDeploy.status = 'success';
        await ctx.reply(`Деплой на **${target}** завершён успешно.`);
    }, 3000);
});

bot.onCommand('/status', async (ctx) => {
    if (!lastDeploy) {
        await ctx.reply('Деплоев пока не было.');
        return;
    }

    const statusIcon = lastDeploy.status === 'success' ? '✅' :
                        lastDeploy.status === 'in_progress' ? '⏳' : '❌';

    await ctx.reply(
        `${statusIcon} Последний деплой:\n` +
        `  Цель: ${lastDeploy.target}\n` +
        `  Статус: ${lastDeploy.status}\n` +
        `  Запустил: ${lastDeploy.startedBy}\n` +
        `  Время: ${lastDeploy.startedAt}`
    );
});

console.log('CI Bot запускается...');
bot.start();
