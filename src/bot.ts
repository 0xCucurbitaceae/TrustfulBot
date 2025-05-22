import { Bot, Context } from 'grammy';
import axios from 'axios';
import { commands } from './commands';
import ENV from './env';

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
    await Promise.race([
      fn(ctx),
      new Promise((_, reject) =>
        setTimeout(async () => {
          await ctx.reply('An error occurred while processing your request.');
          reject(new Error('Timeout'));
        }, 10000)
      ),
    ]);
  };

// let menu = new Menu('main');
Object.entries(commands).forEach(
  ([command, handler]: [string, (ctx: Context) => Promise<void>]) => {
    // menu = menu.text(command, tryAndReply(handler));
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
    // bot.use(menu);
  }
);

bot.command('whoamigroup', async (ctx) => {
  await ctx.reply(`You are in group ${ctx.chat.id}`);
});

// must be last
bot.on('message', (ctx) => {
  console.log('message', ctx);
  ctx.reply('Please use the menu to setup your blessed account!', {});
});
export default bot;
