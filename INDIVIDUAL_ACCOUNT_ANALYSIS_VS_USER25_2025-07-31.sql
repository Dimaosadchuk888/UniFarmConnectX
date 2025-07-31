-- 🔍 ИНДИВИДУАЛЬНЫЙ АНАЛИЗ 9 УЧАСТНИКОВ ПРОТИВ ЭТАЛОНА USER ID 25
-- Дата: 31.07.2025
-- Цель: Сравнить каждого участника с User ID 25 и дать конкретные рекомендации
-- Принцип: ref_code НЕ ТРОГАТЬ, только подключения к системе и БД

-- Список участников для анализа:
-- @Irinkatriumf, @LeLila90, @lvereskun, @Artem_dpp, @Glazeb0, 
-- @Rostik_m09, @al_eksand0, @Dima_27976, @Dezertoddd

-- ===== ЭТАП 1: НАЙТИ ID ВСЕХ УЧАСТНИКОВ ПО USERNAME =====
SELECT 
    '=== ПОИСК ID УЧАСТНИКОВ ПО USERNAME ===' as section;

SELECT 
    id,
    username,
    telegram_id,
    first_name,
    ref_code,
    created_at,
    CASE 
        WHEN username IN ('Irinkatriumf', 'LeLila90', 'lvereskun', 'Artem_dpp', 'Glazeb0', 
                         'Rostik_m09', 'al_eksand0', 'Dima_27976', 'Dezertoddd') 
        THEN '🎯 ЦЕЛЕВОЙ УЧАСТНИК'
        WHEN id = 25 THEN '⭐ ЭТАЛОН'
        ELSE '⚪ ДРУГОЙ'
    END as participant_type
FROM users 
WHERE username IN ('Irinkatriumf', 'LeLila90', 'lvereskun', 'Artem_dpp', 'Glazeb0', 
                   'Rostik_m09', 'al_eksand0', 'Dima_27976', 'Dezertoddd') 
   OR id = 25
ORDER BY 
    CASE WHEN id = 25 THEN 0 ELSE 1 END,
    id;

-- ===== ЭТАП 2: ЭТАЛОННАЯ АРХИТЕКТУРА USER ID 25 =====
SELECT 
    '=== ЭТАЛОН: USER ID 25 - ПОЛНЫЙ ПРОФИЛЬ ===' as section;

-- Основные данные User ID 25
SELECT 
    'ОСНОВНЫЕ ДАННЫЕ' as data_type,
    u.id,
    u.username,
    u.telegram_id,
    u.first_name,
    u.ref_code,
    u.balance_uni,
    u.balance_ton,
    u.ton_farming_balance,
    u.ton_farming_rate,
    u.ton_boost_active,
    u.ton_boost_package,
    u.uni_farming_active,
    u.uni_farming_balance,
    u.created_at
FROM users u
WHERE u.id = 25;

-- Транзакции User ID 25
SELECT 
    'ТРАНЗАКЦИИ' as data_type,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT transaction_type) as unique_types,
    COUNT(DISTINCT currency) as currencies_count,
    MIN(created_at) as first_transaction,
    MAX(created_at) as last_transaction,
    STRING_AGG(DISTINCT transaction_type, ', ') as transaction_types,
    STRING_AGG(DISTINCT currency, ', ') as currencies,
    SUM(CASE WHEN currency = 'UNI' AND status = 'confirmed' THEN amount::numeric ELSE 0 END) as total_uni,
    SUM(CASE WHEN currency = 'TON' AND status = 'confirmed' THEN amount::numeric ELSE 0 END) as total_ton
FROM transactions 
WHERE user_id = 25;

-- Сессии User ID 25
SELECT 
    'СЕССИИ' as data_type,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
    MAX(created_at) as last_session_created,
    MAX(last_activity) as last_activity
FROM user_sessions 
WHERE user_id = 25;

-- TON Farming Data User ID 25
SELECT 
    'TON_FARMING_DATA' as data_type,
    user_id,
    farming_balance,
    farming_rate,
    boost_active,
    last_update
FROM ton_farming_data 
WHERE user_id = '25';

-- Альтернативные балансы User ID 25
SELECT 
    'USER_BALANCES' as data_type,
    CASE WHEN user_id IS NOT NULL THEN 'ЕСТЬ' ELSE 'НЕТ' END as has_alt_balances,
    balance_uni,
    balance_ton,
    updated_at
FROM user_balances 
WHERE user_id = 25;

-- ===== ЭТАП 3: ДЕТАЛЬНОЕ СРАВНЕНИЕ КАЖДОГО УЧАСТНИКА =====
SELECT 
    '=== ДЕТАЛЬНОЕ СРАВНЕНИЕ УЧАСТНИКОВ С USER ID 25 ===' as section;

-- Генерируем сравнительную таблицу для каждого участника
WITH target_users AS (
    SELECT id, username 
    FROM users 
    WHERE username IN ('Irinkatriumf', 'LeLila90', 'lvereskun', 'Artem_dpp', 'Glazeb0', 
                       'Rostik_m09', 'al_eksand0', 'Dima_27976', 'Dezertoddd')
),
user25_template AS (
    SELECT 
        u.id as template_id,
        u.telegram_id as template_telegram_id,
        u.balance_uni as template_balance_uni,
        u.balance_ton as template_balance_ton,
        u.ton_boost_active as template_ton_boost,
        u.uni_farming_active as template_uni_farming,
        COUNT(DISTINCT t.id) as template_transactions,
        COUNT(DISTINCT s.id) as template_sessions,
        CASE WHEN EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 1 ELSE 0 END as template_farming_data,
        CASE WHEN EXISTS(SELECT 1 FROM user_balances WHERE user_id = u.id) THEN 1 ELSE 0 END as template_alt_balances
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN user_sessions s ON u.id = s.user_id
    WHERE u.id = 25
    GROUP BY u.id, u.telegram_id, u.balance_uni, u.balance_ton, u.ton_boost_active, u.uni_farming_active
)
SELECT 
    tu.username as participant_username,
    u.id as participant_id,
    u.telegram_id as participant_telegram_id,
    t25.template_telegram_id as template_telegram_id,
    
    -- Основные данные
    u.balance_uni as participant_balance_uni,
    t25.template_balance_uni as template_balance_uni,
    u.balance_ton as participant_balance_ton,
    t25.template_balance_ton as template_balance_ton,
    u.ton_boost_active as participant_ton_boost,
    t25.template_ton_boost as template_ton_boost,
    
    -- Подключения к таблицам
    COUNT(DISTINCT t.id) as participant_transactions,
    t25.template_transactions as template_transactions,
    COUNT(DISTINCT s.id) as participant_sessions,
    t25.template_sessions as template_sessions,
    CASE WHEN EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 1 ELSE 0 END as participant_farming_data,
    t25.template_farming_data as template_farming_data,
    CASE WHEN EXISTS(SELECT 1 FROM user_balances WHERE user_id = u.id) THEN 1 ELSE 0 END as participant_alt_balances,
    t25.template_alt_balances as template_alt_balances,
    
    -- Проблемы и различия
    CASE WHEN u.telegram_id IS NULL THEN 'MISSING_TELEGRAM_ID' 
         WHEN COUNT(DISTINCT t.id) = 0 THEN 'NO_TRANSACTIONS'
         WHEN COUNT(DISTINCT s.id) = 0 THEN 'NO_SESSIONS'
         WHEN u.ton_boost_active = true AND NOT EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 'FARMING_NOT_SYNCED'
         ELSE 'OK' 
    END as primary_issue,
    
    -- Счет отличий от эталона
    ABS(COUNT(DISTINCT t.id) - t25.template_transactions) + 
    ABS(COUNT(DISTINCT s.id) - t25.template_sessions) +
    ABS((CASE WHEN EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 1 ELSE 0 END) - t25.template_farming_data) as differences_count

FROM target_users tu
JOIN users u ON tu.id = u.id
CROSS JOIN user25_template t25
LEFT JOIN transactions t ON u.id = t.user_id
LEFT JOIN user_sessions s ON u.id = s.user_id
GROUP BY 
    tu.username, u.id, u.telegram_id, u.balance_uni, u.balance_ton, u.ton_boost_active, u.uni_farming_active,
    t25.template_id, t25.template_telegram_id, t25.template_balance_uni, t25.template_balance_ton, 
    t25.template_ton_boost, t25.template_uni_farming, t25.template_transactions, t25.template_sessions, 
    t25.template_farming_data, t25.template_alt_balances
ORDER BY differences_count DESC, tu.username;

-- ===== ЭТАП 4: ИНДИВИДУАЛЬНЫЕ ПРОФИЛИ КАЖДОГО УЧАСТНИКА =====
SELECT 
    '=== ИНДИВИДУАЛЬНЫЕ ПРОФИЛИ УЧАСТНИКОВ ===' as section;

-- @Irinkatriumf
SELECT 
    '--- УЧАСТНИК: @Irinkatriumf ---' as participant;

SELECT 
    'ОСНОВНЫЕ_ДАННЫЕ' as type,
    u.id, u.username, u.telegram_id, u.first_name, u.ref_code,
    u.balance_uni, u.balance_ton, u.ton_boost_active, u.uni_farming_active,
    u.created_at
FROM users u WHERE u.username = 'Irinkatriumf';

SELECT 
    'ТРАНЗАКЦИИ' as type,
    COUNT(*) as count,
    STRING_AGG(DISTINCT transaction_type, ', ') as types,
    STRING_AGG(DISTINCT currency, ', ') as currencies
FROM transactions t 
JOIN users u ON t.user_id = u.id 
WHERE u.username = 'Irinkatriumf';

SELECT 
    'СЕССИИ' as type,
    COUNT(*) as count,
    MAX(created_at) as last_session
FROM user_sessions s 
JOIN users u ON s.user_id = u.id 
WHERE u.username = 'Irinkatriumf';

-- @LeLila90
SELECT 
    '--- УЧАСТНИК: @LeLila90 ---' as participant;

SELECT 
    'ОСНОВНЫЕ_ДАННЫЕ' as type,
    u.id, u.username, u.telegram_id, u.first_name, u.ref_code,
    u.balance_uni, u.balance_ton, u.ton_boost_active, u.uni_farming_active,
    u.created_at
FROM users u WHERE u.username = 'LeLila90';

SELECT 
    'ТРАНЗАКЦИИ' as type,
    COUNT(*) as count,
    STRING_AGG(DISTINCT transaction_type, ', ') as types,
    STRING_AGG(DISTINCT currency, ', ') as currencies
FROM transactions t 
JOIN users u ON t.user_id = u.id 
WHERE u.username = 'LeLila90';

SELECT 
    'СЕССИИ' as type,
    COUNT(*) as count,
    MAX(created_at) as last_session
FROM user_sessions s 
JOIN users u ON s.user_id = u.id 
WHERE u.username = 'LeLila90';

-- Аналогично для остальных участников
-- @lvereskun, @Artem_dpp, @Glazeb0, @Rostik_m09, @al_eksand0, @Dima_27976, @Dezertoddd

-- ===== ЭТАП 5: РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ =====
SELECT 
    '=== РЕКОМЕНДАЦИИ ПО ПРИВЕДЕНИЮ В ПОРЯДОК ===' as section;

WITH participant_analysis AS (
    SELECT 
        u.id,
        u.username,
        u.telegram_id,
        COUNT(DISTINCT t.id) as tx_count,
        COUNT(DISTINCT s.id) as session_count,
        u.ton_boost_active,
        CASE WHEN EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 1 ELSE 0 END as has_farming_data,
        CASE WHEN EXISTS(SELECT 1 FROM user_balances WHERE user_id = u.id) THEN 1 ELSE 0 END as has_alt_balances
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN user_sessions s ON u.id = s.user_id
    WHERE u.username IN ('Irinkatriumf', 'LeLila90', 'lvereskun', 'Artem_dpp', 'Glazeb0', 
                         'Rostik_m09', 'al_eksand0', 'Dima_27976', 'Dezertoddd')
    GROUP BY u.id, u.username, u.telegram_id, u.ton_boost_active
)
SELECT 
    username,
    id,
    
    -- Диагностика проблем
    CASE WHEN telegram_id IS NULL THEN '❌ НЕТ TELEGRAM_ID' ELSE '✅' END as telegram_status,
    CASE WHEN tx_count = 0 THEN '❌ НЕТ ТРАНЗАКЦИЙ' ELSE '✅' END as transactions_status,
    CASE WHEN session_count = 0 THEN '❌ НЕТ СЕССИЙ' ELSE '✅' END as sessions_status,
    CASE WHEN ton_boost_active = true AND has_farming_data = 0 THEN '❌ BOOST НЕ СИНХРОНИЗИРОВАН' ELSE '✅' END as farming_sync_status,
    CASE WHEN has_alt_balances = 1 THEN '⚠️ БАЛАНСЫ В ALT_TABLE' ELSE '✅' END as balance_location_status,
    
    -- Конкретные рекомендации
    CASE 
        WHEN telegram_id IS NULL THEN 'УСТАНОВИТЬ telegram_id'
        WHEN tx_count = 0 THEN 'СОЗДАТЬ БАЗОВУЮ ТРАНЗАКЦИЮ'
        WHEN session_count = 0 THEN 'СОЗДАТЬ user_session'
        WHEN ton_boost_active = true AND has_farming_data = 0 THEN 'СОЗДАТЬ ton_farming_data'
        WHEN has_alt_balances = 1 THEN 'МИГРИРОВАТЬ БАЛАНСЫ В users'
        ELSE 'АККАУНТ В ПОРЯДКЕ'
    END as primary_recommendation,
    
    -- Приоритет исправления
    CASE 
        WHEN telegram_id IS NULL THEN 'КРИТИЧЕСКИЙ'
        WHEN tx_count = 0 OR session_count = 0 THEN 'ВЫСОКИЙ'
        WHEN ton_boost_active = true AND has_farming_data = 0 THEN 'СРЕДНИЙ'
        WHEN has_alt_balances = 1 THEN 'НИЗКИЙ'
        ELSE 'НЕ ТРЕБУЕТСЯ'
    END as priority
    
FROM participant_analysis
ORDER BY 
    CASE 
        WHEN telegram_id IS NULL THEN 1
        WHEN tx_count = 0 OR session_count = 0 THEN 2
        WHEN ton_boost_active = true AND has_farming_data = 0 THEN 3
        WHEN has_alt_balances = 1 THEN 4
        ELSE 5
    END,
    username;