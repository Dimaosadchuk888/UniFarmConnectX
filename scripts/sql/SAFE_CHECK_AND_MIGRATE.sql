-- ================================================
-- БЕЗОПАСНАЯ ПРОВЕРКА И МИГРАЦИЯ
-- ================================================

-- ЭТАП 1: ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ
-- ==================================

-- Проверяем какие колонки есть в таблице transactions
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- ЭТАП 2: БЕЗОПАСНОЕ ДОБАВЛЕНИЕ ПОЛЕЙ БЕЗ ИСПОЛЬЗОВАНИЯ metadata
-- ==============================================================

-- 2.1 Добавляем новые поля для защиты от дубликатов
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS tx_hash_unique TEXT,
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS duplicate_of_id INTEGER REFERENCES transactions(id);

-- 2.2 Добавляем поля для совместимости с кодом
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS amount_uni TEXT,
ADD COLUMN IF NOT EXISTS amount_ton TEXT;

-- 2.3 Проверяем существование поля metadata и его тип
DO $$
DECLARE
    metadata_exists boolean;
    metadata_type text;
BEGIN
    -- Проверяем существование колонки metadata
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'metadata'
    ) INTO metadata_exists;
    
    -- Если metadata существует, получаем её тип
    IF metadata_exists THEN
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'metadata'
        INTO metadata_type;
        
        RAISE NOTICE 'Поле metadata существует, тип: %', metadata_type;
        
        -- Если metadata существует и это JSON/JSONB, заполняем tx_hash_unique
        IF metadata_type IN ('json', 'jsonb') THEN
            EXECUTE 'UPDATE transactions 
                    SET tx_hash_unique = metadata->>''tx_hash''
                    WHERE metadata->>''tx_hash'' IS NOT NULL 
                    AND tx_hash_unique IS NULL';
            RAISE NOTICE 'tx_hash_unique заполнен из metadata';
        END IF;
    ELSE
        RAISE NOTICE 'Поле metadata НЕ существует';
    END IF;
END $$;

-- 2.4 Если есть поле tx_hash, заполняем tx_hash_unique из него
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'tx_hash'
    ) THEN
        UPDATE transactions 
        SET tx_hash_unique = tx_hash
        WHERE tx_hash IS NOT NULL 
        AND tx_hash_unique IS NULL;
        
        RAISE NOTICE 'tx_hash_unique заполнен из tx_hash';
    END IF;
END $$;

-- 2.5 Заполняем amount_uni и amount_ton из существующих данных
UPDATE transactions
SET 
    amount_uni = COALESCE(
        amount_uni,
        CASE 
            WHEN currency = 'UNI' THEN COALESCE(amount::text, '0')
            ELSE '0'
        END
    ),
    amount_ton = COALESCE(
        amount_ton,
        CASE 
            WHEN currency = 'TON' THEN COALESCE(amount::text, '0')
            ELSE '0'
        END
    )
WHERE (amount_uni IS NULL OR amount_ton IS NULL)
AND amount IS NOT NULL;

-- ЭТАП 3: БЕЗОПАСНАЯ ПОМЕТКА ДУБЛИКАТОВ
-- =====================================

-- 3.1 Помечаем дубликаты по tx_hash_unique (без использования metadata)
WITH duplicates AS (
    SELECT 
        id,
        tx_hash_unique,
        ROW_NUMBER() OVER (PARTITION BY tx_hash_unique ORDER BY created_at, id) as rn
    FROM transactions
    WHERE tx_hash_unique IS NOT NULL
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

-- 3.2 Создаем уникальный индекс
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_tx_hash_unique_safe
ON transactions(tx_hash_unique) 
WHERE tx_hash_unique IS NOT NULL;

-- ЭТАП 4: МИГРАЦИЯ boost_purchases
-- ================================

-- 4.1 Проверяем существование таблицы
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'boost_purchases'
    ) THEN
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
            daily_rate = COALESCE(daily_rate, 0.01),
            start_date = COALESCE(start_date, bp.created_at, NOW()),
            end_date = COALESCE(end_date, COALESCE(bp.created_at, NOW()) + INTERVAL '365 days'),
            is_active = COALESCE(is_active, bp.status = 'active')
        WHERE amount IS NULL OR daily_rate IS NULL;
        
        RAISE NOTICE 'boost_purchases успешно обновлена';
    ELSE
        RAISE NOTICE 'Таблица boost_purchases НЕ существует';
    END IF;
END $$;

-- ЭТАП 5: СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ
-- ==============================

-- 5.1 Представление для чистых транзакций
CREATE OR REPLACE VIEW transactions_clean AS
SELECT * FROM transactions
WHERE is_duplicate IS NOT TRUE OR is_duplicate IS NULL;

-- 5.2 Представление для анализа дубликатов
CREATE OR REPLACE VIEW duplicate_transactions_analysis AS
SELECT 
    t1.id as duplicate_id,
    t1.user_id,
    t1.tx_hash_unique,
    t1.amount_ton,
    t1.created_at,
    t2.id as original_id,
    t2.created_at as original_created_at
FROM transactions t1
JOIN transactions t2 ON t1.duplicate_of_id = t2.id
WHERE t1.is_duplicate = TRUE
ORDER BY t1.created_at DESC;

-- ЭТАП 6: ФИНАЛЬНАЯ ПРОВЕРКА
-- ==========================

-- 6.1 Проверяем результаты миграции
SELECT 
    'Всего транзакций' as metric,
    COUNT(*) as value
FROM transactions
UNION ALL
SELECT 
    'Помечено дубликатов',
    COUNT(*) 
FROM transactions 
WHERE is_duplicate = TRUE
UNION ALL
SELECT 
    'Уникальных tx_hash',
    COUNT(DISTINCT tx_hash_unique) 
FROM transactions 
WHERE tx_hash_unique IS NOT NULL
UNION ALL
SELECT 
    'Транзакций с amount_uni',
    COUNT(*) 
FROM transactions 
WHERE amount_uni IS NOT NULL
UNION ALL
SELECT 
    'Транзакций с amount_ton',
    COUNT(*) 
FROM transactions 
WHERE amount_ton IS NOT NULL;