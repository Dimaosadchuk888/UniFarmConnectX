#!/bin/bash

# Скрипт для запуска и проверки PostgreSQL на Replit
echo "=== Запуск PostgreSQL на Replit ==="

# Цвета для консоли
RESET='\033[0m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'

# Проверяем, запущен ли уже PostgreSQL
echo -e "${CYAN}Проверка статуса PostgreSQL...${RESET}"
pg_status=$(pg_ctl status 2>&1)

if [[ "$pg_status" == *"server is running"* ]]; then
  echo -e "${GREEN}PostgreSQL уже запущен!${RESET}"
else
  echo -e "${YELLOW}PostgreSQL не запущен, запускаем...${RESET}"
  
  # Инициализируем базу данных, если это еще не сделано
  if [ ! -d "$HOME/.postgresql/data" ]; then
    echo -e "${CYAN}Инициализация базы данных PostgreSQL...${RESET}"
    mkdir -p $HOME/.postgresql/data
    pg_ctl initdb -D $HOME/.postgresql/data
  fi
  
  # Запускаем PostgreSQL, указывая директорию сокетов в ~/.postgresql/sockets
  echo -e "${CYAN}Создание директории для сокетов PostgreSQL...${RESET}"
  mkdir -p $HOME/.postgresql/sockets
  
  echo -e "${CYAN}Запуск сервера PostgreSQL...${RESET}"
  pg_ctl -D $HOME/.postgresql/data -l $HOME/.postgresql/logfile -o "-k $HOME/.postgresql/sockets" start
  
  # Проверяем, успешно ли запущен PostgreSQL
  sleep 3
  pg_status=$(pg_ctl status 2>&1)
  
  # Проверяем успешность запуска сначала по pg_ctl status, затем по наличию сокета
  if [[ "$pg_status" == *"server is running"* ]] || [ -S "${HOME}/.postgresql/sockets/.s.PGSQL.5432" ]; then
    echo -e "${GREEN}PostgreSQL успешно запущен!${RESET}"
    echo -e "${CYAN}Сокет: ${HOME}/.postgresql/sockets/.s.PGSQL.5432${RESET}"
    
    # Дополнительная проверка на доступность сервера
    if PGHOST=${HOME}/.postgresql/sockets psql -d postgres -c "SELECT 1" >/dev/null 2>&1; then
      echo -e "${GREEN}Соединение с сервером проверено успешно.${RESET}"
    else
      echo -e "${YELLOW}Сервер запущен, но соединение не тестировано. Продолжаем настройку...${RESET}"
    fi
  else
    echo -e "${RED}Не удалось запустить PostgreSQL!${RESET}"
    echo "Лог ошибки:"
    cat $HOME/.postgresql/logfile
    exit 1
  fi
fi

# Проверяем наличие базы данных postgres
echo -e "${CYAN}Проверка наличия базы данных 'postgres'...${RESET}"
if PGHOST=${HOME}/.postgresql/sockets PGUSER=runner psql -l | grep -q postgres; then
  echo -e "${GREEN}База данных 'postgres' существует${RESET}"
else
  echo -e "${YELLOW}Создание базы данных 'postgres'...${RESET}"
  PGHOST=${HOME}/.postgresql/sockets PGUSER=runner createdb postgres
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}База данных 'postgres' успешно создана${RESET}"
  else
    echo -e "${RED}Ошибка при создании базы данных 'postgres'${RESET}"
    echo -e "${YELLOW}Пробуем создать суперпользователя 'runner'...${RESET}"
    
    # Попытка создать пользователя runner как суперпользователя
    PGHOST=${HOME}/.postgresql/sockets psql -d template1 -c "CREATE ROLE runner WITH SUPERUSER LOGIN PASSWORD '';" || true
    PGHOST=${HOME}/.postgresql/sockets PGUSER=runner psql -d template1 -c "CREATE DATABASE postgres OWNER runner;" || true
    
    # Пробуем подключиться снова
    if PGHOST=${HOME}/.postgresql/sockets PGUSER=runner psql -l | grep -q postgres; then
      echo -e "${GREEN}База данных 'postgres' успешно создана${RESET}"
    else
      echo -e "${RED}Не удалось создать базу данных 'postgres'${RESET}"
      exit 1
    fi
  fi
fi

# Вывод информации о соединении
echo -e "${BLUE}=== Информация о соединении с PostgreSQL ===${RESET}"
echo -e "${CYAN}PGHOST (для .env): localhost${RESET}"
echo -e "${CYAN}PGHOST (для psql): ${HOME}/.postgresql/sockets${RESET}"
echo -e "${CYAN}PGPORT: 5432${RESET}"
echo -e "${CYAN}PGUSER: runner${RESET}"
echo -e "${CYAN}PGDATABASE: postgres${RESET}"
echo -e "${CYAN}DATABASE_URL: postgresql://runner@localhost:5432/postgres?host=${HOME}/.postgresql/sockets${RESET}"
echo -e "${BLUE}=== PostgreSQL готов к использованию ===${RESET}"

# Проверяем соединение с базой данных
echo -e "${CYAN}Тестирование соединения с базой данных...${RESET}"
if PGHOST=${HOME}/.postgresql/sockets PGUSER=runner psql -d postgres -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}Соединение с базой данных успешно установлено!${RESET}"
  echo -e "${CYAN}Версия PostgreSQL:${RESET}"
  PGHOST=${HOME}/.postgresql/sockets PGUSER=runner psql -d postgres -c "SELECT version();"
else
  echo -e "${RED}Не удалось подключиться к базе данных!${RESET}"
  echo -e "${YELLOW}Попытка выявить проблему...${RESET}"
  pg_isready -h ${HOME}/.postgresql/sockets
  echo -e "${YELLOW}Пользователи PostgreSQL:${RESET}"
  PGHOST=${HOME}/.postgresql/sockets psql -d template1 -c "SELECT usename FROM pg_user;" || echo "Не удалось получить список пользователей"
  exit 1
fi

echo -e "${GREEN}PostgreSQL успешно запущен и готов к использованию!${RESET}"