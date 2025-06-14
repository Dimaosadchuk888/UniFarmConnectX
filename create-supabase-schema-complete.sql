-- UniFarm Supabase Database Schema - COMPLETE VERSION
-- Includes all required tables based on requirements and shared/schema.ts analysis

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE transaction_type AS ENUM (
  'FARMING_REWARD',
  'BOOST_REWARD', 
  'MISSION_REWARD',
  'DAILY_BONUS',
  'REFERRAL_REWARD',
  'WITHDRAWAL',
  'DEPOSIT'
);

CREATE TYPE farming_type AS ENUM (
  'UNI_FARMING',
  'TON_FARMING', 
  'BOOST_FARMING'
);

-- Users table (matches shared/schema.ts exactly)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  username TEXT,
  first_name TEXT,
  wallet TEXT,
  ton_wallet_address TEXT,
  ref_code TEXT UNIQUE,
  parent_ref_code TEXT,
  referred_by INTEGER,
  balance_uni NUMERIC(18,6) DEFAULT 0,
  balance_ton NUMERIC(18,6) DEFAULT 0,
  uni_deposit_amount NUMERIC(18,6) DEFAULT 0,
  uni_farming_start_timestamp TIMESTAMP,
  uni_farming_balance NUMERIC(18,6) DEFAULT 0,
  uni_farming_rate NUMERIC(18,6) DEFAULT 0,
  uni_farming_last_update TIMESTAMP,
  uni_farming_deposit NUMERIC(18,6) DEFAULT 0,
  uni_farming_activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  checkin_last_date TIMESTAMP,
  checkin_streak INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE
);

-- User sessions table (matches shared/schema.ts)
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  session_token TEXT NOT NULL UNIQUE,
  telegram_init_data TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Wallet table (REQUIRED - missing from original)
CREATE TABLE wallet (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  ton_balance NUMERIC(18,6) DEFAULT 0,
  uni_balance NUMERIC(18,6) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Transactions table (improved structure for Supabase API)
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type transaction_type NOT NULL,
  amount_uni NUMERIC(18,6) DEFAULT 0,
  amount_ton NUMERIC(18,6) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  status TEXT DEFAULT 'confirmed',
  source TEXT,
  tx_hash TEXT
);

-- Referrals table (enhanced with commission tracking)
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  inviter_id INTEGER REFERENCES users(id),
  level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  commission_rate NUMERIC(5,4) DEFAULT 0,
  total_earned NUMERIC(18,6) DEFAULT 0,
  reward_uni NUMERIC(18,6) DEFAULT 0,
  reward_ton NUMERIC(18,6) DEFAULT 0
);

-- Farming sessions table
CREATE TABLE farming_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  farming_type farming_type NOT NULL,
  deposit_amount NUMERIC(18,6) NOT NULL,
  rate NUMERIC(18,6) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  last_claim TIMESTAMP,
  total_earned NUMERIC(18,6) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  boost_multiplier NUMERIC(5,2) DEFAULT 1.0,
  expires_at TIMESTAMP
);

-- Boosts table (REQUIRED - missing from original)
CREATE TABLE boosts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type TEXT NOT NULL,
  value NUMERIC(5,2) NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT
);

-- Airdrop missions table (REQUIRED - based on missions from shared/schema.ts)
CREATE TABLE airdrop_missions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward_uni NUMERIC(18,6) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  requirements JSONB,
  completion_count INTEGER DEFAULT 0
);

-- User mission completions (for tracking user progress)
CREATE TABLE user_mission_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  mission_id INTEGER REFERENCES airdrop_missions(id),
  completed_at TIMESTAMP DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, mission_id)
);

-- Additional tables from shared/schema.ts analysis

-- User balances (separate balance tracking)
CREATE TABLE user_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  balance_uni NUMERIC(18,6) DEFAULT 0,
  balance_ton NUMERIC(18,6) DEFAULT 0,
  total_earned_uni NUMERIC(18,6) DEFAULT 0,
  total_earned_ton NUMERIC(18,6) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Farming deposits (from shared/schema.ts)
CREATE TABLE farming_deposits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount_uni NUMERIC(18,6),
  rate_uni NUMERIC(5,2),
  rate_ton NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  last_claim TIMESTAMP,
  is_boosted BOOLEAN DEFAULT FALSE,
  deposit_type TEXT DEFAULT 'regular',
  boost_id INTEGER,
  expires_at TIMESTAMP
);

-- Referral earnings tracking
CREATE TABLE referral_earnings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  source_user_id INTEGER REFERENCES users(id),
  amount NUMERIC(18,6) NOT NULL,
  currency TEXT NOT NULL,
  level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create comprehensive indexes for performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_ref_code ON users(ref_code);
CREATE INDEX idx_users_parent_ref_code ON users(parent_ref_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);

CREATE INDEX idx_wallet_user_id ON wallet(user_id);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE INDEX idx_referrals_user_id ON referrals(user_id);
CREATE INDEX idx_referrals_inviter_id ON referrals(inviter_id);
CREATE INDEX idx_referrals_level ON referrals(level);

CREATE INDEX idx_farming_sessions_user_id ON farming_sessions(user_id);
CREATE INDEX idx_farming_sessions_active ON farming_sessions(is_active);

CREATE INDEX idx_boosts_user_id ON boosts(user_id);
CREATE INDEX idx_boosts_active ON boosts(is_active);

CREATE INDEX idx_airdrop_missions_active ON airdrop_missions(is_active);
CREATE INDEX idx_user_mission_completions_user_id ON user_mission_completions(user_id);

CREATE INDEX idx_farming_deposits_user_id ON farming_deposits(user_id);
CREATE INDEX idx_referral_earnings_user_id ON referral_earnings(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE farming_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mission_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE farming_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (using anon key)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_sessions" ON user_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on wallet" ON wallet FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on referrals" ON referrals FOR ALL USING (true);
CREATE POLICY "Allow all operations on farming_sessions" ON farming_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on boosts" ON boosts FOR ALL USING (true);
CREATE POLICY "Allow all operations on airdrop_missions" ON airdrop_missions FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_mission_completions" ON user_mission_completions FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_balances" ON user_balances FOR ALL USING (true);
CREATE POLICY "Allow all operations on farming_deposits" ON farming_deposits FOR ALL USING (true);
CREATE POLICY "Allow all operations on referral_earnings" ON referral_earnings FOR ALL USING (true);

-- Insert sample airdrop missions
INSERT INTO airdrop_missions (type, title, description, reward_uni, is_active) VALUES
('invite', 'Пригласить друга', 'Пригласите одного друга в UniFarm', 50.000000, true),
('social', 'Подписаться на Telegram', 'Подпишитесь на наш Telegram канал', 25.000000, true),
('check-in', 'Ежедневный вход', 'Заходите в приложение 7 дней подряд', 100.000000, true),
('deposit', 'Первый депозит', 'Сделайте первый депозит в фарминг', 200.000000, true);

-- Insert test data to verify schema
INSERT INTO users (telegram_id, username, first_name, ref_code, balance_uni, balance_ton) 
VALUES (12345, 'testuser', 'Test User', 'TEST123', 100.000000, 50.000000);

-- Create wallet entry for test user
INSERT INTO wallet (user_id, uni_balance, ton_balance) 
VALUES (1, 100.000000, 50.000000);

-- Success message
SELECT 'UniFarm Complete Supabase schema created successfully!' as status,
       'All required tables: users, user_sessions, wallet, transactions, referrals, farming_sessions, boosts, airdrop_missions' as tables_created;