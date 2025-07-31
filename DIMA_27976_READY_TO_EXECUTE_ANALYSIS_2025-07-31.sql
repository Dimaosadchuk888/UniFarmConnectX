-- 🔍 ГОТОВЫЙ К ВЫПОЛНЕНИЮ АНАЛИЗ @Dima_27976 VS USER ID 25
-- Дата: 31.07.2025
-- Статус: ГОТОВ К ЗАПУСКУ В ПРОИЗВОДСТВЕННОЙ БД
-- Принцип: ref_code НЕ ТРОГАТЬ

-- ===== ШАГ 1: НАЙТИ @Dima_27976 =====
\echo '=== ШАГ 1: ПОИСК @Dima_27976 ==='

SELECT 
    'ОСНОВНЫЕ_ДАННЫЕ' as type,
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
WHERE username = 'Dima_27976'
   OR username = '@Dima_27976'
   OR first_name LIKE '%Dima%27976%';

-- ===== ШАГ 2: ЭТАЛОН USER ID 25 =====
\echo '=== ШАГ 2: ЭТАЛОН USER ID 25 ==='

SELECT 
    'USER_25_ЭТАЛОН' as type,
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

-- ===== ШАГ 3: СРАВНЕНИЕ ТРАНЗАКЦИЙ =====
\echo '=== ШАГ 3: СРАВНЕНИЕ ТРАНЗАКЦИЙ ==='

-- User ID 25 транзакции
SELECT 
    'USER_25' as user_type,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT transaction_type) as unique_types,
    STRING_AGG(DISTINCT transaction_type, ', ') as transaction_types,
    MIN(created_at) as first_tx,
    MAX(created_at) as last_tx
FROM transactions 
WHERE user_id = 25;

-- @Dima_27976 транзакции  
SELECT 
    'DIMA_27976' as user_type,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT transaction_type) as unique_types,
    STRING_AGG(DISTINCT transaction_type, ', ') as transaction_types,
    MIN(t.created_at) as first_tx,
    MAX(t.created_at) as last_tx
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.username IN ('Dima_27976', '@Dima_27976');

-- ===== ШАГ 4: СРАВНЕНИЕ USER_SESSIONS =====
\echo '=== ШАГ 4: СРАВНЕНИЕ USER_SESSIONS ==='

-- User ID 25 сессии
SELECT 
    'USER_25' as user_type,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
    MAX(created_at) as last_session,
    MAX(last_activity) as last_activity
FROM user_sessions 
WHERE user_id = 25;

-- @Dima_27976 сессии
SELECT 
    'DIMA_27976' as user_type,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_sessions,
    MAX(s.created_at) as last_session,
    MAX(s.last_activity) as last_activity
FROM user_sessions s
JOIN users u ON s.user_id = u.id
WHERE u.username IN ('Dima_27976', '@Dima_27976');

-- ===== ШАГ 5: ПРОВЕРКА TON_FARMING_DATA =====
\echo '=== ШАГ 5: ПРОВЕРКА TON_FARMING_DATA ==='

-- User ID 25 farming data
SELECT 
    'USER_25' as user_type,
    user_id,
    farming_balance,
    farming_rate,
    boost_active,
    last_update
FROM ton_farming_data 
WHERE user_id = '25';

-- @Dima_27976 farming data
SELECT 
    'DIMA_27976' as user_type,
    tfd.user_id,
    tfd.farming_balance,
    tfd.farming_rate,
    tfd.boost_active,
    tfd.last_update
FROM ton_farming_data tfd
WHERE tfd.user_id IN (
    SELECT u.id::text 
    FROM users u 
    WHERE u.username IN ('Dima_27976', '@Dima_27976')
);

-- ===== ШАГ 6: ИТОГОВОЕ СРАВНЕНИЕ =====
\echo '=== ШАГ 6: ИТОГОВОЕ СРАВНЕНИЕ ==='

WITH dima_data AS (
    SELECT 
        u.id,
        u.username,
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
    WHERE u.username IN ('Dima_27976', '@Dima_27976')
    GROUP BY u.id, u.username, u.telegram_id, u.balance_uni, u.balance_ton, u.ton_boost_active
),
user25_data AS (
    SELECT 
        u.id,
        u.username,
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
    GROUP BY u.id, u.username, u.telegram_id, u.balance_uni, u.balance_ton, u.ton_boost_active
)
SELECT 
    'СРАВНЕНИЕ' as type,
    'USER_25' as user_type,
    id,
    username,
    telegram_id,
    tx_count,
    session_count,
    CASE WHEN has_farming_data = 1 THEN 'ДА' ELSE 'НЕТ' END as farming_data,
    CASE WHEN has_alt_balances = 1 THEN 'ДА' ELSE 'НЕТ' END as alt_balances
FROM user25_data
UNION ALL
SELECT 
    'СРАВНЕНИЕ' as type,
    'DIMA_27976' as user_type,
    id,
    username,
    telegram_id,
    tx_count,
    session_count,
    CASE WHEN has_farming_data = 1 THEN 'ДА' ELSE 'НЕТ' END as farming_data,
    CASE WHEN has_alt_balances = 1 THEN 'ДА' ELSE 'НЕТ' END as alt_balances
FROM dima_data;

-- ===== ШАГ 7: ДИАГНОСТИКА ПРОБЛЕМ =====
\echo '=== ШАГ 7: ДИАГНОСТИКА ПРОБЛЕМ DIMA_27976 ==='

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
    WHERE u.username IN ('Dima_27976', '@Dima_27976')
    GROUP BY u.id, u.username, u.telegram_id, u.ton_boost_active
)
SELECT 
    'ДИАГНОСТИКА' as type,
    username,
    id,
    
    -- Проблемы
    CASE WHEN telegram_id IS NULL THEN '❌ НЕТ TELEGRAM_ID' ELSE '✅ ЕСТЬ TELEGRAM_ID' END as telegram_status,
    CASE WHEN tx_count = 0 THEN '❌ НЕТ ТРАНЗАКЦИЙ' ELSE CONCAT('✅ ', tx_count, ' ТРАНЗАКЦИЙ') END as tx_status,
    CASE WHEN session_count = 0 THEN '❌ НЕТ СЕССИЙ' ELSE CONCAT('✅ ', session_count, ' СЕССИЙ') END as session_status,
    CASE WHEN ton_boost_active = true AND has_farming_data = 0 THEN '❌ BOOST НЕ СИНХРОНИЗИРОВАН' ELSE '✅ BOOST ОК' END as farming_sync,
    CASE WHEN has_alt_balances = 1 THEN '⚠️ БАЛАНСЫ В ALT_TABLE' ELSE '✅ БАЛАНСЫ В USERS' END as balance_location,
    
    -- Приоритет исправления
    CASE 
        WHEN telegram_id IS NULL THEN 'КРИТИЧЕСКИЙ'
        WHEN tx_count = 0 OR session_count = 0 THEN 'ВЫСОКИЙ'
        WHEN ton_boost_active = true AND has_farming_data = 0 THEN 'СРЕДНИЙ'
        WHEN has_alt_balances = 1 THEN 'НИЗКИЙ'
        ELSE 'НЕ ТРЕБУЕТСЯ'
    END as priority,
    
    -- Рекомендация
    CASE 
        WHEN telegram_id IS NULL THEN 'УСТАНОВИТЬ telegram_id'
        WHEN tx_count = 0 THEN 'СОЗДАТЬ БАЗОВУЮ ТРАНЗАКЦИЮ'
        WHEN session_count = 0 THEN 'СОЗДАТЬ user_session'
        WHEN ton_boost_active = true AND has_farming_data = 0 THEN 'СОЗДАТЬ ton_farming_data'
        WHEN has_alt_balances = 1 THEN 'МИГРИРОВАТЬ БАЛАНСЫ В users'
        ELSE 'АККАУНТ В ПОРЯДКЕ'
    END as recommendation
    
FROM dima_analysis;

-- ===== ГОТОВЫЕ ИСПРАВЛЕНИЯ (НЕ ВЫПОЛНЯТЬ АВТОМАТИЧЕСКИ!) =====
\echo '=== ГОТОВЫЕ КОМАНДЫ ДЛЯ ИСПРАВЛЕНИЯ (НЕ ВЫПОЛНЯТЬ АВТОМАТИЧЕСКИ!) ==='

-- Команды будут сгенерированы после получения результатов диагностики
\echo 'КОМАНДЫ ИСПРАВЛЕНИЯ БУДУТ ПОКАЗАНЫ ПОСЛЕ АНАЛИЗА РЕЗУЛЬТАТОВ';