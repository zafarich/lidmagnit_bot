import cron from 'node-cron';
import User from '../models/User.js';
import logger from '../utils/logger.js';

export const startReminder = (bot) => {
  // Run every hour at :00 (e.g., 9:00, 10:00, etc.)
  cron.schedule('0 * * * *', async () => {
    // Get current hour in Uzbekistan time (UTC+5)
    const now = new Date();
    const uzbekistanHour = (now.getUTCHours() + 5) % 24;

    logger.info(`Reminder cron running for hour: ${uzbekistanHour}`);

    try {
      const users = await User.find({
        'onboarding.studySchedule.hour': uzbekistanHour,
        'onboarding.isCompleted': true,
        isActive: true,
      });

      logger.info(`Found ${users.length} users for hour ${uzbekistanHour}`);

      for (const user of users) {
        const name = user.onboarding.studentName || user.firstName;
        const message = `${name}, dars tayyorlash vaqtingiz bo'ldi. Har kuni kichik qadamlar bilan natijaga erishing`;

        try {
          await bot.sendMessage(user.telegramId, message);
          logger.info(`Reminder sent to user ${user.telegramId}`);
        } catch (err) {
          logger.error(`Failed to send reminder to user ${user.telegramId}:`, err);
        }
      }
    } catch (err) {
      logger.error('Reminder cron error:', err);
    }
  });

  logger.info('Reminder scheduler started');
};
