#!/bin/bash

# Скрипт для запуска приложения с настройками Neon DB
# Автоматически загружает переменные окружения из .env.neon и запускает сервер

# Цвета для более читаемого вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}🚀 ЗАПУСК ПРИЛОЖЕНИЯ С NEON DB${NC}"
echo -e "${BLUE}===============================================${NC}"

# Проверяем наличие файла .env.neon
if [ ! -f ".env.neon" ]; then
  echo -e "${RED}❌ Ошибка: Файл .env.neon не найден!${NC}"
  echo -e "${YELLOW}Создайте файл .env.neon с настройками подключения к Neon DB${NC}"
  exit 1
fi

# Загружаем переменные из .env.neon
echo -e "${BLUE}📝 Загрузка переменных окружения из .env.neon...${NC}"
export $(grep -v '^#' .env.neon | xargs)

# Проверяем, что DATABASE_URL установлен
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ Ошибка: Переменная DATABASE_URL не найдена в .env.neon!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Переменные окружения загружены успешно${NC}"

# Сбрасываем конфликтующие переменные окружения
echo -e "${BLUE}🧹 Сброс конфликтующих переменных окружения...${NC}"
unset REPLIT_DB_URL
echo -e "${GREEN}✅ Переменные сброшены${NC}"

# Устанавливаем флаги принудительного использования Neon DB
echo -e "${BLUE}🔧 Установка флагов принудительного использования Neon DB...${NC}"
export FORCE_NEON_DB=true
export DISABLE_REPLIT_DB=true
export OVERRIDE_DB_PROVIDER=neon
export DATABASE_PROVIDER=neon
export USE_LOCAL_DB_ONLY=false
echo -e "${GREEN}✅ Флаги установлены${NC}"

# Показываем настройки
echo -e "${BLUE}📋 Текущие настройки:${NC}"
echo -e "  DATABASE_PROVIDER=${YELLOW}${DATABASE_PROVIDER}${NC}"
echo -e "  FORCE_NEON_DB=${YELLOW}${FORCE_NEON_DB}${NC}"
echo -e "  DATABASE_URL=${YELLOW}$(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')${NC}"

echo -e "${BLUE}===============================================${NC}"
echo -e "${GREEN}🚀 ЗАПУСК СЕРВЕРА${NC}"
echo -e "${BLUE}===============================================${NC}"

# Запускаем сервер с использованием существующего JS-скрипта
node start-with-neon-db.js