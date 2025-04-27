# Скрипт для запуска приложения в Production режиме
# Устанавливаем переменные окружения
export NODE_ENV=production
export PRODUCTION_DOMAIN="https://uni-farm-connect-2-misterxuniverse.replit.app"
export TELEGRAM_MINI_APP_URL="https://t.me/UniFarming_Bot/UniFarm"

# Запускаем сервер с production настройками
echo "===== UniFarm Production Mode ====="
echo "Environment: $NODE_ENV"
echo "Production Domain: $PRODUCTION_DOMAIN"
echo "Telegram Mini App URL: $TELEGRAM_MINI_APP_URL"
echo "=================================="

tsx server/index.ts
