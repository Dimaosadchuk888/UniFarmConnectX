-- SUPABASE SQL СКРИПТ ДЛЯ СОЗДАНИЯ НЕДОСТАЮЩИХ ТАБЛИЦ UNIFARM
-- Выполните этот скрипт в Supabase SQL Editor

-- =========================================
-- 1. СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ
-- =========================================

-- 1.1 Таблица сессий пользователей
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- 1.2 Таблица прогресса миссий
CREATE TABLE IF NOT EXISTS user_missions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission ON user_missions(mission_id);

-- 1.3 Логи ежедневных бонусов
CREATE TABLE IF NOT EXISTS daily_bonus_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_amount DECIMAL(20,6) NOT NULL,
  day_number INTEGER NOT NULL,
  streak_bonus DECIMAL(20,6) DEFAULT 0,
  claimed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_bonus_user_date ON daily_bonus_logs(user_id, claimed_at);

-- 1.4 Таблица airdrop кампаний
CREATE TABLE IF NOT EXISTS airdrops (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_amount DECIMAL(20,6) NOT NULL,
  participants_count INTEGER DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================
-- 2. ИСПРАВЛЕНИЕ СТРУКТУРЫ СУЩЕСТВУЮЩИХ ТАБЛИЦ
-- =========================================

-- 2.1 Добавляем недостающие поля в таблицу missions (если она пустая)
CREATE TABLE IF NOT EXISTS missions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reward_uni DECIMAL(20,6) DEFAULT 0,
  reward_ton DECIMAL(20,9) DEFAULT 0,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2.2 Добавляем структуру для таблицы referrals
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id),
  referred_id INTEGER NOT NULL REFERENCES users(id),
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- 2.3 Добавляем структуру для farming_sessions
CREATE TABLE IF NOT EXISTS farming_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  deposit_amount DECIMAL(20,6) NOT NULL,
  farming_rate DECIMAL(10,4) NOT NULL,
  start_timestamp TIMESTAMP NOT NULL,
  last_update TIMESTAMP NOT NULL,
  accumulated_reward DECIMAL(20,6) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farming_sessions_user ON farming_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_farming_sessions_status ON farming_sessions(status);

-- 2.4 Добавляем структуру для boost_purchases
CREATE TABLE IF NOT EXISTS boost_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  package_id INTEGER NOT NULL,
  package_name VARCHAR(255) NOT NULL,
  boost_rate DECIMAL(10,4) NOT NULL,
  ton_amount DECIMAL(20,9) NOT NULL,
  expires_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boost_purchases_user ON boost_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_status ON boost_purchases(status);

-- =========================================
-- 3. ДОБАВЛЕНИЕ ПОЛЯ referrer_id В USERS
-- =========================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referrer_id INTEGER REFERENCES users(id);

-- =========================================
-- 4. ЗАПОЛНЕНИЕ БАЗОВЫХ ДАННЫХ
-- =========================================

-- 4.1 Заполнение таблицы missions
INSERT INTO missions (id, title, description, reward_uni, reward_ton, type, status) VALUES
(1, 'Первый депозит', 'Сделайте первый депозит UNI в фарминг', 10, 0, 'one_time', 'active'),
(2, 'Пригласи друга', 'Пригласите минимум 1 друга в UniFarm', 5, 0, 'one_time', 'active'),
(3, 'Активный фармер', 'Фармите 7 дней подряд без перерыва', 20, 0, 'streak', 'active'),
(4, 'TON Boost активация', 'Активируйте любой TON Boost пакет', 0, 0.1, 'one_time', 'active'),
(5, 'Социальная активность', 'Подпишитесь на наш Telegram канал', 2, 0, 'social', 'active')
ON CONFLICT (id) DO NOTHING;

-- 4.2 Миграция реферальных связей из users в referrals
-- Сначала попробуем мигрировать данные из referred_by если оно числовое
INSERT INTO referrals (referrer_id, referred_id, level, created_at)
SELECT 
  CASE 
    WHEN referred_by ~ '^\d+$' THEN referred_by::integer
    ELSE NULL
  END as referrer_id,
  id as referred_id,
  1 as level,
  created_at
FROM users 
WHERE referred_by IS NOT NULL 
  AND referred_by != 'null'
  AND referred_by ~ '^\d+$'
  AND EXISTS (SELECT 1 FROM users WHERE id = CASE WHEN users.referred_by ~ '^\d+$' THEN users.referred_by::integer ELSE NULL END)
ON CONFLICT (referrer_id, referred_id) DO NOTHING;

-- 4.3 Обновление referrer_id в users на основе referred_by
UPDATE users 
SET referrer_id = CASE 
  WHEN referred_by ~ '^\d+$' THEN referred_by::integer
  ELSE NULL
END
WHERE referred_by IS NOT NULL 
  AND referred_by != 'null'
  AND referred_by ~ '^\d+$'
  AND referrer_id IS NULL;

-- =========================================
-- 5. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =========================================

-- Проверка количества записей в каждой таблице
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'user_sessions', COUNT(*) FROM user_sessions
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL
SELECT 'farming_sessions', COUNT(*) FROM farming_sessions
UNION ALL
SELECT 'boost_purchases', COUNT(*) FROM boost_purchases
UNION ALL
SELECT 'missions', COUNT(*) FROM missions
UNION ALL
SELECT 'user_missions', COUNT(*) FROM user_missions
UNION ALL
SELECT 'airdrops', COUNT(*) FROM airdrops
UNION ALL
SELECT 'daily_bonus_logs', COUNT(*) FROM daily_bonus_logs
UNION ALL
SELECT 'withdraw_requests', COUNT(*) FROM withdraw_requests
ORDER BY table_name;