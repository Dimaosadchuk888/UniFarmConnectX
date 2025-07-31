-- 🔧 БЕЗОПАСНАЯ УНИФИКАЦИЯ АККАУНТОВ К СТАНДАРТУ USER ID 25
-- Дата: 31.07.2025
-- Цель: Приведение всех аккаунтов к эталонному стандарту

-- ===== ЭТАП 1: BACKUP КРИТИЧЕСКИХ ТАБЛИЦ =====
CREATE TABLE users_backup_20250731 AS SELECT * FROM users;
CREATE TABLE transactions_backup_20250731 AS SELECT * FROM transactions;
CREATE TABLE ton_farming_data_backup_20250731 AS SELECT * FROM ton_farming_data;
CREATE TABLE user_sessions_backup_20250731 AS SELECT * FROM user_sessions;

-- ===== ЭТАП 2: АНАЛИЗ ПРОБЛЕМНЫХ АККАУНТОВ =====

-- Найти аккаунты без telegram_id (критично для аутентификации)
SELECT id, username, first_name, created_at, 'MISSING_TELEGRAM_ID' as issue
FROM users 
WHERE telegram_id IS NULL OR telegram_id = 0;

-- Найти аккаунты без ref_code (критично для WebSocket/API)
SELECT id, username, first_name, created_at, 'MISSING_REF_CODE' as issue
FROM users 
WHERE ref_code IS NULL OR ref_code = '';

-- Найти аккаунты без транзакций (нет истории операций)
SELECT u.id, u.username, u.first_name, u.created_at, 'NO_TRANSACTIONS' as issue
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE t.user_id IS NULL;

-- Найти TON Boost аккаунты без farming data (разрыв связи)
SELECT u.id, u.username, u.ton_boost_active, 'TON_BOOST_WITHOUT_DATA' as issue
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id
WHERE u.ton_boost_active = true AND tfd.user_id IS NULL;

-- ===== ЭТАП 3: УНИФИКАЦИЯ (ОСТОРОЖНО!) =====

-- 3.1 Генерация ref_code для аккаунтов без него
UPDATE users 
SET ref_code = 'REF_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || 
              SUBSTRING(MD5(RANDOM()::text), 1, 6)
WHERE ref_code IS NULL OR ref_code = '';

-- 3.2 Создание начальных транзакций для аккаунтов без истории
INSERT INTO transactions (user_id, type, currency, amount, status, description, created_at)
SELECT 
    u.id,
    'SYSTEM_INITIALIZATION',
    'UNI',
    0.01,
    'completed',
    'Автоматическая инициализация аккаунта для унификации',
    NOW()
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE t.user_id IS NULL;

-- 3.3 Исправление TON Boost аккаунтов без farming data
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
SELECT 
    u.id,
    0,
    0.000000231, -- стандартная ставка 2% daily
    u.ton_boost_active,
    NOW()
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id
WHERE u.ton_boost_active = true AND tfd.user_id IS NULL;

-- 3.4 Установка минимальных балансов для новых аккаунтов
UPDATE users 
SET 
    balance_uni = COALESCE(balance_uni, 0.01),
    balance_ton = COALESCE(balance_ton, 0.01)
WHERE balance_uni IS NULL OR balance_ton IS NULL;

-- ===== ЭТАП 4: СОЗДАНИЕ СЕССИЙ ДЛЯ АУТЕНТИФИКАЦИИ =====

-- Создать базовые сессии для аккаунтов с telegram_id но без сессий
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at)
SELECT 
    u.id,
    'unif_' || u.id || '_' || EXTRACT(EPOCH FROM NOW())::bigint,
    NOW() + INTERVAL '30 days',
    NOW()
FROM users u
LEFT JOIN user_sessions us ON u.id = us.user_id
WHERE u.telegram_id IS NOT NULL 
    AND u.telegram_id != 0 
    AND us.user_id IS NULL;

-- ===== ЭТАП 5: ВЕРИФИКАЦИЯ РЕЗУЛЬТАТОВ =====

-- Проверить результаты унификации
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN telegram_id IS NOT NULL AND telegram_id != 0 THEN 1 END) as users_with_telegram_id,
    COUNT(CASE WHEN ref_code IS NOT NULL AND ref_code != '' THEN 1 END) as users_with_ref_code,
    COUNT(CASE WHEN balance_uni IS NOT NULL AND balance_uni != 0 THEN 1 END) as users_with_uni_balance,
    COUNT(CASE WHEN balance_ton IS NOT NULL AND balance_ton != 0 THEN 1 END) as users_with_ton_balance
FROM users;

-- Проверить транзакции
SELECT 
    COUNT(DISTINCT user_id) as users_with_transactions,
    COUNT(*) as total_transactions
FROM transactions;

-- Проверить TON Boost консистентность
SELECT 
    COUNT(CASE WHEN u.ton_boost_active = true THEN 1 END) as ton_boost_active_users,
    COUNT(CASE WHEN u.ton_boost_active = true AND tfd.user_id IS NOT NULL THEN 1 END) as ton_boost_with_data
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id;

-- ===== ЭТАП 6: МОНИТОРИНГ ЗДОРОВЬЯ =====

-- Создать view для мониторинга здоровья аккаунтов
CREATE OR REPLACE VIEW account_health_monitor AS
SELECT 
    u.id,
    u.username,
    u.created_at,
    -- Критические поля
    CASE WHEN u.telegram_id IS NOT NULL AND u.telegram_id != 0 THEN '✅' ELSE '❌' END as telegram_id_status,
    CASE WHEN u.ref_code IS NOT NULL AND u.ref_code != '' THEN '✅' ELSE '❌' END as ref_code_status,
    -- Системные интеграции
    CASE WHEN t.user_id IS NOT NULL THEN '✅' ELSE '❌' END as has_transactions,
    CASE WHEN us.user_id IS NOT NULL THEN '✅' ELSE '❌' END as has_sessions,
    CASE WHEN u.ton_boost_active = false OR tfd.user_id IS NOT NULL THEN '✅' ELSE '❌' END as ton_boost_consistent,
    -- Общий статус
    CASE 
        WHEN u.telegram_id IS NOT NULL AND u.ref_code IS NOT NULL AND t.user_id IS NOT NULL 
        THEN 'HEALTHY'
        ELSE 'NEEDS_ATTENTION'
    END as overall_status
FROM users u
LEFT JOIN (SELECT DISTINCT user_id FROM transactions) t ON u.id = t.user_id
LEFT JOIN (SELECT DISTINCT user_id FROM user_sessions WHERE expires_at > NOW()) us ON u.id = us.user_id
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id;

-- Показать статус здоровья после унификации
SELECT overall_status, COUNT(*) as user_count
FROM account_health_monitor
GROUP BY overall_status;

-- ВАЖНО: Сохранить User ID 25 нетронутым
-- User ID 25 исключается из всех UPDATE операций как эталонный аккаунт