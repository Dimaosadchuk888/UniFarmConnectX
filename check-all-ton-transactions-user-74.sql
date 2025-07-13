-- Проверка ВСЕХ транзакций пользователя 74 связанных с TON

-- 1. Все транзакции TON для пользователя 74 (без фильтра по сумме)
SELECT 
    id,
    type,
    amount_ton,
    currency,
    created_at,
    description,
    metadata
FROM transactions
WHERE user_id = 74 
    AND currency = 'TON'
ORDER BY created_at DESC
LIMIT 30;

-- 2. Проверка metadata для поиска покупок TON Boost
SELECT 
    id,
    type,
    amount_ton,
    created_at,
    description,
    metadata->>'original_type' as original_type,
    metadata->>'transaction_source' as source
FROM transactions
WHERE user_id = 74 
    AND metadata IS NOT NULL
    AND (
        metadata->>'original_type' LIKE '%BOOST%'
        OR metadata->>'transaction_source' LIKE '%boost%'
        OR description LIKE '%Boost%'
        OR description LIKE '%пакет%'
    )
ORDER BY created_at DESC;

-- 3. Статистика по всем типам транзакций для пользователя 74
SELECT 
    type,
    currency,
    COUNT(*) as count,
    SUM(amount_ton) as sum_ton,
    SUM(amount_uni) as sum_uni
FROM transactions
WHERE user_id = 74
GROUP BY type, currency
ORDER BY count DESC;

-- 4. Поиск транзакций покупки по описанию
SELECT 
    id,
    type,
    amount_ton,
    currency,
    created_at,
    description
FROM transactions
WHERE user_id = 74 
    AND (
        description LIKE '%покуп%'
        OR description LIKE '%Покуп%'
        OR description LIKE '%purchase%'
        OR description LIKE '%Purchase%'
        OR description LIKE '%boost%'
        OR description LIKE '%Boost%'
    )
ORDER BY created_at DESC;