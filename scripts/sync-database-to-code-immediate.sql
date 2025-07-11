-- =====================================================
-- СРОЧНАЯ СИНХРОНИЗАЦИЯ БД С КОДОМ UNIFARM
-- Дата: 11.01.2025
-- Цель: 100% соответствие структуры БД с ожиданиями кода
-- =====================================================

-- 1. КРИТИЧНО: Добавляем недостающие типы транзакций в ENUM
-- Код ожидает эти типы в shared/schema.ts
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'BOOST_REWARD';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'MISSION_REWARD';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'DAILY_BONUS';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'REFERRAL_REWARD';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'WITHDRAWAL';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'DEPOSIT';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'FARMING_DEPOSIT';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'BOOST_PURCHASE';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'AIRDROP_CLAIM';

-- 2. КРИТИЧНО: Добавляем отсутствующее поле last_active в users
-- Используется в modules/user/controller.ts:getUserStats
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();

-- 3. Добавляем недостающие поля в таблицу users согласно коду
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guest_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS referred_by_user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS farming_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_farming_claim TIMESTAMP,
ADD COLUMN IF NOT EXISTS total_farming_earned NUMERIC(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_boost_id INTEGER,
ADD COLUMN IF NOT EXISTS boost_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS missions_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_daily_bonus TIMESTAMP,
ADD COLUMN IF NOT EXISTS airdrop_eligible BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS total_referral_earnings NUMERIC(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS withdrawal_limit NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_fa_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS language_code VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vip_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- 4. Добавляем недостающие поля в таблицу transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS amount NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS from_user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS to_user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS blockchain_network VARCHAR(50),
ADD COLUMN IF NOT EXISTS blockchain_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS blockchain_confirmations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
ADD COLUMN IF NOT EXISTS parent_transaction_id INTEGER REFERENCES transactions(id),
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS device_info JSONB,
ADD COLUMN IF NOT EXISTS location_info JSONB;

-- 5. Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
CREATE INDEX IF NOT EXISTS idx_users_guest_id ON users(guest_id);
CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users(referred_by_user_id);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_from_user_id ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user_id ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_blockchain_tx_hash ON transactions(blockchain_tx_hash);

-- 6. Создаем таблицу user_sessions если не существует
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    location_info JSONB,
    last_activity TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- 7. Добавляем поля в таблицу referrals
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS inviter_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS invited_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_commission NUMERIC(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_referral_id INTEGER REFERENCES referrals(id);

-- 8. Добавляем поля в таблицу user_missions
ALTER TABLE user_missions
ADD COLUMN IF NOT EXISTS mission_id INTEGER NOT NULL,
ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL REFERENCES users(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS target INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS reward_currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 9. Добавляем поля в таблицу daily_bonus_logs
ALTER TABLE daily_bonus_logs
ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL REFERENCES users(id),
ADD COLUMN IF NOT EXISTS day_number INTEGER NOT NULL,
ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(20,8) NOT NULL,
ADD COLUMN IF NOT EXISTS bonus_currency VARCHAR(10) DEFAULT 'UNI',
ADD COLUMN IF NOT EXISTS streak_bonus NUMERIC(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bonus NUMERIC(20,8) NOT NULL,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 10. Добавляем поля в таблицу farming_sessions
ALTER TABLE farming_sessions
ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL REFERENCES users(id),
ADD COLUMN IF NOT EXISTS farming_type VARCHAR(50) NOT NULL, -- 'UNI' или 'TON'
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(20,8) NOT NULL,
ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(5,2) NOT NULL,
ADD COLUMN IF NOT EXISTS daily_income NUMERIC(20,8) NOT NULL,
ADD COLUMN IF NOT EXISTS total_earned NUMERIC(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_claim_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS auto_compound BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS boost_multiplier NUMERIC(5,2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 11. Добавляем поля в таблицу boost_purchases
ALTER TABLE boost_purchases
ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL REFERENCES users(id),
ADD COLUMN IF NOT EXISTS package_id INTEGER NOT NULL,
ADD COLUMN IF NOT EXISTS package_name VARCHAR(100) NOT NULL,
ADD COLUMN IF NOT EXISTS boost_type VARCHAR(50) NOT NULL, -- 'farming_boost', 'referral_boost', etc
ADD COLUMN IF NOT EXISTS boost_percentage NUMERIC(5,2) NOT NULL,
ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL,
ADD COLUMN IF NOT EXISTS price_ton NUMERIC(20,8) NOT NULL,
ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 12. Добавляем поля в таблицу airdrops
ALTER TABLE airdrops
ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(100) NOT NULL,
ADD COLUMN IF NOT EXISTS campaign_name VARCHAR(255) NOT NULL,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(20,8) NOT NULL,
ADD COLUMN IF NOT EXISTS distributed_amount NUMERIC(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL,
ADD COLUMN IF NOT EXISTS participants_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_participants INTEGER,
ADD COLUMN IF NOT EXISTS amount_per_user NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS eligibility_criteria JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 13. Создаем таблицу airdrop_claims для учета получателей
CREATE TABLE IF NOT EXISTS airdrop_claims (
    id SERIAL PRIMARY KEY,
    airdrop_id INTEGER NOT NULL REFERENCES airdrops(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount NUMERIC(20,8) NOT NULL,
    transaction_id INTEGER REFERENCES transactions(id),
    claimed_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(airdrop_id, user_id)
);

-- 14. Обновляем поля в withdraw_requests для полного соответствия
ALTER TABLE withdraw_requests
ADD COLUMN IF NOT EXISTS request_number VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS user_telegram_id BIGINT,
ADD COLUMN IF NOT EXISTS user_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS amount_uni NUMERIC(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'TON',
ADD COLUMN IF NOT EXISTS payment_tx_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_comment TEXT,
ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 15. Создаем триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггер к таблицам с полем updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column()',
            t, t
        );
    END LOOP;
END $$;

-- 16. Обновляем дефолтные значения для соответствия коду
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE transactions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE missions ALTER COLUMN created_at SET DEFAULT NOW();

-- 17. Создаем функцию для генерации request_number в withdraw_requests
CREATE OR REPLACE FUNCTION generate_withdraw_request_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.request_number = 'WR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::text, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_withdraw_request_number
AFTER INSERT ON withdraw_requests
FOR EACH ROW
EXECUTE FUNCTION generate_withdraw_request_number();

-- 18. Создаем таблицу для хранения реферальных комиссий (используется в коде)
CREATE TABLE IF NOT EXISTS referral_commissions (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER NOT NULL REFERENCES users(id),
    to_user_id INTEGER NOT NULL REFERENCES users(id),
    source_transaction_id INTEGER REFERENCES transactions(id),
    level INTEGER NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(20,8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'farming', 'boost', 'mission', etc
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_referral_commissions_from_user ON referral_commissions(from_user_id);
CREATE INDEX idx_referral_commissions_to_user ON referral_commissions(to_user_id);
CREATE INDEX idx_referral_commissions_created ON referral_commissions(created_at);

-- 19. Добавляем системные настройки (используются в коде)
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    value_type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Добавляем базовые системные настройки
INSERT INTO system_settings (key, value, value_type, description) VALUES
('uni_farming_base_rate', '0.01', 'number', 'Базовая ставка UNI фарминга (1% в день)'),
('ton_boost_enabled', 'true', 'boolean', 'Включен ли TON Boost'),
('referral_max_levels', '20', 'number', 'Максимальное количество уровней рефералов'),
('daily_bonus_base_amount', '5', 'number', 'Базовая сумма ежедневного бонуса UNI'),
('withdrawal_min_amount_ton', '1', 'number', 'Минимальная сумма вывода TON'),
('withdrawal_fee_percentage', '2', 'number', 'Комиссия за вывод в процентах')
ON CONFLICT (key) DO NOTHING;

-- 20. Финальная проверка и оптимизация
ANALYZE users;
ANALYZE transactions;
ANALYZE referrals;
ANALYZE user_missions;
ANALYZE daily_bonus_logs;
ANALYZE farming_sessions;
ANALYZE boost_purchases;
ANALYZE withdraw_requests;

-- Вывод результата
DO $$
BEGIN
    RAISE NOTICE 'База данных успешно синхронизирована с кодом UniFarm!';
    RAISE NOTICE 'Добавлены все недостающие типы транзакций';
    RAISE NOTICE 'Добавлено поле users.last_active';
    RAISE NOTICE 'Все таблицы приведены в соответствие с ожиданиями кода';
END $$;