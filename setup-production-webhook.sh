#!/bin/bash

# Настройка webhook для production среды
BASE_URL="https://uni-farm-connect-2-misterxuniverse.replit.app"
WEBHOOK_PATH="/api/telegram/webhook"
WEBHOOK_URL="$BASE_URL$WEBHOOK_PATH"

# Получаем токен из переменной окружения или запрашиваем его
BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}

if [ -z "$BOT_TOKEN" ]; then
  echo "⚠️ Telegram Bot Token не найден в переменных окружения"
  echo "Используем токен @UniFarming_Bot"
  BOT_TOKEN="7980427501:AAHdia3LusU9dk2aRvhXgmj9Ozo08nR0Gug"
fi

# Устанавливаем webhook
echo "🔄 Устанавливаем webhook на URL: $WEBHOOK_URL"
curl -s "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=$WEBHOOK_URL" | jq .

# Проверяем информацию о webhook
echo "🔍 Проверяем информацию о webhook:"
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo" | jq .

echo "✅ Настройка webhook завершена"