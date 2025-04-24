#!/bin/bash

# Сборка production версии
echo "Собираем production версию приложения..."
npm run build

# Запуск в production режиме
echo "Запускаем приложение в production режиме..."
NODE_ENV=production node dist/index.js