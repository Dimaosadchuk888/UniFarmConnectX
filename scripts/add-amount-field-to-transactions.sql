-- Скрипт для добавления поля amount в таблицу transactions
-- Выполнить в Supabase SQL Editor

-- Добавляем поле amount типа NUMERIC (для точных финансовых расчетов)
-- Поле будет обязательным (NOT NULL) со значением по умолчанию 0
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS amount NUMERIC(20, 9) NOT NULL DEFAULT 0;

-- Создаем индекс для оптимизации запросов по сумме
CREATE INDEX IF NOT EXISTS idx_transactions_amount 
ON transactions(amount);

-- Комментарий к полю
COMMENT ON COLUMN transactions.amount IS 'Общая сумма транзакции в указанной валюте (currency)';

-- Проверка результата
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
    AND column_name = 'amount';