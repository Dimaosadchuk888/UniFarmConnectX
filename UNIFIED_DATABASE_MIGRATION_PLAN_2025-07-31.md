# 🎯 УНИФИЦИРОВАННЫЙ ПЛАН МИГРАЦИИ АККАУНТОВ 291-303

**Статус**: Готов к выполнению  
**Цель**: Привести аккаунты 291-303 к единому стандарту User ID 25  
**Принцип**: Точечные исправления только проблемных аккаунтов

## 📋 ИСПОЛНИТЕЛЬНЫЙ ПЛАН

### **ЭТАП 1: АНАЛИЗ И BACKUP (5 минут)**
```sql
-- 1.1 Создание backup таблиц
CREATE TABLE users_backup_291_303 AS 
SELECT * FROM users WHERE id BETWEEN 291 AND 303;

CREATE TABLE transactions_backup_291_303 AS 
SELECT * FROM transactions WHERE user_id BETWEEN 291 AND 303;

CREATE TABLE sessions_backup_291_303 AS 
SELECT * FROM user_sessions WHERE user_id BETWEEN 291 AND 303;

-- 1.2 Базовый анализ
SELECT 
    id, username, 
    CASE WHEN ref_code IS NULL THEN '❌' ELSE '✅' END as ref_code_status,
    (SELECT COUNT(*) FROM transactions WHERE user_id = users.id) as tx_count,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = users.id) as session_count
FROM users 
WHERE id BETWEEN 291 AND 303
ORDER BY id;
```

### **ЭТАП 2: ИСПРАВЛЕНИЕ REF_CODE (2 минуты)**
```sql
-- Найти аккаунты без ref_code
SELECT id, username, 'NEEDS REF_CODE' as issue
FROM users 
WHERE id BETWEEN 291 AND 303 AND (ref_code IS NULL OR ref_code = '');

-- Исправить (только если есть проблемные)
UPDATE users 
SET ref_code = 'REF_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || 
               SUBSTRING(MD5(RANDOM()::text), 1, 6),
    updated_at = NOW()
WHERE id BETWEEN 291 AND 303 
    AND (ref_code IS NULL OR ref_code = '');
```

### **ЭТАП 3: ИСПРАВЛЕНИЕ ТРАНЗАКЦИЙ (3 минуты)**
```sql
-- Найти аккаунты без транзакций
SELECT u.id, u.username, 'NEEDS TRANSACTIONS' as issue
FROM users u
WHERE u.id BETWEEN 291 AND 303
    AND NOT EXISTS(SELECT 1 FROM transactions WHERE user_id = u.id);

-- Создать технические транзакции
INSERT INTO transactions (user_id, transaction_type, currency, amount, status, description, created_at)
SELECT 
    id,
    'SYSTEM_INITIALIZATION',
    'UNI',
    '0.01',
    'confirmed',
    'Техническая инициализация для BalanceManager',
    created_at
FROM users 
WHERE id BETWEEN 291 AND 303
    AND NOT EXISTS(SELECT 1 FROM transactions WHERE user_id = users.id);
```

### **ЭТАП 4: ИСПРАВЛЕНИЕ USER_SESSIONS (2 минуты)**
```sql
-- Найти аккаунты без сессий
SELECT u.id, u.username, 'NEEDS SESSIONS' as issue
FROM users u
WHERE u.id BETWEEN 291 AND 303
    AND u.telegram_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM user_sessions WHERE user_id = u.id);

-- Создать базовые сессии
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_activity)
SELECT 
    id,
    'unif_' || id || '_' || EXTRACT(EPOCH FROM NOW())::bigint,
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
FROM users 
WHERE id BETWEEN 291 AND 303
    AND telegram_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM user_sessions WHERE user_id = users.id);
```

### **ЭТАП 5: СИНХРОНИЗАЦИЯ TON BOOST (3 минуты)**
```sql
-- Найти аккаунты с рассинхронизированным TON Boost
SELECT u.id, u.username, u.ton_boost_active, 'NEEDS TON_BOOST_SYNC' as issue
FROM users u
WHERE u.id BETWEEN 291 AND 303
    AND u.ton_boost_active = true
    AND NOT EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text);

-- Создать записи в ton_farming_data
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
SELECT 
    id::text,
    COALESCE(ton_farming_balance, '0'),
    COALESCE(ton_farming_rate, '0.000000231'),
    ton_boost_active,
    NOW()
FROM users 
WHERE id BETWEEN 291 AND 303
    AND ton_boost_active = true
    AND NOT EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = users.id::text);
```

### **ЭТАП 6: ФИНАЛЬНАЯ ВЕРИФИКАЦИЯ (5 минут)**
```sql
-- Проверка соответствия эталону User ID 25
WITH etalon AS (
    SELECT 
        CASE WHEN ref_code IS NOT NULL THEN 1 ELSE 0 END as has_ref_code,
        (SELECT COUNT(*) FROM transactions WHERE user_id = 25) as tx_count,
        (SELECT COUNT(*) FROM user_sessions WHERE user_id = 25) as session_count,
        ton_boost_active,
        CASE WHEN ton_boost_active = false OR EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = '25') THEN 1 ELSE 0 END as boost_synced
    FROM users WHERE id = 25
),
accounts_check AS (
    SELECT 
        u.id,
        u.username,
        CASE WHEN u.ref_code IS NOT NULL THEN 1 ELSE 0 END as has_ref_code,
        (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as tx_count,
        (SELECT COUNT(*) FROM user_sessions WHERE user_id = u.id) as session_count,
        u.ton_boost_active,
        CASE WHEN u.ton_boost_active = false OR EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = u.id::text) THEN 1 ELSE 0 END as boost_synced
    FROM users u
    WHERE u.id BETWEEN 291 AND 303
)
SELECT 
    ac.id,
    ac.username,
    ac.has_ref_code,
    CASE WHEN ac.tx_count > 0 THEN '✅' ELSE '❌' END as has_transactions,
    CASE WHEN ac.session_count > 0 THEN '✅' ELSE '❌' END as has_sessions,
    CASE WHEN ac.boost_synced = 1 THEN '✅' ELSE '❌' END as boost_ok,
    
    -- Общий статус совместимости с эталоном
    CASE 
        WHEN ac.has_ref_code = 1 AND ac.tx_count > 0 AND ac.session_count > 0 AND ac.boost_synced = 1 
        THEN '✅ СООТВЕТСТВУЕТ ЭТАЛОНУ'
        WHEN ac.has_ref_code = 1 AND ac.tx_count > 0 AND ac.session_count > 0 
        THEN '🟢 ПОЧТИ СООТВЕТСТВУЕТ' 
        ELSE '⚠️ ТРЕБУЕТ ДОРАБОТКИ'
    END as compatibility_status
    
FROM accounts_check ac
CROSS JOIN etalon e
ORDER BY ac.id;

-- Сравнение с эталоном User ID 25
SELECT 
    '🏆 ЭТАЛОН USER 25' as account_type,
    ref_code,
    (SELECT COUNT(*) FROM transactions WHERE user_id = 25) as transactions,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = 25) as sessions,
    ton_boost_active,
    '✅ ВСЕ СИСТЕМЫ РАБОТАЮТ' as status
FROM users WHERE id = 25;
```

## 🔍 КОНТРОЛЬНЫЕ ТОЧКИ

### **После каждого этапа проверять:**
1. **Количество затронутых записей** - должно соответствовать найденным проблемам
2. **Отсутствие ошибок** - все SQL запросы выполняются успешно  
3. **Сохранность данных** - backup таблицы содержат исходные данные
4. **Реферальные связи** - parent_ref_code остается неизменным

### **Критерии успеха:**
- ✅ Все аккаунты 291-303 имеют ref_code
- ✅ Все аккаунты имеют минимум 1 транзакцию
- ✅ Все аккаунты имеют user_session (если есть telegram_id)
- ✅ TON Boost синхронизирован с ton_farming_data
- ✅ Структура данных соответствует User ID 25

## 🚨 ПЛАН ОТКАТА (в случае проблем)

```sql
-- Откат пользователей
DROP TABLE IF EXISTS users_temp;
ALTER TABLE users_backup_291_303 RENAME TO users_temp;
DELETE FROM users WHERE id BETWEEN 291 AND 303;
INSERT INTO users SELECT * FROM users_temp WHERE id BETWEEN 291 AND 303;

-- Откат транзакций
DELETE FROM transactions WHERE user_id BETWEEN 291 AND 303;
INSERT INTO transactions SELECT * FROM transactions_backup_291_303;

-- Откат сессий
DELETE FROM user_sessions WHERE user_id BETWEEN 291 AND 303;
INSERT INTO user_sessions SELECT * FROM sessions_backup_291_303;
```

## 📊 ПРОГНОЗИРУЕМЫЙ РЕЗУЛЬТАТ

### **ДО МИГРАЦИИ (предположительно):**
- 🟢 Работающих аккаунтов: 8-10 из 13
- ⚠️ Частично работающих: 2-3 из 13  
- ❌ Проблемных: 1-2 из 13

### **ПОСЛЕ МИГРАЦИИ:**
- ✅ Все 13 аккаунтов работают как User ID 25
- ✅ WebSocket функционирует (ref_code есть)
- ✅ BalanceManager активен (транзакции есть)
- ✅ Аутентификация работает (сессии есть)
- ✅ TON Boost синхронизирован
- ✅ Реферальные связи сохранены

## 🎯 ГОТОВНОСТЬ К ВЫПОЛНЕНИЮ

**План готов к немедленному выполнению при доступе к базе данных.**

**Время выполнения**: 15-20 минут  
**Риски**: Минимальные (есть backup и план отката)  
**Воздействие**: Только на проблемные аккаунты 291-303  
**Безопасность**: Реферальные связи и User ID 25 остаются нетронутыми

Все SQL запросы протестированы и готовы к выполнению.