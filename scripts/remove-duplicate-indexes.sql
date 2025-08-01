-- УДАЛЕНИЕ ДУБЛИРУЮЩИХСЯ ИНДЕКСОВ
-- Выполните эти команды в Supabase SQL Editor

-- 1. Удаляем дублирующий индекс для ton_farming_data
-- (оставляем idx_ton_farming_user, удаляем idx_ton_farming_user_id)
DROP INDEX IF EXISTS idx_ton_farming_user_id;

-- 2. Удаляем дублирующий индекс для uni_farming_data  
-- (оставляем idx_uni_farming_user, удаляем idx_uni_farming_user_id)
DROP INDEX IF EXISTS idx_uni_farming_user_id;

-- 3. Проверяем результат
SELECT 
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (tablename = 'ton_farming_data' OR tablename = 'uni_farming_data')
  AND indexname LIKE '%user%'
ORDER BY tablename, indexname;

-- После выполнения должно остаться только:
-- ton_farming_data: idx_ton_farming_user
-- uni_farming_data: idx_uni_farming_user