-- Безопасное добавление типа BOOST_PURCHASE в enum transaction_type
-- Эта команда добавит новое значение только если оно еще не существует

-- Проверка текущих значений enum (для информации)
SELECT unnest(enum_range(NULL::transaction_type)) AS existing_values;

-- Добавление нового типа BOOST_PURCHASE
-- IF NOT EXISTS предотвратит ошибку если тип уже существует
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'BOOST_PURCHASE';

-- Проверка результата
SELECT unnest(enum_range(NULL::transaction_type)) AS updated_values;

-- После выполнения этого скрипта:
-- 1. Новые покупки TON Boost будут записываться с типом BOOST_PURCHASE
-- 2. Существующие транзакции останутся без изменений
-- 3. Система автоматически начнет использовать новый тип