-- Создание недостающих views после миграции

-- View для TON farming
CREATE OR REPLACE VIEW ton_farming_data AS
SELECT 
  id as user_id,
  ton_farming_balance as farming_balance,
  ton_farming_rate as farming_rate,
  ton_farming_start_timestamp,
  ton_farming_last_update,
  ton_farming_accumulated as farming_accumulated,
  ton_farming_last_claim,
  ton_boost_active as boost_active,
  ton_boost_package as boost_package_id,
  ton_boost_expires_at as boost_expires_at,
  created_at
FROM users
WHERE ton_boost_active = true OR ton_farming_balance > 0;

-- View для статистики farming
CREATE OR REPLACE VIEW farming_status_view AS
SELECT 
  COUNT(DISTINCT CASE WHEN uni_farming_active = true THEN id END) as active_uni_farmers,
  COUNT(DISTINCT CASE WHEN ton_boost_active = true THEN id END) as active_ton_farmers,
  SUM(CASE WHEN uni_farming_active = true THEN CAST(uni_farming_balance AS DECIMAL) ELSE 0 END) as total_uni_farming,
  SUM(CASE WHEN ton_boost_active = true THEN CAST(ton_farming_balance AS DECIMAL) ELSE 0 END) as total_ton_farming,
  COUNT(DISTINCT CASE WHEN uni_farming_balance > '0' THEN id END) as users_with_uni_balance,
  COUNT(DISTINCT CASE WHEN ton_farming_balance > '0' THEN id END) as users_with_ton_balance
FROM users;

-- Проверка views
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name IN ('ton_farming_data', 'farming_status_view')
ORDER BY table_name;