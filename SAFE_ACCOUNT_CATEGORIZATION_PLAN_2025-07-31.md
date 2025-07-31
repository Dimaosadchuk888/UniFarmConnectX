# 🔍 БЕЗОПАСНЫЙ АНАЛИЗ АККАУНТОВ 191-303: ПОДКЛЮЧЕНИЯ ТАБЛИЦ

**Дата**: 31.07.2025  
**Диапазон**: Аккаунты 191-303 (113 аккаунтов)  
**Принцип**: REF_CODE НЕ ТРОГАТЬ, только изучить подключения таблиц  
**Задача**: Найти что не настроено в 1% проблемных аккаунтов

## 📊 АРХИТЕКТУРА ТАБЛИЦ (из schema.ts)

### **ОСНОВНАЯ ТАБЛИЦА: users**
```typescript
users: {
  id, telegram_id, username, first_name, 
  ref_code,           // НЕ ТРОГАТЬ! Работает корректно
  parent_ref_code,    // НЕ ТРОГАТЬ! Работает корректно
  balance_uni, balance_ton,
  ton_farming_balance, ton_farming_rate, ton_boost_active,
  uni_farming_active, uni_farming_balance,
  created_at, is_admin
}
```

### **СВЯЗАННЫЕ ТАБЛИЦЫ ДЛЯ ПРОВЕРКИ:**

#### **1. user_sessions** (критично для аутентификации)
```typescript
user_sessions: {
  user_id → users.id,
  session_token, telegram_init_data,
  expires_at, created_at, last_activity
}
```

#### **2. transactions** (критично для BalanceManager)
```typescript
transactions: {
  user_id → users.id,
  transaction_type, currency, amount, status,
  created_at
}
```

#### **3. user_balances** (альтернативное хранение балансов)
```typescript
user_balances: {
  user_id → users.id,
  balance_uni, balance_ton,
  total_earned_uni, total_earned_ton
}
```

#### **4. ton_farming_data** (для TON Boost синхронизации)
```sql
-- Не в schema.ts, но используется в коде
ton_farming_data: {
  user_id (text), farming_balance, farming_rate, 
  boost_active, last_update
}
```

#### **5. farming_deposits** (UNI фарминг депозиты)
```typescript
farming_deposits: {
  user_id → users.id,
  amount_uni, rate_uni, is_boosted,
  deposit_type, boost_id, expires_at
}
```

#### **6. referrals** (реферальная система)
```typescript
referrals: {
  user_id → users.id,
  inviter_id → users.id,
  level, reward_uni, reward_ton
}
```

## 🎯 ЧТО ПРОВЕРИТЬ У АККАУНТОВ 191-303

### **КРИТИЧЕСКИЕ ПОДКЛЮЧЕНИЯ (99% должны быть ОК):**

#### **Проверка 1: Аутентификация**
```sql
-- Есть ли user_sessions для каждого аккаунта с telegram_id?
SELECT u.id, u.username, u.telegram_id,
       COUNT(s.id) as session_count,
       CASE WHEN u.telegram_id IS NOT NULL AND COUNT(s.id) = 0 
            THEN 'MISSING_SESSION' ELSE 'OK' END as auth_status
FROM users u
LEFT JOIN user_sessions s ON u.id = s.user_id
WHERE u.id BETWEEN 191 AND 303
GROUP BY u.id, u.username, u.telegram_id;
```

#### **Проверка 2: BalanceManager**
```sql
-- Есть ли транзакции для работы BalanceManager?
SELECT u.id, u.username,
       COUNT(t.id) as transaction_count,
       CASE WHEN COUNT(t.id) = 0 
            THEN 'MISSING_TRANSACTIONS' ELSE 'OK' END as balance_manager_status
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE u.id BETWEEN 191 AND 303
GROUP BY u.id, u.username;
```

#### **Проверка 3: TON Boost синхронизация**
```sql
-- Синхронизированы ли users.ton_boost_active с ton_farming_data?
SELECT u.id, u.username, u.ton_boost_active,
       tfd.user_id as has_farming_data,
       CASE WHEN u.ton_boost_active = true AND tfd.user_id IS NULL 
            THEN 'BOOST_NOT_SYNCED' ELSE 'OK' END as boost_sync_status
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.id BETWEEN 191 AND 303;
```

#### **Проверка 4: Расположение балансов**
```sql
-- Где хранятся балансы: в users или user_balances?
SELECT u.id, u.username,
       u.balance_uni as users_uni, u.balance_ton as users_ton,
       ub.balance_uni as alt_uni, ub.balance_ton as alt_ton,
       CASE 
         WHEN u.balance_uni != '0' AND ub.user_id IS NULL THEN 'USERS_TABLE'
         WHEN u.balance_uni = '0' AND ub.balance_uni != '0' THEN 'ALT_TABLE'
         WHEN u.balance_uni != '0' AND ub.balance_uni != '0' THEN 'BOTH_TABLES'
         ELSE 'ZERO_BALANCES'
       END as balance_location
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.id BETWEEN 191 AND 303;
```

### **ДОПОЛНИТЕЛЬНЫЕ ПОДКЛЮЧЕНИЯ (информационные):**

#### **Проверка 5: Фарминг депозиты**
```sql
SELECT u.id, u.username, u.uni_farming_active,
       COUNT(fd.id) as farming_deposits_count
FROM users u
LEFT JOIN farming_deposits fd ON u.id = fd.user_id
WHERE u.id BETWEEN 191 AND 303
GROUP BY u.id, u.username, u.uni_farming_active;
```

#### **Проверка 6: Реферальные связи** (НЕ ИЗМЕНЯТЬ!)
```sql
-- Проверить реферальные подключения (только для информации)
SELECT u.id, u.username, u.ref_code, u.parent_ref_code,
       COUNT(r.id) as referrals_count
FROM users u
LEFT JOIN referrals r ON u.id = r.inviter_id
WHERE u.id BETWEEN 191 AND 303
GROUP BY u.id, u.username, u.ref_code, u.parent_ref_code;
```

## 🔧 ОЖИДАЕМЫЕ ПРОБЛЕМЫ (1% аккаунтов)

### **Тип проблемы 1: Отсутствуют user_sessions**
- **Симптом**: telegram_id есть, но нет записей в user_sessions
- **Влияние**: Проблемы с JWT токенами и аутентификацией
- **Решение**: Создать базовую сессию

### **Тип проблемы 2: Нет транзакций**
- **Симптом**: Аккаунт есть, но 0 записей в transactions
- **Влияние**: BalanceManager не функционирует
- **Решение**: Создать техническую транзакцию

### **Тип проблемы 3: TON Boost рассинхронизирован**
- **Симптом**: ton_boost_active = true, но нет записи в ton_farming_data
- **Влияние**: TON Boost не начисляется
- **Решение**: Создать запись в ton_farming_data

### **Тип проблемы 4: Балансы в неправильном месте**
- **Симптом**: Балансы в user_balances вместо users
- **Влияние**: Несовместимость с архитектурой User ID 25
- **Решение**: Мигрировать балансы в users

## 📋 ПЛАН БЕЗОПАСНОГО АНАЛИЗА

### **Этап 1: Диагностика (только SELECT запросы)**
- Запустить все проверочные запросы
- Выявить аккаунты с проблемами подключений
- Создать список конкретных исправлений

### **Этап 2: Классификация проблем**
- ✅ Работающие аккаунты (ожидается ~110 из 113)
- ⚠️ Частично работающие (ожидается ~2-3 аккаунта)  
- ❌ Проблемные (ожидается ~0-1 аккаунт)

### **Этап 3: Точечные исправления (только для проблемных)**
- НЕ ТРОГАТЬ ref_code и parent_ref_code
- НЕ ТРОГАТЬ работающие аккаунты
- Исправить только выявленные проблемы подключений

## 🛡️ ГАРАНТИИ БЕЗОПАСНОСТИ

### **НЕ ИЗМЕНЯЕМ:**
- ✅ ref_code (работают корректно)
- ✅ parent_ref_code (работают корректно)
- ✅ Реферальные связи
- ✅ Работающие аккаунты (99%)
- ✅ User ID 25 (эталон)

### **ИЗМЕНЯЕМ ТОЛЬКО:**
- ❌ Отсутствующие user_sessions
- ❌ Отсутствующие транзакции
- ❌ Рассинхронизированные TON Boost данные
- ❌ Неправильное расположение балансов

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

### **После анализа:**
- 📊 Точная картина подключений всех 113 аккаунтов
- 🔍 Выявлены конкретные проблемы в 1-3 аккаунтах
- 📋 Готовый план точечных исправлений

### **После исправлений:**
- ✅ Все аккаунты 191-303 имеют правильные подключения таблиц
- ✅ BalanceManager работает для всех аккаунтов
- ✅ Аутентификация работает корректно
- ✅ TON Boost синхронизирован
- ✅ Реферальные связи остались нетронутыми

План готов к безопасному выполнению с сохранением всех работающих систем!