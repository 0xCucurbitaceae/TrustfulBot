import bot from '../../telegram/bot';
import { webhookCallback } from 'grammy';

export default webhookCallback(bot, 'next-js', {
  timeoutMilliseconds: 30_000,
});
