#!/bin/bash

# Скрипт для запуска приложения в production-режиме

echo "🚀 Запуск приложения в production-режиме..."

# Остановка текущего development-сервера (если запущен)
# killall node 2>/dev/null || true

# Сборка приложения для production
echo "🔧 Сборка production-версии приложения..."
npm run build

# Настройка бота
echo "🤖 Настройка Telegram бота для работы с пользователями..."
./setup-bot-for-users.sh

# Запуск в production-режиме
echo "🚀 Запуск production-сервера..."
NODE_ENV=production node dist/index.js