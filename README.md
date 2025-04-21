# UniFarm - Telegram Mini App

UniFarm - платформа для криптовалютного фарминга, интегрированная с Telegram Mini App и системой рефералов.

## Особенности проекта

- Интеграция с Telegram Mini App
- Система рефералов и партнерская программа
- Криптовалютные фарминг-депозиты
- Интеграция с TON Blockchain
- Дневные бонусы и миссии

## Технологический стек

- Frontend: React, TypeScript, TailwindCSS
- Backend: Node.js, Express
- Database: PostgreSQL с Drizzle ORM
- Telegram: Telegram Bot API, Telegram Mini App API
- Blockchain: TON

## Настройка проекта

### Требования

- Node.js v18+
- PostgreSQL
- Telegram Bot Token

### Установка

1. Клонируйте репозиторий
2. Установите зависимости: `npm install`
3. Настройте переменные окружения (см. раздел ниже)
4. Запустите сервер: `npm run dev`

### Переменные окружения

Создайте файл `.env` или используйте системные переменные окружения Replit:

```
DATABASE_URL=postgresql://user:password@host:port/database
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

## Telegram Bot

Проект включает интеграцию с Telegram ботом для обеспечения дополнительной функциональности:

- Диагностические команды: `/ping`, `/info`, `/refcode`
- Автоматический webhook для получения обновлений от Telegram API
- Инструменты для настройки и управления вебхуком

Подробная инструкция по настройке Telegram бота доступна в документации: [docs/telegram-bot-setup.md](docs/telegram-bot-setup.md)

## Разработка

### Структура проекта

- `/client` - Фронтенд на React/TypeScript
- `/server` - Backend на Node.js/Express
- `/shared` - Общие типы и схемы данных
- `/docs` - Документация

### Важные компоненты

- `server/telegramBot.ts` - Функции для работы с Telegram Bot API
- `server/routes.ts` - API маршруты, включая webhook для Telegram
- `shared/schema.ts` - Схемы данных и типы для Drizzle ORM
- `client/src/pages` - React компоненты для страниц приложения

## Деплой

Для деплоя проекта:

1. Настройте переменные окружения в производственной среде
2. Запустите `npm run build` для сборки проекта
3. Запустите `node setup-webhook.mjs <URL вашего приложения>` для настройки Telegram webhook
4. Убедитесь, что вебхук корректно настроен, проверив информацию: `/api/telegram/webhook-info`

## Лицензия

Проект лицензирован под [MIT License](LICENSE).