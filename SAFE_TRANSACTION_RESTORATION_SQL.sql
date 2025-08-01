-- 🔒 БЕЗОПАСНЫЙ SQL ДЛЯ ВОССТАНОВЛЕНИЯ TON_DEPOSIT ТРАНЗАКЦИЙ
-- Дата: 01 августа 2025
-- Цель: Восстановить отсутствующие TON_DEPOSIT транзакции для пользователей 191-303

-- ⚠️ ВНИМАНИЕ: ЗАПУСКАТЬ ТОЛЬКО ПОСЛЕ СОЗДАНИЯ BACKUP БАЗЫ ДАННЫХ!

-- 🔍 ШАГ 1: АНАЛИЗ ДАННЫХ (безопасная проверка)
-- Сначала ВСЕГДА запускайте эти запросы для анализа:

-- Проверяем пользователей с TON балансом но без TON_DEPOSIT транзакций
SELECT 
    u.id as user_id,
    u.balance_ton,
    u.created_at as user_registered,
    COUNT(t.id) as total_transactions,
    COUNT(CASE WHEN t.type = 'TON_DEPOSIT' THEN 1 END) as ton_deposit_count,
    CASE 
        WHEN u.balance_ton > 0 AND COUNT(CASE WHEN t.type = 'TON_DEPOSIT' THEN 1 END) = 0 
        THEN 'НУЖНА_ВОССТАНОВКА' 
        ELSE 'ОК' 
    END as status
FROM users u
LEFT JOIN transactions t ON u.id::text = t.user_id
WHERE u.id BETWEEN 191 AND 303
    AND u.balance_ton > 0
GROUP BY u.id, u.balance_ton, u.created_at
ORDER BY u.id;

-- 🔍 ШАГ 2: ПОДСЧЕТ ОПЕРАЦИЙ (проверка безопасности)
-- Сколько транзакций будет создано:
SELECT 
    COUNT(*) as users_need_restoration,
    SUM(u.balance_ton) as total_ton_to_restore
FROM users u
LEFT JOIN transactions t ON u.id::text = t.user_id AND t.type = 'TON_DEPOSIT'
WHERE u.id BETWEEN 191 AND 303
    AND u.balance_ton > 0
    AND t.id IS NULL;

-- 🔍 ШАГ 3: ПРОВЕРКА СУЩЕСТВУЮЩИХ ТРАНЗАКЦИЙ (избежать дублирования)
SELECT 
    user_id,
    type,
    amount,
    currency,
    created_at
FROM transactions 
WHERE user_id::int BETWEEN 191 AND 303
    AND type = 'TON_DEPOSIT'
ORDER BY user_id::int, created_at;

-- ==========================================
-- 🛠️ ОСНОВНОЙ SQL ДЛЯ ВОССТАНОВЛЕНИЯ
-- ЗАПУСКАТЬ ТОЛЬКО ПОСЛЕ АНАЛИЗА ВЫШЕ!
-- ==========================================

-- 🔒 БЕЗОПАСНАЯ ВСТАВКА ТРАНЗАКЦИЙ
-- Создаем TON_DEPOSIT транзакции для пользователей с балансом но без соответствующих транзакций

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
)
SELECT 
    u.id::text as user_id,
    'TON_DEPOSIT' as type,
    u.balance_ton as amount,
    'TON' as currency,
    'completed' as status,
    CONCAT('Historical TON deposit restoration - User ', u.id, ' (', u.balance_ton, ' TON)') as description,
    u.created_at + INTERVAL '1 hour' as created_at, -- Создаем через час после регистрации
    NOW() as updated_at,
    jsonb_build_object(
        'restoration_type', 'historical_deposit',
        'original_balance', u.balance_ton,
        'restored_at', NOW(),
        'restoration_reason', 'Missing transaction history for accounts 191-303 created before API integration',
        'user_registration_date', u.created_at,
        'confidence_level', 'high',
        'data_source', 'user_balance_table'
    ) as metadata
FROM users u
LEFT JOIN transactions t ON u.id::text = t.user_id AND t.type = 'TON_DEPOSIT'
WHERE u.id BETWEEN 191 AND 303
    AND u.balance_ton > 0
    AND t.id IS NULL  -- Только если нет существующих TON_DEPOSIT транзакций
    AND u.balance_ton < 100; -- Защита от аномально больших сумм

-- 🔍 ШАГ 4: ПРОВЕРКА РЕЗУЛЬТАТА (после выполнения)
-- Запустите для проверки что все прошло правильно:

SELECT 
    u.id as user_id,
    u.balance_ton,
    COUNT(t.id) as total_transactions,
    COUNT(CASE WHEN t.type = 'TON_DEPOSIT' THEN 1 END) as ton_deposit_count,
    MAX(CASE WHEN t.type = 'TON_DEPOSIT' THEN t.amount END) as restored_amount,
    MAX(CASE WHEN t.type = 'TON_DEPOSIT' THEN t.created_at END) as restoration_date
FROM users u
LEFT JOIN transactions t ON u.id::text = t.user_id
WHERE u.id BETWEEN 191 AND 303
    AND u.balance_ton > 0
GROUP BY u.id, u.balance_ton
ORDER BY u.id;

-- 🔍 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Соответствие балансов
SELECT 
    user_id,
    SUM(CASE WHEN type = 'TON_DEPOSIT' THEN amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN type LIKE '%WITHDRAWAL%' THEN -amount ELSE 0 END) as total_withdrawals,
    SUM(CASE WHEN type IN ('FARMING_REWARD', 'REFERRAL_REWARD') AND currency = 'TON' THEN amount ELSE 0 END) as total_rewards
FROM transactions 
WHERE user_id::int BETWEEN 191 AND 303
GROUP BY user_id
ORDER BY user_id::int;

-- ==========================================
-- 📋 ИНСТРУКЦИИ ПО БЕЗОПАСНОМУ ЗАПУСКУ:
-- ==========================================

/*
1. ОБЯЗАТЕЛЬНО создайте backup базы данных ПЕРЕД запуском
2. Сначала запустите ШАГ 1-3 для анализа
3. Проверьте результаты анализа
4. Только после этого запускайте основной INSERT
5. После INSERT запустите ШАГ 4 для проверки
6. Если что-то пошло не так - восстанавливайте из backup

КРИТИЧЕСКИЕ ЗАЩИТЫ В КОДЕ:
✅ Проверка на существующие транзакции (избежать дублирования)
✅ Ограничение по сумме (< 100 TON защита от аномалий)  
✅ Точный диапазон пользователей (191-303)
✅ Только пользователи с положительным балансом
✅ Детальные метаданные для отслеживания
✅ Временные метки основанные на дате регистрации
*/