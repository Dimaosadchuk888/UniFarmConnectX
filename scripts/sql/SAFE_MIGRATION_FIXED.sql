-- ================================================
-- ИСПРАВЛЕННАЯ БЕЗОПАСНАЯ МИГРАЦИЯ
-- ================================================

-- ЭТАП 1: ДОБАВЛЕНИЕ НОВЫХ ПОЛЕЙ (только тех, которых нет)
-- ========================================================

-- Добавляем поля для защиты от дубликатов
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS tx_hash_unique TEXT,
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duplicate_of_id INTEGER REFERENCES transactions(id);

-- ЭТАП 2: ЗАПОЛНЕНИЕ tx_hash_unique
-- =================================

-- Если есть поле tx_hash, заполняем из него
UPDATE transactions 
SET tx_hash_unique = tx_hash
WHERE tx_hash IS NOT NULL 
  AND tx_hash_unique IS NULL;

-- ЭТАП 3: ЗАПОЛНЕНИЕ amount_uni и amount_ton (с правильным типом)
-- ===============================================================

-- Заполняем числовые поля amount_uni и amount_ton
UPDATE transactions
SET 
    amount_uni = CASE 
        WHEN currency = 'UNI' AND amount IS NOT NULL THEN amount
        ELSE 0
    END,
    amount_ton = CASE 
        WHEN currency = 'TON' AND amount IS NOT NULL THEN amount
        ELSE 0
    END
WHERE (amount_uni IS NULL OR amount_ton IS NULL OR amount_uni = 0 OR amount_ton = 0)
  AND amount IS NOT NULL;

-- ЭТАП 4: ПОМЕТКА ДУБЛИКАТОВ
-- ==========================

WITH duplicates AS (
    SELECT 
        id,
        tx_hash_unique,
        ROW_NUMBER() OVER (PARTITION BY tx_hash_unique ORDER BY created_at, id) as rn
    FROM transactions
    WHERE tx_hash_unique IS NOT NULL
      AND tx_hash_unique != ''
)
UPDATE transactions t
SET 
    is_duplicate = TRUE,
    duplicate_of_id = (
        SELECT id FROM duplicates d2 
        WHERE d2.tx_hash_unique = t.tx_hash_unique 
        AND d2.rn = 1
    )
FROM duplicates d
WHERE t.id = d.id 
  AND d.rn > 1;

-- ЭТАП 5: СОЗДАНИЕ УНИКАЛЬНОГО ИНДЕКСА
-- ====================================

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tx_hash_unique_safe
ON transactions(tx_hash_unique) 
WHERE tx_hash_unique IS NOT NULL AND tx_hash_unique != '';

-- ЭТАП 6: МИГРАЦИЯ boost_purchases
-- ================================

-- Проверяем существование таблицы и добавляем поля
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'boost_purchases') THEN
        -- Добавляем недостающие поля
        ALTER TABLE boost_purchases 
        ADD COLUMN IF NOT EXISTS amount DECIMAL(20,9),
        ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,6),
        ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        
        -- Заполняем значения по умолчанию
        UPDATE boost_purchases bp
        SET 
            amount = COALESCE(amount, 0),
            daily_rate = COALESCE(daily_rate, 
                CASE bp.package_id
                    WHEN 1 THEN 0.01
                    WHEN 2 THEN 0.015
                    WHEN 3 THEN 0.02
                    WHEN 4 THEN 0.025
                    WHEN 5 THEN 0.03
                    ELSE 0.01
                END
            ),
            start_date = COALESCE(start_date, bp.created_at, NOW()),
            end_date = COALESCE(end_date, COALESCE(bp.created_at, NOW()) + INTERVAL '365 days'),
            is_active = COALESCE(is_active, TRUE)
        WHERE amount IS NULL OR daily_rate IS NULL OR is_active IS NULL;
    END IF;
END $$;

-- ЭТАП 7: СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ
-- ==============================

-- Представление для чистых транзакций
CREATE OR REPLACE VIEW transactions_clean AS
SELECT * FROM transactions
WHERE is_duplicate IS NOT TRUE OR is_duplicate IS NULL;

-- Представление для анализа дубликатов
CREATE OR REPLACE VIEW duplicate_transactions_analysis AS
SELECT 
    t1.id as duplicate_id,
    t1.user_id,
    t1.tx_hash_unique,
    t1.amount,
    t1.currency,
    t1.amount_ton,
    t1.amount_uni,
    t1.created_at,
    t2.id as original_id,
    t2.created_at as original_created_at
FROM transactions t1
JOIN transactions t2 ON t1.duplicate_of_id = t2.id
WHERE t1.is_duplicate = TRUE
ORDER BY t1.created_at DESC;

-- ЭТАП 8: ФИНАЛЬНАЯ ПРОВЕРКА
-- ==========================

-- Проверка результатов
SELECT 
    'Статистика миграции' as info,
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE is_duplicate = TRUE) as marked_duplicates,
    COUNT(DISTINCT tx_hash_unique) FILTER (WHERE tx_hash_unique IS NOT NULL) as unique_tx_hashes,
    COUNT(*) FILTER (WHERE amount_uni > 0) as uni_transactions,
    COUNT(*) FILTER (WHERE amount_ton > 0) as ton_transactions
FROM transactions;

-- Проверка дубликатов по tx_hash
SELECT 
    'Топ-5 дублированных транзакций' as info,
    tx_hash_unique,
    COUNT(*) as duplicate_count,
    SUM(CASE WHEN currency = 'TON' THEN amount ELSE 0 END) as total_ton,
    SUM(CASE WHEN currency = 'UNI' THEN amount ELSE 0 END) as total_uni
FROM transactions
WHERE tx_hash_unique IS NOT NULL
GROUP BY tx_hash_unique
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 5;