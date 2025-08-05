-- DATABASE CONSISTENCY FIX
-- Исправляет все проблемы с данными и приводит их в консистентное состояние

-- 1. Исправление NULL и некорректных балансов
UPDATE users 
SET 
  balance_uni = COALESCE(NULLIF(balance_uni, ''), '0')::numeric,
  balance_ton = COALESCE(NULLIF(balance_ton, ''), '0')::numeric,
  uni_deposit_amount = COALESCE(NULLIF(uni_deposit_amount, ''), '0')::numeric,
  uni_farming_balance = COALESCE(NULLIF(uni_farming_balance, ''), '0')::numeric,
  last_active = COALESCE(last_active, NOW())
WHERE 
  balance_uni IS NULL OR balance_uni = '' OR
  balance_ton IS NULL OR balance_ton = '' OR
  uni_deposit_amount IS NULL OR uni_deposit_amount = '' OR
  uni_farming_balance IS NULL OR uni_farming_balance = '' OR
  last_active IS NULL;

-- 2. Исправление отрицательных балансов
UPDATE users 
SET 
  balance_uni = GREATEST(balance_uni::numeric, 0),
  balance_ton = GREATEST(balance_ton::numeric, 0),
  uni_deposit_amount = GREATEST(uni_deposit_amount::numeric, 0),
  uni_farming_balance = GREATEST(uni_farming_balance::numeric, 0)
WHERE 
  balance_uni::numeric < 0 OR
  balance_ton::numeric < 0 OR
  uni_deposit_amount::numeric < 0 OR
  uni_farming_balance::numeric < 0;

-- 3. Синхронизация farming статусов с депозитами
UPDATE users 
SET uni_farming_active = CASE 
  WHEN uni_deposit_amount::numeric > 0 THEN true
  ELSE false
END
WHERE (uni_deposit_amount::numeric > 0 AND uni_farming_active = false) 
   OR (uni_deposit_amount::numeric = 0 AND uni_farming_active = true);

-- 4. Установка farming timestamp для активных фармеров без timestamp
UPDATE users 
SET uni_farming_start_timestamp = NOW()
WHERE uni_farming_active = true 
  AND uni_farming_start_timestamp IS NULL 
  AND uni_deposit_amount::numeric > 0;

-- 5. Исправление некорректных enum значений в транзакциях
UPDATE transactions 
SET status = 'completed'
WHERE status NOT IN ('completed', 'pending', 'failed', 'cancelled');

-- 6. Удаление транзакций с некорректными суммами
DELETE FROM transactions 
WHERE (amount_uni IS NULL OR amount_uni = '' OR amount_uni::numeric < 0)
  AND (amount_ton IS NULL OR amount_ton = '' OR amount_ton::numeric < 0);

-- 7. Исправление user_id в транзакциях (если есть некорректные)
UPDATE transactions 
SET user_id = (
  SELECT id FROM users WHERE telegram_id = transactions.user_id::text::bigint
)
WHERE user_id::text ~ '^[0-9]{8,15}$' -- Если user_id выглядит как telegram_id
  AND EXISTS (
    SELECT 1 FROM users WHERE telegram_id = transactions.user_id::text::bigint
  );

-- 8. Обновление updated_at для всех пользователей
UPDATE users 
SET updated_at = NOW()
WHERE updated_at IS NULL OR updated_at < NOW() - INTERVAL '1 day';

-- 9. Проверочный запрос - статистика после исправлений
SELECT 
  'USERS' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN balance_uni::numeric > 0 THEN 1 END) as with_uni_balance,
  COUNT(CASE WHEN balance_ton::numeric > 0 THEN 1 END) as with_ton_balance,
  COUNT(CASE WHEN uni_farming_active = true THEN 1 END) as active_farmers,
  ROUND(SUM(balance_uni::numeric), 6) as total_uni,
  ROUND(SUM(balance_ton::numeric), 6) as total_ton
FROM users

UNION ALL

SELECT 
  'TRANSACTIONS' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN amount_uni::numeric > 0 THEN 1 END) as uni_transactions,
  COUNT(CASE WHEN amount_ton::numeric > 0 THEN 1 END) as ton_transactions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  ROUND(SUM(amount_uni::numeric), 6) as total_uni,
  ROUND(SUM(amount_ton::numeric), 6) as total_ton
FROM transactions;