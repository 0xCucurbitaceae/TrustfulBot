import { Bot, Context } from 'grammy';
import { Menu } from '@grammyjs/menu';

import dotenv from 'dotenv';
import axios from 'axios';
import {
  setupAccount,
  attestCommand,
  addTitle,
  getTitlesCommand,
} from './commands';

// Load environment variables
dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be set in environment variables');
}
const bot = new Bot(process.env.BOT_TOKEN!);

axios.defaults.baseURL = `https://api.test.bless.net`;
axios.defaults.headers.common['X-API-KEY'] = process.env.BLESSNET_SCAN_API_KEY;

const menu = new Menu('main').text('Setup', setupAccount);

const tryAndReply =
  (fn: (ctx: Context) => Promise<void>) => async (ctx: Context) => {
    try {
      await fn(ctx);
    } catch (error) {
      console.error('Error in command:', error);
      await ctx.reply('An error occurred while processing your request.');
    }
  };

bot.use(menu);
bot.command('setup', tryAndReply(setupAccount));
bot.command('attest', tryAndReply(attestCommand));
bot.command('addTitle', tryAndReply(addTitle));
bot.command('titles', tryAndReply(getTitlesCommand));

bot.on('message', (ctx) => {
  console.log('message', ctx);
  ctx.reply('Please use the menu to setup your blessed account!', {
    reply_markup: menu,
  });
});

export default bot;
