-- БЕЗОПАСНЫЙ ТЕСТОВЫЙ СКРИПТ МИГРАЦИИ ПОЛЬЗОВАТЕЛЕЙ С УСТАРЕВШЕЙ ЛОГИКОЙ
-- Дата: 01 августа 2025
-- Цель: Протестировать миграцию на небольшой группе пользователей

-- =====================================================
-- PHASE 1: АНАЛИЗ ПЕРЕД МИГРАЦИЕЙ (ТОЛЬКО ЧТЕНИЕ)
-- =====================================================

-- 1.1 Проверить текущее состояние тестовых пользователей
SELECT 
    id,
    username,
    uni_farming_active,
    uni_farming_rate,
    uni_farming_start_timestamp,
    uni_farming_last_update,
    ton_boost_active,
    ton_farming_start_timestamp,
    created_at
FROM users 
WHERE id IN (275, 224, 223, 226, 264) -- Первые 5 проблемных пользователей
ORDER BY id;

-- 1.2 Проверить существующие TON farming data для тестовых пользователей
SELECT 
    user_id,
    farming_rate,
    boost_active,
    farming_balance,
    created_at
FROM ton_farming_data 
WHERE user_id::text IN ('275', '224', '223', '226', '264');

-- =====================================================
-- PHASE 2: БЕЗОПАСНАЯ МИГРАЦИЯ ТЕСТОВОЙ ГРУППЫ
-- =====================================================

-- 2.1 Обновить UNI farming timestamps для тестовых пользователей
-- ИСПРАВЛЕНО: Добавлена проверка и безопасные условия
UPDATE users 
SET 
    uni_farming_start_timestamp = CASE 
        WHEN uni_farming_start_timestamp IS NULL THEN created_at 
        ELSE uni_farming_start_timestamp 
    END,
    uni_farming_last_update = CASE 
        WHEN uni_farming_last_update IS NULL THEN created_at 
        ELSE uni_farming_last_update 
    END,
    updated_at = NOW()
WHERE id IN (275, 224, 223, 226, 264)
  AND uni_farming_active = true
  AND (uni_farming_start_timestamp IS NULL OR uni_farming_last_update IS NULL);

-- 2.2 Создать TON farming data для пользователей с активным boost
-- ИСПРАВЛЕНО: Приведение типов user_id
INSERT INTO ton_farming_data (user_id, farming_rate, boost_active, farming_balance, created_at, updated_at)
SELECT 
    id::text as user_id,  -- Приведение к text типу
    '0.01' as farming_rate,
    true as boost_active,
    '0' as farming_balance,
    NOW() as created_at,
    NOW() as updated_at
FROM users 
WHERE id IN (275, 224, 223, 226, 264)
  AND ton_boost_active = true 
  AND id::text NOT IN (SELECT DISTINCT user_id FROM ton_farming_data WHERE user_id IS NOT NULL);

-- =====================================================
-- PHASE 3: ПРОВЕРКА РЕЗУЛЬТАТОВ МИГРАЦИИ
-- =====================================================

-- 3.1 Проверить обновленное состояние пользователей
SELECT 
    id,
    username,
    uni_farming_active,
    uni_farming_rate,
    uni_farming_start_timestamp IS NOT NULL as has_uni_start,
    uni_farming_last_update IS NOT NULL as has_uni_last_update,
    ton_boost_active,
    ton_farming_start_timestamp IS NOT NULL as has_ton_start,
    updated_at
FROM users 
WHERE id IN (275, 224, 223, 226, 264)
ORDER BY id;

-- 3.2 Проверить созданные TON farming records
SELECT 
    user_id,
    farming_rate,
    boost_active,
    farming_balance,
    created_at
FROM ton_farming_data 
WHERE user_id::text IN ('275', '224', '223', '226', '264')
ORDER BY user_id;

-- =====================================================
-- PHASE 4: СТАТИСТИКА ДО И ПОСЛЕ
-- =====================================================

-- 4.1 Подсчет пользователей готовых к новой логике (после миграции)
SELECT 
    COUNT(*) as total_migrated_users,
    COUNT(CASE WHEN uni_farming_start_timestamp IS NOT NULL THEN 1 END) as with_uni_start,
    COUNT(CASE WHEN uni_farming_last_update IS NOT NULL THEN 1 END) as with_uni_last_update,
    COUNT(CASE WHEN ton_farming_start_timestamp IS NOT NULL THEN 1 END) as with_ton_start
FROM users 
WHERE id IN (275, 224, 223, 226, 264);

-- 4.2 Проверка готовности к обработке планировщиком
-- Пользователи которые теперь должны обрабатываться UnifiedFarmingCalculator
SELECT 
    id,
    username,
    uni_farming_active,
    uni_deposit_amount,
    CASE 
        WHEN uni_farming_active = true 
        AND uni_farming_start_timestamp IS NOT NULL 
        AND COALESCE(uni_deposit_amount, '0')::numeric > 0
        THEN 'ГОТОВ К ОБРАБОТКЕ'
        ELSE 'ТРЕБУЕТ ДОПОЛНИТЕЛЬНОЙ НАСТРОЙКИ'
    END as scheduler_ready_status
FROM users 
WHERE id IN (275, 224, 223, 226, 264)
ORDER BY id;