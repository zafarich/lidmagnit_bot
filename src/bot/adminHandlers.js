import ScheduledContent from '../models/ScheduledContent.js';
import logger from '../utils/logger.js';

const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map(id => Number(id.trim()))
  .filter(Boolean);

const isAdmin = (telegramId) => ADMIN_IDS.includes(telegramId);

export const setupAdminHandlers = (bot) => {
  const channelId = process.env.CONTENT_CHANNEL_ID;

  // Kanalga yangi post tushganda avtomatik indekslash
  if (channelId) {
    bot.on('channel_post', async (msg) => {
      if (String(msg.chat.id) !== channelId) return;

      try {
        await ScheduledContent.findOneAndUpdate(
          { channelId: String(msg.chat.id), channelMessageId: msg.message_id },
          { channelId: String(msg.chat.id), channelMessageId: msg.message_id },
          { upsert: true }
        );
        logger.info(`Channel post auto-indexed: msgId=${msg.message_id}`);
      } catch (err) {
        logger.error('Error auto-indexing channel post:', err);
      }
    });
  }

  // Admin kanaldan xabarni forward qilsa - qo'lda indekslash (eski postlar uchun)
  bot.on('message', async (msg) => {
    if (!msg.from || !isAdmin(msg.from.id)) return;
    if (!msg.forward_from_chat || !channelId) return;
    if (String(msg.forward_from_chat.id) !== channelId) return;

    try {
      await ScheduledContent.findOneAndUpdate(
        { channelId, channelMessageId: msg.forward_from_message_id },
        { channelId, channelMessageId: msg.forward_from_message_id },
        { upsert: true }
      );

      const total = await ScheduledContent.countDocuments({ channelId });
      await bot.sendMessage(msg.chat.id, `Kontent indekslandi! (Jami: ${total})`);
    } catch (err) {
      logger.error('Error manually indexing content:', err);
    }
  });

  // /listcontent - indekslangan kontentlar soni va kunlarga bo'linishi
  bot.onText(/\/listcontent/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;

    if (!channelId) {
      await bot.sendMessage(msg.chat.id, 'CONTENT_CHANNEL_ID sozlanmagan.');
      return;
    }

    try {
      const total = await ScheduledContent.countDocuments({ channelId });

      if (total === 0) {
        await bot.sendMessage(msg.chat.id, 'Hech qanday kontent indekslanmagan.');
        return;
      }

      const days = Math.ceil(total / 2);
      let message = `Jami kontent: ${total} ta\n`;
      message += `Kunlar soni: ${days} kun\n\n`;
      message += `Har kuni 2 ta xabar jo'natiladi:\n`;

      for (let d = 1; d <= days; d++) {
        const from = (d - 1) * 2 + 1;
        const to = Math.min(d * 2, total);
        message += `  Kun ${d}: postlar ${from}-${to}\n`;
      }

      await bot.sendMessage(msg.chat.id, message);
    } catch (err) {
      logger.error('Error listing content:', err);
      await bot.sendMessage(msg.chat.id, 'Xatolik yuz berdi.');
    }
  });

  // /resetcontent - barcha indekslangan kontentlarni o'chirish
  bot.onText(/\/resetcontent/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    if (!channelId) return;

    try {
      const result = await ScheduledContent.deleteMany({ channelId });
      await bot.sendMessage(msg.chat.id, `${result.deletedCount} ta kontent o'chirildi.`);
    } catch (err) {
      logger.error('Error resetting content:', err);
      await bot.sendMessage(msg.chat.id, 'Xatolik yuz berdi.');
    }
  });

  logger.info('Admin handlers setup complete');
};

export default { setupAdminHandlers };
