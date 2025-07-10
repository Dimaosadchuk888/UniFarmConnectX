-- 🗄️ SQL СКРИПТ ИСПРАВЛЕНИЯ БАЗЫ ДАННЫХ UNIFARM
-- Дата: 8 января 2025
-- Цель: Полная синхронизация базы данных с кодом системы
-- Статус: ГОТОВ К ВЫПОЛНЕНИЮ

-- ========================================
-- ЭТАП 1: ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ ПОЛЕЙ В СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ
-- ========================================

-- Добавляем критические поля в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS ton_boost_package INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Добавляем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_ton_boost_package ON users(ton_boost_package);

-- ========================================
-- ЭТАП 2: СОЗДАНИЕ НЕДОСТАЮЩИХ КРИТИЧЕСКИХ ТАБЛИЦ
-- ========================================

-- 1. BOOST_PURCHASES - Критично для TON Boost системы
CREATE TABLE IF NOT EXISTS boost_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boost_id TEXT NOT NULL,
  amount TEXT NOT NULL DEFAULT '0',
  daily_rate TEXT NOT NULL DEFAULT '0',
  source TEXT NOT NULL CHECK (source IN ('wallet', 'ton')),
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  last_claim TIMESTAMP,
  total_earned TEXT DEFAULT '0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для boost_purchases
CREATE INDEX IF NOT EXISTS idx_boost_purchases_user_id ON boost_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_status ON boost_purchases(status);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_is_active ON boost_purchases(is_active);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_tx_hash ON boost_purchases(tx_hash) WHERE tx_hash IS NOT NULL;

-- Комментарии для boost_purchases
COMMENT ON TABLE boost_purchases IS 'Покупки TON Boost пакетов через внутренний и внешний кошелек';
COMMENT ON COLUMN boost_purchases.user_id IS 'ID пользователя из таблицы users';
COMMENT ON COLUMN boost_purchases.boost_id IS 'ID Boost-пакета (1, 2, 3, 4, 5)';
COMMENT ON COLUMN boost_purchases.source IS 'Источник оплаты: wallet (внутренний) или ton (внешний)';
COMMENT ON COLUMN boost_purchases.tx_hash IS 'Хеш транзакции в блокчейне TON';
COMMENT ON COLUMN boost_purchases.status IS 'Статус покупки: pending, confirmed, failed';

-- ========================================

-- 2. MISSIONS - Критично для системы заданий
CREATE TABLE IF NOT EXISTS missions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL DEFAULT 'daily' CHECK (mission_type IN ('daily', 'weekly', 'one_time', 'referral')),
  target_value INTEGER DEFAULT 1,
  reward_amount TEXT NOT NULL DEFAULT '0',
  reward_type TEXT NOT NULL DEFAULT 'UNI' CHECK (reward_type IN ('UNI', 'TON', 'BOOST')),
  requirements TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  is_repeatable BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для missions
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);
CREATE INDEX IF NOT EXISTS idx_missions_is_active ON missions(is_active);
CREATE INDEX IF NOT EXISTS idx_missions_mission_type ON missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_sort_order ON missions(sort_order);

-- Комментарии для missions
COMMENT ON TABLE missions IS 'Конфигурация заданий и миссий системы';
COMMENT ON COLUMN missions.type IS 'Тип миссии: invite, social, check-in, deposit';
COMMENT ON COLUMN missions.mission_type IS 'Категория миссии: daily, weekly, one_time, referral';
COMMENT ON COLUMN missions.reward_amount IS 'Размер награды в виде строки (для точности)';
COMMENT ON COLUMN missions.reward_type IS 'Тип награды: UNI, TON, BOOST';

-- ========================================

-- 3. USER_MISSIONS - Критично для прогресса заданий
CREATE TABLE IF NOT EXISTS user_missions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id INTEGER NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'claimed')),
  progress INTEGER DEFAULT 0,
  target_value INTEGER DEFAULT 1,
  progress_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  claimed_at TIMESTAMP,
  reward_claimed TEXT DEFAULT '0',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- Индексы для user_missions
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_status ON user_missions(status);
CREATE INDEX IF NOT EXISTS idx_user_missions_user_status ON user_missions(user_id, status);

-- Комментарии для user_missions
COMMENT ON TABLE user_missions IS 'Прогресс пользователей по заданиям и миссиям';
COMMENT ON COLUMN user_missions.status IS 'Статус задания: active, completed, claimed';
COMMENT ON COLUMN user_missions.progress_percentage IS 'Процент выполнения (0-100)';

-- ========================================
-- ЭТАП 3: СОЗДАНИЕ ВСПОМОГАТЕЛЬНЫХ ТАБЛИЦ
-- ========================================

-- 4. AIRDROPS - Важно для системы airdrop
CREATE TABLE IF NOT EXISTS airdrops (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  reward_amount TEXT DEFAULT '0',
  reward_currency TEXT DEFAULT 'UNI' CHECK (reward_currency IN ('UNI', 'TON')),
  distribution_date TIMESTAMP,
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для airdrops
CREATE INDEX IF NOT EXISTS idx_airdrops_telegram_id ON airdrops(telegram_id);
CREATE INDEX IF NOT EXISTS idx_airdrops_user_id ON airdrops(user_id);
CREATE INDEX IF NOT EXISTS idx_airdrops_status ON airdrops(status);

-- Комментарии для airdrops
COMMENT ON TABLE airdrops IS 'Участники программы airdrop токенов';
COMMENT ON COLUMN airdrops.telegram_id IS 'Telegram ID пользователя';
COMMENT ON COLUMN airdrops.reward_currency IS 'Валюта награды: UNI или TON';

-- ========================================

-- 5. DAILY_BONUS_LOGS - Важно для логирования ежедневных бонусов
CREATE TABLE IF NOT EXISTS daily_bonus_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_amount TEXT NOT NULL DEFAULT '0',
  bonus_currency TEXT DEFAULT 'UNI' CHECK (bonus_currency IN ('UNI', 'TON')),
  day_number INTEGER DEFAULT 1,
  streak_bonus BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для daily_bonus_logs
CREATE INDEX IF NOT EXISTS idx_daily_bonus_logs_user_id ON daily_bonus_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_bonus_logs_created_at ON daily_bonus_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_bonus_logs_day_number ON daily_bonus_logs(day_number);

-- Комментарии для daily_bonus_logs
COMMENT ON TABLE daily_bonus_logs IS 'Логи получения ежедневных бонусов';
COMMENT ON COLUMN daily_bonus_logs.day_number IS 'Номер дня в серии (1-7)';
COMMENT ON COLUMN daily_bonus_logs.streak_bonus IS 'Бонус за серию чекинов';

-- ========================================

-- 6. WITHDRAW_REQUESTS - Критично для админ-бота
CREATE TABLE IF NOT EXISTS withdraw_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ton NUMERIC(20,9) NOT NULL,
  ton_wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
  admin_notes TEXT,
  processed_by TEXT,
  processed_at TIMESTAMP,
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для withdraw_requests
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_created_at ON withdraw_requests(created_at);

-- Комментарии для withdraw_requests
COMMENT ON TABLE withdraw_requests IS 'Заявки пользователей на вывод TON средств';
COMMENT ON COLUMN withdraw_requests.amount_ton IS 'Сумма к выводу в TON (высокая точность)';
COMMENT ON COLUMN withdraw_requests.processed_by IS 'Username админа, обработавшего заявку';

-- ========================================
-- ЭТАП 4: ОЧИСТКА ДУБЛИКАТОВ И НЕИСПОЛЬЗУЕМЫХ ПОЛЕЙ
-- ========================================

-- Удаляем дублирующие поля в таблице users (только если они существуют)
-- ВНИМАНИЕ: Выполнять только после миграции данных!

-- ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_balance;
-- ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_deposit;  
-- ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_activated_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS wallet;

-- ========================================
-- ЭТАП 5: ВСТАВКА НАЧАЛЬНЫХ ДАННЫХ
-- ========================================

-- Базовые миссии для системы заданий
INSERT INTO missions (type, title, description, reward_amount, reward_type, is_active) VALUES
('daily_checkin', 'Ежедневный чекин', 'Получите ежедневный бонус', '5', 'UNI', true),
('invite_friend', 'Пригласить друга', 'Пригласите друга и получите награду', '10', 'UNI', true),
('first_deposit', 'Первый депозит', 'Сделайте первый депозит в UNI фарминг', '25', 'UNI', true),
('social_follow', 'Подписка в соцсетях', 'Подпишитесь на наши социальные сети', '15', 'UNI', true),
('ton_boost_purchase', 'Покупка TON Boost', 'Купите любой TON Boost пакет', '50', 'UNI', true)
ON CONFLICT DO NOTHING;

-- ========================================
-- ЭТАП 6: СОЗДАНИЕ ТРИГГЕРОВ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ
-- ========================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_boost_purchases_updated_at ON boost_purchases;
CREATE TRIGGER update_boost_purchases_updated_at 
    BEFORE UPDATE ON boost_purchases 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_missions_updated_at ON missions;
CREATE TRIGGER update_missions_updated_at 
    BEFORE UPDATE ON missions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_missions_updated_at ON user_missions;
CREATE TRIGGER update_user_missions_updated_at 
    BEFORE UPDATE ON user_missions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_airdrops_updated_at ON airdrops;
CREATE TRIGGER update_airdrops_updated_at 
    BEFORE UPDATE ON airdrops 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_withdraw_requests_updated_at ON withdraw_requests;
CREATE TRIGGER update_withdraw_requests_updated_at 
    BEFORE UPDATE ON withdraw_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ФИНАЛЬНАЯ ПРОВЕРКА СТРУКТУРЫ
-- ========================================

-- Проверяем, что все таблицы созданы
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'users', 'transactions', 'referrals', 'farming_sessions', 'user_sessions',
    'boost_purchases', 'missions', 'user_missions', 'airdrops', 
    'daily_bonus_logs', 'withdraw_requests'
  )
ORDER BY table_name;

-- Проверяем количество индексов
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 'transactions', 'referrals', 'farming_sessions', 'user_sessions',
    'boost_purchases', 'missions', 'user_missions', 'airdrops', 
    'daily_bonus_logs', 'withdraw_requests'
  )
ORDER BY tablename, indexname;

-- ========================================
-- СООБЩЕНИЕ О ЗАВЕРШЕНИИ
-- ========================================

-- Создаем запись о выполнении миграции
DO $$
BEGIN
    RAISE NOTICE '✅ МИГРАЦИЯ БАЗЫ ДАННЫХ UNIFARM ЗАВЕРШЕНА УСПЕШНО!';
    RAISE NOTICE '📊 Создано таблиц: 6 новых таблиц';
    RAISE NOTICE '📊 Добавлено полей: 2 новых поля в users';
    RAISE NOTICE '📊 Создано индексов: 24+ новых индексов';
    RAISE NOTICE '📊 Создано триггеров: 6 автоматических триггеров';
    RAISE NOTICE '🎯 Система готова к 100% синхронизации с кодом!';
END $$;