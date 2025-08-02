-- Проверка структуры таблиц UniFarm Connect

-- 1. Структура таблицы referrals
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'referrals'
ORDER BY ordinal_position;

-- 2. Структура таблицы users
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 3. Структура таблицы transactions
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- 4. Структура таблицы ton_boost_purchases
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ton_boost_purchases'
ORDER BY ordinal_position;

-- 5. Существующие индексы
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'transactions', 'referrals', 'ton_boost_purchases')
ORDER BY tablename, indexname;