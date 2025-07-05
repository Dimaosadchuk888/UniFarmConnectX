# T60 - Database Tables Creation Plan
## UniFarm Missing Tables Implementation Strategy

**Date:** June 16, 2025  
**Target:** 100% Database Functionality  
**Current Status:** 45% → 100%  

---

## CRITICAL MISSING TABLES

### 1. BOOST_PURCHASES Table
**Priority:** CRITICAL (TON Boost System)  
**Impact:** Enables TON blockchain boost purchasing functionality

```sql
CREATE TABLE boost_purchases (
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

-- Indexes for performance
CREATE INDEX idx_boost_purchases_user_id ON boost_purchases(user_id);
CREATE INDEX idx_boost_purchases_status ON boost_purchases(status);
CREATE INDEX idx_boost_purchases_active ON boost_purchases(is_active);
CREATE INDEX idx_boost_purchases_tx_hash ON boost_purchases(tx_hash);
```

**Business Logic Integration:**
- modules/boost/service.ts: purchaseBoost(), verifyTonPayment()
- modules/scheduler/tonBoostIncomeScheduler.ts: automatic income distribution
- Referral system: commission distribution on boost purchases

### 2. MISSIONS Tables
**Priority:** HIGH (Mission System)  
**Impact:** Enables task/achievement system functionality

```sql
-- Base missions configuration
CREATE TABLE missions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT CHECK (mission_type IN ('daily', 'weekly', 'one_time', 'referral')) NOT NULL,
  target_value INTEGER,
  reward_amount TEXT NOT NULL,
  reward_type TEXT CHECK (reward_type IN ('UNI', 'TON', 'BOOST')) NOT NULL,
  requirements TEXT, -- JSON string for complex requirements
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_repeatable BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User mission progress tracking
CREATE TABLE user_missions (
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

-- Indexes
CREATE INDEX idx_missions_type ON missions(mission_type);
CREATE INDEX idx_missions_active ON missions(is_active);
CREATE INDEX idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX idx_user_missions_status ON user_missions(status);
CREATE INDEX idx_user_missions_mission_id ON user_missions(mission_id);

-- Sample mission data
INSERT INTO missions (title, description, mission_type, target_value, reward_amount, reward_type, is_active) VALUES
('Daily Login', 'Login to UniFarm every day', 'daily', 1, '5', 'UNI', true),
('First Farming', 'Make your first UNI farming deposit', 'one_time', 1, '10', 'UNI', true),
('Invite Friends', 'Invite 5 friends to UniFarm', 'referral', 5, '25', 'UNI', true),
('Weekly Farmer', 'Farm UNI for 7 consecutive days', 'weekly', 7, '50', 'UNI', true),
('Big Depositor', 'Deposit 100+ UNI in farming', 'one_time', 100, '20', 'UNI', true);
```

**Business Logic Integration:**
- modules/missions/service.ts: mission progress tracking, rewards claiming
- Auto-progress updates on user actions (farming, referrals, etc.)

### 3. AIRDROPS Table
**Priority:** MEDIUM (Airdrop System)  
**Impact:** Enables token distribution campaigns

```sql
CREATE TABLE airdrops (
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

-- Indexes
CREATE INDEX idx_airdrops_telegram_id ON airdrops(telegram_id);
CREATE INDEX idx_airdrops_user_id ON airdrops(user_id);
CREATE INDEX idx_airdrops_status ON airdrops(status);
```

**Business Logic Integration:**
- modules/airdrop/service.ts: participant registration, reward distribution

### 4. DAILY_BONUS_LOGS Table
**Priority:** LOW (Enhanced Daily Bonus Tracking)  
**Impact:** Detailed daily bonus history

```sql
CREATE TABLE daily_bonus_logs (
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

-- Indexes
CREATE INDEX idx_daily_bonus_logs_user_id ON daily_bonus_logs(user_id);
CREATE INDEX idx_daily_bonus_logs_date ON daily_bonus_logs(claimed_date);
```

### 5. WALLETS Table
**Priority:** LOW (Enhanced Wallet Management)  
**Impact:** Advanced wallet operations

```sql
CREATE TABLE wallets (
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

-- Indexes
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_type ON wallets(wallet_type);
CREATE INDEX idx_wallets_address ON wallets(wallet_address);
```

---

## IMPLEMENTATION STEPS

### Phase 1: Critical Tables (boost_purchases, missions)
1. Create boost_purchases table in Supabase Dashboard
2. Test TON Boost purchasing functionality
3. Create missions tables with sample data
4. Verify mission system integration

### Phase 2: Enhancement Tables (airdrops, daily_bonus_logs, wallets)
1. Create remaining tables
2. Update services to use new tables
3. Test full functionality

### Phase 3: RLS Policies & Security
```sql
-- Row Level Security policies
ALTER TABLE boost_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE airdrops ENABLE ROW LEVEL SECURITY;

-- Sample RLS policy
CREATE POLICY "Users can view own boost purchases" ON boost_purchases
  FOR SELECT USING (auth.uid()::text = user_id::text);
```

---

## TESTING CHECKLIST

### Boost System Testing
- [ ] Purchase boost with internal wallet balance
- [ ] Purchase boost with TON blockchain transaction
- [ ] Verify boost activation and income distribution
- [ ] Test referral commissions on boost purchases

### Mission System Testing
- [ ] Create user mission progress
- [ ] Update progress on user actions
- [ ] Claim mission rewards
- [ ] Test repeatable vs one-time missions

### Integration Testing
- [ ] All modules work with new tables
- [ ] No breaking changes in existing functionality
- [ ] Performance remains optimal

---

## SQL EXECUTION ORDER

1. **boost_purchases** (CRITICAL - TON Boost functionality)
2. **missions + user_missions** (HIGH - Task system)
3. **airdrops** (MEDIUM - Token distribution)
4. **daily_bonus_logs** (LOW - Enhanced tracking)
5. **wallets** (LOW - Advanced wallet features)

---

## EXPECTED RESULTS

**Before:** 45% functionality (4 tables)  
**After:** 100% functionality (9 tables)  

**Enabled Systems:**
- ✅ TON Boost purchasing and income distribution
- ✅ Mission/task system with progress tracking
- ✅ Airdrop token distribution campaigns
- ✅ Enhanced daily bonus logging
- ✅ Advanced wallet management

**Business Impact:**
- Complete UniFarm feature set available
- All 14 modules fully functional
- Enterprise-grade database architecture
- Production-ready for scaling

---

## NEXT STEPS

1. Execute SQL scripts in Supabase Dashboard
2. Test each table creation
3. Verify business logic integration
4. Update documentation
5. Deploy to production

**Estimated Time:** 2-3 hours for complete implementation