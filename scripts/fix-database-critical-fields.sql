-- UniFarm: Критические исправления структуры базы данных
-- Дата: 2025-07-11
-- Цель: Добавить отсутствующие поля, которые используются в коде и вызывают ошибки

-- =====================================================
-- 1. КРИТИЧЕСКИЕ ПОЛЯ ДЛЯ ТАБЛИЦЫ transactions
-- =====================================================

-- Добавляем поле для хранения хеша блокчейн-транзакции (критично для TON)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS tx_hash TEXT DEFAULT NULL;

-- Добавляем поле для описания транзакции
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Добавляем поле для отслеживания времени обновления
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Создаем индекс для быстрого поиска по tx_hash
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);

-- =====================================================
-- 2. КРИТИЧЕСКИЕ ПОЛЯ ДЛЯ ТАБЛИЦЫ users (админ-панель)
-- =====================================================

-- Добавляем поле статуса пользователя
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Добавляем поля для отслеживания обработки админом
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP DEFAULT NULL;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS processed_by INTEGER DEFAULT NULL;

-- Создаем индекс для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- =====================================================
-- 3. КРИТИЧЕСКИЕ ПОЛЯ ДЛЯ ТАБЛИЦЫ boost_purchases
-- =====================================================

-- Добавляем тип покупки (важно для различения пакетов)
ALTER TABLE boost_purchases 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'ton_boost';

-- Добавляем валюту платежа
ALTER TABLE boost_purchases 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TON';

-- =====================================================
-- 4. КРИТИЧЕСКИЕ ПОЛЯ ДЛЯ ТАБЛИЦЫ daily_bonus_logs
-- =====================================================

-- Добавляем тип бонуса
ALTER TABLE daily_bonus_logs 
ADD COLUMN IF NOT EXISTS bonus_type VARCHAR(50) DEFAULT 'daily_checkin';

-- Добавляем баланс до и после начисления для аудита
ALTER TABLE daily_bonus_logs 
ADD COLUMN IF NOT EXISTS previous_balance NUMERIC(20,9) DEFAULT 0;

ALTER TABLE daily_bonus_logs 
ADD COLUMN IF NOT EXISTS new_balance NUMERIC(20,9) DEFAULT 0;

-- =====================================================
-- 5. ОБНОВЛЕНИЕ ENUM ДЛЯ ТИПОВ ТРАНЗАКЦИЙ
-- =====================================================

-- Проверяем текущие значения enum
DO $$ 
BEGIN
    -- Добавляем новые типы транзакций если их нет
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FARMING_DEPOSIT' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'transaction_type'
        )
    ) THEN
        ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'FARMING_DEPOSIT';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BOOST_PURCHASE' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'transaction_type'
        )
    ) THEN
        ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'BOOST_PURCHASE';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'DAILY_BONUS' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'transaction_type'
        )
    ) THEN
        ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'DAILY_BONUS';
    END IF;
END $$;

-- =====================================================
-- 6. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =====================================================

-- Выводим структуру обновленных таблиц
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name IN ('transactions', 'users', 'boost_purchases', 'daily_bonus_logs')
AND column_name IN (
    'tx_hash', 'description', 'updated_at',
    'status', 'processed_at', 'processed_by',
    'type', 'currency',
    'bonus_type', 'previous_balance', 'new_balance'
)
ORDER BY table_name, ordinal_position;