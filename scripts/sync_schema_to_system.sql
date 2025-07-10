-- ============================================
-- SQL СКРИПТ СИНХРОНИЗАЦИИ СХЕМЫ БД UNIFARM
-- ============================================
-- Дата создания: 2025-01-10
-- Цель: Привести структуру БД в соответствие с бизнес-логикой
-- ============================================

-- ============================================
-- РАЗДЕЛ 1: ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ ПОЛЕЙ
-- ============================================

-- Таблица users - добавляем поля для совместимости
-- Эти поля используются в коде, но отсутствуют в БД
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS processed_by INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- Таблица transactions - добавляем недостающие поля
-- ============================================

-- Поля, которые нужны согласно коду
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS amount NUMERIC(18,6),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Миграция данных из старых полей в новые
UPDATE transactions 
SET transaction_type = type,
    amount = COALESCE(amount_uni, 0) + COALESCE(amount_ton, 0),
    currency = CASE 
        WHEN amount_ton > 0 THEN 'TON'
        ELSE 'UNI'
    END
WHERE transaction_type IS NULL;

-- ============================================
-- Таблица referrals - структурные изменения
-- ============================================

-- Добавляем недостающие поля для статистики
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(18,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_levels JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- ============================================
-- Таблица farming_sessions - добавление полей
-- ============================================

-- Эта таблица пустая, но нужны поля для работы кода
ALTER TABLE farming_sessions
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS uni_farming_start_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS uni_farming_last_update TIMESTAMP,
ADD COLUMN IF NOT EXISTS uni_farming_rate NUMERIC(18,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS uni_deposit_amount NUMERIC(18,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS uni_farming_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Создаем индекс для user_id
CREATE INDEX IF NOT EXISTS idx_farming_sessions_user_id ON farming_sessions(user_id);

-- ============================================
-- Таблица boost_purchases - структура
-- ============================================

-- Добавляем все необходимые поля
ALTER TABLE boost_purchases
ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY,
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS ton_boost_package INTEGER,
ADD COLUMN IF NOT EXISTS ton_boost_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS type VARCHAR(50),
ADD COLUMN IF NOT EXISTS amount_uni NUMERIC(18,6),
ADD COLUMN IF NOT EXISTS amount_ton NUMERIC(18,6),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS tx_hash VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- Таблица withdraw_requests - проверка структуры
-- ============================================

-- Согласно документации, таблица уже имеет правильную структуру:
-- id (UUID), user_id, telegram_id, username, amount_ton, ton_wallet, 
-- status, created_at, processed_at, processed_by

-- Проверяем, что все необходимые поля существуют
DO $$
BEGIN
    -- Если таблица не существует, создаем её
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name = 'withdraw_requests') THEN
        CREATE TABLE withdraw_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id BIGINT NOT NULL,
            telegram_id TEXT,
            username TEXT,
            amount_ton NUMERIC(20, 9) NOT NULL CHECK (amount_ton > 0),
            ton_wallet TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            processed_at TIMESTAMP WITH TIME ZONE,
            processed_by TEXT
        );
        
        -- Создаем индексы
        CREATE INDEX idx_withdraw_requests_user_id ON withdraw_requests(user_id);
        CREATE INDEX idx_withdraw_requests_status ON withdraw_requests(status);
        CREATE INDEX idx_withdraw_requests_created_at ON withdraw_requests(created_at DESC);
    END IF;
END $$;

-- ============================================
-- РАЗДЕЛ 2: УДАЛЕНИЕ НЕИСПОЛЬЗУЕМЫХ ПОЛЕЙ
-- ============================================

-- Таблица transactions - удаляем дублирующие поля
-- metadata, source, source_user_id, action не используются в коде
ALTER TABLE transactions 
DROP COLUMN IF EXISTS metadata,
DROP COLUMN IF EXISTS action;

-- Сохраняем source и source_user_id, так как они могут быть нужны для реферальной системы

-- ============================================
-- РАЗДЕЛ 3: СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ
-- ============================================

-- Создаем таблицу для хранения реферальных комиссий
CREATE TABLE IF NOT EXISTS referral_commissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    source_user_id INTEGER REFERENCES users(id),
    level INTEGER NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    amount NUMERIC(18,6) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для referral_commissions
CREATE INDEX IF NOT EXISTS idx_referral_commissions_user_id ON referral_commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_source_user_id ON referral_commissions(source_user_id);

-- ============================================
-- РАЗДЕЛ 4: ОЧИСТКА НЕИСПОЛЬЗУЕМЫХ ТАБЛИЦ
-- ============================================

-- Эти таблицы существуют, но не используются в коде
-- Оставляем их для возможного будущего использования, но добавляем комментарий

COMMENT ON TABLE user_missions IS 'DEPRECATED - таблица не используется в текущей версии системы';
COMMENT ON TABLE airdrops IS 'DEPRECATED - таблица не используется в текущей версии системы';
COMMENT ON TABLE daily_bonus_logs IS 'DEPRECATED - таблица не используется в текущей версии системы';

-- ============================================
-- РАЗДЕЛ 5: ТРИГГЕРЫ И ФУНКЦИИ
-- ============================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автообновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boost_purchases_updated_at BEFORE UPDATE ON boost_purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- РАЗДЕЛ 6: МИГРАЦИЯ ДАННЫХ
-- ============================================

-- Обновляем статистику рефералов на основе существующих данных
UPDATE referrals r
SET total_referrals = (
    SELECT COUNT(*) 
    FROM users u 
    WHERE u.referred_by = r.user_id
),
active_referrals = (
    SELECT COUNT(*) 
    FROM users u 
    WHERE u.referred_by = r.user_id 
    AND u.is_active = true
)
WHERE r.total_referrals = 0;

-- ============================================
-- РАЗДЕЛ 7: ВАЛИДАЦИЯ И ПРОВЕРКИ
-- ============================================

-- Проверяем, что все критически важные поля существуют
DO $$
BEGIN
    -- Проверка таблицы users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        RAISE EXCEPTION 'Критическое поле users.is_active не было создано';
    END IF;
    
    -- Проверка таблицы transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'transaction_type') THEN
        RAISE EXCEPTION 'Критическое поле transactions.transaction_type не было создано';
    END IF;
    
    RAISE NOTICE 'Все критические поля успешно добавлены';
END $$;

-- ============================================
-- КОНЕЦ СКРИПТА
-- ============================================
-- Примечание: Перед выполнением обязательно сделайте резервную копию БД!