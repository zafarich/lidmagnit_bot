import multer from 'multer';
import { getBot } from '../config/bot.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export const upload = multer({ storage: multer.memoryStorage() });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const checkAdmin = async (req, res) => {
  try {
    const { telegramId } = req.params;
    const isAdmin = ADMIN_TELEGRAM_IDS.includes(String(telegramId));
    res.json({ isAdmin });
  } catch (error) {
    logger.error('Check admin error:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
};

export const sendBroadcast = async (req, res) => {
  try {
    const bot = getBot();
    const message = req.body.message;
    const photo = req.file;

    if (!message) {
      return res.status(400).json({ error: 'Xabar matni kiritilmagan' });
    }

    const users = await User.find({ isActive: true });
    const total = users.length;
    let sent = 0;
    let failed = 0;
    let blocked = 0;
    let fileId = null;

    for (let i = 0; i < users.length; i++) {
      const chatId = users[i].telegramId;

      try {
        if (photo) {
          if (!fileId) {
            // First user: send buffer to get file_id
            const result = await bot.sendPhoto(chatId, photo.buffer, {
              caption: message,
              parse_mode: 'HTML',
            });
            fileId = result.photo[result.photo.length - 1].file_id;
          } else {
            // Subsequent users: send file_id (faster, no re-upload)
            await bot.sendPhoto(chatId, fileId, {
              caption: message,
              parse_mode: 'HTML',
            });
          }
        } else {
          await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        }
        sent++;
      } catch (error) {
        if (error.response && error.response.statusCode === 403) {
          blocked++;
          await User.findOneAndUpdate(
            { telegramId: chatId },
            { isActive: false },
          );
        } else {
          failed++;
          logger.error(`Broadcast error for ${chatId}:`, error.message);
        }
      }

      // Rate limit: 35ms between sends (~28 msg/sec)
      if (i < users.length - 1) {
        await delay(35);
      }
    }

    res.json({ total, sent, failed, blocked });
  } catch (error) {
    logger.error('Broadcast error:', error);
    res.status(500).json({ error: 'Broadcast xatosi' });
  }
};
