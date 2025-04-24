#!/bin/bash

# Скрипт для запуска приложения в production режиме

echo "🚀 Запуск приложения в production режиме"

# Сборка приложения
echo "📦 Сборка приложения..."
npm run build

# Настройка webhook для Telegram бота
echo "🤖 Настройка webhook для Telegram бота..."
node setup-webhook-direct.js

# Запуск в production режиме
echo "🚀 Запуск production сервера..."
NODE_ENV=production node dist/index.js