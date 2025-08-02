-- Сначала архивируем старые таблицы
ALTER TABLE uni_farming_data RENAME TO _archived_uni_farming_data_2025_08_02;
ALTER TABLE ton_farming_data RENAME TO _archived_ton_farming_data_2025_08_02;

-- View для uni_farming_data
CREATE OR REPLACE VIEW uni_farming_data AS
SELECT 
  gen_random_uuid() as id,
  id as user_id,
  uni_deposit_amount as deposit_amount,
  uni_farming_balance as farming_balance,
  COALESCE(uni_farming_balance, 0) as total_earned,
  COALESCE(uni_farming_last_update, created_at) as last_claim_at,
  uni_farming_active as is_active,
  COALESCE(uni_farming_start_timestamp, created_at) as farming_start,
  created_at,
  COALESCE(uni_farming_last_update, created_at) as updated_at,
  COALESCE(uni_farming_rate, 0.01) as farming_rate,
  uni_farming_start_timestamp as farming_start_timestamp,
  uni_farming_last_update as farming_last_update,
  uni_deposit_amount as farming_deposit
FROM users
WHERE uni_deposit_amount > 0 OR uni_farming_balance > 0;

-- View для ton_farming_data  
CREATE OR REPLACE VIEW ton_farming_data AS
SELECT 
  gen_random_uuid() as id,
  id as user_id,
  ton_wallet_address as wallet_address,
  ton_farming_balance as farming_balance,
  COALESCE(ton_boost_package, ton_boost_package_id) as boost_package_id,
  created_at,
  COALESCE(ton_farming_last_update, created_at) as updated_at
FROM users
WHERE ton_wallet_address IS NOT NULL OR ton_farming_balance > 0 OR ton_boost_package IS NOT NULL;