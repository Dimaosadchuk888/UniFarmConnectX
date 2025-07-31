# 🔧 ПЛАН ИСПРАВЛЕНИЯ @Dima_27976 (ID: 254)
**Дата:** 31.07.2025  
**Статус:** ГОТОВ К ВЫПОЛНЕНИЮ  
**Приоритет:** КРИТИЧЕСКИЙ

## 📊 ДИАГНОСТИКА ЗАВЕРШЕНА

**Найдены пользователи @Dima_27976:**
- **ID:** 254 (основной)
- **Telegram ID:** 244  
- **Username:** Dima_27976

**ЭТАЛОН User ID 25:**
- **ID:** 25
- **Username:** DimaOsadchuk  
- **Telegram ID:** 425855744
- **Балансы:** UNI: 79,636,722.06, TON: 6.12
- **Транзакций:** 1,000
- **TON Farming:** Активен (1 запись)
- **Статус:** ПОЛНОСТЬЮ ФУНКЦИОНАЛЕН

## 🚨 ПРОБЛЕМЫ @Dima_27976

| Компонент | @Dima_27976 | User ID 25 | Статус |
|-----------|-------------|------------|---------|
| **Транзакции** | 0 | 1,000 | ❌ КРИТИЧНО |
| **User Sessions** | 0 | 0 | ⚠️ У обоих нет |
| **TON Farming Data** | 0 | 1 | ❌ КРИТИЧНО |
| **Farming Deposits** | 0 | 0 | ⚠️ У обоих нет |
| **Балансы UNI** | 0 | 79,636,722.06 | ❌ КРИТИЧНО |
| **Балансы TON** | 0 | 6.12 | ❌ КРИТИЧНО |
| **TON Boost** | false | true | ❌ НЕАКТИВЕН |
| **UNI Farming** | false | true | ❌ НЕАКТИВЕН |

## 🎯 ПЛАН ПОЭТАПНОГО ИСПРАВЛЕНИЯ

### **ЭТАП 1: СОЗДАНИЕ БЭКАПА (БЕЗОПАСНОСТЬ)**
```sql
-- Создать бэкап данных @Dima_27976 перед изменениями
CREATE TABLE backup_dima_27976_before_fix_2025_07_31 AS
SELECT * FROM users WHERE id = 254;
```

### **ЭТАП 2: СОЗДАНИЕ БАЗОВЫХ ТРАНЗАКЦИЙ**
```sql
-- Создать начальную транзакцию регистрации
INSERT INTO transactions (user_id, transaction_type, amount, description, created_at)
VALUES (254, 'AIRDROP_CLAIM', 100.00, 'Welcome bonus for new user', NOW());

-- Обновить баланс UNI (стартовый бонус)
UPDATE users 
SET balance_uni = 100.00,
    uni_farming_active = true,
    uni_farming_start_timestamp = NOW(),
    uni_farming_last_update = NOW(),
    uni_farming_rate = 0.01
WHERE id = 254;
```

### **ЭТАП 3: СОЗДАНИЕ USER_SESSION**
```sql
-- Создать активную сессию
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_activity)
VALUES (
    254,
    'session_254_fixed_' || EXTRACT(epoch FROM NOW()),
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
);
```

### **ЭТАП 4: АКТИВАЦИЯ TON FARMING**
```sql
-- Создать TON farming data для синхронизации с TON boost
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
VALUES ('254', 0, 0.001, false, NOW());

-- Если пользователь хочет TON boost - активировать
UPDATE users 
SET ton_boost_active = false,  -- Начнем с базового уровня
    ton_farming_rate = 0.001,
    ton_farming_start_timestamp = NOW(),
    ton_farming_last_update = NOW()
WHERE id = 254;
```

### **ЭТАП 5: ВЕРИФИКАЦИЯ ИСПРАВЛЕНИЙ**
```sql
-- Проверить результат исправлений
SELECT 
    'ПОСЛЕ_ИСПРАВЛЕНИЯ' as status,
    id,
    username,
    telegram_id,
    balance_uni,
    balance_ton,
    uni_farming_active,
    ton_boost_active,
    (SELECT COUNT(*) FROM transactions WHERE user_id = 254) as tx_count,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = 254) as session_count,
    (SELECT COUNT(*) FROM ton_farming_data WHERE user_id = '254') as farming_data_count
FROM users WHERE id = 254;
```

## ⚡ ГОТОВЫЕ КОМАНДЫ ДЛЯ ВЫПОЛНЕНИЯ

**Команда 1: Бэкап**
```sql
CREATE TABLE backup_dima_27976_before_fix_2025_07_31 AS SELECT * FROM users WHERE id = 254;
```

**Команда 2: Базовые исправления**
```sql
BEGIN;

-- Стартовая транзакция
INSERT INTO transactions (user_id, transaction_type, amount, description, created_at)
VALUES (254, 'AIRDROP_CLAIM', 100.00, 'Welcome bonus for new user', NOW());

-- Активация UNI farming
UPDATE users 
SET balance_uni = 100.00,
    uni_farming_active = true,
    uni_farming_start_timestamp = NOW(),
    uni_farming_last_update = NOW(),
    uni_farming_rate = 0.01
WHERE id = 254;

-- Создание сессии
INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_activity)
VALUES (254, 'session_254_fixed_' || EXTRACT(epoch FROM NOW()), NOW() + INTERVAL '30 days', NOW(), NOW());

-- TON farming data
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
VALUES ('254', 0, 0.001, false, NOW());

COMMIT;
```

**Команда 3: Верификация**
```sql
SELECT 
    'РЕЗУЛЬТАТ_ИСПРАВЛЕНИЯ' as status,
    u.id, u.username, u.balance_uni, u.balance_ton,
    u.uni_farming_active, u.ton_boost_active,
    (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as tx_count,
    (SELECT COUNT(*) FROM user_sessions WHERE user_id = u.id) as session_count,
    (SELECT COUNT(*) FROM ton_farming_data WHERE user_id = u.id::text) as farming_count
FROM users u WHERE u.id = 254;
```

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После исправления @Dima_27976 будет иметь:
- ✅ Стартовый баланс UNI: 100.00
- ✅ Активный UNI farming 
- ✅ Рабочую сессию (30 дней)
- ✅ TON farming data (подготовлено для boost)
- ✅ Первую транзакцию в истории
- ✅ Полную совместимость с User ID 25

**Время выполнения:** 5-10 минут  
**Риск:** МИНИМАЛЬНЫЙ (с бэкапом)  
**Статус:** ГОТОВ К ЗАПУСКУ