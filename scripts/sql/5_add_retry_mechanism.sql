-- ================================================
-- СКРИПТ 5: Добавление механизма retry (опционально)
-- ================================================
-- Добавляет поля для повторной обработки неудачных транзакций

-- 1. Добавляем поля для retry механизма
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- 2. Создаем индекс для эффективного поиска транзакций требующих retry
CREATE INDEX IF NOT EXISTS idx_pending_retry 
ON transactions(next_retry_at) 
WHERE status = 'pending' AND retry_count < 3;

-- 3. Создаем функцию для планирования retry
CREATE OR REPLACE FUNCTION schedule_transaction_retry(
    p_transaction_id INTEGER,
    p_error_message TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
    v_retry_count INTEGER;
BEGIN
    -- Получаем текущее количество попыток
    SELECT retry_count INTO v_retry_count
    FROM transactions
    WHERE id = p_transaction_id;
    
    -- Обновляем транзакцию
    UPDATE transactions
    SET 
        retry_count = retry_count + 1,
        next_retry_at = CASE 
            WHEN retry_count = 0 THEN NOW() + INTERVAL '1 minute'
            WHEN retry_count = 1 THEN NOW() + INTERVAL '5 minutes'
            WHEN retry_count = 2 THEN NOW() + INTERVAL '30 minutes'
            ELSE NULL -- Больше не пытаемся
        END,
        last_error = p_error_message
    WHERE id = p_transaction_id
    AND retry_count < 3;
END;
$$ LANGUAGE plpgsql;

-- 4. Пример использования функции
-- SELECT schedule_transaction_retry(123, 'Connection timeout');

-- 5. Представление для мониторинга failed транзакций
CREATE OR REPLACE VIEW failed_transactions_monitor AS
SELECT 
    id,
    user_id,
    type,
    amount_ton,
    status,
    retry_count,
    next_retry_at,
    last_error,
    created_at,
    metadata->>'tx_hash' as tx_hash
FROM transactions
WHERE 
    status = 'pending' 
    AND (retry_count >= 3 OR next_retry_at < NOW())
ORDER BY created_at DESC;

-- 6. Проверяем результат
SELECT 
    COUNT(*) FILTER (WHERE retry_count = 0) as no_retries,
    COUNT(*) FILTER (WHERE retry_count BETWEEN 1 AND 2) as in_retry,
    COUNT(*) FILTER (WHERE retry_count >= 3) as failed_permanently
FROM transactions
WHERE status = 'pending';