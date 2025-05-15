#!/bin/bash

# Скрипт для запуска сервера с принудительным использованием Neon DB
# Автор: AI Developer
# Дата: 14.05.2025

# Устанавливаем переменные окружения для Neon DB
export FORCE_NEON_DB=true
export DATABASE_PROVIDER=neon
export DISABLE_REPLIT_DB=true
export USE_LOCAL_DB_ONLY=false
export NODE_ENV=production

# Загружаем настройки из .env.neon, если они есть
if [ -f .env.neon ]; then
  echo "Загружаем настройки из .env.neon..."
  
  # Создаем временный файл для хранения переменных
  temp_file=$(mktemp)
  
  # Читаем .env.neon и экспортируем переменные
  cat .env.neon | grep -v '^#' | grep '=' | while read -r line; do
    # Проверяем, что строка не пустая
    if [ -n "$line" ]; then
      # Разделяем строку по первому знаку равенства
      key=$(echo $line | cut -d= -f1)
      value=$(echo $line | cut -d= -f2-)
      
      # Экспортируем переменную
      echo "export $key=\"$value\"" >> $temp_file
    fi
  done
  
  # Загружаем переменные в текущую сессию
  source $temp_file
  
  # Удаляем временный файл
  rm $temp_file
  
  echo "✅ Настройки Neon DB загружены"
else
  echo "⚠️ Файл .env.neon не найден!"
  echo "Проверьте наличие файла .env.neon с настройками подключения к Neon DB"
  exit 1
fi

# Проверяем, что у нас есть DATABASE_URL для Neon DB
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Ошибка: Переменная DATABASE_URL не установлена!"
  echo "Убедитесь, что файл .env.neon содержит переменную DATABASE_URL с правильным URL для Neon DB"
  exit 1
fi

echo "🚀 Запуск сервера с принудительным использованием Neon DB..."
echo "DATABASE_PROVIDER=$DATABASE_PROVIDER"
echo "FORCE_NEON_DB=$FORCE_NEON_DB"
echo "NODE_ENV=$NODE_ENV"

# Запускаем сервер
node start-unified.js