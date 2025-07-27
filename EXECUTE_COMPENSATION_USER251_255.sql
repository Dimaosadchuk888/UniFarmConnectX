-- 💰 КОМПЕНСАЦИЯ ПОТЕРЯННЫХ 2 TON ДЛЯ USER 251 И 255
-- Выполняется вручную через Supabase SQL Editor или psql

-- ==================================================
-- ЭТАП 1: СОЗДАНИЕ BACKUP (КРИТИЧНО!)
-- ==================================================

CREATE TABLE compensation_backup_users_251_255_2025_07_27 AS 
SELECT 
    id, 
    username, 
    balance_ton, 
    balance_uni,
    created_at,
    last_active
FROM users 
WHERE id IN (251, 255);

-- Проверяем что backup создался
SELECT 'BACKUP CREATED:' as status, COUNT(*) as users_backed_up 
FROM compensation_backup_users_251_255_2025_07_27;

-- ==================================================
-- ЭТАП 2: ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ
-- ==================================================

SELECT 
    '=== ТЕКУЩИЕ БАЛАНСЫ ПЕРЕД КОМПЕНСАЦИЕЙ ===' as header,
    id as user_id,
    username,
    balance_ton as current_ton_balance,
    balance_uni as current_uni_balance,
    created_at as user_registered
FROM users 
WHERE id IN (251, 255)
ORDER BY id;

-- ==================================================
-- ЭТАП 3: СОЗДАНИЕ КОМПЕНСАЦИОННЫХ ТРАНЗАКЦИЙ
-- ==================================================

-- Компенсация для User 251
INSERT INTO transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    created_at,
    updated_at,
    metadata
) VALUES (
    '251',
    'ADMIN_COMPENSATION',
    2.000000,
    'TON',
    'completed',
    'Admin compensation: Lost deposit restored - 2 TON due to system bug (Date: 2025-07-27)',
    NOW(),
    NOW(),
    jsonb_build_object(
        'admin_action', true,
        'compensation_reason', 'lost_deposit_system_bug',
        'original_lost_amount', '2.0',
        'compensation_date', '2025-07-27',
        'admin_user', 'system_admin',
        'ticket_reference', 'LOST_DEPOSIT_USER251'
    )
);

-- Компенсация для User 255  
INSERT INTO transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    description,
    created_at,
    updated_at,
    metadata
) VALUES (
    '255',
    'ADMIN_COMPENSATION', 
    2.000000,
    'TON',
    'completed',
    'Admin compensation: Lost deposit restored - 2 TON due to system bug (Date: 2025-07-27)',
    NOW(),
    NOW(),
    jsonb_build_object(
        'admin_action', true,
        'compensation_reason', 'lost_deposit_system_bug', 
        'original_lost_amount', '2.0',
        'compensation_date', '2025-07-27',
        'admin_user', 'system_admin',
        'ticket_reference', 'LOST_DEPOSIT_USER255'
    )
);

-- Проверяем что транзакции создались
SELECT 
    '=== СОЗДАННЫЕ КОМПЕНСАЦИОННЫЕ ТРАНЗАКЦИИ ===' as header,
    id as transaction_id,
    user_id,
    type,
    amount,
    currency,
    description,
    created_at
FROM transactions 
WHERE user_id IN ('251', '255') 
    AND type = 'ADMIN_COMPENSATION'
    AND created_at >= CURRENT_DATE
ORDER BY user_id;

-- ==================================================
-- ЭТАП 4: ОБНОВЛЕНИЕ БАЛАНСОВ ПОЛЬЗОВАТЕЛЕЙ
-- ==================================================

-- Обновляем баланс User 251
UPDATE users 
SET 
    balance_ton = balance_ton + 2.000000,
    updated_at = NOW()
WHERE id = 251;

-- Обновляем баланс User 255  
UPDATE users 
SET 
    balance_ton = balance_ton + 2.000000,
    updated_at = NOW()
WHERE id = 255;

-- ==================================================
-- ЭТАП 5: ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ==================================================

-- Проверяем новые балансы
SELECT 
    '=== БАЛАНСЫ ПОСЛЕ КОМПЕНСАЦИИ ===' as header,
    u.id as user_id,
    u.username,
    u.balance_ton as new_ton_balance,
    b.balance_ton as old_ton_balance,
    (u.balance_ton - b.balance_ton) as ton_difference,
    CASE 
        WHEN (u.balance_ton - b.balance_ton) = 2.0 THEN '✅ КОМПЕНСАЦИЯ УСПЕШНА'
        ELSE '❌ ОШИБКА КОМПЕНСАЦИИ'
    END as compensation_status
FROM users u
JOIN compensation_backup_users_251_255_2025_07_27 b ON u.id = b.id
WHERE u.id IN (251, 255)
ORDER BY u.id;

-- Проверяем все транзакции пользователей  
SELECT 
    '=== ВСЕ ТРАНЗАКЦИИ ПОЛЬЗОВАТЕЛЕЙ ===' as header,
    user_id,
    type,
    amount,
    currency,
    LEFT(description, 60) as short_description,
    created_at
FROM transactions 
WHERE user_id IN ('251', '255')
ORDER BY user_id, created_at DESC;

-- ==================================================
-- ЭТАП 6: ИТОГОВЫЙ ОТЧЕТ
-- ==================================================

SELECT 
    '=== ИТОГОВЫЙ ОТЧЕТ КОМПЕНСАЦИИ ===' as header,
    COUNT(CASE WHEN user_id = '251' THEN 1 END) as user_251_transactions,
    COUNT(CASE WHEN user_id = '255' THEN 1 END) as user_255_transactions,
    SUM(amount) as total_compensated_ton,
    MIN(created_at) as first_compensation,
    MAX(created_at) as last_compensation
FROM transactions 
WHERE user_id IN ('251', '255') 
    AND type = 'ADMIN_COMPENSATION'
    AND created_at >= CURRENT_DATE;

-- ==================================================
-- ЭТАП 7: СОЗДАНИЕ ЛОГА ОПЕРАЦИИ
-- ==================================================

-- Создаем таблицу логов если не существует
CREATE TABLE IF NOT EXISTS admin_operations_log (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(100),
    affected_users TEXT[],
    operation_details JSONB,
    executed_by VARCHAR(50),
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Логируем выполненную операцию
INSERT INTO admin_operations_log (
    operation_type,
    affected_users,
    operation_details,
    executed_by
) VALUES (
    'MANUAL_BALANCE_COMPENSATION',
    ARRAY['251', '255'],
    jsonb_build_object(
        'reason', 'Lost deposits due to system bugs',
        'amount_per_user', '2.0 TON',
        'total_compensated', '4.0 TON',
        'backup_table', 'compensation_backup_users_251_255_2025_07_27',
        'compensation_date', CURRENT_DATE,
        'users_affected', 2
    ),
    'admin_manual'
);

-- ==================================================
-- ФИНАЛЬНАЯ ПРОВЕРКА
-- ==================================================

SELECT 
    '🎯 ОПЕРАЦИЯ ЗАВЕРШЕНА' as status,
    'User 251 и 255 получили по 2 TON компенсации' as result,
    'Backup создан в таблице: compensation_backup_users_251_255_2025_07_27' as backup_info;

-- ИНСТРУКЦИИ ДЛЯ ВЫПОЛНЕНИЯ:
-- 1. Скопируйте этот SQL в Supabase SQL Editor
-- 2. Выполните по частям (по этапам) 
-- 3. Проверяйте результат после каждого этапа
-- 4. Сохраните итоговый отчет
-- 5. Уведомите пользователей о восстановлении средств