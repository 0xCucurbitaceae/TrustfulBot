import axios from 'axios';
import dotenv from 'dotenv';
import { URL } from 'url';

// Load environment variables
dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be set in environment variables');
}

async function setWebhook() {
  // Get webhook URL from command line arguments
  const webhookUrl = process.argv[2];

  if (!webhookUrl) {
    console.error('Please provide a webhook URL as a command line argument');
    console.error('Example: ts-node scripts/setWebhook.ts https://your-domain.com/api/webhook');
    process.exit(1);
  }

  // Validate URL
  try {
    new URL(webhookUrl);
  } catch (error) {
    console.error('Invalid URL provided');
    process.exit(1);
  }

  const botToken = process.env.BOT_TOKEN;
  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;

  try {
    const response = await axios.post(telegramApiUrl, {
      url: webhookUrl
    });

    console.log('Webhook set response:', response.data);

    if (response.data.ok) {
      console.log('✅ Webhook successfully set to:', webhookUrl);
    } else {
      console.error('❌ Failed to set webhook:', response.data.description);
    }
  } catch (error: any) {
    console.error('Error setting webhook:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

setWebhook();
