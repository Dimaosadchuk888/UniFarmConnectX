# 🎯 ТОЧНАЯ ПРОВЕРКА АККАУНТОВ 291-303 VS USER ID 25

**Дата**: 31.07.2025  
**Цель**: Выявить точные различия с эталоном User ID 25 и создать план унификации  
**Принцип**: Большинство работают корректно, найти и исправить только проблемные

## 📊 ЭТАЛОН ДЛЯ СРАВНЕНИЯ - USER ID 25

### ✅ Структура User ID 25 (идеально работает):
```sql
users таблица:
├── id: 25
├── telegram_id: 425855744
├── username: '@DimaOsadchuk'  
├── ref_code: 'REF_1750079004411_nddfp2'
├── balance_uni: [реальное значение]
├── balance_ton: [реальное значение]
├── ton_farming_balance: [значение в users]
├── ton_farming_rate: [значение в users]
├── ton_boost_active: [синхронизировано]
├── is_admin: true
└── created_at: '2025-06-16T13:03:24'

transactions таблица:
└── 583+ записей для user_id = 25

user_sessions таблица:
└── активные сессии для user_id = 25

ton_farming_data таблица:
└── user_id = '25' (синхронизировано с users.ton_boost_active)
```

## 🔍 ДЕТАЛЬНАЯ ПРОВЕРКА КАЖДОГО АККАУНТА 291-303

### ЭТАП 1: АНАЛИЗ ОСНОВНЫХ ПОЛЕЙ
```sql
-- Проверяем основную структуру всех аккаунтов 291-303
SELECT 
    id,
    telegram_id,
    username,
    ref_code,
    balance_uni,
    balance_ton,
    ton_farming_balance,
    ton_farming_rate,
    ton_boost_active,
    ton_boost_package,
    created_at,
    
    -- Статусы критических полей
    CASE WHEN telegram_id IS NOT NULL THEN '✅' ELSE '❌' END as has_telegram_id,
    CASE WHEN ref_code IS NOT NULL THEN '✅' ELSE '❌' END as has_ref_code,
    CASE WHEN balance_uni != '0' THEN '✅' ELSE '⚠️' END as has_uni_balance,
    CASE WHEN balance_ton != '0' THEN '✅' ELSE '⚠️' END as has_ton_balance
    
FROM users 
WHERE id BETWEEN 291 AND 303
ORDER BY id;
```

### ЭТАП 2: ПРОВЕРКА ТРАНЗАКЦИЙ (критично для BalanceManager)
```sql
-- Сравниваем количество транзакций с эталоном
SELECT 
    u.id,
    u.username,
    COUNT(t.id) as transaction_count,
    CASE 
        WHEN COUNT(t.id) > 0 THEN '✅ Есть транзакции'
        ELSE '❌ НЕТ ТРАНЗАКЦИЙ'
    END as transaction_status,
    MIN(t.created_at) as first_transaction,
    MAX(t.created_at) as last_transaction,
    STRING_AGG(DISTINCT t.transaction_type, ', ') as types
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE u.id BETWEEN 291 AND 303
GROUP BY u.id, u.username
ORDER BY u.id;

-- Для сравнения - User ID 25
SELECT 
    'ЭТАЛОН_USER_25' as type,
    COUNT(*) as transaction_count,
    STRING_AGG(DISTINCT transaction_type, ', ') as types
FROM transactions 
WHERE user_id = 25;
```

### ЭТАП 3: ПРОВЕРКА СЕССИЙ (критично для аутентификации)
```sql
-- Проверяем наличие пользовательских сессий
SELECT 
    u.id,
    u.username,
    COUNT(s.id) as session_count,
    MAX(s.last_activity) as last_activity,
    COUNT(CASE WHEN s.expires_at > NOW() THEN 1 END) as active_sessions,
    CASE 
        WHEN COUNT(s.id) > 0 THEN '✅ Есть сессии'
        ELSE '❌ НЕТ СЕССИЙ'
    END as session_status
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id
WHERE u.id BETWEEN 291 AND 303
GROUP BY u.id, u.username
ORDER BY u.id;
```

### ЭТАП 4: ПРОВЕРКА TON FARMING СИНХРОНИЗАЦИИ
```sql
-- Критическая проверка TON Boost консистентности
SELECT 
    u.id,
    u.username,
    u.ton_boost_active as boost_in_users,
    u.ton_farming_balance as farming_balance_users,
    tfd.user_id as farming_data_exists,
    tfd.boost_active as boost_in_farming_data,
    tfd.farming_balance as farming_balance_data,
    
    CASE 
        WHEN u.ton_boost_active = true AND tfd.user_id IS NULL THEN '❌ BOOST БЕЗ ДАННЫХ'
        WHEN u.ton_boost_active = false AND tfd.user_id IS NOT NULL THEN '⚠️ ДАННЫЕ БЕЗ BOOST'
        WHEN u.ton_boost_active = true AND tfd.user_id IS NOT NULL THEN '✅ СИНХРОНИЗИРОВАНО'
        ELSE '✅ НЕТ BOOST'
    END as sync_status
    
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.id BETWEEN 291 AND 303
ORDER BY u.id;
```

### ЭТАП 5: ПРОВЕРКА АЛЬТЕРНАТИВНЫХ БАЛАНСОВ
```sql
-- Проверяем где хранятся балансы (users vs user_balances)
SELECT 
    u.id,
    u.username,
    u.balance_uni as uni_in_users,
    u.balance_ton as ton_in_users,
    ub.balance_uni as uni_in_balances,
    ub.balance_ton as ton_in_balances,
    
    CASE 
        WHEN u.balance_uni IS NOT NULL AND u.balance_uni != '0' THEN '✅ В USERS (как эталон)'
        WHEN ub.balance_uni IS NOT NULL AND ub.balance_uni != '0' THEN '⚠️ В USER_BALANCES'
        ELSE '❌ НЕТ БАЛАНСОВ'
    END as balance_location
    
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.id BETWEEN 291 AND 303
ORDER BY u.id;
```

## 🔧 ПЛАН ТОЧЕЧНОГО ИСПРАВЛЕНИЯ

### ДЛЯ КАЖДОГО ПРОБЛЕМНОГО АККАУНТА:

#### Проблема 1: НЕТ REF_CODE
```sql
-- Только для аккаунтов без ref_code
UPDATE users 
SET ref_code = 'REF_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || 
              SUBSTRING(MD5(RANDOM()::text), 1, 6)
WHERE id BETWEEN 291 AND 303 
    AND (ref_code IS NULL OR ref_code = '');
```

#### Проблема 2: НЕТ ТРАНЗАКЦИЙ
```sql
-- Создать техническую транзакцию для BalanceManager
INSERT INTO transactions (user_id, transaction_type, currency, amount, status, description, created_at)
SELECT 
    id,
    'SYSTEM_INITIALIZATION',
    'UNI',
    '0.01',
    'confirmed',
    'Техническая инициализация для совместимости с BalanceManager',
    created_at
FROM users 
WHERE id BETWEEN 291 AND 303
    AND NOT EXISTS(SELECT 1 FROM transactions WHERE user_id = users.id);
```

#### Проблема 3: НЕТ USER_SESSIONS
```sql
-- Создать базовую сессию для аутентификации
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at)
SELECT 
    id,
    'tech_session_' || id || '_' || EXTRACT(EPOCH FROM NOW())::bigint,
    NOW() + INTERVAL '30 days',
    NOW()
FROM users 
WHERE id BETWEEN 291 AND 303
    AND telegram_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM user_sessions WHERE user_id = users.id);
```

#### Проблема 4: TON BOOST НЕ СИНХРОНИЗИРОВАН
```sql
-- Исправить TON Boost консистентность
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

#### Проблема 5: БАЛАНСЫ В НЕПРАВИЛЬНОМ МЕСТЕ
```sql
-- Мигрировать балансы в users (как у эталона)
UPDATE users 
SET 
    balance_uni = COALESCE(ub.balance_uni, users.balance_uni, '0'),
    balance_ton = COALESCE(ub.balance_ton, users.balance_ton, '0')
FROM user_balances ub 
WHERE users.id = ub.user_id
    AND users.id BETWEEN 291 AND 303
    AND (users.balance_uni = '0' OR users.balance_uni IS NULL);
```

## 📋 ПОРЯДОК ВЫПОЛНЕНИЯ

### 1. ДИАГНОСТИКА (безопасно)
```sql
-- Запустить все SELECT запросы для анализа
-- Определить какие именно аккаунты имеют проблемы
-- Создать список необходимых исправлений
```

### 2. BACKUP (обязательно)
```sql
-- Backup только затрагиваемых аккаунтов
CREATE TABLE users_291_303_backup AS 
SELECT * FROM users WHERE id BETWEEN 291 AND 303;

CREATE TABLE transactions_291_303_backup AS 
SELECT * FROM transactions WHERE user_id BETWEEN 291 AND 303;
```

### 3. ИСПРАВЛЕНИЯ (точечно)
```sql
-- Применять только к аккаунтам с выявленными проблемами
-- Проверять после каждого исправления
-- НЕ ТРОГАТЬ работающие аккаунты
```

### 4. ВЕРИФИКАЦИЯ (обязательно)
```sql
-- Проверить что все аккаунты 291-303 работают как User ID 25
-- Убедиться что реферальные связи сохранены
-- Тестировать основные функции системы
```

## ✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После точечных исправлений ВСЕ аккаунты 291-303 должны:

- ✅ Иметь структуру данных как у User ID 25
- ✅ Работать с WebSocket (ref_code есть)
- ✅ Проходить аутентификацию (telegram_id заполнен)
- ✅ Работать с BalanceManager (есть транзакции)
- ✅ Иметь синхронизированный TON Boost
- ✅ Сохранить все реферальные связи
- ✅ Работать корректно во всех системах

**ГЛАВНОЕ**: Исправляем только выявленные проблемы, не трогаем работающие аккаунты!