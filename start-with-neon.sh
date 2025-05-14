#!/bin/bash

# Загружаем настройки из .env.neon
if [ -f .env.neon ]; then
  echo "✅ Загрузка настроек из .env.neon..."
  set -a
  source .env.neon
  set +a
  echo "✅ Настройки загружены"
else
  echo "❌ Файл .env.neon не найден!"
  exit 1
fi

# Принудительно устанавливаем ключевые переменные
export FORCE_NEON_DB=true
export DISABLE_REPLIT_DB=true
export OVERRIDE_DB_PROVIDER=neon
export DATABASE_PROVIDER=neon
export USE_LOCAL_DB_ONLY=false
export NODE_ENV=production

# Проверка подключения к Neon DB через выделенный скрипт
echo "🔄 Проверка подключения к Neon DB..."
node check-neon-db.cjs

# Запускаем приложение
echo "🚀 Запуск приложения с Neon DB..."
npm start