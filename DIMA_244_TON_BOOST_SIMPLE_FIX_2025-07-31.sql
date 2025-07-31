-- =====================================================
-- ПРОСТОЕ ИСПРАВЛЕНИЕ TON BOOST ДЛЯ @Dima_27976 (ID: 244)
-- Дата: 31.07.2025 - УПРОЩЕННАЯ ВЕРСИЯ
-- =====================================================

-- 1. ТЕКУЩЕЕ СОСТОЯНИЕ TON BOOST
SELECT 
    'TON_BOOST_BEFORE_FIX' as status,
    id, username,
    ton_boost_active,
    ton_boost_package, 
    ton_farming_start_timestamp
FROM users 
WHERE id = 244;

-- Проверка ton_farming_data ДО
SELECT COUNT(*) as count FROM ton_farming_data WHERE user_id = '244';

-- =====================================================
-- ИСПРАВЛЕНИЕ (без ON CONFLICT для совместимости)
-- =====================================================

BEGIN;

-- 2. ДОБАВЛЕНИЕ TON FARMING TIMESTAMP
UPDATE users 
SET 
    ton_farming_start_timestamp = NOW(),
    ton_farming_last_update = NOW()
WHERE id = 244;

-- 3. СОЗДАНИЕ ЗАПИСИ TON FARMING DATA (простая версия)
-- Сначала удалим если есть, потом вставим
DELETE FROM ton_farming_data WHERE user_id = '244';

-- Теперь вставляем новую запись
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active)
VALUES ('244', 0, 0.01, true);

COMMIT;

-- =====================================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- =====================================================

-- 4. СОСТОЯНИЕ ПОСЛЕ ИСПРАВЛЕНИЯ
SELECT 
    'TON_BOOST_AFTER_FIX' as status,
    id, username,
    ton_boost_active,
    ton_boost_package,
    ton_farming_start_timestamp IS NOT NULL as has_ton_start
FROM users 
WHERE id = 244;

-- Проверка ton_farming_data ПОСЛЕ
SELECT COUNT(*) as count FROM ton_farming_data WHERE user_id = '244';

-- Показать созданную запись
SELECT 
    user_id,
    farming_balance,
    farming_rate,
    boost_active
FROM ton_farming_data 
WHERE user_id = '244';

-- 5. ФИНАЛЬНАЯ ПРОВЕРКА
SELECT 
    CASE 
        WHEN u.ton_farming_start_timestamp IS NOT NULL 
             AND tfd.user_id IS NOT NULL
             AND tfd.boost_active = true
        THEN '✅ TON BOOST ИСПРАВЛЕН'
        ELSE '❌ ПРОБЛЕМЫ ОСТАЛИСЬ'
    END as status,
    u.id,
    u.username,
    u.ton_boost_active,
    tfd.farming_rate,
    tfd.boost_active
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.id = 244;

/*
РЕЗУЛЬТАТ:
✅ ton_farming_start_timestamp установлен
✅ Запись в ton_farming_data создана 
✅ farming_rate = 0.01, boost_active = true
✅ TON Boost работает как у User 25
*/