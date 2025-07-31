-- 🔍 АНАЛИЗ ПОДКЛЮЧЕНИЙ АККАУНТОВ 191-303 В ТАБЛИЦАХ
-- Дата: 31.07.2025
-- Цель: Найти что не так с подключениями в таблицах (БЕЗ ИЗМЕНЕНИЯ REF_CODE)
-- Принцип: 99% настроены правильно, найти только реальные проблемы

-- ===== ЭТАП 1: ОСНОВНАЯ ИНФОРМАЦИЯ АККАУНТОВ 191-303 =====
SELECT 
    '=== ОСНОВНЫЕ ДАННЫЕ АККАУНТОВ 191-303 (без изменения ref_code) ===' as section;

SELECT 
    id,
    telegram_id,
    username,
    first_name,
    ref_code,
    balance_uni,
    balance_ton,
    ton_farming_balance,
    ton_farming_rate,
    ton_boost_active,
    ton_boost_package,
    uni_farming_active,
    created_at,
    
    -- Статусы подключений
    CASE WHEN telegram_id IS NOT NULL AND telegram_id != 0 THEN '✅' ELSE '❌' END as telegram_connected,
    CASE WHEN balance_uni IS NOT NULL THEN '✅' ELSE '❌' END as has_uni_balance,
    CASE WHEN balance_ton IS NOT NULL THEN '✅' ELSE '❌' END as has_ton_balance
    
FROM users 
WHERE id BETWEEN 191 AND 303
ORDER BY id;

-- ===== ЭТАП 2: ПРОВЕРКА ПОДКЛЮЧЕНИЙ К ТАБЛИЦЕ TRANSACTIONS =====
SELECT 
    '=== ПОДКЛЮЧЕНИЯ К ТАБЛИЦЕ TRANSACTIONS ===' as section;

SELECT 
    u.id,
    u.username,
    COUNT(t.id) as transaction_count,
    MIN(t.created_at) as first_transaction,
    MAX(t.created_at) as last_transaction,
    STRING_AGG(DISTINCT t.transaction_type, ', ') as transaction_types,
    STRING_AGG(DISTINCT t.currency, ', ') as currencies,
    SUM(CASE WHEN t.currency = 'UNI' AND t.status = 'confirmed' THEN t.amount::numeric ELSE 0 END) as total_uni_confirmed,
    SUM(CASE WHEN t.currency = 'TON' AND t.status = 'confirmed' THEN t.amount::numeric ELSE 0 END) as total_ton_confirmed,
    CASE 
        WHEN COUNT(t.id) = 0 THEN '❌ НЕТ ТРАНЗАКЦИЙ'
        WHEN COUNT(t.id) < 5 THEN '⚠️ МАЛО ТРАНЗАКЦИЙ'
        ELSE '✅ ТРАНЗАКЦИИ ЕСТЬ'
    END as transaction_status
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE u.id BETWEEN 191 AND 303
GROUP BY u.id, u.username
ORDER BY u.id;

-- ===== ЭТАП 3: ПРОВЕРКА ПОДКЛЮЧЕНИЙ К ТАБЛИЦЕ USER_SESSIONS =====
SELECT 
    '=== ПОДКЛЮЧЕНИЯ К ТАБЛИЦЕ USER_SESSIONS ===' as section;

SELECT 
    u.id,
    u.username,
    u.telegram_id,
    COUNT(s.id) as session_count,
    MAX(s.created_at) as last_session_created,
    MAX(s.last_activity) as last_activity,
    COUNT(CASE WHEN s.expires_at > NOW() THEN 1 END) as active_sessions,
    STRING_AGG(DISTINCT s.session_token, ', ') as session_tokens,
    CASE 
        WHEN u.telegram_id IS NULL THEN '⚠️ НЕТ TELEGRAM_ID'
        WHEN COUNT(s.id) = 0 THEN '❌ НЕТ СЕССИЙ'
        WHEN COUNT(CASE WHEN s.expires_at > NOW() THEN 1 END) = 0 THEN '⚠️ СЕССИИ ИСТЕКЛИ'
        ELSE '✅ СЕССИИ АКТИВНЫ'
    END as session_status
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id
WHERE u.id BETWEEN 191 AND 303
GROUP BY u.id, u.username, u.telegram_id
ORDER BY u.id;

-- ===== ЭТАП 4: ПРОВЕРКА ПОДКЛЮЧЕНИЙ К ТАБЛИЦЕ TON_FARMING_DATA =====
SELECT 
    '=== ПОДКЛЮЧЕНИЯ К ТАБЛИЦЕ TON_FARMING_DATA ===' as section;

SELECT 
    u.id,
    u.username,
    u.ton_boost_active as boost_in_users,
    u.ton_farming_balance as farming_balance_users,
    u.ton_farming_rate as farming_rate_users,
    tfd.user_id as farming_data_user_id,
    tfd.boost_active as boost_in_farming_data,
    tfd.farming_balance as farming_balance_data,
    tfd.farming_rate as farming_rate_data,
    tfd.last_update as farming_last_update,
    
    CASE 
        WHEN u.ton_boost_active = false AND tfd.user_id IS NULL THEN '✅ НЕТ BOOST - ОК'
        WHEN u.ton_boost_active = true AND tfd.user_id IS NOT NULL THEN '✅ BOOST ПОДКЛЮЧЕН'
        WHEN u.ton_boost_active = true AND tfd.user_id IS NULL THEN '❌ BOOST БЕЗ ДАННЫХ'
        WHEN u.ton_boost_active = false AND tfd.user_id IS NOT NULL THEN '⚠️ ДАННЫЕ БЕЗ BOOST'
        ELSE '🤔 НЕОПРЕДЕЛЕННОЕ СОСТОЯНИЕ'
    END as farming_connection_status
    
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.id BETWEEN 191 AND 303
ORDER BY u.id;

-- ===== ЭТАП 5: ПРОВЕРКА ПОДКЛЮЧЕНИЙ К ТАБЛИЦЕ USER_BALANCES =====
SELECT 
    '=== ПОДКЛЮЧЕНИЯ К ТАБЛИЦЕ USER_BALANCES (альтернативное хранение) ===' as section;

SELECT 
    u.id,
    u.username,
    u.balance_uni as uni_in_users,
    u.balance_ton as ton_in_users,
    ub.user_id as has_user_balances_record,
    ub.balance_uni as uni_in_user_balances,
    ub.balance_ton as ton_in_user_balances,
    ub.updated_at as balances_updated_at,
    
    CASE 
        WHEN u.balance_uni IS NOT NULL AND u.balance_uni != '0' AND ub.user_id IS NULL THEN '✅ В USERS (стандарт)'
        WHEN u.balance_uni = '0' AND ub.balance_uni IS NOT NULL AND ub.balance_uni != '0' THEN '⚠️ В USER_BALANCES'
        WHEN u.balance_uni IS NOT NULL AND ub.balance_uni IS NOT NULL THEN '🔄 В ОБЕИХ ТАБЛИЦАХ'
        WHEN u.balance_uni = '0' AND (ub.balance_uni IS NULL OR ub.balance_uni = '0') THEN '⚪ НУЛЕВЫЕ БАЛАНСЫ'
        ELSE '❌ ПРОБЛЕМА С БАЛАНСАМИ'
    END as balance_location_status
    
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.id BETWEEN 191 AND 303
ORDER BY u.id;

-- ===== ЭТАП 6: ПРОВЕРКА ПОДКЛЮЧЕНИЙ К ТАБЛИЦЕ TON_DEPOSITS =====
SELECT 
    '=== ПОДКЛЮЧЕНИЯ К ТАБЛИЦЕ TON_DEPOSITS ===' as section;

SELECT 
    u.id,
    u.username,
    COUNT(td.id) as deposit_count,
    SUM(CASE WHEN td.status = 'confirmed' THEN td.amount::numeric ELSE 0 END) as total_confirmed_deposits,
    SUM(CASE WHEN td.status = 'pending' THEN td.amount::numeric ELSE 0 END) as total_pending_deposits,
    MAX(td.created_at) as last_deposit_date,
    STRING_AGG(DISTINCT td.status, ', ') as deposit_statuses,
    STRING_AGG(DISTINCT td.transaction_hash, ', ') as transaction_hashes,
    CASE 
        WHEN COUNT(td.id) = 0 THEN '⚪ НЕТ ДЕПОЗИТОВ'
        WHEN SUM(CASE WHEN td.status = 'confirmed' THEN 1 ELSE 0 END) > 0 THEN '✅ ЕСТЬ ПОДТВЕРЖДЕННЫЕ'
        ELSE '⚠️ ТОЛЬКО НЕПОДТВЕРЖДЕННЫЕ'
    END as deposit_status
FROM users u
LEFT JOIN ton_deposits td ON u.id = td.user_id
WHERE u.id BETWEEN 191 AND 303
GROUP BY u.id, u.username
ORDER BY u.id;

-- ===== ЭТАП 7: ПРОВЕРКА ПОДКЛЮЧЕНИЙ К ТАБЛИЦЕ WITHDRAWALS =====
SELECT 
    '=== ПОДКЛЮЧЕНИЯ К ТАБЛИЦЕ WITHDRAWALS ===' as section;

SELECT 
    u.id,
    u.username,
    COUNT(w.id) as withdrawal_count,
    SUM(CASE WHEN w.status = 'completed' THEN w.amount::numeric ELSE 0 END) as total_completed_withdrawals,
    SUM(CASE WHEN w.status = 'pending' THEN w.amount::numeric ELSE 0 END) as total_pending_withdrawals,
    MAX(w.created_at) as last_withdrawal_date,
    STRING_AGG(DISTINCT w.status, ', ') as withdrawal_statuses,
    CASE 
        WHEN COUNT(w.id) = 0 THEN '⚪ НЕТ ВЫВОДОВ'
        WHEN SUM(CASE WHEN w.status = 'completed' THEN 1 ELSE 0 END) > 0 THEN '✅ ЕСТЬ ЗАВЕРШЕННЫЕ'
        ELSE '⚠️ ТОЛЬКО НЕЗАВЕРШЕННЫЕ'
    END as withdrawal_status
FROM users u
LEFT JOIN withdrawals w ON u.id = w.user_id
WHERE u.id BETWEEN 191 AND 303
GROUP BY u.id, u.username
ORDER BY u.id;

-- ===== ЭТАП 8: ПРОВЕРКА ПОДКЛЮЧЕНИЙ К ТАБЛИЦЕ REFERRALS =====
SELECT 
    '=== ПОДКЛЮЧЕНИЯ К ТАБЛИЦЕ REFERRALS ===' as section;

-- Рефералы пользователей (кого они пригласили)
SELECT 
    u.id as user_id,
    u.username,
    u.ref_code as user_ref_code,
    COUNT(r.id) as referral_count,
    STRING_AGG(r.referred_user_id::text, ', ') as referred_users,
    SUM(r.commission_earned::numeric) as total_commission_earned,
    MAX(r.created_at) as last_referral_date,
    CASE 
        WHEN COUNT(r.id) = 0 THEN '⚪ НЕТ РЕФЕРАЛОВ'
        ELSE '✅ ЕСТЬ РЕФЕРАЛЫ'
    END as referral_status
FROM users u
LEFT JOIN referrals r ON u.id = r.referrer_user_id
WHERE u.id BETWEEN 191 AND 303
GROUP BY u.id, u.username, u.ref_code
ORDER BY u.id;

-- ===== ЭТАП 9: СВОДНАЯ ТАБЛИЦА ПОДКЛЮЧЕНИЙ =====
SELECT 
    '=== СВОДНАЯ ТАБЛИЦА ВСЕХ ПОДКЛЮЧЕНИЙ ===' as section;

WITH connection_analysis AS (
    SELECT 
        u.id,
        u.username,
        u.ref_code,
        
        -- Подключения к таблицам
        CASE WHEN EXISTS(SELECT 1 FROM transactions WHERE user_id = u.id) THEN 1 ELSE 0 END as has_transactions,
        CASE WHEN EXISTS(SELECT 1 FROM user_sessions WHERE user_id = u.id) THEN 1 ELSE 0 END as has_sessions,
        CASE WHEN u.ton_boost_active = false OR EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 1 ELSE 0 END as farming_connected,
        CASE WHEN EXISTS(SELECT 1 FROM user_balances WHERE user_id = u.id) THEN 1 ELSE 0 END as has_alt_balances,
        CASE WHEN EXISTS(SELECT 1 FROM ton_deposits WHERE user_id = u.id) THEN 1 ELSE 0 END as has_deposits,
        CASE WHEN EXISTS(SELECT 1 FROM withdrawals WHERE user_id = u.id) THEN 1 ELSE 0 END as has_withdrawals,
        CASE WHEN EXISTS(SELECT 1 FROM referrals WHERE referrer_user_id = u.id) THEN 1 ELSE 0 END as has_referrals,
        
        -- Статусы данных
        CASE WHEN u.telegram_id IS NOT NULL AND u.telegram_id != 0 THEN 1 ELSE 0 END as has_telegram_id,
        CASE WHEN u.balance_uni IS NOT NULL AND u.balance_uni != '0' THEN 1 ELSE 0 END as has_uni_balance,
        CASE WHEN u.balance_ton IS NOT NULL AND u.balance_ton != '0' THEN 1 ELSE 0 END as has_ton_balance
        
    FROM users u
    WHERE u.id BETWEEN 191 AND 303
)
SELECT 
    id,
    username,
    ref_code,
    
    -- Подключения к таблицам
    CASE WHEN has_transactions = 1 THEN '✅' ELSE '❌' END as transactions,
    CASE WHEN has_sessions = 1 THEN '✅' ELSE '❌' END as sessions,
    CASE WHEN farming_connected = 1 THEN '✅' ELSE '❌' END as farming_data,
    CASE WHEN has_alt_balances = 1 THEN '⚠️' ELSE '⚪' END as alt_balances,
    CASE WHEN has_deposits = 1 THEN '✅' ELSE '⚪' END as deposits,
    CASE WHEN has_withdrawals = 1 THEN '✅' ELSE '⚪' END as withdrawals,
    CASE WHEN has_referrals = 1 THEN '✅' ELSE '⚪' END as referrals,
    
    -- Основные данные
    CASE WHEN has_telegram_id = 1 THEN '✅' ELSE '❌' END as telegram_id,
    CASE WHEN has_uni_balance = 1 THEN '✅' ELSE '⚪' END as uni_balance,
    CASE WHEN has_ton_balance = 1 THEN '✅' ELSE '⚪' END as ton_balance,
    
    -- Счет проблем (только критические подключения)
    (3 - (has_transactions + has_sessions + farming_connected)) as connection_issues,
    
    -- Общий статус подключений
    CASE 
        WHEN (has_transactions + has_sessions + farming_connected) = 3 THEN '✅ ВСЕ ПОДКЛЮЧЕНО'
        WHEN (has_transactions + has_sessions + farming_connected) = 2 THEN '⚠️ 1 ПРОБЛЕМА'
        WHEN (has_transactions + has_sessions + farming_connected) = 1 THEN '❌ 2 ПРОБЛЕМЫ'
        ELSE '🔴 МНОГО ПРОБЛЕМ'
    END as connection_status
    
FROM connection_analysis
ORDER BY connection_issues DESC, id;

-- ===== ЭТАП 10: ТОЛЬКО ПРОБЛЕМНЫЕ АККАУНТЫ =====
SELECT 
    '=== ТОЛЬКО АККАУНТЫ С ПРОБЛЕМАМИ ПОДКЛЮЧЕНИЙ ===' as section;

WITH problem_accounts AS (
    SELECT 
        u.id,
        u.username,
        u.ref_code,
        
        -- Проверка критических подключений
        CASE WHEN EXISTS(SELECT 1 FROM transactions WHERE user_id = u.id) THEN 0 ELSE 1 END as missing_transactions,
        CASE WHEN EXISTS(SELECT 1 FROM user_sessions WHERE user_id = u.id) THEN 0 ELSE 1 END as missing_sessions,
        CASE WHEN u.ton_boost_active = true AND NOT EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 1 ELSE 0 END as farming_disconnected,
        CASE WHEN u.telegram_id IS NULL OR u.telegram_id = 0 THEN 1 ELSE 0 END as missing_telegram_id
        
    FROM users u
    WHERE u.id BETWEEN 191 AND 303
)
SELECT 
    id,
    username,
    ref_code,
    CASE WHEN missing_transactions = 1 THEN '❌ НЕТ ТРАНЗАКЦИЙ' ELSE '✅' END as transactions_status,
    CASE WHEN missing_sessions = 1 THEN '❌ НЕТ СЕССИЙ' ELSE '✅' END as sessions_status,
    CASE WHEN farming_disconnected = 1 THEN '❌ FARMING НЕ ПОДКЛЮЧЕН' ELSE '✅' END as farming_status,
    CASE WHEN missing_telegram_id = 1 THEN '❌ НЕТ TELEGRAM_ID' ELSE '✅' END as telegram_status,
    (missing_transactions + missing_sessions + farming_disconnected + missing_telegram_id) as total_issues
FROM problem_accounts
WHERE (missing_transactions + missing_sessions + farming_disconnected + missing_telegram_id) > 0
ORDER BY total_issues DESC, id;