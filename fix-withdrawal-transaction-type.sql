-- Исправление типа транзакции для заявок на вывод
-- Дата: 28.07.2025
-- Проблема: enum transaction_type не содержит 'withdrawal' (только 'WITHDRAWAL')

DO $$ 
BEGIN
    -- Добавляем lowercase 'withdrawal' для совместимости с кодом
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'withdrawal' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'withdrawal';
        RAISE NOTICE 'Добавлен тип транзакции: withdrawal';
    ELSE
        RAISE NOTICE 'Тип транзакции withdrawal уже существует';
    END IF;

    -- Добавляем 'withdrawal_fee' для комиссий
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'withdrawal_fee' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'withdrawal_fee';
        RAISE NOTICE 'Добавлен тип транзакции: withdrawal_fee';
    ELSE
        RAISE NOTICE 'Тип транзакции withdrawal_fee уже существует';
    END IF;

    -- Добавляем 'BOOST_PAYMENT' для TON Boost платежей (если нет)
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'BOOST_PAYMENT' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'BOOST_PAYMENT';
        RAISE NOTICE 'Добавлен тип транзакции: BOOST_PAYMENT';
    ELSE
        RAISE NOTICE 'Тип транзакции BOOST_PAYMENT уже существует';
    END IF;
END $$;

-- Проверяем результат
SELECT enumlabel as transaction_types 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
ORDER BY enumlabel;