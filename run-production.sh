#!/bin/bash

# Скрипт для быстрого запуска приложения в production режиме (для тестирования)
# Отличается от start-production.sh тем, что не выполняет полную сборку
# Copyright © 2025 UniFarm

echo "🚀 Testing UniFarm Telegram Mini App in PRODUCTION mode..."

# Устанавливаем переменные окружения для production
export NODE_ENV=production

# Проверяем доступность TELEGRAM_BOT_TOKEN
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "⚠️ TELEGRAM_BOT_TOKEN is not set in environment. Please set it for proper Telegram functionality."
  echo "You can set it with: export TELEGRAM_BOT_TOKEN=your_bot_token"
fi

# Проверяем наличие собранных файлов
if [ ! -f "dist/index.js" ]; then
  echo "❌ Server build not found. Running build..."
  npm run build
fi

echo "🌐 Starting server in PRODUCTION mode (NODE_ENV=$NODE_ENV)..."
NODE_ENV=production node dist/index.js