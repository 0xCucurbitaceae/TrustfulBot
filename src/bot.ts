import { Bot, Context, session } from 'grammy';

import dotenv from 'dotenv';
import axios from 'axios';
import { commands } from './commands';
import ENV from './env';

// Load environment variables
dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be set in environment variables');
}
const bot = new Bot(process.env.BOT_TOKEN!, {
  client: {
    timeoutSeconds: 30,
  },
});

axios.defaults.baseURL = `https://api.test.bless.net`;
axios.defaults.headers.common['X-API-KEY'] = process.env.BLESSNET_SCAN_API_KEY;

const tryAndReply =
  (fn: (ctx: Context) => Promise<void>) => async (ctx: Context) => {
    let resolvedInTime = false;
    await Promise.race([
      (async () => {
        await fn(ctx);
        resolvedInTime = true;
      })(),
      new Promise((_, reject) =>
        setTimeout(async () => {
          if (resolvedInTime) {
            return;
          }
          await ctx.reply('Timeout processing your request.');
          reject(new Error('Timeout'));
        }, 10000)
      ),
    ]);
  };

Object.entries(commands).forEach(
  ([command, handler]: [string, (ctx: Context) => Promise<void>]) => {
    console.log('subscribing to ', command);
    bot.command(
      command,
      async (ctx, next) => {
        if (ctx.chat.id !== ENV.GROUP_ID) {
          return ctx.reply('You are not in the group');
        }
        await next();
      },
      tryAndReply(handler)
    );
  }
);

bot.command('whoamigroup', async (ctx) => {
  await ctx.reply(`You are in group ${ctx.chat.id}`);
});

// must be last
bot.on('message', async (ctx) => {
  console.log('message', ctx);
  ctx.reply('Please use the menu to setup your blessed account!', {});
});
export default bot;
