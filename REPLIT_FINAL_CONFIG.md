# Финальная конфигурация UniFarm для Replit

## Переменные окружения для Replit Secrets

### Публичные переменные (можно добавить через Tools → Secrets):

```
APP_DOMAIN=https://uni-farm-connect-x-alinabndrnk99.replit.app
TELEGRAM_BOT_USERNAME=UniFarming_Bot
TELEGRAM_WEBAPP_NAME=UniFarm
CORS_ORIGINS=https://t.me,https://uni-farm-connect-x-alinabndrnk99.replit.app
VITE_TELEGRAM_BOT_USERNAME=UniFarming_Bot
VITE_TELEGRAM_WEBAPP_NAME=UniFarm
VITE_API_BASE_URL=/api/v2
VITE_APP_URL=https://uni-farm-connect-x-alinabndrnk99.replit.app
TELEGRAM_WEBAPP_URL=https://uni-farm-connect-x-alinabndrnk99.replit.app
TELEGRAM_WEBHOOK_URL=https://uni-farm-connect-x-alinabndrnk99.replit.app/webhook
```

### Чувствительные переменные (уже должны быть в Secrets):

```
SUPABASE_URL=https://wunnsvicbebssrjqedor.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TELEGRAM_BOT_TOKEN=7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug
JWT_SECRET=unifarm_jwt_secret_key_2025_production
NODE_ENV=production
PORT=3000
```

## Webhook конфигурация

Telegram webhook настроен на:
```
https://uni-farm-connect-x-alinabndrnk99.replit.app/webhook
```

## Проверка готовности

1. Приложение доступно: https://uni-farm-connect-x-alinabndrnk99.replit.app/
2. API эндпоинт: https://uni-farm-connect-x-alinabndrnk99.replit.app/api/v2/
3. Webhook для Telegram: https://uni-farm-connect-x-alinabndrnk99.replit.app/webhook
4. Health check: https://uni-farm-connect-x-alinabndrnk99.replit.app/health

## Статус обновлений

- ✅ Обновлены все конфигурационные файлы
- ✅ Удалены старые домены (osadchukdmitro2)
- ✅ Настроен новый домен (alinabndrnk99)
- ✅ Webhook зарегистрирован в Telegram
- ✅ CORS настроен для t.me и нового домена
- ✅ Все fallback URL обновлены