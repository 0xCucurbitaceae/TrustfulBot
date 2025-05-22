import bot from '../../bot';
import { webhookCallback } from 'grammy';

export const config = {
  api: {
    bodyParser: false, // Required for grammy's webhook handler
  },
};

export default webhookCallback(bot, 'next-js', undefined, 30_000);
