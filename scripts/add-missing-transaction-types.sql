-- Скрипт для добавления недостающих типов транзакций в enum transaction_type
-- Дата: 10.01.2025
-- Цель: Синхронизация типов транзакций между кодом и базой данных

-- Добавляем новые типы в enum transaction_type
-- Примечание: В PostgreSQL нельзя использовать IF NOT EXISTS с ALTER TYPE ADD VALUE,
-- поэтому проверяем существование через DO блок

DO $$
BEGIN
    -- Проверяем и добавляем BOOST_PURCHASE
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'BOOST_PURCHASE'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'BOOST_PURCHASE';
    END IF;

    -- Проверяем и добавляем FARMING_DEPOSIT
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'FARMING_DEPOSIT'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
    END IF;

    -- Проверяем и добавляем DAILY_BONUS
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'DAILY_BONUS'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'DAILY_BONUS';
    END IF;

    -- Проверяем и добавляем DEPOSIT
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'DEPOSIT'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'DEPOSIT';
    END IF;

    -- Проверяем и добавляем WITHDRAWAL
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'WITHDRAWAL'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'WITHDRAWAL';
    END IF;
END $$;

-- Проверяем результат
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
ORDER BY enumsortorder;