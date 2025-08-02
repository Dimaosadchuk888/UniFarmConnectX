#!/bin/bash

echo "=== ПЕРЕЗАПУСК СЕРВЕРА И ОЧИСТКА КЕША ==="
echo ""

# 1. Останавливаем все процессы Node.js
echo "1. Остановка процессов..."
pkill -f "node" || true
pkill -f "tsx" || true
pkill -f "npm" || true

# 2. Очистка кеша Node.js
echo "2. Очистка кеша..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .next 2>/dev/null || true
rm -rf dist 2>/dev/null || true

# 3. Очистка временных файлов
echo "3. Очистка временных файлов..."
rm -rf tmp/* 2>/dev/null || true

# 4. Задержка для полной остановки
echo "4. Ожидание полной остановки..."
sleep 3

# 5. Перезапуск сервера
echo "5. Запуск сервера..."
npm run dev &

echo ""
echo "✅ Сервер перезапущен!"
echo "✅ Кеш очищен!"
echo ""
echo "Подождите 10-15 секунд для полной инициализации..."