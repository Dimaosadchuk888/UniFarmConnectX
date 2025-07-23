-- ================================================
-- СКРИПТ 3: Создание уникального индекса
-- ================================================
-- Запускайте ТОЛЬКО после успешной очистки дубликатов (скрипт 2)

-- 1. Проверяем что дубликатов больше нет
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT metadata->>'tx_hash'
        FROM transactions
        WHERE metadata->>'tx_hash' IS NOT NULL
        GROUP BY metadata->>'tx_hash'
        HAVING COUNT(*) > 1
    ) as dups;
    
    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Найдено % дубликатов! Сначала запустите скрипт очистки.', duplicate_count;
    END IF;
END $$;

-- 2. Создаем уникальный индекс с CONCURRENTLY для минимизации блокировок
-- ВАЖНО: Эта команда может занять время на больших таблицах
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tx_hash_unique 
ON transactions((metadata->>'tx_hash')) 
WHERE metadata->>'tx_hash' IS NOT NULL;

-- 3. Проверяем что индекс создан
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'transactions'
AND indexname = 'idx_tx_hash_unique';

-- 4. Тестируем защиту от дубликатов
-- Эта вставка должна завершиться с ошибкой если индекс работает
/*
INSERT INTO transactions (user_id, type, metadata, amount_ton, created_at)
VALUES (1, 'TON_DEPOSIT', '{"tx_hash": "test_duplicate_protection"}', '1.0', NOW());

-- Повторная вставка должна вызвать ошибку
INSERT INTO transactions (user_id, type, metadata, amount_ton, created_at)
VALUES (1, 'TON_DEPOSIT', '{"tx_hash": "test_duplicate_protection"}', '1.0', NOW());
*/