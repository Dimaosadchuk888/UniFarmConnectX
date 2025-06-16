-- T62 - Создание недостающих таблиц Supabase на основе TypeScript типов
-- Выполнить в Supabase SQL Editor

-- 1. BOOST_PURCHASES таблица (modules/boost/types.ts)
CREATE TABLE IF NOT EXISTS boost_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  boost_id INTEGER NOT NULL,
  amount TEXT NOT NULL,
  daily_rate TEXT NOT NULL,
  source TEXT CHECK (source IN ('wallet', 'ton')) NOT NULL,
  tx_hash TEXT,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'failed')) DEFAULT 'pending',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  last_claim TIMESTAMP,
  total_earned TEXT DEFAULT '0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes для boost_purchases
CREATE INDEX IF NOT EXISTS idx_boost_purchases_user_id ON boost_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_status ON boost_purchases(status);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_active ON boost_purchases(is_active);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_tx_hash ON boost_purchases(tx_hash);

-- 2. MISSIONS таблица (modules/missions/types.ts)
CREATE TABLE IF NOT EXISTS missions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT CHECK (mission_type IN ('daily', 'weekly', 'one_time', 'referral')) NOT NULL,
  target_value INTEGER,
  reward_amount TEXT NOT NULL,
  reward_type TEXT CHECK (reward_type IN ('UNI', 'TON', 'BOOST')) NOT NULL,
  requirements TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_repeatable BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. USER_MISSIONS таблица (modules/missions/types.ts)
CREATE TABLE IF NOT EXISTS user_missions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  mission_id INTEGER REFERENCES missions(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('active', 'completed', 'claimed')) DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  target_value INTEGER,
  progress_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  claimed_at TIMESTAMP,
  reward_claimed TEXT DEFAULT '0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- Indexes для missions
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_status ON user_missions(status);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON user_missions(mission_id);

-- 4. AIRDROPS таблица (modules/airdrop/types.ts)
CREATE TABLE IF NOT EXISTS airdrops (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  reward_amount TEXT DEFAULT '0',
  reward_currency TEXT CHECK (reward_currency IN ('UNI', 'TON')) DEFAULT 'UNI',
  distribution_date TIMESTAMP,
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(telegram_id, user_id)
);

-- Indexes для airdrops
CREATE INDEX IF NOT EXISTS idx_airdrops_telegram_id ON airdrops(telegram_id);
CREATE INDEX IF NOT EXISTS idx_airdrops_user_id ON airdrops(user_id);
CREATE INDEX IF NOT EXISTS idx_airdrops_status ON airdrops(status);

-- 5. DAILY_BONUS_LOGS таблица (modules/dailyBonus/types.ts)
CREATE TABLE IF NOT EXISTS daily_bonus_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  bonus_amount TEXT NOT NULL,
  bonus_type TEXT CHECK (bonus_type IN ('UNI', 'TON', 'MULTIPLIER')) NOT NULL,
  streak_count INTEGER NOT NULL,
  claimed_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, claimed_date)
);

-- Indexes для daily_bonus_logs
CREATE INDEX IF NOT EXISTS idx_daily_bonus_logs_user_id ON daily_bonus_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_bonus_logs_date ON daily_bonus_logs(claimed_date);

-- 6. WALLETS таблица (modules/wallet/types.ts)
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  wallet_type TEXT CHECK (wallet_type IN ('internal', 'ton', 'external')) DEFAULT 'internal',
  wallet_address TEXT,
  balance_uni TEXT DEFAULT '0',
  balance_ton TEXT DEFAULT '0',
  total_deposited TEXT DEFAULT '0',
  total_withdrawn TEXT DEFAULT '0',
  last_transaction_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, wallet_type)
);

-- Indexes для wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);

-- Добавление sample данных для missions
INSERT INTO missions (title, description, mission_type, target_value, reward_amount, reward_type, is_active) VALUES
('Daily Login', 'Login to UniFarm every day', 'daily', 1, '5', 'UNI', true),
('First Farming', 'Make your first UNI farming deposit', 'one_time', 1, '10', 'UNI', true),
('Invite Friends', 'Invite 5 friends to UniFarm', 'referral', 5, '25', 'UNI', true),
('Weekly Farmer', 'Farm UNI for 7 consecutive days', 'weekly', 7, '50', 'UNI', true),
('Big Depositor', 'Deposit 100+ UNI in farming', 'one_time', 100, '20', 'UNI', true)
ON CONFLICT DO NOTHING;

-- Включение Row Level Security
ALTER TABLE boost_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrops ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonus_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Sample RLS policies (можно настроить позже)
CREATE POLICY IF NOT EXISTS "Users can view own boost purchases" ON boost_purchases
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint));

CREATE POLICY IF NOT EXISTS "Users can view own missions" ON user_missions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint));