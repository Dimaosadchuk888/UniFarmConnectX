-- ИСПРАВЛЕННЫЕ SQL КОМАНДЫ ДЛЯ СУЩЕСТВУЮЩИХ ТАБЛИЦ

-- 1. Добавить поле referrer_id в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer_id INTEGER;

-- 2. Добавить поле reward_ton в таблицу missions  
ALTER TABLE missions ADD COLUMN IF NOT EXISTS reward_ton DECIMAL(20,9) DEFAULT 0;

-- 3. Так как таблица referrals пустая, давайте удалим её и создадим заново с правильной структурой
DROP TABLE IF EXISTS referrals CASCADE;

CREATE TABLE referrals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  referred_user_id INTEGER NOT NULL REFERENCES users(id),
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, referred_user_id)
);

CREATE INDEX idx_referrals_user ON referrals(user_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_user_id);

-- 4. Создать недостающие таблицы
-- user_sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- user_missions
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

-- daily_bonus_logs
CREATE TABLE IF NOT EXISTS daily_bonus_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_amount DECIMAL(20,6) NOT NULL,
  day_number INTEGER NOT NULL,
  streak_bonus DECIMAL(20,6) DEFAULT 0,
  claimed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_bonus_user_date ON daily_bonus_logs(user_id, claimed_at);

-- airdrops
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

-- 5. Заполнить таблицу missions базовыми данными
INSERT INTO missions (id, title, description, reward_uni, reward_ton, type, status) VALUES
(1, 'Первый депозит', 'Сделайте первый депозит UNI в фарминг', 10, 0, 'one_time', 'active'),
(2, 'Пригласи друга', 'Пригласите минимум 1 друга в UniFarm', 5, 0, 'one_time', 'active'),
(3, 'Активный фармер', 'Фармите 7 дней подряд без перерыва', 20, 0, 'streak', 'active'),
(4, 'TON Boost активация', 'Активируйте любой TON Boost пакет', 0, 0.1, 'one_time', 'active'),
(5, 'Социальная активность', 'Подпишитесь на наш Telegram канал', 2, 0, 'social', 'active')
ON CONFLICT (id) DO NOTHING;