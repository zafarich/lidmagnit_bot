import TelegramBot from 'node-telegram-bot-api';
import logger from '../utils/logger.js';

let bot = null;

export const initBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables');
  }
  
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    bot = new TelegramBot(token, { polling: true });
    logger.info('Telegram Bot started in polling mode');
  } else {
    bot = new TelegramBot(token);
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    if (webhookUrl) {
      bot.setWebHook(webhookUrl);
      logger.info('Telegram Bot webhook set:', webhookUrl);
    }
  }
  
  if (isDevelopment && bot) {
    bot.on('polling_error', (error) => {
      logger.error('Telegram Bot polling error:', error);
    });
  }
  
  return bot;
};

export const getBot = () => {
  if (!bot) {
    throw new Error('Telegram Bot has not been initialized. Call initBot() first.');
  }
  return bot;
};

export const stopBot = async () => {
  if (bot) {
    await bot.stopPolling();
    logger.info('Telegram Bot stopped');
  }
};

export default { initBot, getBot, stopBot };
