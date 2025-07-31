# 🔧 ПЛАН ИСПРАВЛЕНИЯ ОСНОВНОГО АККАУНТА @Dima_27976 (ID: 244)
**Дата:** 31.07.2025  
**Приоритет:** ВЫСОКИЙ  
**Статус:** ГОТОВ К ВЫПОЛНЕНИЮ

## 📊 ДИАГНОЗ ОСНОВНОГО АККАУНТА

**Аккаунт @Dima_27976 (ID: 244):**
- **Балансы:** UNI: 179,729.62, TON: 0.049989 ✅
- **UNI Депозит:** 181,000,000 (ОГРОМНЫЙ!) ✅  
- **UNI Farming:** активен ✅
- **TON Boost:** активен (пакет 1) ✅
- **Транзакции:** 5+ (реферальные доходы) ✅

## 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

| Проблема | Текущее значение | Должно быть | Статус |
|----------|------------------|-------------|---------|
| **UNI Farming Rate** | 0 | 0.01+ | ❌ КРИТИЧНО |
| **UNI Start Timestamp** | NULL | дата/время | ❌ КРИТИЧНО |
| **TON Start Timestamp** | NULL | дата/время | ❌ КРИТИЧНО |
| **TON Farming Data** | 0 записей | 1 запись | ❌ КРИТИЧНО |
| **User Sessions** | 0 сессий | 1+ сессий | ❌ СРЕДНЕ |

## 🎯 ПЛАН ПОЭТАПНОГО ИСПРАВЛЕНИЯ

### **ЭТАП 1: БЭКАП ДАННЫХ**
```sql
-- Создать бэкап основного аккаунта
CREATE TABLE backup_dima_244_before_fix_2025_07_31 AS
SELECT * FROM users WHERE id = 244;

-- Проверить текущее состояние
SELECT 
    id, username, balance_uni, balance_ton,
    uni_farming_active, uni_farming_rate, uni_farming_start_timestamp,
    ton_boost_active, ton_farming_start_timestamp
FROM users WHERE id = 244;
```

### **ЭТАП 2: ИСПРАВЛЕНИЕ UNI FARMING**
```sql
-- Установить корректные значения для UNI farming
UPDATE users 
SET 
    uni_farming_rate = 0.01,                    -- Стандартная ставка как у User 25
    uni_farming_start_timestamp = NOW(),        -- Текущее время старта
    uni_farming_last_update = NOW()             -- Обновить время последнего обновления
WHERE id = 244;
```

### **ЭТАП 3: ИСПРАВЛЕНИЕ TON FARMING**
```sql
-- Установить TON farming timestamp
UPDATE users 
SET 
    ton_farming_start_timestamp = NOW(),
    ton_farming_last_update = NOW()
WHERE id = 244;

-- Создать недостающую запись в ton_farming_data
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
VALUES ('244', 0, 0.01, true, NOW());
```

### **ЭТАП 4: СОЗДАНИЕ USER SESSION**
```sql
-- Создать активную сессию для пользователя
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_activity)
VALUES (
    244,
    'session_244_fixed_' || EXTRACT(epoch FROM NOW()),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
);
```

### **ЭТАП 5: ДОБАВЛЕНИЕ БАЗОВЫХ ТРАНЗАКЦИЙ (ЕСЛИ НУЖНО)**
```sql
-- Добавить базовую транзакцию активации farming (если нужно для системы)
INSERT INTO transactions (user_id, transaction_type, amount, description, created_at)
VALUES (244, 'FARMING_ACTIVATION', 0, 'UNI Farming rate correction applied', NOW());
```

## ⚡ ГОТОВЫЕ КОМАНДЫ ДЛЯ ВЫПОЛНЕНИЯ

### **КОМАНДА 1: КОМПЛЕКСНОЕ ИСПРАВЛЕНИЕ**
```sql
BEGIN;

-- Бэкап
CREATE TABLE backup_dima_244_before_fix_2025_07_31 AS SELECT * FROM users WHERE id = 244;

-- Исправление UNI farming
UPDATE users 
SET 
    uni_farming_rate = 0.01,
    uni_farming_start_timestamp = NOW(),
    uni_farming_last_update = NOW(),
    ton_farming_start_timestamp = NOW(),
    ton_farming_last_update = NOW()
WHERE id = 244;

-- Создание TON farming data
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
VALUES ('244', 0, 0.01, true, NOW());

-- Создание сессии
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_activity)
VALUES (244, 'session_244_fixed_' || EXTRACT(epoch FROM NOW()), NOW() + INTERVAL '30 days', NOW(), NOW());

-- Запись о исправлении
INSERT INTO transactions (user_id, transaction_type, amount, description, created_at)
VALUES (244, 'SYSTEM_FIX', 0, 'Account standardization applied - farming rates corrected', NOW());

COMMIT;
```

### **КОМАНДА 2: ВЕРИФИКАЦИЯ ИСПРАВЛЕНИЙ**
```sql
-- Проверить результат исправлений
SELECT 
    'ПОСЛЕ_ИСПРАВЛЕНИЯ' as status,
    u.id,
    u.username,
    u.balance_uni,
    u.balance_ton,
    u.uni_farming_active,
    u.uni_farming_rate,
    u.uni_farming_start_timestamp IS NOT NULL as has_uni_start,
    u.ton_boost_active,
    u.ton_farming_start_timestamp IS NOT NULL as has_ton_start,
    (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as tx_count,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = u.id) as session_count,
    (SELECT COUNT(*) FROM ton_farming_data WHERE user_id = u.id::text) as farming_data_count
FROM users u 
WHERE u.id = 244;
```

### **КОМАНДА 3: СРАВНЕНИЕ С USER 25**
```sql
-- Финальное сравнение с эталоном
WITH dima_final AS (
    SELECT 
        244 as id,
        'DIMA_244_FIXED' as user_type,
        uni_farming_rate,
        uni_farming_start_timestamp IS NOT NULL as has_uni_start,
        ton_farming_start_timestamp IS NOT NULL as has_ton_start,
        uni_farming_active,
        ton_boost_active
    FROM users WHERE id = 244
),
user25_reference AS (
    SELECT 
        25 as id,
        'USER_25_REFERENCE' as user_type,
        uni_farming_rate,
        uni_farming_start_timestamp IS NOT NULL as has_uni_start,
        ton_farming_start_timestamp IS NOT NULL as has_ton_start,
        uni_farming_active,
        ton_boost_active
    FROM users WHERE id = 25
)
SELECT * FROM dima_final
UNION ALL
SELECT * FROM user25_reference;
```

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После исправления @Dima_27976 (ID: 244) будет иметь:
- ✅ Корректный UNI farming rate: 0.01 (как у User 25)
- ✅ Валидные timestamps для начала farming
- ✅ Рабочую запись в ton_farming_data
- ✅ Активную пользовательскую сессию
- ✅ Полную совместимость с User ID 25
- ✅ Сохраненные балансы: UNI: 179,729.62, TON: 0.049989
- ✅ Сохраненный огромный депозит: 181,000,000 UNI

**Время выполнения:** 3-5 минут  
**Риск:** МИНИМАЛЬНЫЙ (не трогаем балансы)  
**Готовность:** ГОТОВ К ЗАПУСКУ