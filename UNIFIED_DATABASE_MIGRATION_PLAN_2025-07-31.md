# 🚀 ПЛАН УНИФИКАЦИИ ВСЕХ АККАУНТОВ К СТАНДАРТУ USER ID 25

**Дата**: 31.07.2025  
**Проблема**: Старые аккаунты подключены к устаревшим таблицам, система эволюционировала и использует новые таблицы  
**Цель**: Все аккаунты должны работать идентично User ID 25

## 📊 АРХИТЕКТУРА ЭВОЛЮЦИИ СИСТЕМЫ

### 🕐 ЭТАП 1: РАННЯЯ СИСТЕМА (User ID 25)
**Период**: До 2025-06-16  
**Используемые таблицы**:
```sql
users - Все данные в одной таблице ✅
├── balance_uni, balance_ton (прямо в users)
├── uni_farming_* поля (встроенные)
├── ton_farming_* поля (встроенные) 
├── ton_boost_* поля (встроенные)
└── transactions - Полная история операций ✅
```

### 🕑 ЭТАП 2: СОВРЕМЕННАЯ СИСТЕМА (новые таблицы)
**Период**: После 2025-06-16  
**Используемые таблицы**:
```sql
users - Основная таблица
├── user_balances - Отдельная таблица балансов ❌
├── uni_farming_deposits - Отдельная таблица UNI фарминга ❌
├── ton_farming_data - Отдельная таблица TON фарминга ❌
├── ton_boost_deposits - Отдельная таблица TON буста ❌
├── farming_deposits - Отдельная таблица депозитов ❌
└── transactions - НО! новые аккаунты могут иметь 0 записей ❌
```

## 🚨 ПРОБЛЕМЫ РАЗРЫВА

### User ID 25 (работает идеально):
```sql
-- Все данные в users таблице
SELECT balance_uni, balance_ton, ton_farming_balance, ton_boost_active 
FROM users WHERE id = 25;
-- ✅ Возвращает реальные данные

-- Транзакции есть
SELECT COUNT(*) FROM transactions WHERE user_id = 25;
-- ✅ 583+ записей
```

### Новые аккаунты (имеют баги):
```sql
-- Балансы могут быть в разных местах
SELECT balance_uni FROM users WHERE id = [NEW_USER];
-- ❌ Может быть 0 или NULL

SELECT balance_uni FROM user_balances WHERE user_id = [NEW_USER];
-- ❌ Может отсутствовать запись

-- TON фарминг разделен
SELECT ton_farming_balance FROM users WHERE id = [NEW_USER];
-- ❌ Может быть NULL

SELECT farming_balance FROM ton_farming_data WHERE user_id = [NEW_USER];
-- ❌ Может отсутствовать запись или user_id как STRING

-- Транзакций может не быть
SELECT COUNT(*) FROM transactions WHERE user_id = [NEW_USER];
-- ❌ 0 записей = Balance Manager не работает
```

## 🎯 ПЛАН УНИФИКАЦИИ

### ЭТАП 1: АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ
```sql
-- 1.1 Найти аккаунты с данными в users (стиль User ID 25)
SELECT id, 'LEGACY_STYLE' as type,
       balance_uni, balance_ton, 
       ton_farming_balance, ton_boost_active
FROM users 
WHERE balance_uni IS NOT NULL 
   AND balance_uni != '0'
   AND ton_farming_balance IS NOT NULL;

-- 1.2 Найти аккаунты с данными в отдельных таблицах
SELECT u.id, 'MODERN_STYLE' as type,
       ub.balance_uni, ub.balance_ton,
       tfd.farming_balance, u.ton_boost_active
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.id != 25; -- исключаем эталон

-- 1.3 Найти аккаунты без транзакций (критично для BalanceManager)
SELECT u.id, u.username, u.created_at, 'NO_TRANSACTIONS' as issue
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE t.user_id IS NULL;

-- 1.4 Найти несинхронизированные TON Boost аккаунты
SELECT u.id, u.ton_boost_active, 
       CASE WHEN tfd.user_id IS NOT NULL THEN 'HAS_DATA' ELSE 'MISSING_DATA' END
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.ton_boost_active = true;
```

### ЭТАП 2: БЕЗОПАСНАЯ МИГРАЦИЯ К СТАНДАРТУ USER ID 25

#### 2.1 BACKUP ВСЕХ ТАБЛИЦ
```sql
-- Полный backup перед изменениями
CREATE TABLE users_backup_unification AS SELECT * FROM users;
CREATE TABLE user_balances_backup AS SELECT * FROM user_balances;
CREATE TABLE ton_farming_data_backup AS SELECT * FROM ton_farming_data;
CREATE TABLE uni_farming_deposits_backup AS SELECT * FROM uni_farming_deposits;
CREATE TABLE ton_boost_deposits_backup AS SELECT * FROM ton_boost_deposits;
CREATE TABLE transactions_backup_unification AS SELECT * FROM transactions;
```

#### 2.2 КОНСОЛИДАЦИЯ БАЛАНСОВ В USERS (как у User ID 25)
```sql
-- Мигрировать балансы из user_balances в users
UPDATE users 
SET 
    balance_uni = COALESCE(
        (SELECT balance_uni FROM user_balances WHERE user_id = users.id),
        users.balance_uni,
        '0'
    ),
    balance_ton = COALESCE(
        (SELECT balance_ton FROM user_balances WHERE user_id = users.id),
        users.balance_ton, 
        '0'
    )
WHERE id != 25; -- не трогаем эталон

-- Проверить что балансы перенесены
SELECT id, balance_uni, balance_ton 
FROM users 
WHERE balance_uni IS NOT NULL AND balance_ton IS NOT NULL;
```

#### 2.3 КОНСОЛИДАЦИЯ TON FARMING В USERS (как у User ID 25)
```sql
-- Мигрировать TON farming данные в users
UPDATE users 
SET 
    ton_farming_balance = COALESCE(
        (SELECT farming_balance FROM ton_farming_data WHERE user_id = users.id::text),
        users.ton_farming_balance,
        '0'
    ),
    ton_farming_rate = COALESCE(
        (SELECT farming_rate FROM ton_farming_data WHERE user_id = users.id::text),
        users.ton_farming_rate,
        '0.001'
    ),
    ton_farming_last_update = COALESCE(
        (SELECT farming_last_update FROM ton_farming_data WHERE user_id = users.id::text),
        users.ton_farming_last_update,
        NOW()
    )
WHERE id != 25; -- не трогаем эталон

-- Обновить последнее время обновления
UPDATE users 
SET ton_farming_last_update = NOW()
WHERE ton_farming_last_update IS NULL AND id != 25;
```

#### 2.4 СОЗДАНИЕ МИНИМАЛЬНЫХ ТРАНЗАКЦИЙ (как у User ID 25)
```sql
-- Создать техническую транзакцию для аккаунтов без истории
INSERT INTO transactions (user_id, transaction_type, currency, amount, status, description, created_at)
SELECT 
    u.id,
    'SYSTEM_UNIFICATION',
    'UNI',
    '0.01',
    'confirmed',
    'Техническая транзакция для унификации к стандарту User ID 25',
    u.created_at
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE t.user_id IS NULL AND u.id != 25;
```

#### 2.5 СИНХРОНИЗАЦИЯ TON BOOST КОНСИСТЕНТНОСТИ
```sql
-- Для аккаунтов с ton_boost_active=true без ton_farming_data
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
SELECT 
    u.id::text,
    COALESCE(u.ton_farming_balance, '0'),
    COALESCE(u.ton_farming_rate, '0.000000231'),
    u.ton_boost_active,
    NOW()
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.ton_boost_active = true 
    AND tfd.user_id IS NULL 
    AND u.id != 25;
```

### ЭТАП 3: ВЕРИФИКАЦИЯ УНИФИКАЦИИ

#### 3.1 ПРОВЕРКА ЕДИНООБРАЗИЯ
```sql
-- Все аккаунты должны иметь структуру как User ID 25
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN balance_uni IS NOT NULL AND balance_uni != '0' THEN 1 END) as users_with_uni_balance,
    COUNT(CASE WHEN balance_ton IS NOT NULL AND balance_ton != '0' THEN 1 END) as users_with_ton_balance,
    COUNT(CASE WHEN ton_farming_balance IS NOT NULL THEN 1 END) as users_with_ton_farming,
    -- Проверяем что у всех есть транзакции
    (SELECT COUNT(DISTINCT user_id) FROM transactions) as users_with_transactions
FROM users;

-- Проверка TON Boost консистентности
SELECT 
    COUNT(CASE WHEN ton_boost_active = true THEN 1 END) as boost_active_count,
    COUNT(CASE WHEN ton_boost_active = true AND EXISTS(
        SELECT 1 FROM ton_farming_data WHERE user_id = users.id::text
    ) THEN 1 END) as boost_with_farming_data
FROM users;
```

#### 3.2 ТЕСТ СОВМЕСТИМОСТИ С USER ID 25
```sql
-- Проверить что все аккаунты работают как User ID 25
SELECT 
    id,
    username,
    CASE 
        WHEN balance_uni IS NOT NULL 
             AND balance_ton IS NOT NULL
             AND EXISTS(SELECT 1 FROM transactions WHERE user_id = users.id)
             AND (ton_boost_active = false OR EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = users.id::text))
        THEN 'UNIFIED_SUCCESSFULLY'
        ELSE 'NEEDS_ATTENTION'
    END as unification_status
FROM users
ORDER BY id;
```

### ЭТАП 4: ОБНОВЛЕНИЕ КОДА ДЛЯ НОВЫХ АККАУНТОВ

#### 4.1 Модификация modules/auth/service.ts
```typescript
// Все новые аккаунты создаются в стиле User ID 25
async function createUserInLegacyStyle(telegramData: any) {
    // Все данные в users таблице
    const userData = {
        telegram_id: telegramData.id,
        username: telegramData.username,
        first_name: telegramData.first_name,
        ref_code: generateRefCode(), // ВСЕГДА создаем ref_code
        balance_uni: "0.01", // Начальный баланс в users
        balance_ton: "0.01", // Начальный баланс в users
        uni_farming_active: false,
        ton_boost_active: false,
        // Все farming поля в users (как у User ID 25)
        ton_farming_balance: "0",
        ton_farming_rate: "0.001"
    };
    
    // СРАЗУ создаем транзакцию (критично для BalanceManager)
    const initialTransaction = {
        user_id: insertedUserId,
        transaction_type: "WELCOME_BONUS", 
        currency: "UNI",
        amount: "0.01",
        status: "confirmed"
    };
    
    // НЕ используем отдельные таблицы user_balances, ton_farming_data
    // Все в users как у User ID 25
}
```

## ✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После унификации ВСЕ аккаунты будут работать как User ID 25:

### ✅ Единая структура данных:
- Все балансы в `users.balance_uni`, `users.balance_ton`
- Все TON farming в `users.ton_farming_*` полях
- Все аккаунты имеют транзакции для BalanceManager
- TON Boost консистентность восстановлена

### ✅ Единое поведение системы:
- WebSocket подключения работают (ref_code есть у всех)
- API аутентификация работает (telegram_id заполнен)
- Balance Manager работает (есть транзакции)
- Планировщики работают (данные синхронизированы)
- Реферальная система нетронута (ref_code связи сохранены)

### ✅ Предотвращение будущих проблем:
- Новые аккаунты создаются в стиле User ID 25
- Отказ от использования отдельных таблиц для балансов
- Обязательная генерация ref_code и транзакций
- Автоматические проверки целостности

## 🎯 РЕКОМЕНДАЦИИ К ВЫПОЛНЕНИЮ

1. **СНАЧАЛА**: Выполнить анализ (ЭТАП 1) для понимания масштаба
2. **ПОТОМ**: Создать полный backup (ЭТАП 2.1)
3. **ОСТОРОЖНО**: Поэтапная миграция с проверками после каждого шага
4. **ПРОВЕРИТЬ**: Верификация что все работает как User ID 25
5. **ОБНОВИТЬ**: Код регистрации для предотвращения новых проблем

**ГЛАВНОЕ**: User ID 25 остается нетронутым как эталонный стандарт для всей системы!