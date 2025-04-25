#!/bin/bash

# Функция для генерации случайного UUID
generate_uuid() {
  python -c 'import uuid; print(uuid.uuid4())'
}

# URL API
API_URL="https://8ac7b219-438d-4a0b-ab0e-d8b58de37c6d-00-8ncue1micrhz.sisko.replit.dev/api"

# 1. Создаем первого пользователя без указания ref_code
echo "=== Тест 1: Создание пользователя без указания ref_code ==="
GUEST_ID_1=$(generate_uuid)
echo "Используем guest_id: $GUEST_ID_1"

RESPONSE_1=$(curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"guest_id\":\"$GUEST_ID_1\", \"username\":\"test-user-1\"}")

echo "Ответ API: $RESPONSE_1"

# Извлекаем ref_code из ответа
REF_CODE_1=$(echo $RESPONSE_1| grep -o '"ref_code":"[^"]*"' | cut -d'"' -f4)
USER_ID_1=$(echo $RESPONSE_1 | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo "Создан пользователь с ID: $USER_ID_1"
echo "Сгенерированный ref_code: $REF_CODE_1"
echo ""

# 2. Создаем второго пользователя без указания ref_code, проверяем уникальность
echo "=== Тест 2: Создание второго пользователя для проверки уникальности ref_code ==="
GUEST_ID_2=$(generate_uuid)
echo "Используем guest_id: $GUEST_ID_2"

RESPONSE_2=$(curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"guest_id\":\"$GUEST_ID_2\", \"username\":\"test-user-2\"}")

echo "Ответ API: $RESPONSE_2"

# Извлекаем ref_code из ответа
REF_CODE_2=$(echo $RESPONSE_2 | grep -o '"ref_code":"[^"]*"' | cut -d'"' -f4)
USER_ID_2=$(echo $RESPONSE_2 | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo "Создан пользователь с ID: $USER_ID_2"
echo "Сгенерированный ref_code: $REF_CODE_2"

# Проверяем уникальность ref_code
if [[ "$REF_CODE_1" == "$REF_CODE_2" ]]; then
  echo "❌ ОШИБКА: Сгенерированы одинаковые ref_code!"
else
  echo "✅ Проверка пройдена: ref_code уникальны"
fi
echo ""

# 3. Создаем третьего пользователя с уже существующим ref_code
echo "=== Тест 3: Создание пользователя с существующим ref_code ==="
GUEST_ID_3=$(generate_uuid)
echo "Используем guest_id: $GUEST_ID_3"
echo "Используем существующий ref_code: $REF_CODE_1"

RESPONSE_3=$(curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"guest_id\":\"$GUEST_ID_3\", \"username\":\"test-user-3\", \"ref_code\":\"$REF_CODE_1\"}")

echo "Ответ API: $RESPONSE_3"

# Извлекаем ref_code из ответа
REF_CODE_3=$(echo $RESPONSE_3 | grep -o '"ref_code":"[^"]*"' | cut -d'"' -f4)
USER_ID_3=$(echo $RESPONSE_3 | grep -o '"id":[0-9]*' | cut -d':' -f2)

echo "Создан пользователь с ID: $USER_ID_3"
echo "Полученный ref_code: $REF_CODE_3"

# Проверяем, что система заменила дублирующийся ref_code
if [[ "$REF_CODE_3" == "$REF_CODE_1" ]]; then
  echo "❌ ОШИБКА: Система не заменила дублирующийся ref_code!"
else
  echo "✅ Проверка пройдена: Система автоматически заменила дублирующийся ref_code на новый"
fi
echo ""

echo "=== Тестирование завершено ==="