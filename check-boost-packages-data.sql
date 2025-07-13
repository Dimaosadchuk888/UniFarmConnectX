-- Проверка данных TON Boost пакетов

-- 1. Проверка всех boost пакетов и их min_amount
SELECT 
    id,
    name,
    min_amount,
    daily_rate,
    duration_days,
    uni_bonus
FROM boost_packages
ORDER BY id;

-- 2. Поиск пакетов с нулевым или NULL min_amount
SELECT 
    id,
    name,
    min_amount,
    CASE 
        WHEN min_amount IS NULL THEN 'NULL значение'
        WHEN min_amount = 0 THEN 'Нулевое значение'
        WHEN min_amount < 0 THEN 'Отрицательное значение'
        ELSE 'Нормальное значение'
    END as status
FROM boost_packages
WHERE min_amount IS NULL OR min_amount <= 0;

-- 3. Анализ пакетов, используемых пользователями
SELECT 
    bp.id,
    bp.name,
    bp.min_amount,
    COUNT(DISTINCT tf.user_id) as users_count,
    SUM(tf.farming_balance) as total_farming_balance
FROM boost_packages bp
LEFT JOIN ton_farming_data tf ON tf.boost_package_id = bp.id::text
GROUP BY bp.id, bp.name, bp.min_amount
ORDER BY bp.id;

-- 4. Детальная проверка пакетов 1 и 5 (используемых в farming_balance)
SELECT 
    *
FROM boost_packages
WHERE id IN (1, 5);