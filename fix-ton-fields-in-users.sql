-- Добавление TON-related полей в таблицу users
-- Дата: 11 июля 2025

-- 1. Добавляем поля для TON boost пакетов
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_boost_package INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ton_boost_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ton_boost_expires_at TIMESTAMP DEFAULT NULL;

-- 2. Добавляем поля для TON farming
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ton_farming_deposit NUMERIC(20,9) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ton_farming_balance NUMERIC(20,9) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ton_farming_rate NUMERIC(10,6) DEFAULT 0.01,
ADD COLUMN IF NOT EXISTS ton_farming_start_timestamp TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ton_farming_last_update TIMESTAMP DEFAULT NULL;

-- 3. Проверяем результат
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name LIKE 'ton_%'
ORDER BY column_name;