#!/bin/bash
# Скрипт для запуска UniFarm в облачной среде

# Загрузка переменных окружения из .env файла, если он существует
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "Загружены переменные окружения из .env файла"
else
  echo "Файл .env не найден, используются значения по умолчанию"
fi

# Установка необходимых переменных окружения, если они не указаны
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export FORCE_NEON_DB=${FORCE_NEON_DB:-true}
export OVERRIDE_DB_PROVIDER=${OVERRIDE_DB_PROVIDER:-neon}
export SKIP_TELEGRAM_CHECK=${SKIP_TELEGRAM_CHECK:-true}
export ALLOW_BROWSER_ACCESS=${ALLOW_BROWSER_ACCESS:-true}

echo "========================================"
echo "  Запуск UniFarm в Cloud"
echo "========================================"
echo "DATABASE_PROVIDER = ${DATABASE_PROVIDER:-neon}"
echo "FORCE_NEON_DB = $FORCE_NEON_DB"
echo "OVERRIDE_DB_PROVIDER = $OVERRIDE_DB_PROVIDER"
echo "SKIP_TELEGRAM_CHECK = $SKIP_TELEGRAM_CHECK"
echo "ALLOW_BROWSER_ACCESS = $ALLOW_BROWSER_ACCESS"
echo "NODE_ENV = $NODE_ENV"
echo "PORT = $PORT"
echo "========================================"
echo "Start time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "========================================"

# Проверка DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "ВНИМАНИЕ: Переменная DATABASE_URL не установлена!"
  echo "Приложение может работать некорректно без подключения к базе данных."
  echo "Укажите DATABASE_URL в файле .env или в переменных окружения."
  echo ""
fi

# Запуск приложения
node start-browser-access.cjs