#!/bin/bash

# Скрипт для прямого запуска приложения в Production режиме
# Запускает сервер с настроенными переменными, но без пересборки фронтенда

# Проверяем наличие токена бота
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "⚠️ Предупреждение: TELEGRAM_BOT_TOKEN не найден в переменных окружения"
  echo "Валидация Telegram initData может не работать корректно"
fi

# Устанавливаем переменные окружения
export NODE_ENV=production
export PRODUCTION_DOMAIN="https://uni-farm-connect-2-misterxuniverse.replit.app"
export TELEGRAM_MINI_APP_URL="https://t.me/UniFarming_Bot/UniFarm"

echo "===== UniFarm Production Mode ====="
echo "Environment: $NODE_ENV"
echo "Production Domain: $PRODUCTION_DOMAIN"
echo "Telegram Mini App URL: $TELEGRAM_MINI_APP_URL"
echo "Bot Token Status: ${TELEGRAM_BOT_TOKEN:+OK (найден)}"
echo "=================================="

# Запускаем приложение в production режиме
NODE_ENV=production tsx server/index.ts