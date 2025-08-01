-- ПРОВЕРКА СОЗДАННЫХ ИНДЕКСОВ
-- Выполните эту команду в Supabase SQL Editor

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Эта команда покажет все созданные индексы начинающиеся с 'idx_'
-- Должно быть 8 индексов:
-- 1. idx_users_telegram_id
-- 2. idx_transactions_user_id__created_at_desc
-- 3. idx_users_balance_uni__balance_ton
-- 4. idx_users_uni_farming_active
-- 5. idx_users_referred_by
-- 6. idx_transactions_type
-- 7. idx_withdraw_requests_status
-- 8. idx_withdraw_requests_user_id