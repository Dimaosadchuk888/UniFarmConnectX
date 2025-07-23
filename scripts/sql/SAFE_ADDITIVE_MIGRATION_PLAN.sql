-- ================================================
-- БЕЗОПАСНЫЙ ПЛАН ДОПОЛНЕНИЯ БД БЕЗ УДАЛЕНИЯ
-- ================================================
-- Все изменения ТОЛЬКО ДОБАВЛЯЮТ новые поля/индексы
-- Существующие данные и структура НЕ ЗАТРАГИВАЮТСЯ

-- ФАЗА 1: ДОБАВЛЕНИЕ НОВОГО ПОЛЯ ДЛЯ УНИКАЛЬНОСТИ TX_HASH
-- ========================================================

-- 1.1 Добавляем новое поле tx_hash_unique (если его нет)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS tx_hash_unique TEXT;

-- 1.2 Заполняем новое поле из metadata для существующих записей
UPDATE transactions 
SET tx_hash_unique = metadata->>'tx_hash'
WHERE metadata->>'tx_hash' IS NOT NULL 
  AND tx_hash_unique IS NULL;

-- 1.3 Создаем уникальный индекс на новое поле
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tx_hash_unique_safe
ON transactions(tx_hash_unique) 
WHERE tx_hash_unique IS NOT NULL;

-- 1.4 Добавляем поле для отслеживания дубликатов (вместо удаления)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duplicate_of_id INTEGER REFERENCES transactions(id);

-- 1.5 Помечаем существующие дубликаты (НЕ УДАЛЯЕМ!)
WITH duplicates AS (
  SELECT 
    id,
    metadata->>'tx_hash' as tx_hash,
    ROW_NUMBER() OVER (PARTITION BY metadata->>'tx_hash' ORDER BY created_at, id) as rn
  FROM transactions
  WHERE metadata->>'tx_hash' IS NOT NULL
)
UPDATE transactions t
SET 
  is_duplicate = TRUE,
  duplicate_of_id = (
    SELECT id FROM duplicates d2 
    WHERE d2.tx_hash = (t.metadata->>'tx_hash') 
    AND d2.rn = 1
  )
FROM duplicates d
WHERE t.id = d.id 
  AND d.rn > 1;

-- ФАЗА 2: ДОПОЛНЕНИЕ ТАБЛИЦЫ boost_purchases
-- ==========================================

-- 2.1 Добавляем недостающие поля (существующие НЕ трогаем)
ALTER TABLE boost_purchases 
ADD COLUMN IF NOT EXISTS amount DECIMAL(20,9),
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,6),
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2.2 Заполняем новые поля значениями по умолчанию
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
  is_active = COALESCE(is_active, bp.status = 'active')
WHERE amount IS NULL OR daily_rate IS NULL;

-- ФАЗА 3: ДОБАВЛЕНИЕ ПОЛЕЙ ДЛЯ СОВМЕСТИМОСТИ С КОДОМ
-- ==================================================

-- 3.1 Добавляем поля amount_uni и amount_ton (если код их ожидает)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS amount_uni TEXT,
ADD COLUMN IF NOT EXISTS amount_ton TEXT;

-- 3.2 Заполняем новые поля из существующих данных
UPDATE transactions
SET 
  amount_uni = COALESCE(
    amount_uni,
    CASE 
      WHEN currency = 'UNI' THEN amount::text
      ELSE '0'
    END
  ),
  amount_ton = COALESCE(
    amount_ton,
    CASE 
      WHEN currency = 'TON' THEN amount::text
      ELSE '0'
    END
  )
WHERE amount_uni IS NULL OR amount_ton IS NULL;

-- 3.3 Добавляем индексы для производительности
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_is_duplicate 
ON transactions(is_duplicate) 
WHERE is_duplicate = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_tx_hash_unique_not_null
ON transactions(tx_hash_unique)
WHERE tx_hash_unique IS NOT NULL;

-- ФАЗА 4: СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ ДЛЯ РАБОТЫ С ЧИСТЫМИ ДАННЫМИ
-- ===========================================================

-- 4.1 Представление для транзакций без дубликатов
CREATE OR REPLACE VIEW transactions_clean AS
SELECT * FROM transactions
WHERE is_duplicate IS NOT TRUE OR is_duplicate IS NULL;

-- 4.2 Представление для анализа дубликатов
CREATE OR REPLACE VIEW duplicate_transactions_analysis AS
SELECT 
  t1.id as duplicate_id,
  t1.user_id,
  t1.metadata->>'tx_hash' as tx_hash,
  t1.amount_ton,
  t1.created_at,
  t2.id as original_id,
  t2.created_at as original_created_at
FROM transactions t1
JOIN transactions t2 ON t1.duplicate_of_id = t2.id
WHERE t1.is_duplicate = TRUE
ORDER BY t1.created_at DESC;

-- ФАЗА 5: ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ============================

-- 5.1 Статистика по дубликатам
SELECT 
  COUNT(*) FILTER (WHERE is_duplicate = TRUE) as marked_duplicates,
  COUNT(*) FILTER (WHERE is_duplicate IS NOT TRUE) as clean_transactions,
  COUNT(DISTINCT tx_hash_unique) as unique_tx_hashes,
  COUNT(*) as total_transactions
FROM transactions;

-- 5.2 Проверка новых полей
SELECT 
  COUNT(*) FILTER (WHERE tx_hash_unique IS NOT NULL) as with_tx_hash_unique,
  COUNT(*) FILTER (WHERE amount_uni IS NOT NULL) as with_amount_uni,
  COUNT(*) FILTER (WHERE amount_ton IS NOT NULL) as with_amount_ton
FROM transactions;

-- 5.3 Проверка boost_purchases
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE amount IS NOT NULL) as with_amount,
  COUNT(*) FILTER (WHERE daily_rate IS NOT NULL) as with_daily_rate
FROM boost_purchases;