-- 🔍 ПРОВЕРКА @Dima_27976 ПРОТИВ ЭТАЛОНА USER ID 25
-- Дата: 31.07.2025
-- Принцип: ref_code НЕ ТРОГАТЬ, только сравнить подключения

-- ===== ЭТАП 1: НАЙТИ ID ПОЛЬЗОВАТЕЛЯ @Dima_27976 =====
SELECT 
    '=== ПОИСК @Dima_27976 ===' as section;

SELECT 
    id,
    username,
    telegram_id,
    first_name,
    ref_code,
    balance_uni,
    balance_ton,
    ton_boost_active,
    uni_farming_active,
    created_at
FROM users 
WHERE username = 'Dima_27976' OR username = '@Dima_27976';

-- ===== ЭТАП 2: ЭТАЛОН USER ID 25 - ОСНОВНЫЕ ДАННЫЕ =====
SELECT 
    '=== ЭТАЛОН: USER ID 25 ===' as section;

SELECT 
    id,
    username,
    telegram_id,
    first_name,
    ref_code,
    balance_uni,
    balance_ton,
    ton_boost_active,
    uni_farming_active,
    created_at
FROM users 
WHERE id = 25;

-- ===== ЭТАП 3: СРАВНЕНИЕ ТРАНЗАКЦИЙ =====
SELECT 
    '=== СРАВНЕНИЕ ТРАНЗАКЦИЙ ===' as section;

-- Транзакции User ID 25
SELECT 
    'USER_25' as user_type,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT transaction_type) as unique_types,
    STRING_AGG(DISTINCT transaction_type, ', ') as transaction_types,
    MIN(created_at) as first_transaction,
    MAX(created_at) as last_transaction
FROM transactions 
WHERE user_id = 25;

-- Транзакции @Dima_27976
SELECT 
    'DIMA_27976' as user_type,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT transaction_type) as unique_types,
    STRING_AGG(DISTINCT transaction_type, ', ') as transaction_types,
    MIN(created_at) as first_transaction,
    MAX(created_at) as last_transaction
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.username = 'Dima_27976' OR u.username = '@Dima_27976';

-- ===== ЭТАП 4: СРАВНЕНИЕ USER_SESSIONS =====
SELECT 
    '=== СРАВНЕНИЕ USER_SESSIONS ===' as section;

-- Сессии User ID 25
SELECT 
    'USER_25' as user_type,
    COUNT(*) as session_count,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
    MAX(created_at) as last_session_created,
    MAX(last_activity) as last_activity
FROM user_sessions 
WHERE user_id = 25;

-- Сессии @Dima_27976
SELECT 
    'DIMA_27976' as user_type,
    COUNT(*) as session_count,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
    MAX(created_at) as last_session_created,
    MAX(last_activity) as last_activity
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE u.username = 'Dima_27976' OR u.username = '@Dima_27976';

-- ===== ЭТАП 5: ПРОВЕРКА TON_FARMING_DATA =====
SELECT 
    '=== ПРОВЕРКА TON_FARMING_DATA ===' as section;

-- TON Farming Data User ID 25
SELECT 
    'USER_25' as user_type,
    user_id,
    farming_balance,
    farming_rate,
    boost_active,
    last_update
FROM ton_farming_data 
WHERE user_id = '25';

-- TON Farming Data @Dima_27976
SELECT 
    'DIMA_27976' as user_type,
    tfd.user_id,
    tfd.farming_balance,
    tfd.farming_rate,
    tfd.boost_active,
    tfd.last_update
FROM ton_farming_data tfd
JOIN users u ON tfd.user_id = u.id::text
WHERE u.username = 'Dima_27976' OR u.username = '@Dima_27976';

-- ===== ЭТАП 6: ПРОВЕРКА USER_BALANCES (альтернативное хранение) =====
SELECT 
    '=== ПРОВЕРКА USER_BALANCES ===' as section;

-- User Balances User ID 25
SELECT 
    'USER_25' as user_type,
    CASE WHEN user_id IS NOT NULL THEN 'ЕСТЬ' ELSE 'НЕТ' END as has_alt_balances,
    balance_uni,
    balance_ton,
    updated_at
FROM user_balances 
WHERE user_id = 25
UNION ALL
SELECT 
    'USER_25' as user_type,
    'НЕТ' as has_alt_balances,
    NULL as balance_uni,
    NULL as balance_ton,
    NULL as updated_at
WHERE NOT EXISTS (SELECT 1 FROM user_balances WHERE user_id = 25);

-- User Balances @Dima_27976
SELECT 
    'DIMA_27976' as user_type,
    CASE WHEN ub.user_id IS NOT NULL THEN 'ЕСТЬ' ELSE 'НЕТ' END as has_alt_balances,
    ub.balance_uni,
    ub.balance_ton,
    ub.updated_at
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.username = 'Dima_27976' OR u.username = '@Dima_27976';

-- ===== ЭТАП 7: ИТОГОВОЕ СРАВНЕНИЕ =====
SELECT 
    '=== ИТОГОВОЕ СРАВНЕНИЕ ===' as section;

WITH user25_stats AS (
    SELECT 
        25 as user_id,
        'USER_25' as user_type,
        u.telegram_id,
        u.balance_uni,
        u.balance_ton,
        u.ton_boost_active,
        COUNT(DISTINCT t.id) as tx_count,
        COUNT(DISTINCT s.id) as session_count,
        CASE WHEN EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = '25') THEN 1 ELSE 0 END as has_farming_data,
        CASE WHEN EXISTS(SELECT 1 FROM user_balances WHERE user_id = 25) THEN 1 ELSE 0 END as has_alt_balances
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN user_sessions s ON u.id = s.user_id
    WHERE u.id = 25
    GROUP BY u.id, u.telegram_id, u.balance_uni, u.balance_ton, u.ton_boost_active
),
dima_stats AS (
    SELECT 
        u.id as user_id,
        'DIMA_27976' as user_type,
        u.telegram_id,
        u.balance_uni,
        u.balance_ton,
        u.ton_boost_active,
        COUNT(DISTINCT t.id) as tx_count,
        COUNT(DISTINCT s.id) as session_count,
        CASE WHEN EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 1 ELSE 0 END as has_farming_data,
        CASE WHEN EXISTS(SELECT 1 FROM user_balances WHERE user_id = u.id) THEN 1 ELSE 0 END as has_alt_balances
    FROM users u
    LEFT JOIN transactions t ON u.id = t.user_id
    LEFT JOIN user_sessions s ON u.id = s.user_id
    WHERE u.username = 'Dima_27976' OR u.username = '@Dima_27976'
    GROUP BY u.id, u.telegram_id, u.balance_uni, u.balance_ton, u.ton_boost_active
)
SELECT 
    user_type,
    user_id,
    telegram_id,
    balance_uni,
    balance_ton,
    ton_boost_active,
    tx_count,
    session_count,
    CASE WHEN has_farming_data = 1 THEN '✅' ELSE '❌' END as farming_data_status,
    CASE WHEN has_alt_balances = 1 THEN '⚠️ ALT_BALANCES' ELSE '✅ MAIN_TABLE' END as balance_location
FROM user25_stats
UNION ALL
SELECT 
    user_type,
    user_id,
    telegram_id,
    balance_uni,
    balance_ton,
    ton_boost_active,
    tx_count,
    session_count,
    CASE WHEN has_farming_data = 1 THEN '✅' ELSE '❌' END as farming_data_status,
    CASE WHEN has_alt_balances = 1 THEN '⚠️ ALT_BALANCES' ELSE '✅ MAIN_TABLE' END as balance_location
FROM dima_stats;

-- ===== ЭТАП 8: ДИАГНОСТИКА ПРОБЛЕМ @Dima_27976 =====
SELECT 
    '=== ДИАГНОСТИКА ПРОБЛЕМ @Dima_27976 ===' as section;

WITH dima_analysis AS (
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
    WHERE u.username = 'Dima_27976' OR u.username = '@Dima_27976'
    GROUP BY u.id, u.username, u.telegram_id, u.ton_boost_active
)
SELECT 
    username,
    id,
    
    -- Диагностика проблем
    CASE WHEN telegram_id IS NULL THEN '❌ НЕТ TELEGRAM_ID' ELSE '✅ TELEGRAM_ID' END as telegram_status,
    CASE WHEN tx_count = 0 THEN '❌ НЕТ ТРАНЗАКЦИЙ' ELSE CONCAT('✅ ', tx_count, ' ТРАНЗАКЦИЙ') END as transactions_status,
    CASE WHEN session_count = 0 THEN '❌ НЕТ СЕССИЙ' ELSE CONCAT('✅ ', session_count, ' СЕССИЙ') END as sessions_status,
    CASE WHEN ton_boost_active = true AND has_farming_data = 0 THEN '❌ BOOST НЕ СИНХРОНИЗИРОВАН' ELSE '✅ BOOST ОК' END as farming_sync_status,
    CASE WHEN has_alt_balances = 1 THEN '⚠️ БАЛАНСЫ В ALT_TABLE' ELSE '✅ БАЛАНСЫ В USERS' END as balance_location_status,
    
    -- Конкретные рекомендации
    CASE 
        WHEN telegram_id IS NULL THEN 'КРИТИЧЕСКИЙ: УСТАНОВИТЬ telegram_id'
        WHEN tx_count = 0 THEN 'ВЫСОКИЙ: СОЗДАТЬ БАЗОВУЮ ТРАНЗАКЦИЮ'
        WHEN session_count = 0 THEN 'ВЫСОКИЙ: СОЗДАТЬ user_session'
        WHEN ton_boost_active = true AND has_farming_data = 0 THEN 'СРЕДНИЙ: СОЗДАТЬ ton_farming_data'
        WHEN has_alt_balances = 1 THEN 'НИЗКИЙ: МИГРИРОВАТЬ БАЛАНСЫ В users'
        ELSE 'НЕ ТРЕБУЕТСЯ: АККАУНТ В ПОРЯДКЕ'
    END as primary_recommendation
    
FROM dima_analysis;