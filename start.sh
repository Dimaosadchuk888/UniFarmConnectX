#!/bin/bash

# Запуск приложения с Neon DB
echo "🚀 Запуск UniFarm с Neon DB..."

# Установка переменных окружения
export DATABASE_PROVIDER=neon
export FORCE_NEON_DB=true
export DISABLE_REPLIT_DB=true
export OVERRIDE_DB_PROVIDER=neon
export SKIP_PARTITION_CREATION=true
export IGNORE_PARTITION_ERRORS=true

# Запуск приложения
node dist/index.js