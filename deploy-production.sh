#!/bin/bash

# Скрипт для полного деплоя в production

echo "=== 🚀 Начинаем процесс деплоя в production ==="

# 1. Сборка проекта
echo "🔧 Собираем production версию приложения..."
npm run build

# 2. Настройка webhook для Telegram бота
echo "🔄 Настраиваем webhook для Telegram бота..."
./setup-production-webhook.sh

# 3. Запуск приложения в production режиме
echo "▶️ Запускаем приложение в production режиме..."
NODE_ENV=production node dist/index.js