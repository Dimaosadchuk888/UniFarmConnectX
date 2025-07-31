-- =====================================================
-- ИСПРАВЛЕНИЕ ТОЛЬКО TON BOOST ДЛЯ @Dima_27976 (ID: 244)
-- Дата: 31.07.2025
-- Проблемы: НЕТ ton_farming_start_timestamp, НЕТ ton_farming_data записи
-- =====================================================

-- 1. ПРОВЕРКА ТЕКУЩЕГО СОСТОЯНИЯ TON BOOST
SELECT 
    'TON_BOOST_BEFORE_FIX' as status,
    id, username,
    ton_boost_active,
    ton_boost_package, 
    ton_farming_balance,
    ton_farming_start_timestamp,
    ton_farming_last_update
FROM users 
WHERE id = 244;

-- Проверка ton_farming_data ДО исправления
SELECT 'TON_FARMING_DATA_BEFORE' as check_type, COUNT(*) as count 
FROM ton_farming_data WHERE user_id = '244';

-- =====================================================
-- ИСПРАВЛЕНИЕ TON BOOST
-- =====================================================

BEGIN;

-- 2. ДОБАВЛЕНИЕ TON FARMING TIMESTAMP
UPDATE users 
SET 
    ton_farming_start_timestamp = NOW(),
    ton_farming_last_update = NOW()
WHERE id = 244;

-- 3. СОЗДАНИЕ ЗАПИСИ TON FARMING DATA (как у User 25)
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
VALUES ('244', 0, 0.01, true, NOW())
ON CONFLICT (user_id) DO UPDATE SET
    farming_rate = 0.01,
    boost_active = true,
    last_update = NOW();

COMMIT;

-- =====================================================
-- ВЕРИФИКАЦИЯ TON BOOST ИСПРАВЛЕНИЯ
-- =====================================================

-- 4. ПРОВЕРКА ПОСЛЕ ИСПРАВЛЕНИЯ
SELECT 
    'TON_BOOST_AFTER_FIX' as status,
    id, username,
    ton_boost_active,
    ton_boost_package,
    ton_farming_balance,
    ton_farming_start_timestamp IS NOT NULL as has_ton_start,
    ton_farming_last_update IS NOT NULL as has_ton_update
FROM users 
WHERE id = 244;

-- Проверка ton_farming_data ПОСЛЕ исправления
SELECT 'TON_FARMING_DATA_AFTER' as check_type, COUNT(*) as count 
FROM ton_farming_data WHERE user_id = '244';

-- Показать созданную запись
SELECT 
    user_id,
    farming_balance,
    farming_rate,
    boost_active,
    last_update
FROM ton_farming_data 
WHERE user_id = '244';

-- 5. СРАВНЕНИЕ С USER 25 TON BOOST
WITH dima_ton AS (
    SELECT 
        244 as id,
        'DIMA_244_TON_FIXED' as account_type,
        u.ton_boost_active,
        u.ton_boost_package,
        u.ton_farming_start_timestamp IS NOT NULL as has_ton_start,
        tfd.farming_rate,
        tfd.boost_active as ton_data_boost_active
    FROM users u
    LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
    WHERE u.id = 244
),
user25_ton AS (
    SELECT 
        25 as id,
        'USER_25_TON_REFERENCE' as account_type,
        u.ton_boost_active,
        u.ton_boost_package,
        u.ton_farming_start_timestamp IS NOT NULL as has_ton_start,
        tfd.farming_rate,
        tfd.boost_active as ton_data_boost_active
    FROM users u
    LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
    WHERE u.id = 25
)
SELECT * FROM dima_ton
UNION ALL
SELECT * FROM user25_ton
ORDER BY account_type;

-- 6. ФИНАЛЬНАЯ ПРОВЕРКА TON BOOST СОВМЕСТИМОСТИ
SELECT 
    CASE 
        WHEN u.ton_farming_start_timestamp IS NOT NULL 
             AND tfd.user_id IS NOT NULL
             AND tfd.boost_active = true
             AND tfd.farming_rate > 0
        THEN '✅ TON BOOST ПОЛНОСТЬЮ ИСПРАВЛЕН'
        ELSE '❌ ОСТАЛИСЬ ПРОБЛЕМЫ С TON BOOST'
    END as ton_boost_status,
    u.id,
    u.username,
    u.ton_boost_active,
    u.ton_farming_start_timestamp IS NOT NULL as has_ton_start,
    tfd.farming_rate,
    tfd.boost_active
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.id = 244;

-- =====================================================
-- ОЖИДАЕМЫЙ РЕЗУЛЬТАТ
-- =====================================================

/*
ПОСЛЕ ВЫПОЛНЕНИЯ @Dima_27976 (ID: 244) TON BOOST БУДЕТ:
✅ ton_farming_start_timestamp установлен
✅ ton_farming_last_update установлен  
✅ Запись в ton_farming_data создана
✅ farming_rate = 0.01 (как у User 25)
✅ boost_active = true
✅ Полная совместимость TON Boost с User 25

ВРЕМЯ: 1-2 минуты
РИСК: МИНИМАЛЬНЫЙ (только TON Boost поля)
UNI FARMING: НЕ ТРОГАЕМ (остается как есть)
*/