-- Простая проверка индексов UniFarm Connect
-- Используем стандартные PostgreSQL системные таблицы

-- Проверка индексов для каждой таблицы
SELECT 
    tablename AS "Таблица",
    indexname AS "Имя индекса",
    indexdef AS "Определение"
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'transactions', 'referrals', 'ton_boost_purchases')
ORDER BY tablename, indexname;

-- Подсчет индексов по таблицам
SELECT 
    tablename AS "Таблица",
    COUNT(*) AS "Количество индексов"
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'transactions', 'referrals', 'ton_boost_purchases')
GROUP BY tablename
ORDER BY tablename;