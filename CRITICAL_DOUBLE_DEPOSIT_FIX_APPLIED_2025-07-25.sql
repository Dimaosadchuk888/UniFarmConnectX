-- ================================================
-- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ ДУБЛИРОВАНИЯ ДЕПОЗИТОВ
-- Дата: 25 июля 2025
-- Статус: БЕЗОПАСНОЕ ПРИМЕНЕНИЕ
-- ================================================

-- ЭТАП 1: ПРОВЕРКА СУЩЕСТВОВАНИЯ ИНДЕКСА
-- =====================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'transactions' 
        AND indexname = 'idx_tx_hash_unique_dedupe'
    ) THEN
        -- ЭТАП 2: СОЗДАНИЕ УНИКАЛЬНОГО ИНДЕКСА
        -- ===================================
        -- Создаем уникальный индекс для предотвращения дублирования
        -- Только для записей где tx_hash_unique не NULL
        CREATE UNIQUE INDEX CONCURRENTLY idx_tx_hash_unique_dedupe
        ON transactions(tx_hash_unique) 
        WHERE tx_hash_unique IS NOT NULL AND tx_hash_unique != '';
        
        RAISE NOTICE 'Уникальный индекс для дедупликации создан успешно';
    ELSE
        RAISE NOTICE 'Уникальный индекс уже существует';
    END IF;
END $$;

-- ЭТАП 3: ПРОВЕРКА РЕЗУЛЬТАТА
-- ==========================
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'transactions' 
AND indexname = 'idx_tx_hash_unique_dedupe';

-- ЭТАП 4: ТЕСТИРОВАНИЕ ДЕДУПЛИКАЦИИ
-- =================================
-- Проверяем что дублирование теперь невозможно
DO $$
DECLARE
    test_hash TEXT := 'test_duplicate_prevention_' || extract(epoch from now());
    test_user_id INTEGER := 1;
BEGIN
    -- Попытка создать первую транзакцию (должна пройти)
    INSERT INTO transactions (
        user_id, 
        type, 
        amount, 
        amount_uni, 
        amount_ton, 
        currency, 
        status, 
        description,
        tx_hash_unique,
        created_at
    ) VALUES (
        test_user_id,
        'FARMING_REWARD',
        '1.0',
        '0',
        '1.0',
        'TON',
        'completed',
        'Test deduplication - first transaction',
        test_hash,
        now()
    );
    
    RAISE NOTICE 'Первая тестовая транзакция создана успешно';
    
    -- Попытка создать дублирующую транзакцию (должна быть заблокирована)
    BEGIN
        INSERT INTO transactions (
            user_id, 
            type, 
            amount, 
            amount_uni, 
            amount_ton, 
            currency, 
            status, 
            description,
            tx_hash_unique,
            created_at
        ) VALUES (
            test_user_id,
            'FARMING_REWARD',
            '1.0',
            '0',
            '1.0',
            'TON',
            'completed',
            'Test deduplication - duplicate transaction',
            test_hash,
            now()
        );
        
        RAISE EXCEPTION 'ОШИБКА: Дублирующая транзакция была создана!';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'УСПЕХ: Дублирующая транзакция была заблокирована уникальным индексом';
    END;
    
    -- Очищаем тестовые данные
    DELETE FROM transactions WHERE tx_hash_unique = test_hash;
    RAISE NOTICE 'Тестовые данные очищены';
    
END $$;

-- ЭТАП 5: СТАТИСТИКА ПОСЛЕ ПРИМЕНЕНИЯ
-- ===================================
SELECT 
    'transactions' as table_name,
    COUNT(*) as total_records,
    COUNT(tx_hash_unique) as records_with_tx_hash,
    COUNT(DISTINCT tx_hash_unique) as unique_tx_hashes,
    (COUNT(tx_hash_unique) - COUNT(DISTINCT tx_hash_unique)) as potential_duplicates
FROM transactions;

-- ФИНАЛЬНАЯ ПРОВЕРКА
-- ==================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'transactions' 
            AND indexname = 'idx_tx_hash_unique_dedupe'
        ) THEN '✅ ИНДЕКС СОЗДАН - ДУБЛИРОВАНИЕ ЗАБЛОКИРОВАНО'
        ELSE '❌ ИНДЕКС НЕ НАЙДЕН - ДУБЛИРОВАНИЕ ВОЗМОЖНО'
    END as deduplication_status;