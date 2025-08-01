-- ПРОВЕРКА СТАТУСА ИНДЕКСОВ
-- Выполните в Supabase SQL Editor

-- 1. Проверяем, удалены ли дублирующиеся индексы
SELECT 
    'Дублирующие индексы' as category,
    indexname,
    tablename,
    CASE 
        WHEN indexname IN ('idx_ton_farming_user_id', 'idx_uni_farming_user_id') 
        THEN '❌ ДОЛЖЕН БЫТЬ УДАЛЕН!'
        ELSE '✅ OK'
    END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN ('idx_ton_farming_user_id', 'idx_uni_farming_user_id')

UNION ALL

-- 2. Проверяем наличие всех нужных индексов
SELECT 
   ablename,
    ' 'Основные индексы' as category,
    indexname,
    t✅ Существует' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN (
    'idx_users_telegram_id',
    'idx_transactions_user_id__created_at_desc',
    'idx_users_balance_uni__balance_ton',
    'idx_users_uni_farming_active',
    'idx_users_referred_by',
    'idx_transactions_type',
    'idx_withdraw_requests_status',
    'idx_withdraw_requests_user_id'
  )
ORDER BY category, indexname;

-- 3. Обновляем статистику для улучшения производительности
ANALYZE users;
ANALYZE transactions;
ANALYZE ton_farming_data;
ANALYZE uni_farming_data;
ANALYZE withdraw_requests;

-- После выполнения должно показать:
-- 1. 0 строк для дублирующих индексов (они удалены)
-- 2. 8 строк для основных индексов (все на месте)
-- 3. ANALYZE обновит статистику