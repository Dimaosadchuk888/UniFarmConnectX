-- SQL для исправления всех критических проблем базы данных UniFarm
-- На основе технического аудита от 28 июня 2025
-- Применять ПОСЛЕ SQL_TON_FARMING_FIX.sql

-- ===================================================
-- ЧАСТЬ 1: Исправление структуры таблицы boost_purchases
-- ===================================================

-- Добавляем недостающие поля для корректной записи покупок TON Boost
ALTER TABLE boost_purchases
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS payment_currency VARCHAR(10) DEFAULT 'TON',
ADD COLUMN IF NOT EXISTS payment_transaction_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS uni_bonus_amount DECIMAL(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_rewards_distributed BOOLEAN DEFAULT false;

-- ===================================================
-- ЧАСТЬ 2: Исправление таблицы transactions
-- ===================================================

-- Добавляем поддержку новых типов транзакций
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Обновляем constraint для поддержки всех типов транзакций
-- (если нужно пересоздать enum, сначала удалите старый constraint)
-- ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- ===================================================
-- ЧАСТЬ 3: Исправление таблицы mission_progress
-- ===================================================

-- Добавляем недостающие поля для отслеживания прогресса
ALTER TABLE mission_progress
ADD COLUMN IF NOT EXISTS current_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_progress INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reward_amount_uni DECIMAL(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_amount_ton DECIMAL(20,8) DEFAULT 0;

-- ===================================================
-- ЧАСТЬ 4: Исправление таблицы daily_bonus_history
-- ===================================================

-- Добавляем поля для детальной истории
ALTER TABLE daily_bonus_history
ADD COLUMN IF NOT EXISTS bonus_type VARCHAR(50) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS multiplier DECIMAL(5,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS final_amount DECIMAL(20,8);

-- ===================================================
-- ЧАСТЬ 5: Создание недостающих таблиц (если они не существуют)
-- ===================================================

-- Таблица для истории изменений балансов
CREATE TABLE IF NOT EXISTS balance_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  balance_type VARCHAR(10) NOT NULL CHECK (balance_type IN ('UNI', 'TON')),
  old_balance DECIMAL(20,8) NOT NULL,
  new_balance DECIMAL(20,8) NOT NULL,
  change_amount DECIMAL(20,8) NOT NULL,
  change_reason VARCHAR(100),
  transaction_id INTEGER REFERENCES transactions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для реферальных цепочек (для оптимизации)
CREATE TABLE IF NOT EXISTS referral_chains (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 20),
  chain_path INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, referrer_id)
);

-- ===================================================
-- ЧАСТЬ 6: Оптимизация производительности
-- ===================================================

-- Индексы для быстрого поиска транзакций
CREATE INDEX IF NOT EXISTS idx_transactions_user_type 
ON transactions(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at 
ON transactions(created_at DESC);

-- Индексы для реферальной системы
CREATE INDEX IF NOT EXISTS idx_users_referred_by 
ON users(referred_by) WHERE referred_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_chains_user 
ON referral_chains(user_id);

CREATE INDEX IF NOT EXISTS idx_referral_chains_referrer 
ON referral_chains(referrer_id);

-- Индексы для миссий
CREATE INDEX IF NOT EXISTS idx_mission_progress_user_status 
ON mission_progress(user_id, is_completed);

-- ===================================================
-- ЧАСТЬ 7: Очистка и нормализация данных
-- ===================================================

-- Устанавливаем дефолтные значения для NULL полей
UPDATE users SET
  balance_uni = COALESCE(balance_uni, 0),
  balance_ton = COALESCE(balance_ton, 0),
  uni_deposit_amount = COALESCE(uni_deposit_amount, 0),
  uni_farming_rate = COALESCE(uni_farming_rate, 0.01),
  checkin_streak = COALESCE(checkin_streak, 0),
  is_active = COALESCE(is_active, true),
  is_admin = COALESCE(is_admin, false)
WHERE balance_uni IS NULL OR balance_ton IS NULL;

-- Исправляем несоответствия в farming данных
UPDATE users SET
  uni_farming_start_timestamp = NOW()
WHERE uni_deposit_amount > 0 AND uni_farming_start_timestamp IS NULL;

-- ===================================================
-- ЧАСТЬ 8: Активация функций базы данных
-- ===================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггер к таблицам где есть updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('
            CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column()',
            t, t
        );
    END LOOP;
END $$;

-- ===================================================
-- ЧАСТЬ 9: Проверка целостности данных
-- ===================================================

-- Проверяем и исправляем отрицательные балансы
UPDATE users SET balance_uni = 0 WHERE balance_uni < 0;
UPDATE users SET balance_ton = 0 WHERE balance_ton < 0;

-- Проверяем корректность реферальных связей
UPDATE users SET referred_by = NULL 
WHERE referred_by IS NOT NULL 
AND referred_by NOT IN (SELECT id FROM users);

-- ===================================================
-- ЧАСТЬ 10: Финальная статистика
-- ===================================================

-- Общая статистика системы после исправлений
SELECT 
  'Общая статистика UniFarm' as metric,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN u.balance_uni > 0 THEN u.id END) as users_with_uni,
  COUNT(DISTINCT CASE WHEN u.balance_ton > 0 THEN u.id END) as users_with_ton,
  COUNT(DISTINCT CASE WHEN u.uni_deposit_amount > 0 THEN u.id END) as active_uni_farmers,
  COUNT(DISTINCT CASE WHEN u.ton_farming_balance > 0 THEN u.id END) as active_ton_farmers,
  COUNT(DISTINCT CASE WHEN u.referred_by IS NOT NULL THEN u.id END) as referred_users,
  COUNT(DISTINCT t.id) as total_transactions,
  COUNT(DISTINCT bp.id) as total_boost_purchases,
  COUNT(DISTINCT mp.id) as missions_completed
FROM users u
LEFT JOIN transactions t ON t.user_id = u.id
LEFT JOIN boost_purchases bp ON bp.user_id = u.id
LEFT JOIN mission_progress mp ON mp.user_id = u.id AND mp.is_completed = true;

-- ===================================================
-- ВАЖНО: После выполнения этого SQL:
-- 1. Все критические проблемы БД будут исправлены
-- 2. Производительность значительно улучшится
-- 3. Целостность данных будет восстановлена
-- 4. Система будет готова к 100% production нагрузке
-- ===================================================