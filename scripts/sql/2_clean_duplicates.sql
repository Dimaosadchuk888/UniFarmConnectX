-- ================================================
-- СКРИПТ 2: Очистка дублирующихся транзакций
-- ================================================
-- ВНИМАНИЕ! Запускайте ТОЛЬКО после анализа результатов скрипта 1
-- Этот скрипт удалит дубликаты, оставив только первую транзакцию

-- 1. Создаем резервную таблицу с дубликатами перед удалением
CREATE TABLE IF NOT EXISTS duplicate_transactions_backup_20250123 AS
SELECT t.* 
FROM transactions t
INNER JOIN (
    SELECT metadata->>'tx_hash' as tx_hash
    FROM transactions
    WHERE metadata->>'tx_hash' IS NOT NULL
    GROUP BY metadata->>'tx_hash'
    HAVING COUNT(*) > 1
) dups ON t.metadata->>'tx_hash' = dups.tx_hash;

-- 2. Подсчитываем сколько записей будет удалено
SELECT COUNT(*) as records_to_delete
FROM transactions t1
WHERE EXISTS (
    SELECT 1 
    FROM transactions t2 
    WHERE t2.metadata->>'tx_hash' = t1.metadata->>'tx_hash'
    AND t2.metadata->>'tx_hash' IS NOT NULL
    AND t2.id < t1.id
);

-- 3. Удаляем дубликаты, оставляя только первую транзакцию (с минимальным ID)
DELETE FROM transactions t1
WHERE EXISTS (
    SELECT 1 
    FROM transactions t2 
    WHERE t2.metadata->>'tx_hash' = t1.metadata->>'tx_hash'
    AND t2.metadata->>'tx_hash' IS NOT NULL
    AND t2.id < t1.id
);

-- 4. Проверяем результат очистки
SELECT 
    'Удалено дубликатов' as action,
    COUNT(*) as count
FROM duplicate_transactions_backup_20250123
WHERE id NOT IN (SELECT id FROM transactions);