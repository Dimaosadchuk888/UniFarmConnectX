# UniFarm - Telegram Mini App

UniFarm - платформа для криптовалютного фарминга, интегрированная с Telegram Mini App и системой рефералов.

## Особенности проекта

- Интеграция с Telegram Mini App
- Система рефералов и партнерская программа
- Криптовалютные фарминг-депозиты
- Интеграция с TON Blockchain
- Дневные бонусы и миссии

## Технологический стек

- Frontend: React, TypeScript, TailwindCSS, Shadcn/UI
- Backend: Node.js, Express
- Database: PostgreSQL с Drizzle ORM
- API: Унифицированный API-сервис с улучшенной обработкой ошибок
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

Создайте файл `.env` на основе `.env.example` или используйте Secrets Replit:

```
# Режим приложения
NODE_ENV=production

# Базовые настройки
PORT=3000

# Telegram
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
VITE_BOT_USERNAME=UniFarming_Bot

# База данных
DATABASE_URL=postgresql://user:password@host:port/database

# Административный доступ
ADMIN_SECRET_KEY=секретный_ключ_для_админ_функций
```

**Важно:** В production окружении Replit все секреты (токены, ключи) должны храниться в Secrets, а не в файле `.env`.

Подробная информация о настройке переменных окружения доступна в файле [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md).

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
- `client/src/lib/apiService.ts` - Унифицированный сервис для API-запросов
- `client/src/pages` - React компоненты для страниц приложения

### Документация

- `docs/API_SERVICE_MIGRATION.md` - Руководство по миграции на новый API-сервис
- `docs/API_SERVICE_TESTING.md` - Рекомендации по тестированию API-компонентов

## Деплой в Replit

Для деплоя проекта в Replit:

1. Настройте переменные окружения в Secrets Replit
2. Для ручного деплоя используйте скрипт:
   ```bash
   bash deploy-production.sh
   ```
3. Для настройки Telegram бота после деплоя:
   ```bash
   node setup-telegram-webhook.js
   node setup-telegram-mini-app.js
   ```
4. Проверьте корректность настроек webhook:
   ```bash
   node check-bot-settings.js
   ```

### Режимы запуска

* **Разработка**: `npm run dev` или `bash restart.sh` 
* **Разработка в режиме production**: `node dev-production.cjs` или `bash restart-prod.sh`
* **Production**: `npm run build && npm run start`
* **Деплой в Replit**: `bash deploy-production.sh && bash start-production.sh`

Подробная информация о процессе деплоя доступна в [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) и [DEPLOY_REPLIT_PRODUCTION.md](DEPLOY_REPLIT_PRODUCTION.md).

## Лицензия

Проект лицензирован под [MIT License](LICENSE).