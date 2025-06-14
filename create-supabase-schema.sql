-- Complete UniFarm users table schema for Supabase
-- Based on existing schema analysis from shared/schema.ts

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL UNIQUE,
  username VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  ref_code VARCHAR NOT NULL UNIQUE,
  parent_ref_code VARCHAR,
  balance_uni DECIMAL DEFAULT 0,
  balance_ton DECIMAL DEFAULT 0,
  total_farmed_uni DECIMAL DEFAULT 0,
  total_farmed_ton DECIMAL DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  wallet VARCHAR,
  ton_wallet_address VARCHAR,
  referred_by INTEGER REFERENCES users(id),
  uni_deposit_amount DECIMAL DEFAULT 0,
  ton_deposit_amount DECIMAL DEFAULT 0,
  farming_start_time TIMESTAMP,
  last_farming_claim TIMESTAMP,
  language_code VARCHAR DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  uni_farming_start_timestamp TIMESTAMP,
  ton_farming_start_timestamp TIMESTAMP,
  last_uni_claim TIMESTAMP,
  last_ton_claim TIMESTAMP,
  daily_bonus_streak INTEGER DEFAULT 0,
  last_daily_bonus TIMESTAMP,
  referral_count INTEGER DEFAULT 0,
  total_referral_earnings DECIMAL DEFAULT 0,
  uni_farming_balance DECIMAL DEFAULT 0,
  ton_farming_balance DECIMAL DEFAULT 0,
  guest_id VARCHAR,
  boost_multiplier DECIMAL DEFAULT 1.0,
  boost_expiry TIMESTAMP,
  uni_farming_rate DECIMAL DEFAULT 0,
  ton_farming_rate DECIMAL DEFAULT 0,
  missions_completed INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  uni_farming_last_update TIMESTAMP,
  ton_farming_last_update TIMESTAMP,
  avatar_url VARCHAR,
  bio TEXT,
  achievements TEXT,
  uni_farming_deposit DECIMAL DEFAULT 0,
  ton_farming_deposit DECIMAL DEFAULT 0,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notification_settings JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  uni_farming_activated_at TIMESTAMP,
  ton_farming_activated_at TIMESTAMP,
  farming_boost_active BOOLEAN DEFAULT false,
  farming_boost_expires_at TIMESTAMP,
  checkin_last_date DATE,
  checkin_streak INTEGER DEFAULT 0,
  checkin_total INTEGER DEFAULT 0,
  checkin_reward_claimed BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  verification_status VARCHAR DEFAULT 'unverified'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);
CREATE INDEX IF NOT EXISTS idx_users_parent_ref_code ON users(parent_ref_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create other essential tables
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Create transactions table for wallet operations
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL, -- 'deposit', 'withdrawal', 'farming_reward', 'referral_bonus', 'mission_reward'
  currency VARCHAR NOT NULL, -- 'UNI', 'TON'
  amount DECIMAL NOT NULL,
  balance_before DECIMAL NOT NULL,
  balance_after DECIMAL NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  tx_hash VARCHAR, -- blockchain transaction hash if applicable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Create referrals table for tracking referral hierarchy
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL, -- 1-20 levels deep
  commission_rate DECIMAL NOT NULL,
  total_earned DECIMAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals(level);

-- Create farming_sessions table
CREATE TABLE IF NOT EXISTS farming_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR NOT NULL, -- 'UNI', 'TON'
  deposit_amount DECIMAL NOT NULL,
  farming_rate DECIMAL NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  total_earned DECIMAL DEFAULT 0,
  status VARCHAR DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_farming_sessions_user_id ON farming_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_farming_sessions_currency ON farming_sessions(currency);
CREATE INDEX IF NOT EXISTS idx_farming_sessions_status ON farming_sessions(status);