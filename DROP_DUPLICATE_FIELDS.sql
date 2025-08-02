
-- SQL для удаления дублирующихся полей
-- ВНИМАНИЕ: Выполнять ТОЛЬКО после обновления всего кода!

-- Проверка данных перед удалением
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN uni_deposit_amount != uni_farming_deposit THEN 1 END) as deposit_diffs,
  COUNT(CASE WHEN ton_boost_package != ton_boost_package_id THEN 1 END) as boost_diffs,
  COUNT(CASE WHEN wallet != ton_wallet_address THEN 1 END) as wallet_diffs
FROM users;

-- Если все различия = 0, можно безопасно удалять поля:

-- 1. Удаление uni_farming_deposit (дубликат uni_deposit_amount)
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_deposit;

-- 2. Удаление ton_boost_package_id (дубликат ton_boost_package)
ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_package_id;

-- 3. Удаление wallet (заменен на ton_wallet_address)
ALTER TABLE users DROP COLUMN IF EXISTS wallet;

-- Проверка результата
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name IN ('uni_farming_deposit', 'ton_boost_package_id', 'wallet');
