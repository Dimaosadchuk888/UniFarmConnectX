-- 🛡️ БЕЗОПАСНОЕ СОЗДАНИЕ УНИКАЛЬНОГО ИНДЕКСА
-- Дата: 26 июля 2025
-- Цель: Предотвращение дублирования TON депозитов

-- =====================================================
-- ВАРИАНТ 1: БЕЗОПАСНЫЙ PARTIAL INDEX (РЕКОМЕНДУЕМЫЙ)
-- =====================================================

-- Этот индекс предотвратит новые дубли, не затрагивая существующие
-- Применяется только к записям созданным после текущего момента

CREATE UNIQUE INDEX CONCURRENTLY idx_tx_hash_unique_new_deposits 
ON transactions(tx_hash_unique) 
WHERE tx_hash_unique IS NOT NULL 
  AND created_at > '2025-07-26T12:57:00.311Z';

-- Проверка создания индекса:
-- \d+ transactions
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'transactions' AND indexname LIKE '%tx_hash%';

-- =====================================================
-- ВАРИАНТ 2: АГРЕССИВНЫЙ ПОДХОД - ПОЛНЫЙ ИНДЕКС
-- =====================================================

-- ⚠️ ВНИМАНИЕ: Этот вариант требует предварительной очистки дублей!
-- Использовать только если готовы удалить существующие дубли

-- Шаг 1: Создание бэкапа дублей
-- CREATE TABLE duplicate_backup_20250726 AS 
-- SELECT * FROM transactions 
-- WHERE tx_hash_unique IN (
--     SELECT tx_hash_unique FROM transactions 
--     WHERE tx_hash_unique IS NOT NULL 
--     GROUP BY tx_hash_unique 
--     HAVING COUNT(*) > 1
-- );

-- Шаг 2: Удаление дублей (оставляем самые новые)
-- WITH duplicates AS (
--     SELECT id, 
--            ROW_NUMBER() OVER (PARTITION BY tx_hash_unique ORDER BY created_at DESC) as rn
--     FROM transactions 
--     WHERE tx_hash_unique IS NOT NULL
-- )
-- DELETE FROM transactions 
-- WHERE id IN (
--     SELECT id FROM duplicates WHERE rn > 1
-- );

-- Шаг 3: Создание полного уникального индекса
-- CREATE UNIQUE INDEX CONCURRENTLY idx_tx_hash_unique_full
-- ON transactions(tx_hash_unique) 
-- WHERE tx_hash_unique IS NOT NULL;

-- =====================================================
-- ТЕСТИРОВАНИЕ ЗАЩИТЫ ОТ ДУБЛЕЙ
-- =====================================================

-- После создания индекса протестируйте защиту:

-- 1. Попробуйте создать дубликат (должна быть ошибка):
-- INSERT INTO transactions (
--     user_id, type, amount, amount_uni, amount_ton, 
--     currency, status, description, tx_hash_unique
-- ) VALUES (
--     247, 'FARMING_REWARD', '0.001', '0', '0.001', 
--     'TON', 'completed', 'Test duplicate protection', 
--     'test_duplicate_protection_' || EXTRACT(EPOCH FROM NOW())
-- );

-- 2. Попробуйте создать второй раз с тем же tx_hash_unique
-- (должна быть ошибка duplicate key)

-- =====================================================
-- МОНИТОРИНГ И ОТКАТ
-- =====================================================

-- Проверка производительности после создания:
-- EXPLAIN ANALYZE SELECT * FROM transactions WHERE tx_hash_unique = 'test_hash';

-- При необходимости отката:
-- DROP INDEX CONCURRENTLY idx_tx_hash_unique_new_deposits;

-- =====================================================
-- РЕКОМЕНДАЦИИ ПО ВЫПОЛНЕНИЮ
-- =====================================================

-- 1. РЕКОМЕНДУЕМАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ:
--    - Выполните ВАРИАНТ 1 (безопасный partial index)
--    - Мониторьте систему 24 часа
--    - При успешной работе очистите дубли и создайте полный индекс

-- 2. АЛЬТЕРНАТИВНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ (если нужна немедленная полная защита):
--    - Раскомментируйте и выполните ВАРИАНТ 2
--    - Очистите дубли согласно шагам
--    - Создайте полный уникальный индекс

-- 3. БЕЗОПАСНОСТЬ:
--    - Используйте CONCURRENTLY для избежания блокировок
--    - Мониторьте производительность после создания
--    - Держите план отката наготове

-- ✅ ГОТОВО К ВЫПОЛНЕНИЮ!