-- SQL скрипт для исправления отображения TON транзакций в истории
-- Проблема: старые транзакции созданы с полем 'amount' вместо 'amount_uni'/'amount_ton'
-- Решение: мигрируем данные в правильные поля на основе валюты

-- 1. Сначала проверяем текущее состояние
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN currency = 'TON' THEN 1 END) as ton_transactions,
  COUNT(CASE WHEN amount_ton IS NOT NULL AND amount_ton != '0' THEN 1 END) as correct_ton_transactions
FROM transactions
WHERE user_id IN (SELECT id FROM users);

-- 2. Обновляем TON транзакции - переносим amount в amount_ton
UPDATE transactions
SET 
  amount_ton = COALESCE(amount, '0'),
  amount_uni = '0'
WHERE 
  currency = 'TON'
  AND (amount_ton IS NULL OR amount_ton = '0')
  AND amount IS NOT NULL;

-- 3. Обновляем UNI транзакции - переносим amount в amount_uni  
UPDATE transactions
SET 
  amount_uni = COALESCE(amount, '0'),
  amount_ton = '0'
WHERE 
  currency = 'UNI'
  AND (amount_uni IS NULL OR amount_uni = '0')
  AND amount IS NOT NULL;

-- 4. Для транзакций без явной валюты - определяем по типу
-- TON транзакции
UPDATE transactions
SET 
  amount_ton = COALESCE(amount, '0'),
  amount_uni = '0',
  currency = 'TON'
WHERE 
  type IN ('boost_purchase', 'ton_farming_income', 'ton_boost_reward')
  AND currency IS NULL
  AND amount IS NOT NULL;

-- 5. UNI транзакции  
UPDATE transactions
SET 
  amount_uni = COALESCE(amount, '0'),
  amount_ton = '0',
  currency = 'UNI'
WHERE 
  type IN ('farming_income', 'referral_bonus', 'mission_reward', 'daily_bonus')
  AND currency IS NULL
  AND amount IS NOT NULL;

-- 6. Проверяем результат
SELECT 
  COUNT(*) as total_after_fix,
  COUNT(CASE WHEN currency = 'TON' AND amount_ton != '0' THEN 1 END) as fixed_ton_transactions,
  COUNT(CASE WHEN currency = 'UNI' AND amount_uni != '0' THEN 1 END) as fixed_uni_transactions
FROM transactions
WHERE user_id IN (SELECT id FROM users);

-- 7. Примеры исправленных транзакций
SELECT 
  id, 
  type,
  currency,
  amount_uni,
  amount_ton,
  description,
  created_at
FROM transactions
WHERE currency = 'TON'
ORDER BY created_at DESC
LIMIT 10;