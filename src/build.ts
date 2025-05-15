import { Bot } from 'grammy';
import dotenv from 'dotenv';
dotenv.config();
// Load environment variables
dotenv.config();
if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be set in environment variables');
}
const bot = new Bot(process.env.BOT_TOKEN);

// Set up the webhook
const host =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.WEBHOOK_HOST;

if (!host) {
  throw new Error('WEBHOOK_HOST must be set in environment variables');
}
const webhookUrl = `https://${host}/api/bot`;

// Set webhook on startup
bot.api
  .setWebhook(webhookUrl, {
    drop_pending_updates: true,
  })
  .then(() => {
    console.log(
      `Webhook set successfully to ${webhookUrl} for ${
        process.env.BOT_TOKEN.split(':')[0]
      }!`
    );
  })
  .catch(console.error);
