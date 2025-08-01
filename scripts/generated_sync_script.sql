-- Скрипт синхронизации данных
-- Сгенерирован: 2025-08-01T18:34:15.328Z
-- ОБЯЗАТЕЛЬНО сделайте backup перед выполнением!

BEGIN;

-- Сохраняем контрольную сумму ДО
CREATE TEMP TABLE checksum_before AS
SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
FROM users;

-- Синхронизация ton_farming_balance (16 записей)
UPDATE users u
SET ton_farming_balance = GREATEST(u.ton_farming_balance, COALESCE(tfd.farming_balance, 0))
FROM ton_farming_data tfd
WHERE u.id = CAST(tfd.user_id AS INTEGER)
  AND u.ton_farming_balance < COALESCE(tfd.farming_balance, 0);

-- Проверяем контрольную сумму ПОСЛЕ
CREATE TEMP TABLE checksum_after AS
SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
FROM users;

-- Сравниваем
SELECT 
  'ДО' as period, total 
FROM checksum_before
UNION ALL
SELECT 
  'ПОСЛЕ' as period, total 
FROM checksum_after;

-- Если суммы совпадают - коммитим
-- COMMIT;
-- Если нет - откатываем
-- ROLLBACK;
