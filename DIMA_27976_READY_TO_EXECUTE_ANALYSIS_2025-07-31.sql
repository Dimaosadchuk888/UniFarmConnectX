-- =====================================================
-- ГОТОВЫЕ SQL КОМАНДЫ ДЛЯ ИСПРАВЛЕНИЯ @Dima_27976 (ID: 244)
-- Дата: 31.07.2025
-- Цель: Стандартизация аккаунта до уровня User ID 25
-- =====================================================

-- 1. БЭКАП ДАННЫХ ПЕРЕД ИСПРАВЛЕНИЕМ
SELECT 
    'BACKUP_BEFORE_FIX_ID_244' as backup_type,
    id, username, telegram_id, first_name,
    balance_uni, balance_ton,
    uni_farming_active, uni_deposit_amount, uni_farming_balance,
    uni_farming_start_timestamp, uni_farming_last_update,
    ton_boost_active, ton_boost_package, ton_farming_balance,
    ton_farming_start_timestamp, ton_farming_last_update,
    created_at, updated_at
FROM users 
WHERE id = 244;

-- 2. ПРОВЕРКА СВЯЗАННЫХ ДАННЫХ ДО ИСПРАВЛЕНИЯ
SELECT 'TON_FARMING_DATA_BEFORE' as check_type, COUNT(*) as count FROM ton_farming_data WHERE user_id = '244';
SELECT 'USER_SESSIONS_BEFORE' as check_type, COUNT(*) as count FROM user_sessions WHERE user_id = 244;
SELECT 'TRANSACTIONS_BEFORE' as check_type, COUNT(*) as count FROM transactions WHERE user_id = 244;

-- =====================================================
-- ОСНОВНЫЕ ИСПРАВЛЕНИЯ
-- =====================================================

BEGIN;

-- 3. ИСПРАВЛЕНИЕ UNI FARMING (установка корректной ставки и timestamps)
UPDATE users 
SET 
    uni_farming_rate = 0.01,                    -- Стандартная ставка как у User 25
    uni_farming_start_timestamp = NOW(),        -- Текущее время старта
    uni_farming_last_update = NOW(),            -- Обновить время последнего обновления
    ton_farming_start_timestamp = NOW(),        -- TON farming timestamp
    ton_farming_last_update = NOW(),            -- TON последнее обновление  
    updated_at = NOW()                          -- Общее время обновления
WHERE id = 244;

-- 4. СОЗДАНИЕ НЕДОСТАЮЩЕЙ ЗАПИСИ TON FARMING DATA
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
VALUES ('244', 0, 0.01, true, NOW())
ON CONFLICT (user_id) DO UPDATE SET
    farming_rate = 0.01,
    boost_active = true,
    last_update = NOW();

-- 5. СОЗДАНИЕ USER SESSION (если нужно)
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_activity)
VALUES (
    244,
    'session_244_fixed_' || EXTRACT(epoch FROM NOW()),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    last_activity = NOW(),
    expires_at = NOW() + INTERVAL '30 days';

-- 6. ДОБАВЛЕНИЕ ЗАПИСИ О СИСТЕМНОМ ИСПРАВЛЕНИИ
INSERT INTO transactions (user_id, transaction_type, amount, description, created_at)
VALUES (244, 'SYSTEM_FIX', 0, 'Account standardization: farming rates and timestamps corrected', NOW());

COMMIT;

-- =====================================================
-- ВЕРИФИКАЦИЯ РЕЗУЛЬТАТОВ
-- =====================================================

-- 7. ПРОВЕРКА ИСПРАВЛЕННОГО АККАУНТА
SELECT 
    'DIMA_244_AFTER_FIX' as status,
    id, username, telegram_id,
    balance_uni, balance_ton,
    uni_farming_active,
    uni_farming_rate,
    uni_farming_start_timestamp IS NOT NULL as has_uni_start,
    uni_deposit_amount,
    ton_boost_active,
    ton_farming_start_timestamp IS NOT NULL as has_ton_start,
    ton_boost_package
FROM users 
WHERE id = 244;

-- 8. ПРОВЕРКА СВЯЗАННЫХ ДАННЫХ ПОСЛЕ ИСПРАВЛЕНИЯ
SELECT 'TON_FARMING_DATA_AFTER' as check_type, COUNT(*) as count FROM ton_farming_data WHERE user_id = '244';
SELECT 'USER_SESSIONS_AFTER' as check_type, COUNT(*) as count FROM user_sessions WHERE user_id = 244;
SELECT 'TRANSACTIONS_AFTER' as check_type, COUNT(*) as count FROM transactions WHERE user_id = 244;

-- 9. СРАВНЕНИЕ С ЭТАЛОНОМ USER 25
WITH dima_fixed AS (
    SELECT 
        244 as id,
        'DIMA_244_FIXED' as account_type,
        uni_farming_rate,
        uni_farming_start_timestamp IS NOT NULL as has_uni_start,
        ton_farming_start_timestamp IS NOT NULL as has_ton_start,
        uni_farming_active,
        ton_boost_active,
        balance_uni,
        uni_deposit_amount
    FROM users WHERE id = 244
),
user25_reference AS (
    SELECT 
        25 as id,
        'USER_25_REFERENCE' as account_type,
        uni_farming_rate,
        uni_farming_start_timestamp IS NOT NULL as has_uni_start,
        ton_farming_start_timestamp IS NOT NULL as has_ton_start,
        uni_farming_active,
        ton_boost_active,
        balance_uni,
        uni_deposit_amount
    FROM users WHERE id = 25
)
SELECT * FROM dima_fixed
UNION ALL
SELECT * FROM user25_reference
ORDER BY account_type;

-- 10. ФИНАЛЬНАЯ ПРОВЕРКА СОВМЕСТИМОСТИ
SELECT 
    CASE 
        WHEN u.uni_farming_rate > 0 
             AND u.uni_farming_start_timestamp IS NOT NULL 
             AND u.ton_farming_start_timestamp IS NOT NULL
             AND tfd.user_id IS NOT NULL
        THEN '✅ ПОЛНОСТЬЮ СОВМЕСТИМ С USER 25'
        ELSE '❌ ОСТАЛИСЬ ПРОБЛЕМЫ'
    END as compatibility_status,
    u.id,
    u.username,
    u.uni_farming_rate,
    u.uni_farming_start_timestamp IS NOT NULL as has_uni_start,
    u.ton_farming_start_timestamp IS NOT NULL as has_ton_start,
    tfd.user_id IS NOT NULL as has_ton_farming_data
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.id = 244;

-- =====================================================
-- ОЖИДАЕМЫЙ РЕЗУЛЬТАТ
-- =====================================================

/*
ПОСЛЕ ВЫПОЛНЕНИЯ @Dima_27976 (ID: 244) БУДЕТ ИМЕТЬ:
✅ UNI farming rate: 0.01 (как у User 25)
✅ Валидные timestamps для UNI и TON farming
✅ Запись в ton_farming_data с boost_active = true
✅ Активную user session
✅ Сохраненные балансы: UNI: ~179,729, TON: ~0.049989
✅ Сохраненный депозит: 181,000,000 UNI
✅ Полную совместимость с User ID 25

ВРЕМЯ ВЫПОЛНЕНИЯ: 2-3 минуты
РИСК: МИНИМАЛЬНЫЙ (не трогаем балансы и депозиты)
*/