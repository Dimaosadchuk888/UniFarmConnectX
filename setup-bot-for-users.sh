#!/bin/bash

# Скрипт для полной настройки бота для работы с реальными пользователями
# Подготавливает бота для использования в производственной среде

echo "🤖 Начинаем настройку бота @UniFarming_Bot для работы с пользователями..."

# 1. Установка webhook
echo "🔄 Настройка webhook..."
WEBHOOK_URL="https://uni-farm-connect-2-misterxuniverse.replit.app/api/telegram/webhook"
BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-"7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug"}

curl -s "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=$WEBHOOK_URL" | jq .

# 2. Установка команд бота
echo "📝 Настройка команд бота..."
curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      { "command": "start", "description": "Запуск бота и приветствие" },
      { "command": "ping", "description": "Проверить работу бота" },
      { "command": "info", "description": "Показать мою информацию" },
      { "command": "refcode", "description": "Получить мой реферальный код" },
      { "command": "app", "description": "Открыть приложение UniFarm" }
    ]
  }' | jq .

# 3. Отправка тестового сообщения администратору (если указан ID)
ADMIN_ID=${1:-""}
if [ ! -z "$ADMIN_ID" ]; then
  echo "📨 Отправка тестового сообщения администратору ID=$ADMIN_ID..."
  MESSAGE="✅ Бот <b>UniFarming</b> успешно настроен и готов к работе!
  
🔹 Установлен webhook: $WEBHOOK_URL
🔹 Настроены команды: /start, /ping, /info, /refcode, /app
🔹 Приложение в production-режиме: https://uni-farm-connect-2-misterxuniverse.replit.app/

Бот полностью готов к работе с реальными пользователями."

  curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{
      \"chat_id\": $ADMIN_ID,
      \"text\": \"$MESSAGE\",
      \"parse_mode\": \"HTML\"
    }" | jq .
fi

# 4. Проверка статуса webhook
echo "🔍 Проверка статуса webhook..."
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | jq .

echo "✅ Настройка бота завершена! Бот готов к работе с пользователями."