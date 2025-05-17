#!/bin/bash
# Скрипт для быстрой настройки UniFarm в облачной среде

# Проверка наличия необходимых утилит
command -v npm >/dev/null 2>&1 || { echo "Требуется npm, установите Node.js"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Требуется node, установите Node.js"; exit 1; }

echo "========================================"
echo "  Настройка UniFarm для Cloud"
echo "========================================"

# Создание файла .env из примера, если он отсутствует
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Создан файл .env из примера"
    echo "ВНИМАНИЕ: Отредактируйте файл .env и укажите правильные значения"
  else
    echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unifarm" > .env
    echo "NODE_ENV=production" >> .env
    echo "PORT=3000" >> .env
    echo "FORCE_NEON_DB=true" >> .env
    echo "OVERRIDE_DB_PROVIDER=neon" >> .env
    echo "SKIP_TELEGRAM_CHECK=true" >> .env
    echo "ALLOW_BROWSER_ACCESS=true" >> .env
    echo "Создан базовый файл .env"
    echo "ВНИМАНИЕ: Отредактируйте файл .env и укажите правильные значения"
  fi
fi

# Установка зависимостей
echo "Установка необходимых зависимостей..."
npm install --production

# Создание директорий для логов, если они отсутствуют
mkdir -p logs
mkdir -p temp

# Настройка прав на исполнение скриптов
chmod +x run-cloud.sh

echo "========================================"
echo "  Настройка завершена"
echo "========================================"
echo "Для запуска приложения используйте:"
echo "./run-cloud.sh"
echo ""
echo "Или запустите вручную:"
echo "node start-browser-access.cjs"
echo "========================================"