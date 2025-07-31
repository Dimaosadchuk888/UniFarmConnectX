-- 🛠️ БЕЗОПАСНЫЙ СКРИПТ УНИФИКАЦИИ АККАУНТОВ
-- Дата: 31.07.2025
-- Эталон: User ID 25 (НЕ ИЗМЕНЯЕТСЯ)
-- Цель: Привести все аккаунты к единой структуре

-- ⚠️ ВАЖНО: ВЫПОЛНЯТЬ ПОШАГОВО С ПРОВЕРКАМИ!

-- =============================================================================
-- ЭТАП 1: СОЗДАНИЕ BACKUP И ДИАГНОСТИЧЕСКИХ ПРЕДСТАВЛЕНИЙ
-- =============================================================================

-- 1.1 Полный backup критически важных таблиц
CREATE TABLE users_backup_unification_2025_07_31 AS 
SELECT * FROM users;

CREATE TABLE transactions_backup_unification_2025_07_31 AS 
SELECT * FROM transactions;

CREATE TABLE ton_farming_data_backup_unification_2025_07_31 AS 
SELECT * FROM ton_farming_data;

-- 1.2 Диагностическое представление для мониторинга
CREATE OR REPLACE VIEW account_health_status AS
SELECT 
    u.id,
    u.username,
    u.telegram_id,
    u.created_at,
    
    -- Критические поля
    CASE WHEN u.telegram_id IS NULL THEN 'CRITICAL' ELSE 'OK' END as telegram_id_status,
    CASE WHEN u.ref_code IS NULL OR u.ref_code = '' THEN 'CRITICAL' ELSE 'OK' END as ref_code_status,
    CASE WHEN u.username IS NULL THEN 'WARNING' ELSE 'OK' END as username_status,
    CASE WHEN u.first_name IS NULL THEN 'WARNING' ELSE 'OK' END as firstname_status,
    
    -- Балансы
    CASE WHEN u.balance_uni IS NULL OR u.balance_uni::numeric = 0 THEN 'WARNING' ELSE 'OK' END as uni_balance_status,
    CASE WHEN u.balance_ton IS NULL OR u.balance_ton::numeric = 0 THEN 'WARNING' ELSE 'OK' END as ton_balance_status,
    
    -- Связанные данные
    CASE WHEN trans.user_id IS NULL THEN 'MISSING' ELSE 'OK' END as transactions_status,
    CASE WHEN u.ton_boost_active = true AND tfd.user_id IS NULL THEN 'INCONSISTENT' ELSE 'OK' END as farming_data_status,
    
    -- Общая оценка здоровья аккаунта
    CASE 
        WHEN u.telegram_id IS NULL THEN 'BROKEN'
        WHEN u.ref_code IS NULL OR u.ref_code = '' THEN 'BROKEN'
        WHEN trans.user_id IS NULL THEN 'ISSUES'
        WHEN u.ton_boost_active = true AND tfd.user_id IS NULL THEN 'ISSUES'
        WHEN u.balance_uni IS NULL OR u.balance_uni::numeric = 0 THEN 'NEEDS_ATTENTION'
        WHEN u.balance_ton IS NULL OR u.balance_ton::numeric = 0 THEN 'NEEDS_ATTENTION'
        ELSE 'HEALTHY'
    END as overall_health,
    
    -- Эталонный статус
    CASE WHEN u.id = 25 THEN 'REFERENCE_USER' ELSE 'REGULAR_USER' END as user_type
    
FROM users u
LEFT JOIN (SELECT DISTINCT user_id FROM transactions) trans ON u.id = trans.user_id
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id;

-- 1.3 Статистика до миграции
SELECT 'СТАТИСТИКА ДО УНИФИКАЦИИ:' as info;
SELECT 
    overall_health, 
    COUNT(*) as count, 
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM account_health_status 
GROUP BY overall_health 
ORDER BY count DESC;

-- 1.4 Детальный список проблемных аккаунтов
SELECT 'ПРОБЛЕМНЫЕ АККАУНТЫ:' as info;
SELECT id, username, overall_health, telegram_id_status, ref_code_status, 
       transactions_status, farming_data_status, created_at
FROM account_health_status 
WHERE overall_health IN ('BROKEN', 'ISSUES', 'NEEDS_ATTENTION')
AND user_type != 'REFERENCE_USER'
ORDER BY 
    CASE overall_health 
        WHEN 'BROKEN' THEN 1 
        WHEN 'ISSUES' THEN 2 
        WHEN 'NEEDS_ATTENTION' THEN 3 
    END, 
    id;

-- =============================================================================
-- ЭТАП 2: БЕЗОПАСНАЯ УНИФИКАЦИЯ (НЕ ЗАТРАГИВАЕТ USER ID 25)
-- =============================================================================

BEGIN;

-- 2.1 Исправление критических полей ref_code
UPDATE users 
SET ref_code = 'REF' || LPAD(id::text, 6, '0')
WHERE (ref_code IS NULL OR ref_code = '') 
AND id != 25 -- НЕ ТРОГАЕМ ЭТАЛОН
AND telegram_id IS NOT NULL; -- Только для пользователей с telegram_id

SELECT 'ref_code исправлено для пользователей:' as info, COUNT(*) as count
FROM users 
WHERE ref_code LIKE 'REF%' AND LENGTH(ref_code) = 9;

-- 2.2 Инициализация минимальных балансов
UPDATE users 
SET balance_uni = COALESCE(balance_uni, '0.01'),
    balance_ton = COALESCE(balance_ton, '0.01')
WHERE (balance_uni IS NULL OR balance_ton IS NULL)
AND id != 25 -- НЕ ТРОГАЕМ ЭТАЛОН
AND telegram_id IS NOT NULL;

SELECT 'Балансы инициализированы для пользователей:' as info, COUNT(*) as count
FROM users 
WHERE balance_uni::numeric >= 0.01 AND balance_ton::numeric >= 0.01;

-- 2.3 Создание базовых транзакций для пользователей без истории
INSERT INTO transactions (
    user_id, 
    transaction_type, 
    currency, 
    amount, 
    status, 
    description, 
    created_at,
    data
)
SELECT 
    u.id,
    'SYSTEM_INITIALIZATION',
    'UNI',
    '0.01',
    'confirmed',
    'System initialization - account unification',
    NOW(),
    '{"migration": "unification_2025_07_31", "reason": "missing_transactions", "reference_user": 25}'
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE t.user_id IS NULL
AND u.id != 25 -- НЕ ТРОГАЕМ ЭТАЛОН
AND u.telegram_id IS NOT NULL;

SELECT 'Базовые транзакции созданы для пользователей:' as info, COUNT(*) as count
FROM transactions 
WHERE transaction_type = 'SYSTEM_INITIALIZATION' 
AND description LIKE '%unification%';

-- 2.4 Создание ton_farming_data для пользователей с активным TON Boost
INSERT INTO ton_farming_data (
    user_id, 
    farming_balance, 
    farming_rate, 
    boost_active, 
    last_update,
    created_at
)
SELECT 
    u.id,
    0.0,
    0.0,
    false,
    NOW(),
    NOW()
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id
WHERE u.ton_boost_active = true 
AND tfd.user_id IS NULL
AND u.id != 25 -- НЕ ТРОГАЕМ ЭТАЛОН
AND u.telegram_id IS NOT NULL;

SELECT 'ton_farming_data созданы для пользователей:' as info, COUNT(*) as count
FROM ton_farming_data tfd
JOIN users u ON tfd.user_id = u.id
WHERE tfd.created_at >= CURRENT_DATE;

-- 2.5 Синхронизация TON Boost статусов
UPDATE users 
SET ton_boost_active = false,
    ton_boost_package = NULL,
    ton_boost_rate = NULL
WHERE id IN (
    SELECT u.id 
    FROM users u 
    LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
    WHERE u.ton_boost_active = true 
    AND (tfd.user_id IS NULL OR tfd.boost_active = false)
)
AND id != 25 -- НЕ ТРОГАЕМ ЭТАЛОН
AND telegram_id IS NOT NULL;

-- =============================================================================
-- ЭТАП 3: ПРОВЕРКИ ПОСЛЕ УНИФИКАЦИИ
-- =============================================================================

-- 3.1 Статистика после миграции
SELECT 'СТАТИСТИКА ПОСЛЕ УНИФИКАЦИИ:' as info;
SELECT 
    overall_health, 
    COUNT(*) as count, 
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM account_health_status 
GROUP BY overall_health 
ORDER BY count DESC;

-- 3.2 Проверка критических аккаунтов
SELECT 'КРИТИЧЕСКИЕ АККАУНТЫ ПОСЛЕ МИГРАЦИИ:' as info;
SELECT COUNT(*) as broken_accounts_count
FROM account_health_status 
WHERE overall_health = 'BROKEN'
AND user_type != 'REFERENCE_USER';

-- 3.3 Проверка пользователей без транзакций
SELECT 'ПОЛЬЗОВАТЕЛИ БЕЗ ТРАНЗАКЦИЙ:' as info;
SELECT COUNT(*) as users_without_transactions
FROM users u 
LEFT JOIN transactions t ON u.id = t.user_id 
WHERE t.user_id IS NULL
AND u.id != 25
AND u.telegram_id IS NOT NULL;

-- 3.4 Проверка TON Boost несоответствий
SELECT 'TON BOOST НЕСООТВЕТСТВИЯ:' as info;
SELECT COUNT(*) as boost_inconsistencies
FROM users u 
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
WHERE u.ton_boost_active != COALESCE(tfd.boost_active, false)
AND u.id != 25;

-- 3.5 Проверка эталонного пользователя
SELECT 'ПРОВЕРКА ЭТАЛОНА (User ID 25):' as info;
SELECT overall_health, user_type
FROM account_health_status 
WHERE id = 25;

-- =============================================================================
-- ЭТАП 4: ФИНАЛИЗАЦИЯ
-- =============================================================================

-- 4.1 Если все проверки прошли успешно:
-- COMMIT;

-- 4.2 Если есть проблемы:
-- ROLLBACK;

-- 4.3 Создание отчета об унификации
CREATE TABLE unification_report_2025_07_31 AS
SELECT 
    'ACCOUNT_UNIFICATION' as migration_type,
    NOW() as completed_at,
    (SELECT COUNT(*) FROM users WHERE id != 25) as total_accounts_processed,
    (SELECT COUNT(*) FROM account_health_status WHERE overall_health = 'HEALTHY' AND user_type != 'REFERENCE_USER') as healthy_accounts,
    (SELECT COUNT(*) FROM account_health_status WHERE overall_health = 'BROKEN' AND user_type != 'REFERENCE_USER') as broken_accounts,
    (SELECT COUNT(*) FROM transactions WHERE transaction_type = 'SYSTEM_INITIALIZATION' AND created_at >= CURRENT_DATE) as transactions_created,
    'User ID 25 not modified (reference user)' as notes;

-- =============================================================================
-- ЭТАП 5: СКРИПТ ОТКАТА (В СЛУЧАЕ НЕОБХОДИМОСТИ)
-- =============================================================================

/*
-- ПОЛНЫЙ ОТКАТ УНИФИКАЦИИ:

BEGIN;

-- Восстановление users
DROP TABLE IF EXISTS users;
ALTER TABLE users_backup_unification_2025_07_31 RENAME TO users;

-- Восстановление transactions  
DELETE FROM transactions 
WHERE transaction_type = 'SYSTEM_INITIALIZATION' 
AND description LIKE '%unification%';

-- Удаление добавленных ton_farming_data
DELETE FROM ton_farming_data 
WHERE created_at >= '2025-07-31'::date;

COMMIT;

-- Проверка отката
SELECT 'ОТКАТ ЗАВЕРШЕН' as status;
*/

-- =============================================================================
-- МОНИТОРИНГ ПОСЛЕ УНИФИКАЦИИ
-- =============================================================================

-- Запрос для ежедневного мониторинга новых проблемных аккаунтов
CREATE OR REPLACE VIEW daily_account_monitoring AS
SELECT 
    id, username, overall_health, created_at,
    telegram_id_status, ref_code_status, transactions_status
FROM account_health_status 
WHERE overall_health IN ('BROKEN', 'ISSUES')
AND user_type != 'REFERENCE_USER'
AND created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC;

SELECT 'СКРИПТ УНИФИКАЦИИ ПОДГОТОВЛЕН' as status;
SELECT 'ВЫПОЛНЯТЬ ПОШАГОВО С ПРОВЕРКАМИ!' as warning;