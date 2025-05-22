import express from 'express';
import { webhookCallback } from 'grammy';
import dotenv from 'dotenv';
import bot from './telegram/bot';

// Load environment variables
dotenv.config();
if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be set in environment variables');
}
const app = express();

// Parse JSON bodies
app.use(express.json());
// Local development server¥ƒ
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(
  '/api/bot',
  webhookCallback(bot, 'express', { timeoutMilliseconds: 30_000 })
);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
