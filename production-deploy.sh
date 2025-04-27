#!/bin/bash

# Скрипт для запуска приложения в production-режиме
# Использование: ./production-deploy.sh

echo "🚀 Начинаем production deploy..."

# Останавливаем любые активные процессы Node.js
echo "🛑 Останавливаем запущенные процессы..."
pkill -f "node " || true
pkill -f "tsx " || true
pkill -f "npm " || true
sleep 1

# Очищаем дистрибутив для чистого билда
echo "🧹 Удаляем старый билд..."
rm -rf dist
sleep 1

# Собираем приложение
echo "🔨 Собираем production-билд приложения..."
npm run build
sleep 1

# Запускаем приложение в production-режиме
echo "📦 Запускаем приложение в production режиме..."
NODE_ENV=production node dist/index.js