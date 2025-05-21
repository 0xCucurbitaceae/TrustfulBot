import { Bot, Context } from 'grammy';
import { Menu } from '@grammyjs/menu';

import dotenv from 'dotenv';
import axios from 'axios';
import { commands } from './commands';

// Load environment variables
dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be set in environment variables');
}
const bot = new Bot(process.env.BOT_TOKEN!);

axios.defaults.baseURL = `https://api.test.bless.net`;
axios.defaults.headers.common['X-API-KEY'] = process.env.BLESSNET_SCAN_API_KEY;

const tryAndReply =
  (fn: (ctx: Context) => Promise<void>) => async (ctx: Context) => {
    try {
      await fn(ctx);
    } catch (error) {
      console.error('Error in command:', error);
      await ctx.reply('An error occurred while processing your request.');
    }
  };

// let menu = new Menu('main');
Object.entries(commands).forEach(
  ([command, handler]: [string, (ctx: Context) => Promise<void>]) => {
    // menu = menu.text(command, tryAndReply(handler));
    console.log('subscribing to ', command);
    bot.command(command, tryAndReply(handler));
    // bot.use(menu);
  }
);

// must be last
bot.on('message', (ctx) => {
  console.log('message', ctx);
  ctx.reply('Please use the menu to setup your blessed account!', {});
});
export default bot;
