-- SQL скрипт для исправления несоответствий в базе данных UniFarm
-- Создан: ${new Date().toISOString()}
-- ВНИМАНИЕ: Выполняйте по частям и проверяйте результаты!

-- ========================================
-- 1. ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ ТИПОВ ТРАНЗАКЦИЙ
-- ========================================

-- Проверяем существующие значения enum
SELECT unnest(enum_range(NULL::transaction_type));

-- Добавляем недостающие типы (выполнить если их нет)
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'FARMING_DEPOSIT';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'BOOST_PURCHASE';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'AIRDROP_CLAIM';

-- ========================================
-- 2. ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ ПОЛЕЙ В ТАБЛИЦУ USERS
-- ========================================

-- Поля для TON фарминга
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_boost_package INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_balance NUMERIC(18,6) DEFAULT '0';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_rate NUMERIC(18,6) DEFAULT '0.001';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_start_timestamp TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_last_update TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_accumulated NUMERIC(18,6) DEFAULT '0';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_farming_last_claim TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_boost_active BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_boost_package_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_boost_rate NUMERIC(18,6) DEFAULT '0';

-- Поля для UNI фарминга
ALTER TABLE users ADD COLUMN IF NOT EXISTS uni_farming_active BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS uni_farming_activated_at TIMESTAMP;

-- Поля для реферальной системы (если отсутствует)
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_ref_code TEXT;

-- Поля для TON кошелька
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_wallet_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_wallet_linked_at TIMESTAMP;

-- Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_users_parent_ref_code ON users(parent_ref_code);
CREATE INDEX IF NOT EXISTS idx_users_ton_wallet_address ON users(ton_wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_uni_farming_active ON users(uni_farming_active);
CREATE INDEX IF NOT EXISTS idx_users_ton_boost_active ON users(ton_boost_active);

-- ========================================
-- 3. СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ
-- ========================================

-- Таблица для airdrop кампаний
CREATE TABLE IF NOT EXISTS airdrops (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC(18,6) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('UNI', 'TON')),
  amount_per_user NUMERIC(18,6),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  conditions JSONB, -- Условия участия в JSON формате
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица для участников airdrop
CREATE TABLE IF NOT EXISTS airdrop_claims (
  id SERIAL PRIMARY KEY,
  airdrop_id INTEGER REFERENCES airdrops(id),
  user_id INTEGER REFERENCES users(id),
  amount NUMERIC(18,6) NOT NULL,
  currency TEXT NOT NULL,
  claimed_at TIMESTAMP DEFAULT NOW(),
  tx_hash TEXT,
  UNIQUE(airdrop_id, user_id)
);

-- Таблица для логов ежедневных бонусов
CREATE TABLE IF NOT EXISTS daily_bonus_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  bonus_amount NUMERIC(18,6) NOT NULL,
  streak_day INTEGER NOT NULL,
  claimed_at TIMESTAMP DEFAULT NOW(),
  currency TEXT DEFAULT 'UNI',
  bonus_type TEXT DEFAULT 'daily_checkin'
);

-- Обновление таблицы withdraw_requests (если она неполная)
CREATE TABLE IF NOT EXISTS withdraw_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) NOT NULL,
  amount_uni NUMERIC(18,6) DEFAULT '0',
  amount_ton NUMERIC(18,6) DEFAULT '0',
  wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  admin_id INTEGER REFERENCES users(id), -- Админ, обработавший заявку
  admin_comment TEXT,
  tx_hash TEXT, -- Хеш транзакции для completed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- ========================================
-- 4. СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ОПТИМИЗАЦИИ
-- ========================================

-- Индексы для airdrops
CREATE INDEX IF NOT EXISTS idx_airdrops_active ON airdrops(is_active);
CREATE INDEX IF NOT EXISTS idx_airdrops_dates ON airdrops(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_airdrop_claims_user ON airdrop_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_airdrop_claims_airdrop ON airdrop_claims(airdrop_id);

-- Индексы для daily_bonus_logs
CREATE INDEX IF NOT EXISTS idx_daily_bonus_logs_user ON daily_bonus_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_bonus_logs_claimed ON daily_bonus_logs(claimed_at);

-- Индексы для withdraw_requests
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user ON withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_created ON withdraw_requests(created_at);

-- ========================================
-- 5. ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ДАННЫХ
-- ========================================

-- Установка значений по умолчанию для новых полей
UPDATE users 
SET 
  ton_boost_package = COALESCE(ton_boost_package, 0),
  ton_farming_balance = COALESCE(ton_farming_balance, '0'),
  ton_farming_rate = COALESCE(ton_farming_rate, '0.001'),
  ton_farming_accumulated = COALESCE(ton_farming_accumulated, '0'),
  ton_boost_rate = COALESCE(ton_boost_rate, '0'),
  ton_boost_active = COALESCE(ton_boost_active, false),
  uni_farming_active = COALESCE(uni_farming_active, false),
  ton_wallet_verified = COALESCE(ton_wallet_verified, false)
WHERE 
  ton_boost_package IS NULL 
  OR ton_farming_balance IS NULL
  OR ton_farming_rate IS NULL
  OR ton_farming_accumulated IS NULL
  OR ton_boost_rate IS NULL
  OR ton_boost_active IS NULL
  OR uni_farming_active IS NULL
  OR ton_wallet_verified IS NULL;

-- ========================================
-- 6. СОЗДАНИЕ ФУНКЦИЙ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_airdrops_updated_at BEFORE UPDATE ON airdrops 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdraw_requests_updated_at BEFORE UPDATE ON withdraw_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ========================================

-- Проверка новых типов транзакций
SELECT unnest(enum_range(NULL::transaction_type)) ORDER BY 1;

-- Проверка новых полей в users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN (
    'ton_boost_package', 'ton_farming_balance', 'ton_farming_rate',
    'ton_farming_start_timestamp', 'ton_farming_last_update', 'ton_farming_accumulated',
    'ton_farming_last_claim', 'ton_boost_active', 'ton_boost_package_id',
    'ton_boost_rate', 'uni_farming_active', 'uni_farming_activated_at',
    'parent_ref_code', 'ton_wallet_verified', 'ton_wallet_linked_at'
  )
ORDER BY column_name;

-- Проверка новых таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('airdrops', 'airdrop_claims', 'daily_bonus_logs', 'withdraw_requests')
ORDER BY table_name;

-- Статистика по таблицам
SELECT 
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 
  'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 
  'airdrops', COUNT(*) FROM airdrops
UNION ALL
SELECT 
  'daily_bonus_logs', COUNT(*) FROM daily_bonus_logs
UNION ALL
SELECT 
  'withdraw_requests', COUNT(*) FROM withdraw_requests;

-- ========================================
-- КОНЕЦ СКРИПТА
-- ========================================

-- Примечание: После выполнения скрипта необходимо обновить shared/schema.ts
-- чтобы отразить все изменения в коде