import cron from 'node-cron';
import User from '../models/User.js';
import ScheduledContent from '../models/ScheduledContent.js';
import logger from '../utils/logger.js';

const MESSAGES_PER_DAY = 2;

// Foydalanuvchiga keyingi 2 ta kontentni jo'natish
export const sendContentToUser = async (bot, user) => {
  const channelId = process.env.CONTENT_CHANNEL_ID;
  if (!channelId) return 0;

  const sentCount = user.contentSchedule?.sentCount || 0;

  // Tartib bo'yicha keyingi 2 ta kontentni olish
  const contents = await ScheduledContent.find({ channelId })
    .sort({ channelMessageId: 1 })
    .skip(sentCount)
    .limit(MESSAGES_PER_DAY);

  if (contents.length === 0) return 0;

  let sent = 0;
  for (const content of contents) {
    try {
      await bot.copyMessage(user.telegramId, content.channelId, content.channelMessageId);
      sent++;
    } catch (err) {
      if (err.response?.statusCode === 403) {
        // Foydalanuvchi botni bloklagan
        await User.updateOne({ _id: user._id }, { isActive: false });
        logger.info(`User ${user.telegramId} blocked bot, marked inactive`);
        break;
      }
      if (err.response?.statusCode === 400) {
        // Xabar o'chirilgan yoki topilmadi - o'tkazib yuborish
        logger.warn(`Skipping deleted message ${content.channelMessageId}`);
        sent++;
        continue;
      }
      // Vaqtinchalik xato - to'xtatish, keyingi safar qayta urinish
      logger.error(`Error copying msg ${content.channelMessageId} to ${user.telegramId}:`, err.message);
      break;
    }
  }

  if (sent > 0) {
    await User.updateOne(
      { _id: user._id },
      {
        $inc: { 'contentSchedule.sentCount': sent },
        $set: { 'contentSchedule.lastSentAt': new Date() },
      }
    );
  }

  return sent;
};

export const startContentDelivery = (bot) => {
  const channelId = process.env.CONTENT_CHANNEL_ID;
  if (!channelId) {
    logger.info('CONTENT_CHANNEL_ID not set, content delivery disabled');
    return;
  }

  // Har kuni 9:00 UZT (4:00 UTC)
  cron.schedule('0 4 * * *', async () => {
    logger.info('Content delivery cron running');

    try {
      const users = await User.find({
        'onboarding.isCompleted': true,
        'contentSchedule.startDate': { $exists: true, $ne: null },
        isActive: true,
      });

      const now = new Date();
      const todayUZT = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      const todayStr = todayUZT.toISOString().split('T')[0];

      let deliveredCount = 0;

      for (const user of users) {
        // Bugun allaqachon jo'natilgan bo'lsa - o'tkazib yuborish
        if (user.contentSchedule.lastSentAt) {
          const lastSentUZT = new Date(user.contentSchedule.lastSentAt.getTime() + 5 * 60 * 60 * 1000);
          if (lastSentUZT.toISOString().split('T')[0] === todayStr) continue;
        }

        const sent = await sendContentToUser(bot, user);
        if (sent > 0) deliveredCount++;
      }

      logger.info(`Content delivery completed: ${deliveredCount} users received content`);
    } catch (err) {
      logger.error('Content delivery cron error:', err);
    }
  });

  logger.info('Content delivery scheduler started (daily 9:00 UZT)');
};

export default { sendContentToUser, startContentDelivery };
