-- SQL скрипт для добавления защиты от дублирования tx_hash
-- и проверки структуры таблиц для TON Boost системы

-- 1. Добавляем уникальный индекс на tx_hash для защиты от дублирования
CREATE UNIQUE INDEX IF NOT EXISTS boost_tx_hash_unique 
ON boost_purchases(tx_hash) 
WHERE tx_hash IS NOT NULL;

-- 2. Проверка структуры таблицы boost_purchases
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'boost_purchases'
ORDER BY ordinal_position;

-- 3. Проверка существующих индексов
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'boost_purchases';

-- 4. Примеры запросов для проверки данных
-- Проверка таблицы boost_purchases
SELECT * FROM boost_purchases LIMIT 1;

-- Проверка транзакций с типом DAILY_BONUS
SELECT * FROM transactions WHERE type = 'DAILY_BONUS' LIMIT 1;

-- Проверка полей TON Boost в таблице users
SELECT id, ton_boost_package, ton_boost_rate, balance_uni, balance_ton 
FROM users 
WHERE ton_boost_package IS NOT NULL 
LIMIT 5;

-- 5. Проверка на дублирующиеся tx_hash (должно вернуть 0 строк после добавления индекса)
SELECT tx_hash, COUNT(*) as count
FROM boost_purchases
WHERE tx_hash IS NOT NULL
GROUP BY tx_hash
HAVING COUNT(*) > 1;