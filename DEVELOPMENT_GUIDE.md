# Руководство по разработке UniFarm

## Режимы запуска

### Стандартный режим разработки
```bash
npm run dev

# ИЛИ с помощью скрипта
bash restart.sh
```
Запускает приложение в режиме разработки с `NODE_ENV=development`. В этом режиме:
- Активны все отладочные сообщения
- Используется Vite middleware для горячей перезагрузки
- Доступны все маршруты отладки

### Режим разработки с настройками production
```bash
# Использование ESM версии скрипта (основная версия)
node dev-production.js

# ИЛИ использование CommonJS версии (альтернатива)
node dev-production.cjs

# ИЛИ с помощью скрипта оболочки
bash restart-prod.sh
```
Запускает приложение в режиме разработки, но с `NODE_ENV=production`. Это полезно для:
- Тестирования Telegram WebApp API (которое работает только в production)
- Проверки корректности настроек production перед деплоем
- Отладки проблем, возникающих только в production окружении

### Production режим после сборки
```bash
npm run build
npm run start
```
Запускает собранное приложение в режиме production. Используется для:
- Финального тестирования перед деплоем
- Запуска в production окружении (Replit Deployments)

## Переменные окружения

### Основные переменные
- `NODE_ENV` - окружение (`development`/`production`)
- `PORT` - порт для запуска сервера (по умолчанию 3000)
- `DATABASE_URL` - строка подключения к PostgreSQL базе данных

### Переменные Telegram
- `TELEGRAM_BOT_TOKEN` - токен бота, полученный от BotFather
- `BOT_USERNAME` - имя бота для использования в коде (без символа @)

### Клиентские переменные
- `VITE_BOT_USERNAME` - имя бота для фронтенда
- `VITE_APP_NAME` - название приложения

### Административные переменные
- `ADMIN_SECRET_KEY` - секретный ключ для административных функций

## Настройка переменных окружения

1. Создайте файл `.env` на основе `.env.example`
2. Заполните все необходимые переменные

**Примечание**: В production на Replit чувствительные переменные (токены, ключи) должны храниться в Secrets, а не в файле `.env`.

## Скрипты

Проект включает набор вспомогательных скриптов для упрощения разработки и деплоя:

### Скрипты запуска
- `restart.sh` - Перезапуск в режиме разработки
- `restart-prod.sh` - Перезапуск в режиме разработки с переменными production
- `dev-production.js` / `dev-production.cjs` - Запуск в режиме production (ESM/CommonJS)

### Скрипты деплоя
- `deploy-production.sh` - Сборка и деплой на Replit
- `start-production.sh` - Запуск в production режиме
- `production-start.js` - Production запуск для Replit Deployment

### Скрипты настройки Telegram бота
- `setup-telegram-webhook.js` - Настройка webhook для Telegram бота
- `setup-telegram-mini-app.js` - Полная настройка Mini App в BotFather
- `check-bot-settings.js` - Проверка настроек бота
- `check-production-url.js` - Проверка URL приложения