-- UniFarm Missing Tables Creation Script
-- Execute in Supabase SQL Editor
-- Based on TypeScript interfaces from modules

-- 1. BOOST_PURCHASES table (modules/boost/types.ts - BoostPurchaseData)
CREATE TABLE IF NOT EXISTS boost_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boost_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  daily_rate TEXT,
  source TEXT NOT NULL CHECK (source IN ('wallet', 'ton')),
  tx_hash TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')) DEFAULT 'pending',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  last_claim TIMESTAMP WITH TIME ZONE,
  total_earned TEXT DEFAULT '0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MISSIONS table (modules/missions/types.ts - MissionConfig)
CREATE TABLE IF NOT EXISTS missions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('daily', 'weekly', 'one_time', 'referral')),
  target_value INTEGER,
  reward_amount TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('UNI', 'TON', 'BOOST')),
  requirements TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  is_repeatable BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MISSION_PROGRESS table (modules/missions/types.ts - UserMissionProgress)
CREATE TABLE IF NOT EXISTS mission_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'claimed')) DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  target_value INTEGER,
  progress_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  reward_claimed TEXT DEFAULT '0',
  can_claim BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- 4. AIRDROP_CLAIMS table (modules/airdrop/types.ts - AirdropParticipant)
CREATE TABLE IF NOT EXISTS airdrop_claims (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'completed')) DEFAULT 'active',
  reward_amount TEXT DEFAULT '0',
  reward_currency TEXT CHECK (reward_currency IN ('UNI', 'TON')) DEFAULT 'UNI',
  distribution_date TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(telegram_id, user_id)
);

-- 5. WALLET_LOGS table (modules/wallet/types.ts - TransactionData & DepositRecord)
CREATE TABLE IF NOT EXISTS wallet_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('UNI', 'TON')),
  status TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  wallet_address TEXT,
  network TEXT,
  source TEXT,
  transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- 6. DAILY_BONUS_HISTORY table (modules/dailyBonus/types.ts - BonusHistoryItem)
CREATE TABLE IF NOT EXISTS daily_bonus_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  claimed_amount TEXT NOT NULL,
  bonus_type TEXT NOT NULL CHECK (bonus_type IN ('UNI', 'TON', 'MULTIPLIER')),
  streak_count INTEGER NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint with expression-based index for daily_bonus_history
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_daily_bonus 
ON daily_bonus_history (user_id, DATE(claimed_at));

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_boost_purchases_user_id ON boost_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_status ON boost_purchases(status);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_tx_hash ON boost_purchases(tx_hash);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_active ON boost_purchases(is_active);

CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(is_active);

CREATE INDEX IF NOT EXISTS idx_mission_progress_user_id ON mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_progress_mission_id ON mission_progress(mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_progress_status ON mission_progress(status);

CREATE INDEX IF NOT EXISTS idx_airdrop_claims_telegram_id ON airdrop_claims(telegram_id);
CREATE INDEX IF NOT EXISTS idx_airdrop_claims_user_id ON airdrop_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_airdrop_claims_status ON airdrop_claims(status);

CREATE INDEX IF NOT EXISTS idx_wallet_logs_user_id ON wallet_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_logs_type ON wallet_logs(transaction_type);
CREATE INDEX IF NOT EXISTS idx_wallet_logs_currency ON wallet_logs(currency);
CREATE INDEX IF NOT EXISTS idx_wallet_logs_status ON wallet_logs(status);

CREATE INDEX IF NOT EXISTS idx_daily_bonus_history_user_id ON daily_bonus_history(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_bonus_history_claimed_at ON daily_bonus_history(claimed_at);

-- Enable Row Level Security (RLS)
ALTER TABLE boost_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrop_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonus_history ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for user data access
CREATE POLICY "Users can view own boost purchases" ON boost_purchases
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint));

CREATE POLICY "Users can view own mission progress" ON mission_progress
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint));

CREATE POLICY "Users can view own airdrop claims" ON airdrop_claims
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint));

CREATE POLICY "Users can view own wallet logs" ON wallet_logs
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint));

CREATE POLICY "Users can view own bonus history" ON daily_bonus_history
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint));

-- Missions are public read-only
CREATE POLICY "Public missions read access" ON missions
  FOR SELECT USING (is_active = true);