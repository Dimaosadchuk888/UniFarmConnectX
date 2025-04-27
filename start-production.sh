#!/bin/bash

# Скрипт для запуска приложения в production режиме
# Устанавливает NODE_ENV=production для корректной работы Telegram WebApp
# Copyright © 2025 UniFarm

echo "🚀 Starting UniFarm Telegram Mini App in PRODUCTION mode..."

# Проверка наличия файла .env
if [ ! -f .env ]; then
  echo "⚠️ .env file not found. Creating default configuration..."
  echo "NODE_ENV=production" > .env
  echo "PORT=5000" >> .env
else
  # Убедимся, что NODE_ENV=production в .env
  if grep -q "NODE_ENV=" .env; then
    # Заменяем значение NODE_ENV, если оно уже есть
    sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
  else
    # Добавляем NODE_ENV=production, если его нет
    echo "NODE_ENV=production" >> .env
  fi
fi

# Принудительно устанавливаем NODE_ENV=production в окружении, чтобы он был доступен сразу
export NODE_ENV=production

# Проверяем доступность TELEGRAM_BOT_TOKEN
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "⚠️ TELEGRAM_BOT_TOKEN is not set in environment. Please set it for proper Telegram functionality."
  echo "You can set it with: export TELEGRAM_BOT_TOKEN=your_bot_token"
fi

# Проверяем, была ли выполнена сборка клиента
if [ ! -d "dist/public" ]; then
  echo "⚠️ Client build not found. Building client..."
  npm run build
fi

# Запуск сервера в production режиме
echo "🌐 Starting server in PRODUCTION mode (NODE_ENV=$NODE_ENV)..."
node dist/index.js