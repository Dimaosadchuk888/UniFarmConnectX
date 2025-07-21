-- ====================================
-- ИСПРАВЛЕНИЕ ENUM TRANSACTION_TYPE
-- Добавление TON_DEPOSIT для корректной работы депозитов
-- ====================================

-- Проверяем текущие значения enum перед изменением
SELECT 'Текущие значения enum transaction_type:' as info;
SELECT enumlabel as current_values 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname = 'transaction_type'
ORDER BY enumsortorder;

-- Добавляем новое значение TON_DEPOSIT в enum
ALTER TYPE transaction_type ADD VALUE 'TON_DEPOSIT';

-- Проверяем что значение добавилось успешно
SELECT 'Значения enum после добавления TON_DEPOSIT:' as info;
SELECT enumlabel as updated_values 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE typname = 'transaction_type'
ORDER BY enumsortorder;

-- Дополнительная проверка - показываем все доступные типы
SELECT 'Все доступные типы транзакций:' as info;
SELECT unnest(enum_range(NULL::transaction_type)) as available_types;

-- Проверяем что теперь можно создавать TON_DEPOSIT транзакции
-- (это только проверка синтаксиса, не создаем реальную транзакцию)
SELECT 'Проверка синтаксиса TON_DEPOSIT:' as info;
SELECT 'TON_DEPOSIT'::transaction_type as test_type;

SELECT '✅ Исправление enum transaction_type завершено успешно!' as result;