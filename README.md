
# UniFarm - Telegram Mini App для Криптофармингу

🌾 **UniFarm** - інноваційний Telegram Mini App для фармингу UNI та TON токенів з реферальною системою та бустами.

## 🚀 Особливості

- **Криптофарминг**: Автоматичний фарминг UNI та TON токенів
- **Реферальна система**: 20-рівнева система винагород
- **Місії та бусти**: Додаткові завдання для збільшення доходу
- **TON Connect**: Інтеграція з TON гаманцями
- **Real-time оновлення**: WebSocket підтримка для живих даних

## 🛠️ Технології

- **Backend**: Node.js, TypeScript, Express
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **База даних**: Supabase (PostgreSQL)
- **Платформа**: Telegram Mini App
- **Deployment**: Replit
- **Моніторинг**: Sentry

## 📦 Встановлення

### Вимоги
- Node.js 18+
- npm або yarn
- Supabase проєкт
- Telegram Bot Token

### Налаштування

1. **Клонування репозиторію:**
```bash
git clone <repository-url>
cd unifarm
```

2. **Встановлення залежностей:**
```bash
npm install
```

3. **Налаштування змінних середовища:**
Створіть файл `.env` на основі `.env.example`:

```env
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Security
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# Sentry (опціонально)
SENTRY_DSN=your-sentry-dsn

# Environment
NODE_ENV=development
PORT=3000
```

## 🚀 Запуск

### Development режим:
```bash
npm run dev
```

### Production режим:
```bash
npm run build
npm start
```

### Перевірка здоров'я системи:
```bash
npm run health
```

## 📋 API Endpoints

### Основні маршрути:
- `GET /health` - Перевірка стану системи
- `GET /api/v2/users/profile` - Профіль користувача
- `GET /api/v2/wallet/balance` - Баланс гаманця
- `POST /api/v2/farming/start` - Запуск фармингу
- `GET /api/v2/missions/list` - Список місій
- `POST /webhook` - Telegram webhook

📖 **[Повний список 79 API endpoints](docs/API_ENDPOINTS_FULL_LIST.md)**

### WebSocket:
- `ws://localhost:3000/ws` - Real-time з'єднання

## 🔧 Конфігурація Telegram Mini App

### Bot Commands:
- `/start` - Запуск UniFarm додатку

### Web App URL:
```
https://your-app-domain.replit.app
```

### Webhook URL:
```
https://your-app-domain.replit.app/webhook
```

## 📊 Архітектура

```
├── client/          # React frontend
├── server/          # Express backend
├── core/            # Основна логіка та утиліти
├── modules/         # Бізнес модулі
│   ├── auth/        # Автентифікація
│   ├── farming/     # Логіка фармингу
│   ├── wallet/      # Система гаманців
│   ├── missions/    # Місії та завдання
│   └── referral/    # Реферальна система
└── types/          # TypeScript типи
```

🗺️ **[Детальний roadmap розробки](docs/UNIFARM_PRODUCTION_ROADMAP.md)** - повна карта проекту з 95% готовністю до production

## 🏗️ Deployment на Replit

1. **Імпорт проєкту** в Replit
2. **Налаштування Secrets** через Replit Secrets
3. **Запуск** через кнопку Run або `npm run dev`

### Replit Secrets:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `SESSION_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `SENTRY_DSN` (опціонально)

## 🔐 Безпека

- Всі API ендпоінти захищені Telegram ініціалізаційними даними
- JWT токени для автентифікації
- Валідація та санітизація входних даних
- Rate limiting на критичних ендпоінтах
- Sentry моніторинг для відстеження помилок

## 📈 Моніторинг

- **Health Check**: `/health` endpoint
- **Sentry**: Автоматичне відстеження помилок
- **WebSocket**: Моніторинг з'єднань
- **Database**: Supabase метрики

## 🤝 Підтримка

Для питань та підтримки:
- Telegram: @your-support-bot
- Issues: GitHub Issues

## 📄 Ліцензія

MIT License - деталі в файлі `LICENSE`

---

**UniFarm** - Майбутнє криптофармингу в Telegram! 🚀
