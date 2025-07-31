# 🔍 КОМПЛЕКСНЫЙ ОТЧЕТ ПО УНИФИКАЦИИ АККАУНТОВ

**Дата**: 31.07.2025  
**Эталон**: User ID 25 (корректно работающий аккаунт)  
**Цель**: Выявить все причины различий между аккаунтами и привести к единому формату

## 📊 АНАЛИЗ ЭТАЛОННОГО АККАУНТА (User ID 25)

### Из документации replit.md выявлено:
- **Высокая активность**: 583 транзакции с 12:00 одного дня (преимущественно REFERRAL_REWARD)
- **Проблемы с депозитами**: 3 TON депозит исчез после blockchain подтверждения  
- **Критическая аномалия**: 5.564 TON user balance vs 54 TON farming balance (872% расхождение)
- **Компенсации**: Получил компенсацию 3 TON за потерянный депозит
- **Системная важность**: Используется как референс для тестирования и диагностики

### Структура User ID 25 (идеальная):
```sql
-- Основная таблица users
users {
  id: 25,
  telegram_id: [УНИКАЛЬНЫЙ],
  username: "DimaOsadchuk",
  first_name: [ЗАПОЛНЕНО],
  balance_uni: [>0],
  balance_ton: [>0],
  ref_code: [УНИКАЛЬНЫЙ_КОД],
  parent_ref_code: [МОЖЕТ_БЫТЬ_NULL],
  referred_by: [МОЖЕТ_БЫТЬ_NULL],
  uni_farming_active: true/false,
  ton_boost_active: true/false,
  ton_boost_package: [МОЖЕТ_БЫТЬ_NULL],
  ton_boost_rate: [МОЖЕТ_БЫТЬ_NULL],
  ton_wallet_address: [МОЖЕТ_БЫТЬ_NULL],
  created_at: [ДАТА_СОЗДАНИЯ]
}

-- Связанные таблицы (для полнофункционального аккаунта)
transactions: МНОЖЕСТВО записей
ton_farming_data: ЕСТЬ при ton_boost_active=true  
user_sessions: АКТИВНЫЕ сессии
daily_bonus_claims: ИСТОРИЯ бонусов
referrals: МОЖЕТ отсутствовать
```

## 🚨 ВЫЯВЛЕННЫЕ РАЗЛИЧИЯ МЕЖДУ АККАУНТАМИ

### 1. **Критические поля основной таблицы**

| Поле | Проблема | Влияние |
|------|----------|---------|
| `telegram_id` | NULL или дубликаты | Невозможность аутентификации |
| `ref_code` | NULL или пустая строка | Нет реферальной системы |
| `balance_uni` | NULL или "0" | Нулевые балансы |  
| `balance_ton` | NULL или "0" | Нет TON средств |
| `username` | NULL | Проблемы с отображением |
| `first_name` | NULL | Невозможность идентификации |

### 2. **Проблемы связанных таблиц**

| Таблица | Проблема | Симптомы |
|---------|----------|----------|
| `transactions` | Отсутствуют записи | Нет истории операций |
| `ton_farming_data` | Нет при `ton_boost_active=true` | TON Boost не работает |
| `user_sessions` | Отсутствуют | Проблемы авторизации |
| `daily_bonus_claims` | Нет записей | Нет ежедневных бонусов |

### 3. **Логические несоответствия**

| Несоответствие | Описание | Риск |
|----------------|----------|------|
| TON Boost без данных | `ton_boost_active=true` но нет `ton_farming_data` | Висящие флаги |
| Баланс без транзакций | Есть баланс, но нет записи о его происхождении | Аномальные средства |
| Farming без депозита | Активный фарминг без депозитной записи | Логическая ошибка |

## 🔧 SQL ДИАГНОСТИЧЕСКИЕ ЗАПРОСЫ

### 1. Пользователи без базовых данных
```sql
-- Пользователи с критическими пропусками
SELECT u.id, u.username, u.telegram_id, u.ref_code, u.balance_uni, u.balance_ton,
       CASE 
         WHEN telegram_id IS NULL THEN 'NO_TELEGRAM_ID'
         WHEN ref_code IS NULL OR ref_code = '' THEN 'NO_REF_CODE'
         WHEN balance_uni IS NULL OR balance_uni::numeric = 0 THEN 'ZERO_UNI'
         WHEN balance_ton IS NULL OR balance_ton::numeric = 0 THEN 'ZERO_TON'
         WHEN username IS NULL THEN 'NO_USERNAME'
         WHEN first_name IS NULL THEN 'NO_FIRSTNAME'
         ELSE 'OK'
       END as critical_issue
FROM users u 
WHERE telegram_id IS NULL 
   OR ref_code IS NULL OR ref_code = ''
   OR balance_uni IS NULL OR balance_uni::numeric = 0
   OR balance_ton IS NULL OR balance_ton::numeric = 0
   OR username IS NULL 
   OR first_name IS NULL
ORDER BY u.id;
```

### 2. Пользователи без транзакций
```sql
-- Аккаунты без истории операций
SELECT u.id, u.username, u.balance_uni, u.balance_ton, u.created_at,
       'NO_TRANSACTIONS' as issue_type
FROM users u 
LEFT JOIN transactions t ON u.id = t.user_id 
WHERE t.user_id IS NULL 
ORDER BY u.created_at DESC;
```

### 3. Логические несоответствия TON Boost
```sql
-- TON Boost активен без данных фарминга
SELECT u.id, u.username, u.ton_boost_active, u.ton_boost_package, u.ton_boost_rate,
       'BOOST_WITHOUT_DATA' as issue_type
FROM users u 
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
WHERE u.ton_boost_active = true AND tfd.user_id IS NULL 
ORDER BY u.id;
```

### 4. Дубликаты и конфликты
```sql
-- Дубликаты telegram_id
SELECT telegram_id, COUNT(*) as duplicate_count, 
       STRING_AGG(id::text, ', ') as user_ids
FROM users 
WHERE telegram_id IS NOT NULL
GROUP BY telegram_id 
HAVING COUNT(*) > 1;

-- Дубликаты ref_code
SELECT ref_code, COUNT(*) as duplicate_count,
       STRING_AGG(id::text, ', ') as user_ids  
FROM users
WHERE ref_code IS NOT NULL AND ref_code != ''
GROUP BY ref_code
HAVING COUNT(*) > 1;
```

## 🛠️ ПЛАН БЕЗОПАСНОЙ УНИФИКАЦИИ

### ЭТАП 1: ДИАГНОСТИКА (БЕЗ ИЗМЕНЕНИЙ)
```sql
-- 1.1 Создаем диагностические представления
CREATE OR REPLACE VIEW account_health_check AS
SELECT 
    u.id,
    u.username,
    u.telegram_id,
    -- Критические проверки
    CASE WHEN telegram_id IS NULL THEN 'CRITICAL' ELSE 'OK' END as telegram_id_status,
    CASE WHEN ref_code IS NULL OR ref_code = '' THEN 'CRITICAL' ELSE 'OK' END as ref_code_status,
    CASE WHEN balance_uni IS NULL OR balance_uni::numeric = 0 THEN 'WARNING' ELSE 'OK' END as uni_balance_status,
    CASE WHEN balance_ton IS NULL OR balance_ton::numeric = 0 THEN 'WARNING' ELSE 'OK' END as ton_balance_status,
    
    -- Связанные данные
    CASE WHEN t.user_id IS NULL THEN 'MISSING' ELSE 'OK' END as transactions_status,
    CASE WHEN u.ton_boost_active = true AND tfd.user_id IS NULL THEN 'INCONSISTENT' ELSE 'OK' END as ton_farming_status,
    
    -- Общая оценка
    CASE 
        WHEN telegram_id IS NULL THEN 'BROKEN'
        WHEN ref_code IS NULL OR ref_code = '' THEN 'BROKEN'
        WHEN t.user_id IS NULL THEN 'ISSUES'
        WHEN u.ton_boost_active = true AND tfd.user_id IS NULL THEN 'ISSUES'
        WHEN balance_uni IS NULL OR balance_uni::numeric = 0 THEN 'WARNINGS'
        ELSE 'GOOD'
    END as overall_status,
    
    u.created_at
FROM users u
LEFT JOIN (SELECT DISTINCT user_id FROM transactions) t ON u.id = t.user_id
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id;

-- 1.2 Статистика по состоянию аккаунтов
SELECT overall_status, COUNT(*) as count, 
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM account_health_check 
GROUP BY overall_status 
ORDER BY count DESC;
```

### ЭТАП 2: СОЗДАНИЕ BACKUP
```sql
-- 2.1 Полный backup всех таблиц
CREATE TABLE users_backup_unification_2025_07_31 AS SELECT * FROM users;
CREATE TABLE transactions_backup_unification_2025_07_31 AS SELECT * FROM transactions;
CREATE TABLE ton_farming_data_backup_unification_2025_07_31 AS SELECT * FROM ton_farming_data;
CREATE TABLE user_sessions_backup_unification_2025_07_31 AS SELECT * FROM user_sessions;

-- 2.2 Backup проблемных аккаунтов
CREATE TABLE problematic_accounts_before_fix AS
SELECT * FROM account_health_check 
WHERE overall_status IN ('BROKEN', 'ISSUES');
```

### ЭТАП 3: БЕЗОПАСНАЯ МИГРАЦИЯ
```sql
BEGIN;

-- 3.1 Исправление критических полей (НЕ затрагивая User ID 25)

-- Заполнение ref_code для пользователей без него
UPDATE users 
SET ref_code = 'REF' || LPAD(id::text, 6, '0')
WHERE (ref_code IS NULL OR ref_code = '') 
AND id != 25; -- НЕ ТРОГАЕМ ЭТАЛОН

-- Инициализация минимальных балансов (только для NULL)
UPDATE users 
SET balance_uni = COALESCE(balance_uni, '0.01'),
    balance_ton = COALESCE(balance_ton, '0.01')
WHERE (balance_uni IS NULL OR balance_ton IS NULL)
AND id != 25; -- НЕ ТРОГАЕМ ЭТАЛОН

-- 3.2 Создание недостающих связанных записей

-- Создание ton_farming_data для активных TON Boost
INSERT INTO ton_farming_data (
    user_id, farming_balance, farming_rate, boost_active, 
    last_update, created_at
)
SELECT 
    u.id, 0.0, 0.0, false, NOW(), NOW()
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id
WHERE u.ton_boost_active = true 
AND tfd.user_id IS NULL
AND u.id != 25; -- НЕ ТРОГАЕМ ЭТАЛОН

-- Создание базовых транзакций для пользователей без истории
INSERT INTO transactions (
    user_id, transaction_type, currency, amount, status, 
    description, created_at, data
)
SELECT 
    u.id, 'SYSTEM_INITIALIZATION', 'UNI', 0.01, 'confirmed',
    'Account unification - system initialization',
    NOW(),
    jsonb_build_object(
        'migration', 'unification_2025_07_31',
        'reason', 'missing_transactions',
        'reference_user', 25
    )
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE t.user_id IS NULL
AND u.id != 25; -- НЕ ТРОГАЕМ ЭТАЛОН

-- 3.3 Синхронизация статусов
UPDATE users 
SET ton_boost_active = false,
    ton_boost_package = NULL,
    ton_boost_rate = NULL
WHERE id IN (
    SELECT u.id 
    FROM users u 
    LEFT JOIN ton_farming_data tfd ON u.id = tfd.user_id 
    WHERE u.ton_boost_active = true 
    AND (tfd.user_id IS NULL OR tfd.boost_active = false)
)
AND id != 25; -- НЕ ТРОГАЕМ ЭТАЛОН

-- Проверочные запросы
SELECT 'После миграции - критические аккаунты:' as check_result;
SELECT COUNT(*) FROM account_health_check WHERE overall_status = 'BROKEN';

SELECT 'После миграции - аккаунты без транзакций:' as check_result;
SELECT COUNT(*) FROM users u LEFT JOIN transactions t ON u.id = t.user_id WHERE t.user_id IS NULL;

-- COMMIT только после проверки результатов
-- COMMIT;
```

## 🎯 АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ДЛЯ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ

### Модификация процесса создания аккаунта
```typescript
// modules/auth/service.ts - добавить в createUser()
async function createUserWithFullInitialization(userData: any) {
    const transaction = await db.transaction();
    
    try {
        // 1. Создаем основного пользователя
        const user = await transaction.insert(users).values({
            telegram_id: userData.telegram_id,
            username: userData.username,
            first_name: userData.first_name,
            ref_code: generateUniqueRefCode(),
            balance_uni: "0.01", // Минимальный баланс
            balance_ton: "0.01", // Минимальный баланс
            parent_ref_code: userData.parent_ref_code || null,
            created_at: new Date()
        }).returning();
        
        // 2. Создаем базовую транзакцию
        await transaction.insert(transactions).values({
            user_id: user.id,
            transaction_type: 'SYSTEM_INITIALIZATION',
            currency: 'UNI',
            amount: "0.01",
            status: 'confirmed',
            description: 'Welcome bonus - account initialization',
            created_at: new Date()
        });
        
        // 3. Создаем запись для фарминга (пассивную)
        await transaction.insert(ton_farming_data).values({
            user_id: user.id,
            farming_balance: "0",
            farming_rate: "0",
            boost_active: false,
            created_at: new Date()
        });
        
        await transaction.commit();
        return user;
        
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

## ⚠️ ПОТЕНЦИАЛЬНЫЕ ПРИЧИНЫ РАЗЛИЧИЙ

### 1. **Временные факторы**
- **Старые пользователи**: Созданы до внедрения полной инициализации
- **Версии системы**: Разные периоды регистрации имели разную логику
- **Обновления схемы**: Миграции БД не всегда затрагивали существующих пользователей

### 2. **Технические сбои**
- **Прерванные регистрации**: Частичное создание аккаунта
- **Race conditions**: Конкурентное создание записей
- **Rollback операции**: Автоматические откаты (частично отключены в системе)

### 3. **Кеширование**
- **Frontend кеш**: Разные версии клиентского кода
- **JWT токены**: Разное время жизни и содержимое
- **WebSocket соединения**: Разные статусы подключений

### 4. **Проблемы интеграции**
- **TON Connect**: Различия в подключении кошельков
- **Telegram WebApp**: Разные версии API
- **API endpoints**: Эволюция серверных методов

## 🔍 РЕКОМЕНДАЦИИ ПО МОНИТОРИНГУ

### 1. **Ежедневные проверки**
```sql
-- Мониторинг новых проблемных аккаунтов
SELECT * FROM account_health_check 
WHERE overall_status IN ('BROKEN', 'ISSUES')
AND created_at >= CURRENT_DATE - INTERVAL '1 day';
```

### 2. **Автоматические алерты**
- Новые аккаунты без ref_code
- TON Boost активация без ton_farming_data  
- Пользователи без транзакций старше 24 часов

### 3. **Метрики качества данных**
- Процент "здоровых" аккаунтов
- Время исправления аномалий
- Количество успешных унификаций

## 📋 ЗАКЛЮЧЕНИЕ

**Проблема**: Аккаунты имеют различную структуру данных из-за эволюции системы, технических сбоев и неполной инициализации.

**Решение**: Поэтапная унификация всех аккаунтов к структуре User ID 25 с сохранением безопасности и возможности отката.

**Результат**: Все аккаунты будут иметь единую, полную структуру данных, что обеспечит консистентное поведение системы для всех пользователей.

**Безопасность**: User ID 25 остается нетронутым как эталон, все изменения обратимы через backup таблицы.