import ScheduledContent from '../models/ScheduledContent.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map(id => Number(id.trim()))
  .filter(Boolean);

const isAdmin = (telegramId) => ADMIN_IDS.includes(telegramId);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Broadcast kutayotgan adminlar: telegramId -> true
const broadcastPending = new Map();

export const setupAdminHandlers = (bot) => {
  const channelId = process.env.CONTENT_CHANNEL_ID;

  // /broadcast - admin istalgan turdagi xabarni barcha obunachilarga jo'natadi
  bot.onText(/\/broadcast/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;

    broadcastPending.set(msg.from.id, true);
    await bot.sendMessage(
      msg.chat.id,
      '📨 Broadcast uchun xabaringizni yuboring (matn, rasm, video, audio — istalgan tur).\n\nBekor qilish: /cancel'
    );
  });

  bot.onText(/\/cancel/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    if (broadcastPending.delete(msg.from.id)) {
      await bot.sendMessage(msg.chat.id, 'Broadcast bekor qilindi.');
    }
  });

  // Broadcast xabarini qabul qilish va barcha foydalanuvchilarga jo'natish
  bot.on('message', async (msg) => {
    if (!msg.from || !isAdmin(msg.from.id)) return;
    if (!broadcastPending.has(msg.from.id)) return;

    // Komandalarni e'tiborsiz qoldirish
    if (msg.text && msg.text.startsWith('/')) return;

    // Kanaldan forward qilingan xabar broadcast emas, indekslash uchun
    if (msg.forward_from_chat && channelId && String(msg.forward_from_chat.id) === channelId) return;

    broadcastPending.delete(msg.from.id);

    const statusMsg = await bot.sendMessage(msg.chat.id, '⏳ Broadcast boshlanmoqda...');

    try {
      const users = await User.find({
        'onboarding.isCompleted': true,
        isActive: true,
      });

      let sent = 0;
      let failed = 0;
      let blocked = 0;

      for (let i = 0; i < users.length; i++) {
        const chatId = users[i].telegramId;
        try {
          await bot.copyMessage(chatId, msg.chat.id, msg.message_id);
          sent++;
        } catch (err) {
          if (err.response?.statusCode === 403) {
            blocked++;
            await User.updateOne({ _id: users[i]._id }, { isActive: false });
          } else {
            failed++;
            logger.error(`Broadcast error for ${chatId}:`, err.message);
          }
        }

        // Rate limit: 35ms (~28 msg/sec)
        if (i < users.length - 1) {
          await delay(35);
        }
      }

      await bot.editMessageText(
        `✅ Broadcast tugadi!\n\n` +
        `Jami: ${users.length}\n` +
        `Yuborildi: ${sent}\n` +
        `Bloklangan: ${blocked}\n` +
        `Xato: ${failed}`,
        { chat_id: msg.chat.id, message_id: statusMsg.message_id }
      );
    } catch (err) {
      logger.error('Broadcast error:', err);
      await bot.editMessageText(
        '❌ Broadcast xatosi yuz berdi.',
        { chat_id: msg.chat.id, message_id: statusMsg.message_id }
      );
    }
  });

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

  // /reindex - kanaldan o'chirilgan postlarni bazadan tozalash
  bot.onText(/\/reindex/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    if (!channelId) {
      await bot.sendMessage(msg.chat.id, 'CONTENT_CHANNEL_ID sozlanmagan.');
      return;
    }

    const contents = await ScheduledContent.find({ channelId }).sort({ channelMessageId: 1 });
    if (contents.length === 0) {
      await bot.sendMessage(msg.chat.id, 'Indeksda hech qanday kontent yo\'q.');
      return;
    }

    const statusMsg = await bot.sendMessage(
      msg.chat.id,
      `⏳ ${contents.length} ta post tekshirilmoqda...`
    );

    let removed = 0;

    for (const content of contents) {
      try {
        // Postni adminga forward qilib tekshirish
        const forwarded = await bot.forwardMessage(msg.chat.id, channelId, content.channelMessageId);
        // Post mavjud — forward qilingan nusxani o'chirish
        await bot.deleteMessage(msg.chat.id, forwarded.message_id);
      } catch (err) {
        if (err.response?.statusCode === 400) {
          // Post kanaldan o'chirilgan — bazadan ham o'chirish
          await ScheduledContent.deleteOne({ _id: content._id });
          removed++;
        }
      }
      await delay(50);
    }

    const remaining = await ScheduledContent.countDocuments({ channelId });

    await bot.editMessageText(
      `✅ Reindex tugadi!\n\n` +
      `O'chirilgan postlar: ${removed} ta\n` +
      `Qolgan kontentlar: ${remaining} ta\n` +
      `Kunlar: ${Math.ceil(remaining / 2)} kun`,
      { chat_id: msg.chat.id, message_id: statusMsg.message_id }
    );
  });

  // /resetcontent - barcha indeks + foydalanuvchilar progressini tozalash
  bot.onText(/\/resetcontent/, async (msg) => {
    if (!isAdmin(msg.from.id)) return;
    if (!channelId) return;

    try {
      const contentResult = await ScheduledContent.deleteMany({ channelId });

      // Barcha foydalanuvchilarning kontent progressini ham reset qilish
      const userResult = await User.updateMany(
        { 'contentSchedule.sentCount': { $gt: 0 } },
        {
          $set: {
            'contentSchedule.sentCount': 0,
            'contentSchedule.lastSentAt': null,
            'contentSchedule.startDate': null,
          },
        }
      );

      await bot.sendMessage(
        msg.chat.id,
        `${contentResult.deletedCount} ta kontent o'chirildi.\n${userResult.modifiedCount} ta foydalanuvchi progressi reset qilindi.`
      );
    } catch (err) {
      logger.error('Error resetting content:', err);
      await bot.sendMessage(msg.chat.id, 'Xatolik yuz berdi.');
    }
  });

  logger.info('Admin handlers setup complete');
};

export default { setupAdminHandlers };
