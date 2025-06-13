-- T15: Critical Database Schema Synchronization
-- Adds missing fields for referral system functionality

-- Add ref_code column (unique referral code for each user)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code TEXT UNIQUE;

-- Add parent_ref_code column (referral code of inviting user)  
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_ref_code TEXT;

-- Add source_user_id to transactions for analytics
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_user_id INTEGER;

-- Add user_id to airdrop_participants for proper linking
ALTER TABLE airdrop_participants ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);
CREATE INDEX IF NOT EXISTS idx_users_parent_ref_code ON users(parent_ref_code);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_source_user_id ON transactions(source_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_inviter_id ON referrals(inviter_id);
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);
CREATE INDEX IF NOT EXISTS idx_airdrop_telegram_id ON airdrop_participants(telegram_id);

-- Generate ref_codes for existing users without them
UPDATE users 
SET ref_code = 'REF' || telegram_id || extract(epoch from now())::bigint
WHERE ref_code IS NULL AND telegram_id IS NOT NULL;