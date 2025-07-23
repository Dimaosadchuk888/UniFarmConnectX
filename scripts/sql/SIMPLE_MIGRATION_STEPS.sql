-- ================================================
-- ПРОСТАЯ МИГРАЦИЯ БЕЗ DO БЛОКОВ
-- ================================================
-- Выполняйте команды по одной или группами

-- ЧАСТЬ 1: ДОБАВЛЕНИЕ ПОЛЕЙ В transactions
-- ========================================

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS tx_hash_unique TEXT;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS duplicate_of_id INTEGER REFERENCES transactions(id);

-- ЧАСТЬ 2: ЗАПОЛНЕНИЕ tx_hash_unique
-- ==================================

UPDATE transactions 
SET tx_hash_unique = tx_hash
WHERE tx_hash IS NOT NULL 
  AND tx_hash_unique IS NULL;

-- ЧАСТЬ 3: ЗАПОЛНЕНИЕ amount_uni и amount_ton
-- ===========================================

UPDATE transactions
SET amount_uni = amount
WHERE currency = 'UNI' 
  AND amount IS NOT NULL 
  AND (amount_uni IS NULL OR amount_uni = 0);

UPDATE transactions
SET amount_ton = amount
WHERE currency = 'TON' 
  AND amount IS NOT NULL 
  AND (amount_ton IS NULL OR amount_ton = 0);

UPDATE transactions
SET amount_uni = 0
WHERE currency != 'UNI' 
  AND (amount_uni IS NULL OR amount_uni = 0);

UPDATE transactions
SET amount_ton = 0
WHERE currency != 'TON' 
  AND (amount_ton IS NULL OR amount_ton = 0);

-- ЧАСТЬ 4: ПОМЕТКА ДУБЛИКАТОВ
-- ===========================

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

-- ЧАСТЬ 5: СОЗДАНИЕ ИНДЕКСА
-- =========================

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tx_hash_unique_safe
ON transactions(tx_hash_unique) 
WHERE tx_hash_unique IS NOT NULL AND tx_hash_unique != '';

-- ЧАСТЬ 6: МИГРАЦИЯ boost_purchases
-- =================================

-- 6.1 Добавляем поля
ALTER TABLE boost_purchases 
ADD COLUMN IF NOT EXISTS amount DECIMAL(20,9);

ALTER TABLE boost_purchases 
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,6);

ALTER TABLE boost_purchases 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;

ALTER TABLE boost_purchases 
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;

ALTER TABLE boost_purchases 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 6.2 Заполняем amount
UPDATE boost_purchases 
SET amount = 0 
WHERE amount IS NULL;

-- 6.3 Заполняем daily_rate
UPDATE boost_purchases 
SET daily_rate = CASE package_id
    WHEN 1 THEN 0.01
    WHEN 2 THEN 0.015
    WHEN 3 THEN 0.02
    WHEN 4 THEN 0.025
    WHEN 5 THEN 0.03
    ELSE 0.01
END
WHERE daily_rate IS NULL;

-- 6.4 Заполняем даты
UPDATE boost_purchases 
SET start_date = COALESCE(created_at, NOW())
WHERE start_date IS NULL;

UPDATE boost_purchases 
SET end_date = COALESCE(created_at, NOW()) + INTERVAL '365 days'
WHERE end_date IS NULL;

-- 6.5 Заполняем is_active
UPDATE boost_purchases 
SET is_active = (status = 'active')
WHERE is_active IS NULL;

-- ЧАСТЬ 7: СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ
-- ===============================

CREATE OR REPLACE VIEW transactions_clean AS
SELECT * FROM transactions
WHERE is_duplicate IS NOT TRUE OR is_duplicate IS NULL;

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

-- ЧАСТЬ 8: ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =============================

-- 8.1 Общая статистика
SELECT 
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE is_duplicate = TRUE) as marked_duplicates,
    COUNT(DISTINCT tx_hash_unique) as unique_hashes
FROM transactions;

-- 8.2 Проверка amount_uni и amount_ton
SELECT 
    COUNT(*) FILTER (WHERE amount_uni > 0) as uni_transactions,
    COUNT(*) FILTER (WHERE amount_ton > 0) as ton_transactions,
    COUNT(*) FILTER (WHERE amount_uni = 0 AND amount_ton = 0) as zero_amounts
FROM transactions;

-- 8.3 Топ дубликатов
SELECT 
    tx_hash_unique,
    COUNT(*) as duplicate_count,
    SUM(amount) as total_amount,
    STRING_AGG(DISTINCT currency, ', ') as currencies
FROM transactions
WHERE tx_hash_unique IS NOT NULL
GROUP BY tx_hash_unique
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;