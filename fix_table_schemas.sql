-- Исправление схем специализированных таблиц для полной совместимости

-- 1. Проверяем текущие схемы
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('farming_sessions', 'referral_earnings', 'daily_bonus_history', 'missions', 'mission_progress', 'airdrop_claims', 'wallet_logs')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Добавляем недостающие поля в farming_sessions
ALTER TABLE farming_sessions ADD COLUMN IF NOT EXISTS amount_earned DECIMAL(20,8) DEFAULT 0;
ALTER TABLE farming_sessions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'UNI';
ALTER TABLE farming_sessions ADD COLUMN IF NOT EXISTS farming_rate DECIMAL(20,8) DEFAULT 0;
ALTER TABLE farming_sessions ADD COLUMN IF NOT EXISTS session_start TIMESTAMPTZ;
ALTER TABLE farming_sessions ADD COLUMN IF NOT EXISTS session_end TIMESTAMPTZ;
ALTER TABLE farming_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';

-- 3. Добавляем недостающие поля в referral_earnings
ALTER TABLE referral_earnings ADD COLUMN IF NOT EXISTS percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE referral_earnings ADD COLUMN IF NOT EXISTS amount DECIMAL(20,8) DEFAULT 0;
ALTER TABLE referral_earnings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'UNI';
ALTER TABLE referral_earnings ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'farming';

-- 4. Добавляем недостающие поля в daily_bonus_history
ALTER TABLE daily_bonus_history ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(20,8) DEFAULT 0;
ALTER TABLE daily_bonus_history ADD COLUMN IF NOT EXISTS streak_day INTEGER DEFAULT 1;
ALTER TABLE daily_bonus_history ADD COLUMN IF NOT EXISTS bonus_type VARCHAR(20) DEFAULT 'DAILY_CHECKIN';
ALTER TABLE daily_bonus_history ADD COLUMN IF NOT EXISTS previous_balance DECIMAL(20,8) DEFAULT 0;
ALTER TABLE daily_bonus_history ADD COLUMN IF NOT EXISTS new_balance DECIMAL(20,8) DEFAULT 0;

-- 5. Добавляем недостающие поля в missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS title VARCHAR(100) NOT NULL DEFAULT 'New Mission';
ALTER TABLE missions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS reward_amount DECIMAL(20,8) DEFAULT 0;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS mission_type VARCHAR(20) DEFAULT 'GENERAL';
ALTER TABLE missions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 6. Добавляем недостающие поля в airdrop_claims
ALTER TABLE airdrop_claims ADD COLUMN IF NOT EXISTS airdrop_type VARCHAR(30) DEFAULT 'GENERAL';
ALTER TABLE airdrop_claims ADD COLUMN IF NOT EXISTS amount DECIMAL(20,8) DEFAULT 0;
ALTER TABLE airdrop_claims ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'UNI';
ALTER TABLE airdrop_claims ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- 7. Добавляем недостающие поля в wallet_logs
ALTER TABLE wallet_logs ADD COLUMN IF NOT EXISTS action VARCHAR(30) DEFAULT 'BALANCE_UPDATE';
ALTER TABLE wallet_logs ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'UNI';
ALTER TABLE wallet_logs ADD COLUMN IF NOT EXISTS amount DECIMAL(20,8) DEFAULT 0;
ALTER TABLE wallet_logs ADD COLUMN IF NOT EXISTS balance_before DECIMAL(20,8) DEFAULT 0;
ALTER TABLE wallet_logs ADD COLUMN IF NOT EXISTS balance_after DECIMAL(20,8) DEFAULT 0;
ALTER TABLE wallet_logs ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(30);

-- 8. Проверяем обновленные схемы
SELECT table_name, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name IN ('farming_sessions', 'referral_earnings', 'daily_bonus_history', 'missions', 'mission_progress', 'airdrop_claims', 'wallet_logs')
AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;