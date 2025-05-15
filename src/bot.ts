import { Bot, Context } from 'grammy';
import { Menu } from '@grammyjs/menu';

import dotenv from 'dotenv';
import axios from 'axios';
import { setupAccount, attestCommand } from './attestations';

// Load environment variables
dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be set in environment variables');
}
const bot = new Bot(process.env.BOT_TOKEN!);

axios.defaults.baseURL = `https://api.test.bless.net`;
axios.defaults.headers.common['X-API-KEY'] = process.env.BLESSNET_SCAN_API_KEY;

const menu = new Menu('main').text('Setup', setupAccount);

bot.use(menu);
bot.command('setup', setupAccount);
bot.command('attest', attestCommand);

bot.on('message', (ctx) => {
  console.log('message', ctx);
  ctx.reply('Please use the menu to setup your blessed account!', {
    reply_markup: menu,
  });
});

export default bot;
