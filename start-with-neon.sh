#!/bin/bash

# Скрипт для запуска приложения с принудительным использованием Neon DB

# Устанавливаем переменные окружения
export DATABASE_PROVIDER=neon
export FORCE_NEON_DB=true
export DISABLE_REPLIT_DB=true
export OVERRIDE_DB_PROVIDER=neon
export NODE_ENV=production
export SKIP_PARTITION_CREATION=true
export IGNORE_PARTITION_ERRORS=true

# Запускаем приложение с корректными настройками
echo "🚀 Запуск UniFarm с принудительным использованием Neon DB"
node start-neon-safe.mjs