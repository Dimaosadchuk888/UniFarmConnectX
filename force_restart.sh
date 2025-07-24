#!/bin/bash
echo "🔄 Принудительная перезагрузка сервера..."

# Останавливаем все Node.js процессы
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
sleep 2

# Очищаем временные файлы (безопасно)
rm -rf tmp/* 2>/dev/null || true
rm -rf logs/server.log 2>/dev/null || true

echo "✅ Процессы остановлены, кеши очищены"

# Запускаем сервер заново
cd /home/runner/workspace
npx tsx server/index.ts