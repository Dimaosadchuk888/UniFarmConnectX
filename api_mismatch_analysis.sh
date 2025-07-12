#!/bin/bash

echo "=== АНАЛИЗ РАСХОЖДЕНИЙ МЕЖДУ FRONTEND И BACKEND ==="
echo ""

# Список frontend вызовов из файла
mapfile -t frontend_calls < front_endpoints.txt

# Функция для проверки существования роута
check_route_exists() {
    local route=$1
    local clean_route=$(echo "$route" | sed "s|^'||;s|'$||")
    
    # Убираем префиксы для поиска
    local search_pattern=""
    
    if [[ $clean_route == /api/v2/* ]]; then
        # Убираем /api/v2/ префикс
        search_pattern=$(echo "$clean_route" | sed 's|^/api/v2/||')
    elif [[ $clean_route == /api/* ]]; then
        # Убираем /api/ префикс  
        search_pattern=$(echo "$clean_route" | sed 's|^/api/||')
    fi
    
    # Проверяем наличие роута в modules и server
    if grep -r "router\.\(get\|post\|put\|delete\|patch\).*['\"]/$search_pattern['\"]" modules/ server/ --include="*.ts" --include="*.js" > /dev/null 2>&1; then
        echo "✅ FOUND: $clean_route"
        return 0
    else
        # Пробуем альтернативные варианты
        local alt_pattern=$(echo "$search_pattern" | sed 's|/.*||')
        if grep -r "router\.\(get\|post\|put\|delete\|patch\).*['\"]/$alt_pattern" modules/ server/ --include="*.ts" --include="*.js" > /dev/null 2>&1; then
            echo "⚠️  PARTIAL: $clean_route (found base route /$alt_pattern)"
            return 1
        else
            echo "❌ MISSING: $clean_route"
            return 2
        fi
    fi
}

# Анализ всех frontend вызовов
missing_count=0
partial_count=0
found_count=0

echo "### Проверка frontend API вызовов ###"
echo ""

for call in "${frontend_calls[@]}"; do
    result=$(check_route_exists "$call")
    echo "$result"
    
    if [[ $result == *"MISSING"* ]]; then
        ((missing_count++))
    elif [[ $result == *"PARTIAL"* ]]; then
        ((partial_count++))
    else
        ((found_count++))
    fi
done

echo ""
echo "### ИТОГОВАЯ СТАТИСТИКА ###"
echo "Найдено: $found_count"
echo "Частично найдено: $partial_count"
echo "Отсутствует: $missing_count"
echo "Всего проверено: ${#frontend_calls[@]}"
