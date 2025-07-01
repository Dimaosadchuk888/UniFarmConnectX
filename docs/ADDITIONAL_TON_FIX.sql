-- Дополнительный скрипт для исправления TON транзакций
-- Применять если первый скрипт не помог

-- 1. Проверяем текущее состояние
SELECT 
  user_id,
  type,
  currency,
  amount_uni,
  amount_ton,
  description
FROM transactions
WHERE user_id = 48
  AND (type LIKE '%ton%' OR type LIKE '%boost%' OR description LIKE '%TON%')
ORDER BY created_at DESC
LIMIT 20;

-- 2. Более агрессивное исправление - устанавливаем currency явно для всех TON транзакций
UPDATE transactions
SET 
  currency = 'TON',
  amount_ton = CASE
    WHEN amount_ton IS NOT NULL AND amount_ton != '0' THEN amount_ton
    WHEN amount IS NOT NULL THEN amount
    ELSE '0'
  END,
  amount_uni = '0'
WHERE 
  (type IN ('boost_purchase', 'ton_farming_income', 'ton_boost_reward', 'boost_farming')
   OR description LIKE '%TON%'
   OR description LIKE '%Boost%')
  AND (currency IS NULL OR currency != 'TON');

-- 3. Проверяем результат для пользователя 48
SELECT 
  COUNT(*) as ton_transactions_count,
  SUM(CAST(amount_ton AS DECIMAL)) as total_ton_amount
FROM transactions
WHERE user_id = 48
  AND currency = 'TON';

-- 4. Показываем примеры исправленных транзакций
SELECT 
  id,
  type,
  currency,
  amount_ton,
  description,
  created_at
FROM transactions
WHERE user_id = 48
  AND currency = 'TON'
ORDER BY created_at DESC
LIMIT 10;