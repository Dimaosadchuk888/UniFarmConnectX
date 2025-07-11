-- UniFarm: Оптимизация структуры базы данных
-- Дата: 2025-07-11
-- Цель: Очистка неиспользуемых полей и оптимизация структуры

-- =====================================================
-- 1. УДАЛЕНИЕ НЕИСПОЛЬЗУЕМЫХ ТАБЛИЦ
-- =====================================================

-- Сохраняем резервные копии перед удалением
CREATE TABLE IF NOT EXISTS user_missions_backup AS SELECT * FROM user_missions;
CREATE TABLE IF NOT EXISTS airdrops_backup AS SELECT * FROM airdrops;

-- Удаляем неиспользуемые таблицы
DROP TABLE IF EXISTS user_missions CASCADE;
DROP TABLE IF EXISTS airdrops CASCADE;

-- =====================================================
-- 2. МИГРАЦИЯ FARMING ПОЛЕЙ В ОТДЕЛЬНУЮ ТАБЛИЦУ
-- =====================================================

-- Создаем новую таблицу для UNI farming данных
CREATE TABLE IF NOT EXISTS uni_farming_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    deposit_amount NUMERIC(20,9) DEFAULT 0,
    farming_balance NUMERIC(20,9) DEFAULT 0,
    farming_rate NUMERIC(10,6) DEFAULT 0,
    farming_start_timestamp TIMESTAMP DEFAULT NULL,
    farming_last_update TIMESTAMP DEFAULT NULL,
    farming_deposit NUMERIC(20,9) DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем новую таблицу для TON farming данных
CREATE TABLE IF NOT EXISTS ton_farming_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    farming_balance NUMERIC(20,9) DEFAULT 0,
    farming_rate NUMERIC(10,6) DEFAULT 0.001,
    farming_start_timestamp TIMESTAMP DEFAULT NULL,
    farming_last_update TIMESTAMP DEFAULT NULL,
    farming_accumulated NUMERIC(20,9) DEFAULT 0,
    farming_last_claim TIMESTAMP DEFAULT NULL,
    boost_active BOOLEAN DEFAULT FALSE,
    boost_package_id INTEGER DEFAULT NULL,
    boost_expires_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Мигрируем существующие данные
INSERT INTO uni_farming_data (
    user_id, deposit_amount, farming_balance, farming_rate,
    farming_start_timestamp, farming_last_update, farming_deposit, is_active
)
SELECT 
    id, uni_deposit_amount, uni_farming_balance, uni_farming_rate,
    uni_farming_start_timestamp, uni_farming_last_update, uni_farming_deposit,
    uni_farming_active
FROM users
WHERE uni_deposit_amount > 0 OR uni_farming_active = true;

INSERT INTO ton_farming_data (
    user_id, farming_balance, farming_rate, farming_start_timestamp,
    farming_last_update, farming_accumulated, farming_last_claim,
    boost_active, boost_package_id, boost_expires_at
)
SELECT 
    id, ton_farming_balance, ton_farming_rate, ton_farming_start_timestamp,
    ton_farming_last_update, ton_farming_accumulated, ton_farming_last_claim,
    ton_boost_active, ton_boost_package_id, ton_boost_expires_at
FROM users
WHERE ton_boost_package > 0 OR ton_boost_active = true;

-- =====================================================
-- 3. СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
-- =====================================================

-- Создаем представление для упрощенного доступа к данным пользователя
CREATE OR REPLACE VIEW user_full_data AS
SELECT 
    u.*,
    uf.deposit_amount as uni_deposit_amount,
    uf.farming_balance as uni_farming_balance,
    uf.farming_rate as uni_farming_rate,
    uf.is_active as uni_farming_active,
    tf.farming_balance as ton_farming_balance,
    tf.farming_rate as ton_farming_rate,
    tf.boost_active as ton_boost_active,
    tf.boost_package_id as ton_boost_package
FROM users u
LEFT JOIN uni_farming_data uf ON u.id = uf.user_id
LEFT JOIN ton_farming_data tf ON u.id = tf.user_id;

-- =====================================================
-- 4. УДАЛЕНИЕ НЕИСПОЛЬЗУЕМЫХ ПОЛЕЙ ИЗ USERS
-- =====================================================

-- ВНИМАНИЕ: Это удалит данные! Выполнять только после успешной миграции!
-- Раскомментируйте следующие строки после проверки миграции:

/*
ALTER TABLE users DROP COLUMN IF EXISTS wallet;
ALTER TABLE users DROP COLUMN IF EXISTS uni_deposit_amount;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_balance;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_rate;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_last_update;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_deposit;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_start_timestamp;
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_active;
ALTER TABLE users DROP COLUMN IF EXISTS ton_farming_balance;
ALTER TABLE users DROP COLUMN IF EXISTS ton_farming_rate;
ALTER TABLE users DROP COLUMN IF EXISTS ton_farming_start_timestamp;
ALTER TABLE users DROP COLUMN IF EXISTS ton_farming_last_update;
ALTER TABLE users DROP COLUMN IF EXISTS ton_farming_accumulated;
ALTER TABLE users DROP COLUMN IF EXISTS ton_farming_last_claim;
ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_active;
ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_package_id;
ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS ton_boost_package;
ALTER TABLE users DROP COLUMN IF EXISTS last_active;
*/

-- =====================================================
-- 5. УДАЛЕНИЕ НЕИСПОЛЬЗУЕМЫХ ПОЛЕЙ ИЗ TRANSACTIONS
-- =====================================================

/*
ALTER TABLE transactions DROP COLUMN IF EXISTS metadata;
ALTER TABLE transactions DROP COLUMN IF EXISTS source;
ALTER TABLE transactions DROP COLUMN IF EXISTS source_user_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS action;
*/

-- =====================================================
-- 6. СОЗДАНИЕ ИНДЕКСОВ ДЛЯ ОПТИМИЗАЦИИ
-- =====================================================

-- Индексы для новых таблиц
CREATE INDEX IF NOT EXISTS idx_uni_farming_active ON uni_farming_data(is_active);
CREATE INDEX IF NOT EXISTS idx_ton_farming_active ON ton_farming_data(boost_active);
CREATE INDEX IF NOT EXISTS idx_uni_farming_updated ON uni_farming_data(farming_last_update);
CREATE INDEX IF NOT EXISTS idx_ton_farming_updated ON ton_farming_data(farming_last_update);

-- =====================================================
-- 7. ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =====================================================

-- Проверяем количество записей в новых таблицах
SELECT 
    'uni_farming_data' as table_name, 
    COUNT(*) as record_count 
FROM uni_farming_data
UNION ALL
SELECT 
    'ton_farming_data' as table_name, 
    COUNT(*) as record_count 
FROM ton_farming_data;