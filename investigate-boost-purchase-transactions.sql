-- Детальное исследование транзакций BOOST_PURCHASE

-- 1. Все транзакции BOOST_PURCHASE для пользователя 74
SELECT 
    id,
    type,
    amount_ton,
    amount_uni,
    currency,
    status,
    created_at,
    description,
    metadata
FROM transactions
WHERE user_id = 74 
    AND type = 'BOOST_PURCHASE'
ORDER BY created_at ASC;

-- 2. Проверка всех пользователей с BOOST_PURCHASE транзакциями
SELECT 
    user_id,
    COUNT(*) as purchase_count,
    SUM(amount_ton) as total_ton_spent,
    MIN(created_at) as first_purchase,
    MAX(created_at) as last_purchase
FROM transactions
WHERE type = 'BOOST_PURCHASE'
GROUP BY user_id
ORDER BY user_id;

-- 3. Поиск транзакций с описанием покупки пакетов
SELECT 
    id,
    user_id,
    type,
    amount_ton,
    currency,
    created_at,
    description
FROM transactions
WHERE description LIKE '%пакет%'
    OR description LIKE '%Покупка%'
    OR description LIKE '%Package%'
    OR description LIKE '%Purchase%'
ORDER BY created_at DESC
LIMIT 50;

-- 4. Анализ farming_balance для всех пользователей с активным TON Boost
SELECT 
    tf.user_id,
    tf.farming_balance,
    tf.boost_package_id,
    COUNT(t.id) as boost_purchase_count,
    SUM(t.amount_ton) as total_spent_via_transactions
FROM ton_farming_data tf
LEFT JOIN transactions t ON t.user_id = tf.user_id::integer AND t.type = 'BOOST_PURCHASE'
WHERE tf.boost_package_id IS NOT NULL 
    AND tf.boost_package_id != '0'
GROUP BY tf.user_id, tf.farming_balance, tf.boost_package_id
ORDER BY tf.user_id::integer;

-- 5. Проверка метаданных BOOST_PURCHASE транзакций
SELECT 
    id,
    user_id,
    amount_ton,
    created_at,
    metadata,
    metadata->>'boost_package_id' as package_id,
    metadata->>'boost_amount' as boost_amount
FROM transactions
WHERE type = 'BOOST_PURCHASE'
ORDER BY created_at DESC
LIMIT 20;