-- Скрипт миграции данных для заполнения поля amount
-- Выполнить ПОСЛЕ добавления поля amount в таблицу transactions

-- Обновляем поле amount для UNI транзакций
UPDATE transactions 
SET amount = CAST(amount_uni AS NUMERIC)
WHERE currency = 'UNI' 
  AND amount_uni IS NOT NULL 
  AND amount_uni != '0'
  AND (amount = 0 OR amount IS NULL);

-- Обновляем поле amount для TON транзакций  
UPDATE transactions
SET amount = CAST(amount_ton AS NUMERIC)
WHERE currency = 'TON'
  AND amount_ton IS NOT NULL
  AND amount_ton != '0'
  AND (amount = 0 OR amount IS NULL);

-- Для транзакций без явной валюты, но с amount_uni
UPDATE transactions
SET amount = CAST(amount_uni AS NUMERIC),
    currency = 'UNI'
WHERE currency IS NULL
  AND amount_uni IS NOT NULL
  AND amount_uni != '0'
  AND CAST(amount_uni AS NUMERIC) > 0
  AND (amount = 0 OR amount IS NULL);

-- Для транзакций без явной валюты, но с amount_ton
UPDATE transactions  
SET amount = CAST(amount_ton AS NUMERIC),
    currency = 'TON'
WHERE currency IS NULL
  AND amount_ton IS NOT NULL
  AND amount_ton != '0'
  AND CAST(amount_ton AS NUMERIC) > 0
  AND (amount = 0 OR amount IS NULL);

-- Статистика после миграции
SELECT 
    currency,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN amount > 0 THEN 1 END) as with_amount,
    COUNT(CASE WHEN amount = 0 OR amount IS NULL THEN 1 END) as without_amount,
    ROUND(AVG(amount), 9) as avg_amount,
    ROUND(MAX(amount), 9) as max_amount
FROM transactions
GROUP BY currency
ORDER BY currency;

-- Проверка транзакций, которые все еще имеют amount = 0
SELECT 
    id,
    user_id,
    type,
    amount,
    amount_uni,
    amount_ton,
    currency,
    created_at
FROM transactions
WHERE amount = 0 OR amount IS NULL
LIMIT 20;