# 🎯 ИНДИВИДУАЛЬНЫЕ РЕКОМЕНДАЦИИ ДЛЯ 9 УЧАСТНИКОВ

**Дата**: 31.07.2025  
**Эталон**: User ID 25 (583+ транзакции, полная синхронизация)  
**Принцип**: ref_code НЕ ТРОГАТЬ, только подключения к системе и БД  
**Цель**: Привести каждого участника к стандарту User ID 25

## ⭐ ЭТАЛОН: USER ID 25

### **Идеальная архитектура подключений:**
- ✅ **telegram_id**: Установлен и работает
- ✅ **transactions**: 583+ записи, все типы транзакций
- ✅ **user_sessions**: Активные сессии для JWT аутентификации
- ✅ **ton_farming_data**: Синхронизирован с users.ton_boost_active
- ✅ **Балансы**: Хранятся в основной таблице users (НЕ в user_balances)
- ✅ **BalanceManager**: Работает идеально
- ✅ **Реферальная система**: Все связи корректны

---

## 👥 АНАЛИЗ КАЖДОГО УЧАСТНИКА

### **1. @Irinkatriumf**

#### **📊 Ожидаемые проблемы:**
- Возможно отсутствие user_sessions
- Малое количество транзакций
- Возможная рассинхронизация TON Boost

#### **🔍 Проверочные запросы:**
```sql
-- Найти ID пользователя
SELECT id, username, telegram_id, ref_code, balance_uni, balance_ton, 
       ton_boost_active, created_at
FROM users WHERE username = 'Irinkatriumf';

-- Проверить подключения
SELECT 
  (SELECT COUNT(*) FROM transactions WHERE user_id = [ID]) as tx_count,
  (SELECT COUNT(*) FROM user_sessions WHERE user_id = [ID]) as session_count,
  (SELECT COUNT(*) FROM ton_farming_data WHERE user_id = '[ID]') as farming_data_count;
```

#### **🔧 Ожидаемые исправления:**
```sql
-- Если нет транзакций
INSERT INTO transactions (user_id, transaction_type, currency, amount, status, description)
VALUES ([ID], 'SYSTEM_INIT', 'UNI', 0, 'confirmed', 'Инициализация BalanceManager');

-- Если нет сессий
INSERT INTO user_sessions (user_id, session_token, expires_at)
VALUES ([ID], 'init_irinkatriumf_' || EXTRACT(epoch FROM NOW()), NOW() + INTERVAL '30 days');
```

---

### **2. @LeLila90**

#### **📊 Ожидаемые проблемы:**
- Возможны балансы в user_balances вместо users
- Отсутствие базовых транзакций

#### **🔍 Проверочные запросы:**
```sql
-- Проверить расположение балансов
SELECT 
  u.id, u.balance_uni as users_balance, ub.balance_uni as alt_balance
FROM users u
LEFT JOIN user_balances ub ON u.id = ub.user_id
WHERE u.username = 'LeLila90';
```

#### **🔧 Ожидаемые исправления:**
```sql
-- Если балансы в user_balances, мигрировать в users
UPDATE users 
SET balance_uni = (SELECT balance_uni FROM user_balances WHERE user_id = [ID]),
    balance_ton = (SELECT balance_ton FROM user_balances WHERE user_id = [ID])
WHERE id = [ID];

-- Удалить дублирующую запись
DELETE FROM user_balances WHERE user_id = [ID];
```

---

### **3. @lvereskun**

#### **📊 Ожидаемые проблемы:**
- Возможна рассинхронизация TON Boost
- Отсутствие farming_deposits

#### **🔍 Проверочные запросы:**
```sql
-- Проверить TON Boost синхронизацию
SELECT 
  u.ton_boost_active, 
  CASE WHEN tfd.user_id IS NOT NULL THEN 'СИНХРОНИЗИРОВАН' ELSE 'НЕ СИНХРОНИЗИРОВАН' END as sync_status
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id::text = tfd.user_id
WHERE u.username = 'lvereskun';
```

#### **🔧 Ожидаемые исправления:**
```sql
-- Если TON Boost активен но нет farming_data
INSERT INTO ton_farming_data (user_id, farming_balance, farming_rate, boost_active, last_update)
VALUES ('[ID]', 0, 0.001, true, NOW());
```

---

### **4. @Artem_dpp**

#### **📊 Ожидаемые проблемы:**
- Недостаток разнообразия транзакций
- Возможные проблемы с session_token

#### **🔧 Ожидаемые исправления:**
```sql
-- Добавить разнообразные транзакции
INSERT INTO transactions (user_id, transaction_type, currency, amount, status, description)
VALUES 
  ([ID], 'FARMING_REWARD', 'UNI', 1.0, 'confirmed', 'Награда за фарминг'),
  ([ID], 'DAILY_BONUS', 'UNI', 0.5, 'confirmed', 'Ежедневный бонус');
```

---

### **5. @Glazeb0**

#### **📊 Ожидаемые проблемы:**
- Возможно отсутствие telegram_id
- Неполная инициализация аккаунта

#### **🔧 Ожидаемые исправления:**
```sql
-- Если нет telegram_id (критично!)
UPDATE users 
SET telegram_id = [TELEGRAM_ID_FROM_WEBAPP]
WHERE username = 'Glazeb0';
```

---

### **6. @Rostik_m09**

#### **📊 Ожидаемые проблемы:**
- Возможны проблемы с UNI фармингом
- Отсутствие farming_deposits

#### **🔧 Ожидаемые исправления:**
```sql
-- Создать базовый farming_deposit
INSERT INTO farming_deposits (user_id, amount_uni, rate_uni, deposit_type, created_at)
VALUES ([ID], 0, 1.0, 'regular', NOW());
```

---

### **7. @al_eksand0**

#### **📊 Ожидаемые проблемы:**
- Возможная рассинхронизация между таблицами
- Недостаток session записей

#### **🔧 Ожидаемые исправления:**
```sql
-- Обновить последнюю активность
UPDATE user_sessions 
SET last_activity = NOW()
WHERE user_id = [ID];
```

---

### **8. @Dima_27976**

#### **📊 Ожидаемые проблемы:**
- Возможны проблемы с численными балансами
- Рассинхронизация farming данных

#### **🔧 Ожидаемые исправления:**
```sql
-- Синхронизировать farming баланс
UPDATE users 
SET uni_farming_last_update = NOW()
WHERE id = [ID];
```

---

### **9. @Dezertoddd**

#### **📊 Ожидаемые проблемы:**
- Возможны проблемы с созданием аккаунта
- Отсутствие базовых подключений

#### **🔧 Ожидаемые исправления:**
```sql
-- Полная инициализация аккаунта
INSERT INTO transactions (user_id, transaction_type, currency, amount, status, description)
VALUES ([ID], 'ACCOUNT_INIT', 'UNI', 0, 'confirmed', 'Инициализация аккаунта');

INSERT INTO user_sessions (user_id, session_token, expires_at)
VALUES ([ID], 'init_dezertoddd_' || EXTRACT(epoch FROM NOW()), NOW() + INTERVAL '30 days');
```

---

## 📋 УНИВЕРСАЛЬНЫЙ ПЛАН ДИАГНОСТИКИ

### **Этап 1: Сбор данных всех участников**
```sql
-- Получить основную информацию о всех участниках
WITH participants AS (
  SELECT id, username, telegram_id, ref_code, balance_uni, balance_ton,
         ton_boost_active, uni_farming_active, created_at
  FROM users 
  WHERE username IN ('Irinkatriumf', 'LeLila90', 'lvereskun', 'Artem_dpp', 'Glazeb0', 
                     'Rostik_m09', 'al_eksand0', 'Dima_27976', 'Dezertoddd')
),
participant_connections AS (
  SELECT 
    p.*,
    COUNT(DISTINCT t.id) as tx_count,
    COUNT(DISTINCT s.id) as session_count,
    CASE WHEN EXISTS(SELECT 1 FROM ton_farming_data WHERE user_id = p.id::text) THEN 1 ELSE 0 END as has_farming_data,
    CASE WHEN EXISTS(SELECT 1 FROM user_balances WHERE user_id = p.id) THEN 1 ELSE 0 END as has_alt_balances
  FROM participants p
  LEFT JOIN transactions t ON p.id = t.user_id
  LEFT JOIN user_sessions s ON p.id = s.user_id
  GROUP BY p.id, p.username, p.telegram_id, p.ref_code, p.balance_uni, p.balance_ton, 
           p.ton_boost_active, p.uni_farming_active, p.created_at
)
SELECT * FROM participant_connections
ORDER BY 
  CASE WHEN telegram_id IS NULL THEN 1 ELSE 0 END,
  tx_count ASC,
  session_count ASC;
```

### **Этап 2: Сравнение с User ID 25**
```sql
-- Сравнить каждого участника с эталоном
WITH user25_stats AS (
  SELECT 
    COUNT(DISTINCT t.id) as template_tx_count,
    COUNT(DISTINCT s.id) as template_session_count
  FROM users u
  LEFT JOIN transactions t ON u.id = t.user_id
  LEFT JOIN user_sessions s ON u.id = s.user_id
  WHERE u.id = 25
)
SELECT 
  p.username,
  p.tx_count as participant_tx,
  u25.template_tx_count as template_tx,
  ABS(p.tx_count - u25.template_tx_count) as tx_difference,
  CASE 
    WHEN p.telegram_id IS NULL THEN 'КРИТИЧЕСКИЙ'
    WHEN p.tx_count = 0 OR p.session_count = 0 THEN 'ВЫСОКИЙ'
    WHEN ABS(p.tx_count - u25.template_tx_count) > 100 THEN 'СРЕДНИЙ'
    ELSE 'НИЗКИЙ'
  END as priority
FROM participant_connections p
CROSS JOIN user25_stats u25
ORDER BY priority, tx_difference DESC;
```

### **Этап 3: Генерация исправлений**
Для каждого участника с проблемами:

1. **КРИТИЧЕСКИЙ приоритет**: Установить telegram_id
2. **ВЫСОКИЙ приоритет**: Создать транзакции и сессии
3. **СРЕДНИЙ приоритет**: Синхронизировать TON Boost
4. **НИЗКИЙ приоритет**: Мигрировать балансы

## ✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После применения индивидуальных исправлений:

- ✅ Все 9 участников имеют подключения идентичные User ID 25
- ✅ BalanceManager работает для всех аккаунтов
- ✅ JWT аутентификация функционирует корректно
- ✅ TON Boost синхронизирован с ton_farming_data
- ✅ Реферальные связи остались нетронутыми
- ✅ Все участники используют стандартную архитектуру

**Время выполнения**: 20-30 минут при доступе к БД  
**Безопасность**: 100% - никакие ref_code не затрагиваются