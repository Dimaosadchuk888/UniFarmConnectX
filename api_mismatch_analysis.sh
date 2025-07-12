#!/bin/bash

echo "🔍 Анализ расхождений API между фронтендом и бэкендом"
echo "======================================================="
echo ""

# Функция для извлечения эндпоинтов из файла роутов с префиксом
extract_module_endpoints() {
    local module=$1
    local prefix=$2
    local file="modules/${module}/routes.ts"
    
    if [ -f "$file" ]; then
        rg "router\.(get|post|put|delete|patch)\(" "$file" | while read -r line; do
            endpoint=$(echo "$line" | grep -oE "'[^']*'" | head -1 | sed "s/'//g")
            if [ ! -z "$endpoint" ]; then
                echo "/api/v2${prefix}${endpoint}"
            fi
        done
    fi
}

# Собираем все бэкенд эндпоинты
echo "📋 Сбор бэкенд эндпоинтов..."
{
    # Эндпоинты из server/index.ts
    echo "/health"
    echo "/api/v2/debug/jwt"
    echo "/api/v2/debug/generate-jwt-74"
    echo "/api/v2/test/balance-notification"
    echo "/api/v2/daily-bonus-fixed"
    echo "/api/v2/debug/env"
    echo "/api/v2/ref-debug-test"
    echo "/api/v2/uni-farming/status"
    echo "/api/v2/wallet/ton-deposit"
    echo "/api/v2/wallet/balance"
    echo "/api/v2/wallet/withdraw"
    echo "/api/v2/wallet/transfer"
    echo "/api/v2/wallet/transactions"
    echo "/api/v2/metrics"
    echo "/manifest.json"
    echo "/tonconnect-manifest.json"
    echo "/webhook"
    
    # Модули с их префиксами
    extract_module_endpoints "auth" "/auth"
    extract_module_endpoints "farming" "/farming"
    extract_module_endpoints "farming" "/uni-farming"
    extract_module_endpoints "user" "/users"
    extract_module_endpoints "wallet" "/wallet"
    extract_module_endpoints "boost" "/boost"
    extract_module_endpoints "boost" "/boosts"
    extract_module_endpoints "boost" "/ton-boost"
    extract_module_endpoints "missions" "/missions"
    extract_module_endpoints "missions" "/user-missions"
    extract_module_endpoints "referral" "/referral"
    extract_module_endpoints "referral" "/referrals"
    extract_module_endpoints "dailyBonus" "/daily-bonus"
    extract_module_endpoints "telegram" "/telegram"
    extract_module_endpoints "tonFarming" "/ton-farming"
    extract_module_endpoints "transactions" "/transactions"
    extract_module_endpoints "airdrop" "/airdrop"
    extract_module_endpoints "admin" "/admin"
    extract_module_endpoints "monitor" "/monitor"
} | sort | uniq > /tmp/backend_endpoints_complete.txt

echo "✅ Найдено бэкенд эндпоинтов: $(wc -l < /tmp/backend_endpoints_complete.txt)"
echo ""

# Сравниваем с фронтендом
echo "📊 Анализ расхождений..."
echo ""

echo "🚨 Эндпоинты, вызываемые с фронтенда, но отсутствующие на бэкенде:"
echo "================================================================"
comm -23 /tmp/front_endpoints.txt /tmp/backend_endpoints_complete.txt | while read -r endpoint; do
    # Находим где используется на фронтенде
    location=$(rg -n "$endpoint" client/ -g "*.ts" -g "*.tsx" | head -1)
    echo "❌ $endpoint"
    echo "   Используется в: $location"
    echo ""
done

echo ""
echo "📝 Сохранение отчета..."
comm -23 /tmp/front_endpoints.txt /tmp/backend_endpoints_complete.txt > /tmp/missing_endpoints.txt

echo "✅ Анализ завершен. Найдено $(wc -l < /tmp/missing_endpoints.txt) отсутствующих эндпоинтов."