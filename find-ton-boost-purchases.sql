-- Поиск транзакций покупки TON Boost для пользователя 74

-- 1. Поиск по metadata с 'BOOST_PURCHASE'
SELECT 
    id,
    type,
    amount_ton,
    amount_uni,
    currency,
    created_at,
    description,
    metadata
FROM transactions
WHERE user_id = 74 
    AND metadata->>'original_type' = 'BOOST_PURCHASE'
ORDER BY created_at DESC;

-- 2. Поиск транзакций с отрицательной суммой UNI (возможно покупки за UNI)
SELECT 
    id,
    type,
    amount_uni,
    currency,
    created_at,
    description,
    metadata
FROM transactions
WHERE user_id = 74 
    AND currency = 'UNI'
    AND amount_uni < 0
    AND (description LIKE '%Boost%' OR description LIKE '%пакет%')
ORDER BY created_at DESC
LIMIT 20;

-- 3. Проверка общего баланса TON пользователя и сопоставление с транзакциями
WITH ton_income AS (
    SELECT 
        COUNT(*) as income_count,
        SUM(amount_ton) as total_income
    FROM transactions
    WHERE user_id = 74 
        AND type = 'FARMING_REWARD'
        AND currency = 'TON'
        AND amount_ton > 0
),
user_balance AS (
    SELECT 
        id,
        balance_ton,
        (SELECT farming_balance FROM ton_farming_data WHERE user_id = '74') as farming_balance
    FROM users
    WHERE id = 74
)
SELECT 
    ub.*,
    ti.income_count,
    ti.total_income,
    ub.balance_ton - ti.total_income as unaccounted_ton
FROM user_balance ub
CROSS JOIN ton_income ti;

-- 4. Проверка начального баланса TON
SELECT 
    id,
    balance_ton,
    created_at
FROM users
WHERE id = 74;

-- 5. Анализ всех транзакций с группировкой по типам
SELECT 
    type,
    currency,
    COUNT(*) as count,
    SUM(CASE WHEN amount_ton > 0 THEN amount_ton ELSE 0 END) as positive_ton,
    SUM(CASE WHEN amount_ton < 0 THEN amount_ton ELSE 0 END) as negative_ton,
    SUM(CASE WHEN amount_uni > 0 THEN amount_uni ELSE 0 END) as positive_uni,
    SUM(CASE WHEN amount_uni < 0 THEN amount_uni ELSE 0 END) as negative_uni
FROM transactions
WHERE user_id = 74
GROUP BY type, currency
ORDER BY count DESC;