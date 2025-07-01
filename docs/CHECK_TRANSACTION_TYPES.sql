-- Проверочный скрипт для определения существующих типов транзакций

-- 1. Смотрим все уникальные типы транзакций в базе
SELECT DISTINCT type, COUNT(*) as count
FROM transactions
GROUP BY type
ORDER BY count DESC;

-- 2. Смотрим транзакции пользователя 48 с описанием TON или Boost
SELECT 
  id,
  type,
  currency,
  amount_uni,
  amount_ton,
  description,
  created_at
FROM transactions
WHERE user_id = 48
  AND (description LIKE '%TON%' OR description LIKE '%Boost%' OR description LIKE '%boost%')
ORDER BY created_at DESC
LIMIT 20;

-- 3. Проверяем транзакции с ненулевым amount_ton
SELECT 
  id,
  type,
  currency,
  amount_uni,
  amount_ton,
  description
FROM transactions
WHERE user_id = 48
  AND amount_ton IS NOT NULL 
  AND amount_ton != '0'
ORDER BY created_at DESC;

-- 4. Исправляем currency для транзакций с amount_ton > 0
UPDATE transactions
SET currency = 'TON'
WHERE amount_ton IS NOT NULL 
  AND amount_ton != '0'
  AND CAST(amount_ton AS DECIMAL) > 0
  AND (currency IS NULL OR currency != 'TON');

-- 5. Проверяем результат
SELECT 
  COUNT(*) as fixed_transactions,
  SUM(CAST(amount_ton AS DECIMAL)) as total_ton_amount
FROM transactions
WHERE currency = 'TON';