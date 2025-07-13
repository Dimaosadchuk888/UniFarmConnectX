-- Детальный анализ пользователя 74 и его TON Boost депозитов

-- 1. Основные данные пользователя 74
SELECT 
    u.id,
    u.balance_ton,
    tf.farming_balance,
    tf.boost_package_id,
    tf.created_at as ton_farming_created,
    tf.updated_at as ton_farming_updated
FROM users u
LEFT JOIN ton_farming_data tf ON tf.user_id = u.id::text
WHERE u.id = 74;

-- 2. Все транзакции покупки TON Boost для пользователя 74
SELECT 
    id,
    type,
    amount_ton,
    created_at,
    description,
    metadata
FROM transactions
WHERE user_id = 74 
    AND type = 'BOOST_PURCHASE'
ORDER BY created_at DESC;

-- 3. Проверка - может быть транзакции имеют другой тип?
SELECT 
    type,
    COUNT(*) as count,
    SUM(ABS(amount_ton)) as total_amount
FROM transactions
WHERE user_id = 74 
    AND currency = 'TON'
    AND amount_ton < 0  -- Отрицательные суммы = списания
GROUP BY type
ORDER BY total_amount DESC;

-- 4. Поиск всех транзакций списания TON для пользователя 74
SELECT 
    id,
    type,
    amount_ton,
    created_at,
    description
FROM transactions
WHERE user_id = 74 
    AND currency = 'TON'
    AND amount_ton < 0
ORDER BY created_at DESC
LIMIT 20;

-- 5. Анализ всех пользователей с несоответствием farming_balance и покупок
WITH user_purchases AS (
    SELECT 
        user_id,
        COUNT(*) as purchase_count,
        SUM(ABS(amount_ton)) as total_spent
    FROM transactions
    WHERE type = 'BOOST_PURCHASE' 
        AND currency = 'TON'
    GROUP BY user_id
)
SELECT 
    tf.user_id,
    tf.farming_balance,
    COALESCE(up.total_spent, 0) as total_purchases,
    tf.farming_balance - COALESCE(up.total_spent, 0) as difference
FROM ton_farming_data tf
LEFT JOIN user_purchases up ON up.user_id = tf.user_id::integer
WHERE tf.boost_package_id IS NOT NULL 
    AND tf.boost_package_id != '0'
ORDER BY difference DESC
LIMIT 20;