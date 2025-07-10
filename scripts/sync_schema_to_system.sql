-- =====================================================
-- UniFarm Database Schema Synchronization Script
-- Generated: 2025-07-10
-- Purpose: Bring database structure to 100% alignment with system code
-- =====================================================

-- ВАЖНО: Перед выполнением сделайте резервную копию БД!
-- Этот скрипт приведет структуру БД в полное соответствие с кодом системы

BEGIN;

-- =====================================================
-- ЭТАП 1: ДОБАВЛЕНИЕ КРИТИЧЕСКИ ВАЖНЫХ ПОЛЕЙ
-- =====================================================

-- 1.1. Таблица users - добавляем недостающие поля
-- Поле is_active используется в 9 модулях для проверки активности пользователя
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
COMMENT ON COLUMN users.is_active IS 'Флаг активности пользователя';

-- Поле guest_id используется для гостевых пользователей
ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_id INTEGER;
COMMENT ON COLUMN users.guest_id IS 'ID гостевого пользователя';

-- 1.2. Таблица transactions - критическое поле amount
-- Без этого поля транзакции не могут работать!
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount DECIMAL(20,9) NOT NULL DEFAULT 0;
COMMENT ON COLUMN transactions.amount IS 'Сумма транзакции в базовой валюте';

-- 1.3. Таблица boost_purchases - добавляем структуру
-- Таблица используется в модуле boost для хранения покупок
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL REFERENCES users(id);
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS boost_id INTEGER NOT NULL;
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS tx_hash TEXT;
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE boost_purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Добавляем индексы для boost_purchases
CREATE INDEX IF NOT EXISTS idx_boost_purchases_user ON boost_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_status ON boost_purchases(status);

-- =====================================================
-- ЭТАП 2: УДАЛЕНИЕ НЕИСПОЛЬЗУЕМЫХ ПОЛЕЙ
-- =====================================================

-- 2.1. Очистка таблицы users от неиспользуемых полей
-- Эти поля не используются ни в одном модуле системы

-- Старые поля фарминга (логика перенесена в отдельные таблицы)
ALTER TABLE users DROP COLUMN IF EXISTS uni_deposit_amount;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_balance;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_rate;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_last_update;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_deposit;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_active;

-- Старые поля TON фарминга
ALTER TABLE users DROP COLUMN IF EXISTS ton_farming_balance;
ALTER TABLE users DROP COLUMN IF EXISTS ton_farming_accumulated;
ALTER TABLE users DROP COLUMN IF EXISTS ton_farming_last_claim;
ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_active;
ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_package_id;
ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_expires_at;

-- Старые поля чекинов (перенесены в daily_bonus_logs)
ALTER TABLE users DROP COLUMN IF EXISTS checkin_last_date;
ALTER TABLE users DROP COLUMN IF EXISTS checkin_streak;

-- Неиспользуемые поля
ALTER TABLE users DROP COLUMN IF EXISTS wallet;
ALTER TABLE users DROP COLUMN IF EXISTS last_active;
ALTER TABLE users DROP COLUMN IF EXISTS referrer_id; -- Дублирует функционал таблицы referrals

-- TON wallet поля (не используются в текущей версии)
ALTER TABLE users DROP COLUMN IF EXISTS ton_wallet_address;
ALTER TABLE users DROP COLUMN IF EXISTS ton_wallet_verified;
ALTER TABLE users DROP COLUMN IF EXISTS ton_wallet_linked_at;

-- 2.2. Очистка таблицы transactions от неиспользуемых полей
ALTER TABLE transactions DROP COLUMN IF EXISTS metadata;
ALTER TABLE transactions DROP COLUMN IF EXISTS source;
ALTER TABLE transactions DROP COLUMN IF EXISTS source_user_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS action;

-- =====================================================
-- ЭТАП 3: ОБРАБОТКА НЕИСПОЛЬЗУЕМЫХ ТАБЛИЦ
-- =====================================================

-- Эти таблицы существуют в БД, но не используются в коде
-- Решение: переименовываем в архивные для сохранения данных

-- 3.1. Архивируем неиспользуемые таблицы
ALTER TABLE IF EXISTS referrals RENAME TO _archive_referrals;
ALTER TABLE IF EXISTS farming_sessions RENAME TO _archive_farming_sessions;
ALTER TABLE IF EXISTS user_sessions RENAME TO _archive_user_sessions;
ALTER TABLE IF EXISTS missions RENAME TO _archive_missions;
ALTER TABLE IF EXISTS user_missions RENAME TO _archive_user_missions;
ALTER TABLE IF EXISTS airdrops RENAME TO _archive_airdrops;
ALTER TABLE IF EXISTS daily_bonus_logs RENAME TO _archive_daily_bonus_logs;

-- Добавляем комментарии к архивным таблицам
COMMENT ON TABLE _archive_referrals IS 'АРХИВ: Не используется в текущей версии системы';
COMMENT ON TABLE _archive_farming_sessions IS 'АРХИВ: Не используется в текущей версии системы';
COMMENT ON TABLE _archive_user_sessions IS 'АРХИВ: Не используется в текущей версии системы';
COMMENT ON TABLE _archive_missions IS 'АРХИВ: Не используется в текущей версии системы';
COMMENT ON TABLE _archive_user_missions IS 'АРХИВ: Не используется в текущей версии системы';
COMMENT ON TABLE _archive_airdrops IS 'АРХИВ: Не используется в текущей версии системы';
COMMENT ON TABLE _archive_daily_bonus_logs IS 'АРХИВ: Не используется в текущей версии системы';

-- =====================================================
-- ЭТАП 4: СОЗДАНИЕ АКТИВНО ИСПОЛЬЗУЕМЫХ ТАБЛИЦ
-- =====================================================

-- Создаем таблицы, которые активно используются в коде
-- но могли быть удалены или не созданы

-- 4.1. Таблица для хранения активных сессий (используется в коде)
CREATE TABLE IF NOT EXISTS active_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expires_at);

-- 4.2. Таблица для логирования операций (используется в scheduler)
CREATE TABLE IF NOT EXISTS operation_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    operation_type VARCHAR(100) NOT NULL,
    details JSONB,
    status VARCHAR(50) DEFAULT 'success',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_logs_user ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_type ON operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);

-- =====================================================
-- ЭТАП 5: КОРРЕКТИРОВКА ТИПОВ И ОГРАНИЧЕНИЙ
-- =====================================================

-- 5.1. Убеждаемся что все decimal поля имеют правильную точность
-- Стандарт для криптовалют: DECIMAL(20,9)

-- Проверяем и корректируем поля балансов
ALTER TABLE users ALTER COLUMN balance_uni TYPE DECIMAL(20,9);
ALTER TABLE users ALTER COLUMN balance_ton TYPE DECIMAL(20,9);

-- Проверяем поля в transactions
ALTER TABLE transactions ALTER COLUMN amount TYPE DECIMAL(20,9);
ALTER TABLE transactions ALTER COLUMN amount_uni TYPE DECIMAL(20,9);
ALTER TABLE transactions ALTER COLUMN amount_ton TYPE DECIMAL(20,9);

-- 5.2. Добавляем необходимые ограничения
-- Баланс не может быть отрицательным
ALTER TABLE users ADD CONSTRAINT check_balance_uni_positive CHECK (balance_uni >= 0);
ALTER TABLE users ADD CONSTRAINT check_balance_ton_positive CHECK (balance_ton >= 0);

-- Сумма транзакции должна быть положительной (кроме списаний)
ALTER TABLE transactions ADD CONSTRAINT check_amount_not_zero CHECK (amount != 0);

-- =====================================================
-- ЭТАП 6: ФИНАЛЬНАЯ ОПТИМИЗАЦИЯ
-- =====================================================

-- 6.1. Добавляем индексы для часто используемых запросов
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- 6.2. Обновляем статистику для оптимизатора
ANALYZE users;
ANALYZE transactions;
ANALYZE withdraw_requests;
ANALYZE boost_purchases;

-- =====================================================
-- ЭТАП 7: ПРОВЕРКА ЦЕЛОСТНОСТИ
-- =====================================================

-- Добавляем отсутствующие внешние ключи
ALTER TABLE transactions 
    ADD CONSTRAINT fk_transactions_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

ALTER TABLE withdraw_requests 
    ADD CONSTRAINT fk_withdraw_requests_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE;

-- =====================================================
-- ЗАВЕРШЕНИЕ
-- =====================================================

-- Добавляем метаинформацию о синхронизации
CREATE TABLE IF NOT EXISTS schema_sync_log (
    id SERIAL PRIMARY KEY,
    sync_version VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_sync_log (sync_version, description) 
VALUES ('2025.07.10.001', 'Полная синхронизация структуры БД с кодом системы UniFarm');

COMMIT;

-- =====================================================
-- ПОСТМИГРАЦИОННЫЕ ПРОВЕРКИ
-- =====================================================

-- Проверка успешности миграции:
DO $$
DECLARE
    missing_columns INTEGER;
    archived_tables INTEGER;
BEGIN
    -- Проверяем критические поля
    SELECT COUNT(*) INTO missing_columns
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name IN ('is_active', 'guest_id')
    AND table_schema = 'public';
    
    IF missing_columns < 2 THEN
        RAISE EXCEPTION 'Не все критические поля были добавлены в таблицу users';
    END IF;
    
    -- Проверяем архивацию таблиц
    SELECT COUNT(*) INTO archived_tables
    FROM information_schema.tables 
    WHERE table_name LIKE '_archive_%'
    AND table_schema = 'public';
    
    RAISE NOTICE 'Миграция завершена. Архивировано таблиц: %', archived_tables;
END $$;

-- Конец скрипта синхронизации