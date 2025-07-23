-- ================================================
-- СКРИПТ 4: Миграция таблицы boost_purchases
-- ================================================
-- Добавляем недостающие поля для корректной работы кода

-- 1. Проверяем текущую структуру таблицы
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'boost_purchases'
ORDER BY ordinal_position;

-- 2. Добавляем недостающие колонки
ALTER TABLE boost_purchases 
ADD COLUMN IF NOT EXISTS amount DECIMAL(20,9) DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,6) DEFAULT 0.01,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Заполняем данные для существующих записей
UPDATE boost_purchases bp
SET 
    amount = COALESCE(u.balance_ton::decimal, 0),
    daily_rate = CASE bp.package_id
        WHEN 1 THEN 0.01    -- 1% daily
        WHEN 2 THEN 0.015   -- 1.5% daily
        WHEN 3 THEN 0.02    -- 2% daily
        WHEN 4 THEN 0.025   -- 2.5% daily
        WHEN 5 THEN 0.03    -- 3% daily
        ELSE 0.01
    END,
    start_date = COALESCE(bp.created_at, NOW()),
    end_date = COALESCE(bp.created_at, NOW()) + INTERVAL '365 days',
    is_active = (bp.status = 'active')
FROM users u
WHERE bp.user_id = u.id 
AND bp.amount = 0;

-- 4. Проверяем результат миграции
SELECT 
    COUNT(*) as total_boost_purchases,
    COUNT(CASE WHEN amount > 0 THEN 1 END) as with_amount,
    COUNT(CASE WHEN daily_rate > 0 THEN 1 END) as with_rate,
    COUNT(CASE WHEN is_active THEN 1 END) as active_boosts
FROM boost_purchases;

-- 5. Примеры данных после миграции
SELECT 
    bp.id,
    bp.user_id,
    bp.package_id,
    bp.amount,
    bp.daily_rate,
    bp.start_date,
    bp.end_date,
    bp.is_active,
    u.ton_boost_package as user_boost_package
FROM boost_purchases bp
JOIN users u ON bp.user_id = u.id
ORDER BY bp.created_at DESC
LIMIT 10;