-- 🔍 ЖИВАЯ ДИАГНОСТИКА АККАУНТОВ 291-303 VS USER ID 25
-- Дата: 31.07.2025
-- Цель: Выявить точные различия с эталоном

-- ===== ЭТАП 1: ОСНОВНАЯ ИНФОРМАЦИЯ =====
SELECT 
    '=== ОСНОВНАЯ ИНФОРМАЦИЯ АККАУНТОВ 291-303 VS USER ID 25 ===' as section;

SELECT 
    id,
    telegram_id,
    username,
    first_name,
    ref_code,
    parent_ref_code,
    balance_uni,
    balance_ton,
    ton_farming_balance,
    ton_farming_rate,
    ton_boost_active,
    ton_boost_package,
    is_admin,
    created_at,
    
    -- Статусы критических полей
    CASE WHEN telegram_id IS NOT NULL AND telegram_id != 0 THEN '✅' ELSE '❌' END as has_telegram_id,
    CASE WHEN ref_code IS NOT NULL AND ref_code != '' THEN '✅' ELSE '❌' END as has_ref_code,
    CASE WHEN balance_uni IS NOT NULL AND balance_uni != '0' THEN '✅' ELSE '⚠️' END as has_uni_balance,
    CASE WHEN balance_ton IS NOT NULL AND balance_ton != '0' THEN '✅' ELSE '⚠️' END as has_ton_balance,
    
    -- Сравнение с эталоном
    CASE WHEN id = 25 THEN '🏆 ЭТАЛОН' ELSE 'ПРОВЕРЯЕМЫЙ' END as account_type
    
FROM users 
WHERE id = 25 OR (id BETWEEN 291 AND 303)
ORDER BY CASE WHEN id = 25 THEN 0 ELSE 1 END, id;

-- ===== ЭТАП 2: ПРОВЕРКА ТРАНЗАКЦИЙ =====
SELECT 
    '=== ПРОВЕРКА ТРАНЗАКЦИЙ (критично для BalanceManager) ===' as section;

SELECT 
    u.id,
    u.username,
    COUNT(t.id) as transaction_count,
    CASE 
        WHEN COUNT(t.id) > 0 THEN '✅ Есть транзакции'
        ELSE '❌ НЕТ ТРАНЗАКЦИЙ'
    END as transaction_status,
    MIN(t.created_at) as first_transaction,
    MAX(t.created_at) as last_transaction,
    STRING_AGG(DISTINCT t.transaction_type, ', ') as transaction_types,
    CASE WHEN u.id = 25 THEN '🏆 ЭТАЛОН' ELSE 'ПРОВЕРЯЕМЫЙ' END as account_type
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE u.id = 25 OR (u.id BETWEEN 291 AND 303)
GROUP BY u.id, u.username
ORDER BY CASE WHEN u.id = 25 THEN 0 ELSE 1 END, u.id;

-- ===== ЭТАП 3: ПРОВЕРКА ПОЛЬЗОВАТЕЛЬСКИХ СЕССИЙ =====
SELECT 
    '=== ПРОВЕРКА USER SESSIONS (критично для аутентификации) ===' as section;

SELECT 
    u.id,
    u.username,
    COUNT(s.id) as session_count,
    MAX(s.created_at) as last_session_created,
    MAX(s.last_activity) as last_activity,
    COUNT(CASE WHEN s.expires_at > NOW() THEN 1 END) as active_sessions,
    CASE 
        WHEN COUNT(s.id) > 0 THEN '✅ Есть сессии'
        ELSE '❌ НЕТ СЕССИЙ'
    END as session_status,
    CASE WHEN u.id = 25 THEN '🏆 ЭТАЛОН' ELSE 'ПРОВЕРЯЕМЫЙ' END as account_type
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id
WHERE u.id = 25 OR (u.id BETWEEN 291 AND 303)
GROUP BY u.id, u.username
ORDER BY CASE WHEN u.id = 25 THEN 0 ELSE 1 END, u.id;

-- ===== ЭТАП 4: ПРОВЕРКА TON FARMING СИНХРОНИЗАЦИИ =====
SELECT 
    '=== ПРОВЕРКА TON BOOST СИНХРОНИЗАЦИИ ===' as section;

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
    
    CASE 
        WHEN u.ton_boost_active = true AND tfd.user_id IS NULL THEN '❌ BOOST БЕЗ ДАННЫХ'
        WHEN u.ton_boost_active = false AND tfd.user_id IS NOT NULL THEN '⚠️ ДАННЫЕ БЕЗ BOOST'
        WHEN u.ton_boost_active = true AND tfd.user_id IS NOT NULL THEN '✅ СИНХРОНИЗИРОВАНО'
        ELSE '✅ НЕТ BOOST'
    END as sync_status,
    CASE WHEN u.id = 25 THEN '🏆 ЭТАЛОН' ELSE 'ПРОВЕРЯЕМЫЙ' END as account_type
    
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.id = 25 OR (u.id BETWEEN 291 AND 303)
ORDER BY CASE WHEN u.id = 25 THEN 0 ELSE 1 END, u.id;

-- ===== ЭТАП 5: ПРОВЕРКА РАСПОЛОЖЕНИЯ БАЛАНСОВ =====
SELECT 
    '=== ПРОВЕРКА РАСПОЛОЖЕНИЯ БАЛАНСОВ ===' as section;

SELECT 
    u.id,
    u.username,
    u.balance_uni as uni_in_users,
    u.balance_ton as ton_in_users,
    ub.balance_uni as uni_in_user_balances,
    ub.balance_ton as ton_in_user_balances,
    
    CASE 
        WHEN u.balance_uni IS NOT NULL AND u.balance_uni != '0' THEN '✅ В USERS (как эталон)'
        WHEN ub.balance_uni IS NOT NULL AND ub.balance_uni != '0' THEN '⚠️ В USER_BALANCES'
        ELSE '❌ НЕТ БАЛАНСОВ'
    END as balance_location,
    CASE WHEN u.id = 25 THEN '🏆 ЭТАЛОН' ELSE 'ПРОВЕРЯЕМЫЙ' END as account_type
    
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.id = 25 OR (u.id BETWEEN 291 AND 303)
ORDER BY CASE WHEN u.id = 25 THEN 0 ELSE 1 END, u.id;

-- ===== ЭТАП 6: СВОДНАЯ ТАБЛИЦА ПРОБЛЕМ =====
SELECT 
    '=== СВОДНАЯ ТАБЛИЦА ПРОБЛЕМ ПО АККАУНТАМ ===' as section;

WITH account_analysis AS (
    SELECT 
        u.id,
        u.username,
        
        -- Критические проверки
        CASE WHEN u.telegram_id IS NOT NULL AND u.telegram_id != 0 THEN 1 ELSE 0 END as has_telegram_id,
        CASE WHEN u.ref_code IS NOT NULL AND u.ref_code != '' THEN 1 ELSE 0 END as has_ref_code,
        CASE WHEN EXISTS(SELECT 1 FROM transactions WHERE user_id = u.id) THEN 1 ELSE 0 END as has_transactions,
        CASE WHEN EXISTS(SELECT 1 FROM user_sessions WHERE user_id = u.id) THEN 1 ELSE 0 END as has_sessions,
        CASE WHEN u.ton_boost_active = false OR EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 1 ELSE 0 END as ton_boost_consistent,
        CASE WHEN u.balance_uni IS NOT NULL AND u.balance_uni != '0' THEN 1 ELSE 0 END as has_balances_in_users
        
    FROM users u
    WHERE u.id = 25 OR (u.id BETWEEN 291 AND 303)
)
SELECT 
    id,
    username,
    has_telegram_id,
    has_ref_code,
    has_transactions,
    has_sessions,
    ton_boost_consistent,
    has_balances_in_users,
    
    -- Общий счет проблем
    (6 - (has_telegram_id + has_ref_code + has_transactions + has_sessions + ton_boost_consistent + has_balances_in_users)) as problems_count,
    
    -- Статус аккаунта
    CASE 
        WHEN (has_telegram_id + has_ref_code + has_transactions + has_sessions + ton_boost_consistent + has_balances_in_users) = 6 THEN '✅ ИДЕАЛЬНО'
        WHEN (has_telegram_id + has_ref_code + has_transactions + has_sessions + ton_boost_consistent + has_balances_in_users) >= 4 THEN '🟢 ХОРОШО'
        WHEN (has_telegram_id + has_ref_code + has_transactions + has_sessions + ton_boost_consistent + has_balances_in_users) >= 2 THEN '🟡 ЕСТЬ ПРОБЛЕМЫ'
        ELSE '🔴 ТРЕБУЕТ ИСПРАВЛЕНИЯ'
    END as overall_status,
    
    CASE WHEN id = 25 THEN '🏆 ЭТАЛОН' ELSE 'ПРОВЕРЯЕМЫЙ' END as account_type
    
FROM account_analysis
ORDER BY CASE WHEN id = 25 THEN 0 ELSE 1 END, problems_count DESC, id;

-- ===== ЭТАП 7: СПИСОК КОНКРЕТНЫХ ИСПРАВЛЕНИЙ =====
SELECT 
    '=== ПЛАН ИСПРАВЛЕНИЙ ДЛЯ ПРОБЛЕМНЫХ АККАУНТОВ ===' as section;

-- Аккаунты без ref_code
SELECT 
    'MISSING_REF_CODE' as issue_type,
    id,
    username,
    'UPDATE users SET ref_code = ''REF_'' || EXTRACT(EPOCH FROM NOW())::bigint || ''_'' || SUBSTRING(MD5(RANDOM()::text), 1, 6) WHERE id = ' || id || ';' as fix_sql
FROM users 
WHERE (id BETWEEN 291 AND 303) 
    AND (ref_code IS NULL OR ref_code = '')

UNION ALL

-- Аккаунты без транзакций
SELECT 
    'MISSING_TRANSACTIONS' as issue_type,
    u.id,
    u.username,
    'INSERT INTO transactions (user_id, transaction_type, currency, amount, status, description) VALUES (' || u.id || ', ''SYSTEM_INIT'', ''UNI'', ''0.01'', ''confirmed'', ''Техническая инициализация'');' as fix_sql
FROM users u
WHERE (u.id BETWEEN 291 AND 303)
    AND NOT EXISTS(SELECT 1 FROM transactions WHERE user_id = u.id)

UNION ALL

-- Аккаунты без сессий
SELECT 
    'MISSING_SESSIONS' as issue_type,
    u.id,
    u.username,
    'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (' || u.id || ', ''tech_'' || ' || u.id || ' || ''_'' || EXTRACT(EPOCH FROM NOW())::bigint, NOW() + INTERVAL ''30 days'');' as fix_sql
FROM users u
WHERE (u.id BETWEEN 291 AND 303)
    AND u.telegram_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM user_sessions WHERE user_id = u.id)

UNION ALL

-- TON Boost не синхронизирован
SELECT 
    'TON_BOOST_NOT_SYNCED' as issue_type,
    u.id,
    u.username,
    'INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active) VALUES (''' || u.id || ''', ''0'', ''0.000000231'', ' || u.ton_boost_active || ');' as fix_sql
FROM users u
WHERE (u.id BETWEEN 291 AND 303)
    AND u.ton_boost_active = true
    AND NOT EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text)

ORDER BY issue_type, id;