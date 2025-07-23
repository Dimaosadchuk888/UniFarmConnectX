-- ================================================
-- СКРИПТ 1: Проверка дублирующихся транзакций
-- ================================================
-- Запустите этот скрипт ПЕРВЫМ для анализа текущей ситуации

-- 1. Проверка дублей по tx_hash в metadata
SELECT 
    metadata->>'tx_hash' as tx_hash, 
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as transaction_ids,
    array_agg(user_id) as user_ids,
    array_agg(amount_ton) as amounts_ton,
    array_agg(created_at::text) as created_dates
FROM transactions 
WHERE metadata->>'tx_hash' IS NOT NULL 
GROUP BY metadata->>'tx_hash' 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2. Детальный анализ дублей за последние 30 дней
SELECT 
    user_id,
    type,
    metadata->>'tx_hash' as tx_hash,
    COUNT(*) as count,
    SUM(COALESCE(amount_ton::numeric, 0)) as total_ton,
    MIN(created_at) as first_transaction,
    MAX(created_at) as last_transaction
FROM transactions
WHERE 
    metadata->>'tx_hash' IS NOT NULL
    AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, type, metadata->>'tx_hash'
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, user_id;

-- 3. Общая статистика по дублям
SELECT 
    COUNT(DISTINCT metadata->>'tx_hash') as unique_hashes_with_duplicates,
    COUNT(*) as total_duplicate_transactions,
    SUM(COALESCE(amount_ton::numeric, 0)) as total_duplicate_ton_amount
FROM transactions
WHERE metadata->>'tx_hash' IN (
    SELECT metadata->>'tx_hash'
    FROM transactions
    WHERE metadata->>'tx_hash' IS NOT NULL
    GROUP BY metadata->>'tx_hash'
    HAVING COUNT(*) > 1
);

-- 4. Проверка структуры таблицы transactions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;