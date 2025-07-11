-- ===================================
-- UNIFARM PRODUCTION DATABASE SETUP
-- ===================================
-- Выполните этот скрипт в Supabase SQL Editor:
-- https://app.supabase.com/project/wunnsvicbebssrjqedor/sql/new

-- 1. СОЗДАНИЕ ТАБЛИЦЫ UNI_FARMING_DATA
-- ===================================
CREATE TABLE IF NOT EXISTS uni_farming_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  deposit_amount NUMERIC(20, 9) DEFAULT 0,
  farming_balance NUMERIC(20, 9) DEFAULT 0,
  total_earned NUMERIC(20, 9) DEFAULT 0,
  last_claim_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT false,
  farming_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для uni_farming_data
CREATE INDEX idx_uni_farming_user_id ON uni_farming_data(user_id);
CREATE INDEX idx_uni_farming_active ON uni_farming_data(is_active);

-- 2. СОЗДАНИЕ ТАБЛИЦЫ TON_FARMING_DATA
-- ===================================
CREATE TABLE IF NOT EXISTS ton_farming_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  boost_active BOOLEAN DEFAULT false,
  boost_package_id INTEGER,
  boost_expires_at TIMESTAMP WITH TIME ZONE,
  farming_balance NUMERIC(20, 9) DEFAULT 0,
  total_earned NUMERIC(20, 9) DEFAULT 0,
  last_claim_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для ton_farming_data
CREATE INDEX idx_ton_farming_user_id ON ton_farming_data(user_id);
CREATE INDEX idx_ton_farming_active ON ton_farming_data(boost_active);

-- 3. НАСТРОЙКА ROW LEVEL SECURITY
-- ===================================
ALTER TABLE uni_farming_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ton_farming_data ENABLE ROW LEVEL SECURITY;

-- Политики для uni_farming_data
CREATE POLICY "Users can view their own uni farming data" ON uni_farming_data
FOR SELECT USING (true);

CREATE POLICY "Service can manage all uni farming data" ON uni_farming_data
FOR ALL USING (true);

-- Политики для ton_farming_data
CREATE POLICY "Users can view their own ton farming data" ON ton_farming_data
FOR SELECT USING (true);

CREATE POLICY "Service can manage all ton farming data" ON ton_farming_data
FOR ALL USING (true);

-- 4. МИГРАЦИЯ ДАННЫХ ИЗ ТАБЛИЦЫ USERS
-- ===================================
-- Миграция UNI farming данных
INSERT INTO uni_farming_data (
  user_id,
  deposit_amount,
  farming_balance,
  total_earned,
  is_active,
  farming_start,
  last_claim_at
)
SELECT 
  id::TEXT as user_id,
  COALESCE(uni_deposit_amount, 0) as deposit_amount,
  COALESCE(uni_farming_balance, 0) as farming_balance,
  0 as total_earned,
  COALESCE(uni_farming_active, false) as is_active,
  COALESCE(uni_farming_start_timestamp, CURRENT_TIMESTAMP) as farming_start,
  COALESCE(uni_farming_start_timestamp, CURRENT_TIMESTAMP) as last_claim_at
FROM users
WHERE uni_deposit_amount > 0 OR uni_farming_active = true
ON CONFLICT (user_id) DO NOTHING;

-- Миграция TON boost данных
INSERT INTO ton_farming_data (
  user_id,
  boost_active,
  boost_package_id,
  boost_expires_at,
  farming_balance,
  total_earned
)
SELECT 
  id::TEXT as user_id,
  COALESCE(ton_boost_active, false) as boost_active,
  ton_boost_package as boost_package_id,
  ton_boost_expires_at as boost_expires_at,
  COALESCE(ton_farming_balance, 0) as farming_balance,
  0 as total_earned
FROM users
WHERE ton_boost_active = true OR ton_boost_package IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ===================================
-- Проверяем количество мигрированных записей
SELECT 
  (SELECT COUNT(*) FROM uni_farming_data) as uni_farming_count,
  (SELECT COUNT(*) FROM ton_farming_data) as ton_farming_count,
  (SELECT COUNT(*) FROM users WHERE uni_farming_active = true) as active_uni_farmers,
  (SELECT COUNT(*) FROM users WHERE ton_boost_active = true) as active_ton_farmers;

-- Примеры данных после миграции
SELECT * FROM uni_farming_data LIMIT 5;
SELECT * FROM ton_farming_data LIMIT 5;

-- ===================================
-- ГОТОВО!
-- После выполнения этого скрипта система автоматически
-- переключится на использование новых таблиц.
-- ===================================