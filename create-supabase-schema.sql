-- UniFarm Supabase Database Schema
-- Complete schema for UniFarm Telegram Mini App

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

-- Users table
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

-- User sessions table
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

-- Transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type transaction_type NOT NULL,
  amount_uni NUMERIC(18,6) DEFAULT 0,
  amount_ton NUMERIC(18,6) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Referrals table
CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  inviter_id INTEGER REFERENCES users(id),
  level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  commission_rate NUMERIC(5,4) DEFAULT 0,
  total_earned NUMERIC(18,6) DEFAULT 0
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

-- Create indexes for performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_ref_code ON users(ref_code);
CREATE INDEX idx_users_parent_ref_code ON users(parent_ref_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_referrals_user_id ON referrals(user_id);
CREATE INDEX idx_referrals_inviter_id ON referrals(inviter_id);
CREATE INDEX idx_farming_sessions_user_id ON farming_sessions(user_id);
CREATE INDEX idx_farming_sessions_active ON farming_sessions(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE farming_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're using anon key)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_sessions" ON user_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on referrals" ON referrals FOR ALL USING (true);
CREATE POLICY "Allow all operations on farming_sessions" ON farming_sessions FOR ALL USING (true);

-- Insert test data to verify schema
INSERT INTO users (telegram_id, username, first_name, ref_code, balance_uni, balance_ton) 
VALUES (12345, 'testuser', 'Test User', 'TEST123', 100.000000, 50.000000);

-- Success message
SELECT 'UniFarm Supabase schema created successfully!' as status;