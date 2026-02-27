# Backend - Express + MongoDB + Telegram Bot (JavaScript)

## Texnologiyalar

- **Express.js** - Web framework
- **MongoDB** - Database (Mongoose ODM)
- **JavaScript (ES Modules)** - Modern JS with import/export
- **node-telegram-bot-api** - Telegram bot integration
- **Winston** - Logging

## Folder Structure

```
backend/
├── src/
│   ├── bot/              # Telegram bot handlers
│   │   └── handlers.js   # Bot command handlers
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection
│   │   └── bot.js        # Telegram bot setup
│   ├── controllers/      # Route controllers (bo'sh)
│   ├── middleware/       # Express middleware (bo'sh)
│   ├── models/           # Mongoose models
│   │   └── User.js       # User model with onboarding
│   ├── routes/           # Express routes
│   │   └── userRoutes.js # User API routes
│   ├── services/         # Business logic (bo'sh)
│   ├── types/            # JSDoc types (bo'sh)
│   ├── utils/            # Utility functions
│   │   └── logger.js     # Winston logger
│   └── index.js          # Entry point
├── logs/                 # Log files
├── .env.example          # Environment variables example
├── .gitignore
├── package.json
└── README.md
```

## O'rnatish

### 1. Dependencies o'rnatish

```bash
cd backend
npm install
```

### 2. Environment variables sozlash

```bash
cp .env.example .env
```

`.env` faylini tahrirlang:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/telegram-bot-db
TELEGRAM_BOT_TOKEN=your_bot_token_here
WEB_APP_URL=https://t.me/your_bot_username/app
```

### 3. Telegram Bot yaratish va sozlash

1. [@BotFather](https://t.me/botfather) ga kiring
2. `/newbot` komandasini yuboring
3. Bot nomi va username ni kiriting
4. Berilgan token ni `.env` fayliga qo'shing
5. Mini App yaratish: `/newapp` → Web App URL ni kiriting

### 4. MongoDB sozlash

**Variant 1: Local MongoDB**
```bash
mongod --dbpath /path/to/data
```

**Variant 2: MongoDB Atlas**
1. [MongoDB Atlas](https://cloud.mongodb.com/) dan cluster yarating
2. Connection string ni `.env` ga qo'shing

### 5. Server ni ishga tushirish

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

### User Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/api/users/me/:telegramId` | GET | Get user by telegramId |
| `/api/users/phone` | POST | Update phone number |
| `/api/users/onboarding/name` | POST | Save student name |
| `/api/users/onboarding/schedule` | POST | Save study schedule |
| `/api/users/onboarding/test-start` | POST | Mark test as started |

### API Examples

#### Get User
```bash
GET /api/users/me/123456789
```

#### Update Phone
```bash
POST /api/users/phone
Content-Type: application/json

{
  "telegramId": 123456789,
  "phoneNumber": "998901234567"
}
```

#### Save Name
```bash
POST /api/users/onboarding/name
Content-Type: application/json

{
  "telegramId": 123456789,
  "studentName": "Aziz"
}
```

#### Save Schedule
```bash
POST /api/users/onboarding/schedule
Content-Type: application/json

{
  "telegramId": 123456789,
  "period": "morning",
  "hour": 8
}
```

## Telegram Bot Flow

1. **User /start bosadi** → Contact ulashish so'raladi
2. **Contact ulashsa** → Telefon raqam bazaga saqlanadi, Web App tugmasi ko'rsatiladi
3. **Contact ulashmasdan Web App ochsa** → Telefon kiritish sahifasiga yo'naltiriladi

## User Model Fields

```javascript
{
  telegramId: Number,
  username: String,
  firstName: String,
  lastName: String,
  phoneNumber: String,
  onboarding: {
    isCompleted: Boolean,
    currentStep: String, // 'phone' | 'name' | 'schedule' | 'test-info' | 'test' | 'completed'
    studentName: String,
    studySchedule: {
      period: String, // 'morning' | 'afternoon' | 'evening'
      hour: Number
    },
    testStarted: Boolean
  }
}
```

## Scripts

- `npm run dev` - Development mode (nodemon bilan hot reload)
- `npm start` - Production mode

## ES Modules

Loyiha `"type": "module"` bilan ES Modules ishlatadi:

```javascript
// Import
import express from 'express';
import logger from './utils/logger.js';

// Export
export const myFunc = () => {};
export default myFunc;
```
