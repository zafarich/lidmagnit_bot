const ADMIN_TELEGRAM_IDS = (process.env.ADMIN_TELEGRAM_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const adminAuth = (req, res, next) => {
  const telegramId = req.headers['x-telegram-id'];

  if (!telegramId || !ADMIN_TELEGRAM_IDS.includes(String(telegramId))) {
    return res.status(403).json({ error: 'Ruxsat berilmagan' });
  }

  next();
};

export default adminAuth;
