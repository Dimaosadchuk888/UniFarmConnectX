#!/bin/bash

# Скрипт для деплоя приложения в Production режиме
# Этот скрипт подготавливает проект к деплою и настраивает необходимые переменные окружения

# Проверяем наличие токена бота
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Ошибка: TELEGRAM_BOT_TOKEN не найден в переменных окружения"
  echo "Необходимо добавить TELEGRAM_BOT_TOKEN в секреты проекта"
  exit 1
fi

# Устанавливаем переменные окружения
export NODE_ENV=production
export PRODUCTION_DOMAIN="https://uni-farm-connect-2-misterxuniverse.replit.app"
export TELEGRAM_MINI_APP_URL="https://t.me/UniFarming_Bot/UniFarm"

echo "===== UniFarm Production Deployment ====="
echo "Environment: $NODE_ENV"
echo "Production Domain: $PRODUCTION_DOMAIN"
echo "Telegram Mini App URL: $TELEGRAM_MINI_APP_URL"
echo "========================================"

# Компилируем клиентскую часть приложения
echo "🔨 Сборка клиентской части..."
NODE_ENV=production npm run build

# Проверка успешности сборки
if [ $? -ne 0 ]; then
  echo "❌ Ошибка при сборке клиентской части"
  exit 1
fi

echo "✅ Клиентская часть успешно собрана"

# Запускаем приложение в фоновом режиме
echo "🚀 Запуск приложения в production режиме..."
NODE_ENV=production tsx server/index.ts