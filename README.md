# UniFarm - Telegram Mini App

Современное Telegram Mini App для криптофарминга с интеграцией TON Blockchain.

## Технологии

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, Shadcn/UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL, Drizzle ORM
- **Blockchain**: TON Connect, TON Core
- **Platform**: Telegram WebApp API

## Функции

- 🎮 Интерактивный дашборд с темным дизайном
- 💰 Система UNI фарминга
- 🎯 Система миссий и заданий
- 👥 Реферальная программа
- 💼 Интеграция с TON кошельком
- 📊 Статистика и аналитика

## Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd unifarm

# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env

# Запуск в режиме разработки
npm run dev
```

## Переменные окружения

```env
DATABASE_URL=postgresql://...
VITE_TELEGRAM_BOT_NAME=your_bot_name
VITE_APP_URL=your_app_url
```

## Разработка

Приложение использует модульную архитектуру:
- `client/` - React frontend
- `server/` - Express.js backend
- `shared/` - Общие типы и схемы
- `modules/` - Функциональные модули

## Деплой

Приложение готово для деплоя на Replit с автоматической интеграцией PostgreSQL.

## Лицензия

MIT License