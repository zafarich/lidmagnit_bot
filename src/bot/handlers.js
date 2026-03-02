import logger from "../utils/logger.js";
import User from "../models/User.js";

// Web App URL - Mini App ochish uchun. Telegram API t.me havolalarini qabul qilmaydi, shuning uchun https majburiy.
const WEB_APP_URL = process.env.WEB_APP_URL || "https://example.com";

// Contact request button
const getContactButton = () => ({
  reply_markup: {
    keyboard: [
      [
        {
          text: "📱 Kontaktni ulashish",
          request_contact: true,
        },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
});

// Web App button
const getWebAppButton = () => ({
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "🚀 Test topshirish",
          web_app: {url: WEB_APP_URL},
        },
      ],
    ],
  },
});

export const setupBotHandlers = (bot) => {
  // Start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const username = msg.from?.username;
    const firstName = msg.from?.first_name;
    const lastName = msg.from?.last_name;

    try {
      // Find or create user
      let user = await User.findOne({telegramId});

      if (!user) {
        user = new User({
          telegramId,
          username,
          firstName,
          lastName,
        });
        await user.save();
        logger.info(`New user created: ${telegramId}`);
      }

      // Check if phone number exists
      if (!user.phoneNumber) {
        const welcomeMessage = `
👋 Assalomu alaykum, ${firstName || "Foydalanuvchi"}!

Botdan to'liq foydalanish uchun kontaktingizni ulashing.
        `;
        await bot.sendMessage(chatId, welcomeMessage, getContactButton());
      } else {
        // Phone exists, show web app button
        const welcomeBackMessage = `
✅ Xush kelibsiz, ${firstName || "Foydalanuvchi"}!

Siz allaqachon ro'yxatdan o'tgansiz.
Quyidagi tugma orqali dasturni ochishingiz mumkin:
        `;
        await bot.sendMessage(chatId, welcomeBackMessage, getWebAppButton());
      }
    } catch (error) {
      logger.error("Error in /start command:", error);
      await bot.sendMessage(
        chatId,
        "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      );
    }
  });

  // Handle contact sharing
  bot.on("contact", async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const contact = msg.contact;

    try {
      // Verify the contact belongs to the user
      if (contact.user_id !== telegramId) {
        await bot.sendMessage(
          chatId,
          "⚠️ Iltimos, o'zingizning kontaktingizni ulashing.",
          getContactButton(),
        );
        return;
      }

      // Update user with phone number
      const user = await User.findOneAndUpdate(
        {telegramId},
        {
          phoneNumber: contact.phone_number,
          "onboarding.currentStep": "name",
        },
        {new: true},
      );

      if (user) {
        const successMessage = `
✅ Rahmat! Telefon raqamingiz qabul qilindi.

Sinov testida qatnashish uchun quyidagi "Test topshirish" tugmasini bosing:
        `;
        await bot.sendMessage(chatId, successMessage, getWebAppButton());
        logger.info(`Phone number saved for user: ${telegramId}`);
      }
    } catch (error) {
      logger.error("Error saving contact:", error);
      await bot.sendMessage(
        chatId,
        "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      );
    }
  });

  // Help command
  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;

    const helpMessage = `
📋 *Yordam menyusi*

Mavjud komandalar:
• /start - Botni ishga tushirish
• /help - Bu menyuni ko'rsatish

Agar savollaringiz bo'lsa, admin bilan bog'laning.
    `;

    await bot.sendMessage(chatId, helpMessage, {parse_mode: "Markdown"});
  });

  // Handle errors
  bot.on("error", (error) => {
    logger.error("Telegram Bot error:", error);
  });

  // Handle polling errors
  bot.on("polling_error", (error) => {
    logger.error("Telegram Bot polling error:", error);
  });

  logger.info("Bot handlers setup complete");
};

export default {setupBotHandlers};
