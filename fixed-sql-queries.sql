-- Исправленный запрос для поиска пользователей с несоответствием депозитов
-- Проблема: user_id в ton_farming_data хранится как TEXT, а id в users как INTEGER

SELECT u.id, u.balance_ton, 
       tf.farming_balance,
       (SELECT SUM(ABS(amount_ton)) 
        FROM transactions 
        WHERE user_id = u.id 
        AND type = 'BOOST_PURCHASE') as total_purchases
FROM users u
JOIN ton_farming_data tf ON tf.user_id = u.id::text  -- Приведение типа: integer к text
WHERE tf.boost_package_id IS NOT NULL;

-- Альтернативный вариант (приведение text к integer)
SELECT u.id, u.balance_ton, 
       tf.farming_balance,
       (SELECT SUM(ABS(amount_ton)) 
        FROM transactions 
        WHERE user_id = u.id 
        AND type = 'BOOST_PURCHASE') as total_purchases
FROM users u
JOIN ton_farming_data tf ON tf.user_id::integer = u.id  -- Приведение типа: text к integer
WHERE tf.boost_package_id IS NOT NULL;

-- Проверка последних обновлений farming_balance
SELECT user_id, farming_balance, 
       EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_ago
FROM ton_farming_data
ORDER BY updated_at DESC
LIMIT 20;

-- Дополнительный запрос для анализа всех пользователей с TON Boost
SELECT 
    tf.user_id,
    tf.farming_balance,
    tf.boost_package_id,
    u.balance_ton,
    COUNT(t.id) as boost_purchase_count,
    COALESCE(SUM(ABS(t.amount_ton)), 0) as total_spent_on_boosts
FROM ton_farming_data tf
LEFT JOIN users u ON u.id = tf.user_id::integer
LEFT JOIN transactions t ON t.user_id = u.id AND t.type = 'BOOST_PURCHASE'
WHERE tf.boost_package_id IS NOT NULL OR tf.boost_package_id != '0'
GROUP BY tf.user_id, tf.farming_balance, tf.boost_package_id, u.balance_ton
ORDER BY tf.user_id::integer;

-- Проверка типов данных в таблицах
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('users', 'ton_farming_data', 'transactions')
AND column_name IN ('id', 'user_id')
ORDER BY table_name, column_name;