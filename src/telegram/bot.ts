import { Bot, Context } from 'grammy';
import axios from 'axios';
import { commands } from './commands';
import ENV from '../lib/env';

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be set in environment variables');
}
const bot = new Bot(process.env.BOT_TOKEN!, {
  client: {
    timeoutSeconds: 30,
  },
});

axios.defaults.baseURL = ENV.BLESSNET_API_URL;
axios.defaults.headers.common['X-API-KEY'] = process.env.BLESSNET_SCAN_API_KEY;

const tryAndReply =
  (fn: (ctx: Context) => Promise<void>) => async (ctx: Context) => {
    try {
      await fn(ctx);
    } catch (error) {
      console.error('Error in command handler:', error);
      await ctx.reply(
        error.message || 'An error occurred while processing your request.'
      );
    }
  };

Object.entries(commands).forEach(
  ([command, handler]: [string, (ctx: Context) => Promise<void>]) => {
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
  // console.log('message', ctx);
  // ctx.reply('Please use the menu to setup your blessed account!', {});
});
export default bot;
