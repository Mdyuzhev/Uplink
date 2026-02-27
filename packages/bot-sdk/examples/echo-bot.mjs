/**
 * Минимальный echo-бот — отвечает тем же текстом.
 *
 * Запуск:
 *   UPLINK_URL=https://uplink.example.com UPLINK_TOKEN=bot_xxx node echo-bot.mjs
 */

import { UplinkBot } from '../src/index.mjs';

const bot = new UplinkBot({
    url: process.env.UPLINK_URL || 'http://localhost:5174',
    token: process.env.UPLINK_TOKEN || 'bot_test',
});

bot.onCommand('/echo', async (ctx) => {
    const text = ctx.args.join(' ') || '(пустое сообщение)';
    await ctx.reply(text);
});

bot.onCommand('/ping', async (ctx) => {
    await ctx.reply('pong!');
});

bot.onMessage(async (ctx) => {
    // Отвечаем только на сообщения, содержащие "привет"
    if (ctx.body.toLowerCase().includes('привет')) {
        await ctx.react('👋');
    }
});

console.log('Echo Bot запускается...');
bot.start();
