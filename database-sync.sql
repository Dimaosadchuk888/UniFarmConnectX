-- ========================================
-- ПОЛНАЯ СИНХРОНИЗАЦИЯ БАЗЫ ДАННЫХ UNIFARM
-- Создание всех таблиц и структур на основе текущей схемы
-- ========================================

-- Создание расширений для UUID и других функций
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. ОСНОВНАЯ ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- ========================================

-- Таблица аутентификации
CREATE TABLE IF NOT EXISTS auth_users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT DEFAULT 'telegram_auth'
);

-- Основная таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    guest_id TEXT UNIQUE,
    username TEXT,
    wallet TEXT,
    ton_wallet_address TEXT,
    ref_code TEXT UNIQUE,
    parent_ref_code TEXT,
    balance_uni NUMERIC(18,6) DEFAULT 0,
    balance_ton NUMERIC(18,6) DEFAULT 0,
    -- Поля для основного UNI фарминга
    uni_deposit_amount NUMERIC(18,6) DEFAULT 0,
    uni_farming_start_timestamp TIMESTAMP,
    uni_farming_balance NUMERIC(18,6) DEFAULT 0,
    uni_farming_rate NUMERIC(18,6) DEFAULT 0,
    uni_farming_last_update TIMESTAMP,
    -- Поля для совместимости со старой системой
    uni_farming_deposit NUMERIC(18,6) DEFAULT 0,
    uni_farming_activated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checkin_last_date TIMESTAMP,
    checkin_streak INTEGER DEFAULT 0
);

-- Индексы для пользователей
CREATE INDEX IF NOT EXISTS idx_users_parent_ref_code ON users(parent_ref_code);
CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_guest_id ON users(guest_id);

-- ========================================
-- 2. ТАБЛИЦЫ ФАРМИНГА И ДЕПОЗИТОВ
-- ========================================

-- Фарминг депозиты (устаревшая таблица, сохраняем для совместимости)
CREATE TABLE IF NOT EXISTS farming_deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount_uni NUMERIC(18,6),
    rate_uni NUMERIC(5,2),
    rate_ton NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_claim TIMESTAMP,
    is_boosted BOOLEAN DEFAULT FALSE,
    deposit_type TEXT DEFAULT 'regular',
    boost_id INTEGER,
    expires_at TIMESTAMP
);

-- UNI фарминг депозиты (новая система)
CREATE TABLE IF NOT EXISTS uni_farming_deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount NUMERIC(18,6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    rate_per_second NUMERIC(20,18) NOT NULL,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Boost депозиты
CREATE TABLE IF NOT EXISTS boost_deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    boost_id INTEGER NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    bonus_uni NUMERIC(18,6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TON Boost депозиты
CREATE TABLE IF NOT EXISTS ton_boost_deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    ton_amount NUMERIC(18,5) NOT NULL,
    bonus_uni NUMERIC(18,6) NOT NULL,
    rate_ton_per_second NUMERIC(20,18) NOT NULL,
    rate_uni_per_second NUMERIC(20,18) NOT NULL,
    accumulated_ton NUMERIC(18,10) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- ========================================
-- 3. СИСТЕМА ТРАНЗАКЦИЙ
-- ========================================

-- Основная таблица транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type TEXT, -- deposit / withdraw / reward / boost_bonus
    currency TEXT, -- UNI / TON
    amount NUMERIC(18,6),
    status TEXT DEFAULT 'confirmed', -- pending / confirmed / rejected
    source TEXT, -- источник транзакции
    category TEXT, -- категория транзакции
    tx_hash TEXT, -- хеш транзакции для блокчейн-операций
    description TEXT, -- описание транзакции
    source_user_id INTEGER, -- ID пользователя-источника
    wallet_address TEXT, -- адрес кошелька для вывода
    data TEXT, -- JSON-строка с дополнительными данными
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для транзакций
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_source_user_id ON transactions(source_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ========================================
-- 4. РЕФЕРАЛЬНАЯ СИСТЕМА
-- ========================================

-- Таблица рефералов
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    inviter_id INTEGER REFERENCES users(id) NOT NULL,
    level INTEGER NOT NULL, -- Уровень (1–20)
    reward_uni NUMERIC(18,6),
    ref_path JSON, -- Массив ID пригласителей в цепочке
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для рефералов
CREATE INDEX IF NOT EXISTS idx_referrals_user_id ON referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_inviter_id ON referrals(inviter_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user_inviter ON referrals(user_id, inviter_id);
CREATE INDEX IF NOT EXISTS idx_referrals_level ON referrals(level);

-- ========================================
-- 5. СИСТЕМА МИССИЙ
-- ========================================

-- Таблица миссий
CREATE TABLE IF NOT EXISTS missions (
    id SERIAL PRIMARY KEY,
    type TEXT, -- Тип миссии: invite / social / check-in / deposit
    title TEXT, -- Название миссии
    description TEXT, -- Подробное описание
    reward_uni NUMERIC(18,6), -- Награда в UNI
    is_active BOOLEAN DEFAULT TRUE -- Активна ли миссия
);

-- Таблица выполнения миссий пользователями
CREATE TABLE IF NOT EXISTS user_missions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    mission_id INTEGER REFERENCES missions(id),
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для миссий
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON user_missions(mission_id);

-- ========================================
-- 6. СИСТЕМНЫЕ ТАБЛИЦЫ ЛОГИРОВАНИЯ
-- ========================================

-- Логи запусков приложения
CREATE TABLE IF NOT EXISTS launch_logs (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT,
    ref_code TEXT,
    platform TEXT, -- android / ios / web / unknown
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_agent TEXT,
    init_data TEXT,
    ip_address TEXT,
    request_id TEXT, -- Для отслеживания уникальных запросов
    user_id INTEGER REFERENCES users(id) -- Связь с таблицей пользователей
);

-- Логи операций с партициями
CREATE TABLE IF NOT EXISTS partition_logs (
    id SERIAL PRIMARY KEY,
    operation TEXT NOT NULL, -- CREATE, DROP, INFO, ERROR
    partition_name TEXT,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status TEXT NOT NULL, -- success, error
    error_details TEXT
);

-- Логи распределения реферальных вознаграждений
CREATE TABLE IF NOT EXISTS reward_distribution_logs (
    id SERIAL PRIMARY KEY,
    batch_id TEXT NOT NULL, -- Уникальный ID пакета операций
    source_user_id INTEGER NOT NULL, -- ID пользователя, от которого идёт распределение
    earned_amount NUMERIC(18,6) NOT NULL, -- Сумма исходного действия
    currency TEXT NOT NULL, -- Валюта (UNI/TON)
    processed_at TIMESTAMP, -- Время обработки сообщения
    status TEXT DEFAULT 'pending', -- pending / completed / failed
    levels_processed INTEGER, -- Количество обработанных уровней
    inviter_count INTEGER, -- Количество пригласителей
    total_distributed NUMERIC(18,6), -- Общая распределенная сумма
    error_message TEXT, -- Ошибка при обработке
    completed_at TIMESTAMP -- Время завершения обработки
);

-- Метрики производительности
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    operation TEXT NOT NULL, -- Тип операции
    batch_id TEXT, -- ID связанного пакета распределения
    duration_ms NUMERIC(12,2) NOT NULL, -- Длительность операции в миллисекундах
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, -- Время записи метрики
    details TEXT -- Дополнительные детали (JSON-строка)
);

-- Индексы для метрик производительности
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_batch_id ON performance_metrics(batch_id);

-- ========================================
-- 7. СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ
-- ========================================

-- Вставляем базовые миссии, если их нет
INSERT INTO missions (type, title, description, reward_uni, is_active) VALUES
    ('check-in', 'Ежедневный чек-ин', 'Получайте награду за ежедневный вход в приложение', 10, TRUE),
    ('invite', 'Пригласить друга', 'Пригласите друга и получите бонус', 50, TRUE),
    ('social', 'Подписаться на Telegram', 'Подпишитесь на наш Telegram канал', 25, TRUE),
    ('deposit', 'Первый депозит', 'Сделайте первый депозит в UNI фарминг', 100, TRUE)
ON CONFLICT DO NOTHING;

-- ========================================
-- 8. СОЗДАНИЕ ФУНКЦИЙ ДЛЯ АВТОМАТИЗАЦИИ
-- ========================================

-- Функция для генерации уникального реферального кода
CREATE OR REPLACE FUNCTION generate_ref_code() RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := UPPER(substring(encode(gen_random_bytes(4), 'hex'), 1, 8));
        SELECT EXISTS(SELECT 1 FROM users WHERE ref_code = new_code) INTO code_exists;
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Функция для генерации guest_id
CREATE OR REPLACE FUNCTION generate_guest_id() RETURNS TEXT AS $$
BEGIN
    RETURN uuid_generate_v4()::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического создания ref_code и guest_id при создании пользователя
CREATE OR REPLACE FUNCTION auto_generate_user_codes() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ref_code IS NULL THEN
        NEW.ref_code := generate_ref_code();
    END IF;
    
    IF NEW.guest_id IS NULL THEN
        NEW.guest_id := generate_guest_id();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер, если его нет
DROP TRIGGER IF EXISTS trigger_auto_generate_user_codes ON users;
CREATE TRIGGER trigger_auto_generate_user_codes
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_user_codes();

-- ========================================
-- 9. ПРОВЕРКА И ОБНОВЛЕНИЕ СТРУКТУРЫ
-- ========================================

-- Добавляем отсутствующие колонки, если их нет
DO $$ 
BEGIN
    -- Проверяем и добавляем guest_id в users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'guest_id') THEN
        ALTER TABLE users ADD COLUMN guest_id TEXT UNIQUE;
        -- Заполняем guest_id для существующих пользователей
        UPDATE users SET guest_id = generate_guest_id() WHERE guest_id IS NULL;
    END IF;
    
    -- Проверяем и добавляем ton_wallet_address в users
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'ton_wallet_address') THEN
        ALTER TABLE users ADD COLUMN ton_wallet_address TEXT;
    END IF;
    
    -- Заполняем ref_code для существующих пользователей без кода
    UPDATE users SET ref_code = generate_ref_code() WHERE ref_code IS NULL;
END $$;

-- ========================================
-- 10. СОЗДАНИЕ ПРЕДСТАВЛЕНИЙ ДЛЯ API
-- ========================================

-- Представление для получения полной информации о пользователе
CREATE OR REPLACE VIEW user_full_info AS
SELECT 
    u.*,
    COALESCE(SUM(ufd.amount), 0) as total_uni_farming,
    COALESCE(SUM(tbd.ton_amount), 0) as total_ton_farming,
    COUNT(DISTINCT r.user_id) as referral_count
FROM users u
LEFT JOIN uni_farming_deposits ufd ON u.id = ufd.user_id AND ufd.is_active = TRUE
LEFT JOIN ton_boost_deposits tbd ON u.id = tbd.user_id AND tbd.is_active = TRUE
LEFT JOIN referrals r ON u.id = r.inviter_id
GROUP BY u.id;

-- Представление для реферальной статистики
CREATE OR REPLACE VIEW referral_stats AS
SELECT 
    inviter_id,
    COUNT(*) as total_referrals,
    COUNT(CASE WHEN level = 1 THEN 1 END) as level_1_referrals,
    SUM(reward_uni) as total_rewards
FROM referrals
GROUP BY inviter_id;

-- ========================================
-- ЗАВЕРШЕНИЕ
-- ========================================

-- Обновляем статистику таблиц для оптимизации запросов
ANALYZE;

-- Выводим информацию о созданных таблицах
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;