#!/bin/bash

# Скрипт для запуска приложения с принудительным использованием Neon DB
# Автоматически загружает настройки из .env.neon

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
RESET='\033[0m'

# Функция для вывода сообщений с цветом
log() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${RESET}"
}

# Функция для загрузки переменных из .env.neon
load_env() {
  log $BLUE "🔄 Загрузка настроек из .env.neon..."
  
  if [ ! -f .env.neon ]; then
    log $RED "❌ Файл .env.neon не найден!"
    return 1
  fi
  
  # Загружаем переменные из .env.neon
  export $(grep -v '^#' .env.neon | xargs)
  
  # Проверяем наличие основных переменных
  if [ -z "$DATABASE_URL" ]; then
    log $RED "❌ Отсутствует DATABASE_URL в .env.neon!"
    return 1
  fi
  
  # Принудительно устанавливаем переменные для Neon DB
  export DATABASE_PROVIDER=neon
  export USE_LOCAL_DB_ONLY=false
  export FORCE_NEON_DB=true
  export DISABLE_REPLIT_DB=true
  export OVERRIDE_DB_PROVIDER=neon
  
  # Вывод настроек с маскировкой DATABASE_URL
  log $GREEN "✅ Настройки загружены:"
  log $RESET "  DATABASE_PROVIDER=$DATABASE_PROVIDER"
  log $RESET "  USE_LOCAL_DB_ONLY=$USE_LOCAL_DB_ONLY"
  log $RESET "  FORCE_NEON_DB=$FORCE_NEON_DB"
  log $RESET "  DATABASE_URL=$(echo $DATABASE_URL | sed 's/:[^:]*@/:\*\*\*@/')"
  
  return 0
}

# Проверка подключения к Neon DB
check_neon_connection() {
  log $BLUE "🔍 Проверка подключения к Neon DB..."
  
  # Запускаем проверку подключения
  node check-neon-db.js
  
  # Проверяем код возврата
  if [ $? -ne 0 ]; then
    log $RED "❌ Проверка подключения к Neon DB не удалась!"
    return 1
  fi
  
  return 0
}

# Запуск приложения
start_app() {
  log $MAGENTA "\n🚀 Запуск приложения с Neon DB..."
  
  # Устанавливаем переменные окружения для запуска
  export NODE_ENV=production
  export PORT=${PORT:-3000}
  
  # Запуск приложения
  node dist/index.js
}

# Основная логика скрипта
main() {
  log $CYAN "=== UniFarm с Neon DB ==="
  
  # Загружаем переменные окружения
  if ! load_env; then
    log $RED "❌ Ошибка загрузки настроек из .env.neon"
    exit 1
  fi
  
  # Проверяем подключение к Neon DB
  if ! check_neon_connection; then
    log $YELLOW "⚠️ Проблемы с подключением к Neon DB!"
    read -p "Продолжить запуск? (y/n): " continue_launch
    
    if [ "$continue_launch" != "y" ]; then
      log $YELLOW "Запуск отменен."
      exit 1
    fi
  fi
  
  # Стартуем приложение
  start_app
}

# Обработка сигналов завершения
trap 'log $YELLOW "\n⚠️ Получен сигнал завершения. Останавливаем приложение..."; exit 0' SIGINT SIGTERM

# Запуск основной функции
main