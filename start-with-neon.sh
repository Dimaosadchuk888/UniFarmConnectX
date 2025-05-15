#!/bin/bash

# Унифицированный скрипт для запуска приложения с принудительным использованием Neon DB
# Соответствует требованиям ТЗ по деплою в Replit

# Устанавливаем переменные окружения согласно ТЗ
export DATABASE_PROVIDER=neon
export FORCE_NEON_DB=true
export DISABLE_REPLIT_DB=true
export OVERRIDE_DB_PROVIDER=neon
export NODE_ENV=production
export PORT=3000
export SKIP_PARTITION_CREATION=true
export IGNORE_PARTITION_ERRORS=true

# Проверяем наличие health.html в dist/public
if [ ! -f "dist/public/health.html" ]; then
  echo "❌ Файл health.html не найден в dist/public, копируем из server/public"
  mkdir -p dist/public
  cp server/public/health.html dist/public/ 2>/dev/null || echo "⚠️ Ошибка при копировании health.html"
fi

# Запускаем приложение с корректными настройками
echo "🚀 Запуск UniFarm с принудительным использованием Neon DB на порту $PORT"
# Используем непосредственно собранный файл для обеспечения стабильности
node dist/index.js