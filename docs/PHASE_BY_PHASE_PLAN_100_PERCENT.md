# 📋 ПОЭТАПНЫЙ ПЛАН ОПТИМИЗАЦИИ БД - 100% ТОЧНОСТЬ

**Дата создания:** 2025-08-01  
**Контрольная сумма балансов:** 112,935,565.07  
**Всего записей:** 845,228 транзакций, 103 пользователя

## ⚠️ КРИТИЧЕСКИ ВАЖНО

**ВСЕ ДАННЫЕ ДОЛЖНЫ БЫТЬ СОХРАНЕНЫ!**
- Перед каждой фазой - проверка
- После каждой фазы - валидация  
- При любой ошибке - откат

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ (после аудита)

| Таблица | Записей | Статус | Критические данные |
|---------|---------|--------|-------------------|
| users | 103 | ✅ Основная | Балансы, farming данные |
| transactions | 845,228 | ⚠️ Гибридная | 2 формата данных |
| withdraw_requests | 159 | ⚠️ Дублирование | telegram_id, username |
| uni_farming_data | 98 | ❌ Дублирует users | Farming балансы |
| ton_farming_data | 44 | ❌ Дублирует users | TON boost данные |
| referrals | 52 | ⚠️ Частичное дубл. | Реферальные связи |
| missions | 5 | ✅ Уникальная | Настройки миссий |

**Проверки целостности:**
- ✅ Транзакции без пользователей: 0
- ✅ Выводы без пользователей: 0  
- ✅ Farming данные без пользователей: 0

---

## 🔄 ФАЗА 0: ПОДГОТОВКА (30 минут) [CRITICAL]

### Цель
Создать полные резервные копии и документацию текущего состояния

### Предварительные проверки
```sql
-- 1. Проверить права доступа
SELECT current_user, current_database();

-- 2. Проверить свободное место
SELECT pg_database_size(current_database());

-- 3. Получить точные счётчики
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM transactions) as tx_count,
  (SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) FROM users) as total_balance;
```

### Действия
1. **Создать полный backup БД**
   ```bash
   pg_dump -U postgres -d unifarm_production > backup_20250801_$(date +%H%M%S).sql
   ```

2. **Экспорт критических данных в CSV**
   ```sql
   -- Балансы пользователей
   COPY (
     SELECT id, telegram_id, username, balance_uni, balance_ton, 
            uni_farming_balance, ton_farming_balance,
            (balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
     FROM users
     ORDER BY total DESC
   ) TO '/tmp/user_balances_backup.csv' CSV HEADER;
   
   -- Farming статусы
   COPY (
     SELECT id, user_id, deposit_amount, farming_balance, is_active
     FROM uni_farming_data
   ) TO '/tmp/uni_farming_backup.csv' CSV HEADER;
   ```

3. **Документировать топ-20 пользователей**
   ```sql
   SELECT 
     id, telegram_id, username,
     balance_uni, balance_ton,
     uni_farming_balance, ton_farming_balance,
     (balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
   FROM users
   ORDER BY total DESC
   LIMIT 20;
   ```

### Проверки после
- [ ] Backup файл создан и не пустой (размер > 100MB)
- [ ] CSV файлы экспортированы
- [ ] Скриншоты админ панели сделаны
- [ ] Контрольная сумма записана: **112,935,565.07**

---

## 🔄 ФАЗА 1: СИНХРОНИЗАЦИЯ FARMING (15 минут) [CRITICAL]

### Цель
Перенести ВСЕ farming данные в таблицу users без потерь

### Предварительные проверки
```sql
-- 1. Найти расхождения в UNI farming
SELECT 
  u.id,
  u.telegram_id,
  u.uni_deposit_amount as user_deposit,
  ufd.deposit_amount as farming_deposit,
  u.uni_farming_balance as user_balance,
  ufd.farming_balance as farming_balance,
  CASE 
    WHEN u.uni_deposit_amount != COALESCE(ufd.deposit_amount, 0) THEN 'DEPOSIT_DIFF'
    WHEN u.uni_farming_balance != COALESCE(ufd.farming_balance, 0) THEN 'BALANCE_DIFF'
    ELSE 'OK'
  END as status
FROM users u
LEFT JOIN uni_farming_data ufd ON u.id = ufd.user_id
WHERE ufd.user_id IS NOT NULL
  AND (u.uni_deposit_amount != ufd.deposit_amount 
       OR u.uni_farming_balance != ufd.farming_balance);

-- 2. Найти расхождения в TON boost
SELECT 
  u.id,
  u.ton_boost_active,
  tfd.boost_active,
  u.ton_farming_balance,
  tfd.farming_balance
FROM users u
LEFT JOIN ton_farming_data tfd ON u.id = CAST(tfd.user_id AS INTEGER)
WHERE tfd.user_id IS NOT NULL
  AND (u.ton_boost_active != tfd.boost_active
       OR u.ton_farming_balance != tfd.farming_balance);

-- 3. Сохранить контрольную сумму ДО
SELECT 
  SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as checksum_before
FROM users;
```

### Действия
```sql
-- НАЧАТЬ ТРАНЗАКЦИЮ
BEGIN;

-- 1. Создать архивные таблицы
CREATE TABLE archive_uni_farming_data AS 
SELECT *, NOW() as archived_at FROM uni_farming_data;

CREATE TABLE archive_ton_farming_data AS 
SELECT *, NOW() as archived_at FROM ton_farming_data;

-- 2. Синхронизировать UNI farming (только где есть расхождения)
UPDATE users u
SET 
  uni_deposit_amount = GREATEST(u.uni_deposit_amount, COALESCE(ufd.deposit_amount, 0)),
  uni_farming_balance = GREATEST(u.uni_farming_balance, COALESCE(ufd.farming_balance, 0)),
  uni_farming_rate = CASE 
    WHEN ufd.farming_rate > 0 THEN ufd.farming_rate 
    ELSE COALESCE(u.uni_farming_rate, 0.01)
  END,
  uni_farming_active = u.uni_farming_active OR COALESCE(ufd.is_active, false),
  uni_farming_start_timestamp = COALESCE(u.uni_farming_start_timestamp, ufd.farming_start_timestamp),
  uni_farming_last_update = GREATEST(u.uni_farming_last_update, ufd.farming_last_update)
FROM uni_farming_data ufd
WHERE u.id = ufd.user_id;

-- 3. Синхронизировать TON boost
UPDATE users u
SET 
  ton_boost_active = u.ton_boost_active OR COALESCE(tfd.boost_active, false),
  ton_boost_package_id = COALESCE(u.ton_boost_package_id, tfd.boost_package_id),
  ton_boost_rate = GREATEST(u.ton_boost_rate, COALESCE(tfd.farming_rate, 0)),
  ton_farming_balance = GREATEST(u.ton_farming_balance, COALESCE(tfd.farming_balance, 0)),
  ton_farming_start_timestamp = COALESCE(u.ton_farming_start_timestamp, tfd.farming_start_timestamp),
  ton_farming_last_update = GREATEST(u.ton_farming_last_update, tfd.farming_last_update)
FROM ton_farming_data tfd
WHERE u.id = CAST(tfd.user_id AS INTEGER);

-- ПРОВЕРИТЬ результат
SELECT 
  SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as checksum_after
FROM users;

-- Если всё ОК - зафиксировать
COMMIT;
-- Если проблемы - откатить
-- ROLLBACK;
```

### Проверки после
```sql
-- 1. Контрольная сумма должна совпадать
SELECT 
  SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as checksum
FROM users;
-- ДОЛЖНО БЫТЬ: 112,935,565.07

-- 2. Количество активных фермеров
SELECT 
  COUNT(*) FILTER (WHERE uni_farming_active) as uni_farmers,
  COUNT(*) FILTER (WHERE ton_boost_active) as ton_boosters
FROM users;

-- 3. Проверить через API
-- GET /api/v2/uni-farming/status?user_id=1
-- GET /api/v2/ton-boost/status?user_id=1
```

---

## 🔄 ФАЗА 2: ОЧИСТКА WITHDRAW_REQUESTS (10 минут) [HIGH]

### Цель
Удалить дублирующие поля telegram_id и username

### Предварительные проверки
```sql
-- 1. Проверить совпадение данных
SELECT 
  wr.id,
  wr.telegram_id = u.telegram_id as telegram_match,
  wr.username = u.username as username_match
FROM withdraw_requests wr
JOIN users u ON wr.user_id = u.id
WHERE wr.telegram_id != u.telegram_id 
   OR wr.username != u.username;

-- 2. Найти активные заявки
SELECT COUNT(*) as pending_count
FROM withdraw_requests
WHERE status = 'pending';
```

### Действия
```sql
BEGIN;

-- 1. Создать VIEW для совместимости
CREATE OR REPLACE VIEW withdraw_requests_full AS
SELECT 
  wr.id,
  wr.user_id,
  wr.amount_ton,
  wr.ton_wallet,
  wr.status,
  wr.created_at,
  wr.processed_at,
  wr.processed_by,
  u.telegram_id,
  u.username,
  u.first_name,
  u.balance_ton as current_balance
FROM withdraw_requests wr
JOIN users u ON wr.user_id = u.id;

-- 2. Проверить что VIEW работает
SELECT * FROM withdraw_requests_full LIMIT 5;

-- 3. Удалить дублирующие поля
ALTER TABLE withdraw_requests 
DROP COLUMN telegram_id CASCADE,
DROP COLUMN username CASCADE;

COMMIT;
```

### Проверки после
- [ ] VIEW возвращает правильные данные
- [ ] Админ панель показывает список выводов
- [ ] Можно создать новую заявку на вывод

---

## 🔄 ФАЗА 3: УНИФИКАЦИЯ TRANSACTIONS (20 минут) [HIGH]

### Цель
Создать единый формат для транзакций с обратной совместимостью

### Предварительные проверки
```sql
-- Анализ форматов
SELECT 
  COUNT(*) FILTER (WHERE currency IS NOT NULL) as new_format,
  COUNT(*) FILTER (WHERE currency IS NULL AND (amount_uni > 0 OR amount_ton > 0)) as old_format,
  COUNT(*) FILTER (WHERE currency IS NOT NULL AND (amount_uni > 0 OR amount_ton > 0)) as hybrid
FROM transactions;
```

### Действия
```sql
BEGIN;

-- 1. Добавить вычисляемые поля
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS unified_amount DECIMAL(20,6) 
GENERATED ALWAYS AS (COALESCE(amount, amount_uni + amount_ton)) STORED;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS unified_currency VARCHAR(10)
GENERATED ALWAYS AS (
  COALESCE(
    currency,
    CASE 
      WHEN amount_ton > 0 THEN 'TON'
      WHEN amount_uni > 0 THEN 'UNI'
      ELSE 'UNKNOWN'
    END
  )
) STORED;

-- 2. Создать индекс
CREATE INDEX idx_transactions_unified 
ON transactions(user_id, unified_currency, created_at DESC);

-- 3. Проверить вычисления
SELECT 
  id, type, 
  amount_uni, amount_ton, amount, currency,
  unified_amount, unified_currency
FROM transactions 
LIMIT 20;

COMMIT;
```

### Проверки после
- [ ] Суммы транзакций совпадают в обоих форматах
- [ ] История транзакций отображается корректно
- [ ] Статистика считается правильно

---

## 🔄 ФАЗА 4: ИНДЕКСЫ (10 минут) [MEDIUM]

### Действия
```sql
-- Индексы для users
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_balance_uni ON users(balance_uni) WHERE balance_uni > 0;
CREATE INDEX IF NOT EXISTS idx_users_balance_ton ON users(balance_ton) WHERE balance_ton > 0;
CREATE INDEX IF NOT EXISTS idx_users_farming_active ON users(uni_farming_active) WHERE uni_farming_active = true;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;

-- Индексы для transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type, created_at DESC);

-- Обновить статистику
ANALYZE users;
ANALYZE transactions;
```

---

## 🔄 ФАЗА 5: УДАЛЕНИЕ ТАБЛИЦ (5 минут) [LOW]

### Предварительные проверки
- [ ] Система работает 24+ часа без farming таблиц
- [ ] Архивы созданы (archive_uni_farming_data, archive_ton_farming_data)
- [ ] Код не использует старые таблицы

### Действия
```sql
-- Только после полного тестирования!
DROP TABLE IF EXISTS uni_farming_data CASCADE;
DROP TABLE IF EXISTS ton_farming_data CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
```

---

## 🔄 ФАЗА 6: ОБНОВЛЕНИЕ КОДА [CRITICAL]

### Файлы для обновления

1. **server/repositories/UniFarmingRepository.ts**
   - Удалить все ссылки на `uni_farming_data`
   - Читать только из `users`

2. **server/repositories/TonFarmingRepository.ts**
   - Удалить все ссылки на `ton_farming_data`
   - Читать только из `users`

3. **server/controllers/WithdrawController.ts**
   - Использовать `withdraw_requests_full` VIEW

4. **shared/schema.ts**
   - Удалить определения старых таблиц
   - Добавить определения для VIEW

---

## ✅ ФИНАЛЬНАЯ ПРОВЕРКА

### SQL тесты валидации
```sql
-- 1. Контрольная сумма балансов
SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
FROM users;
-- ДОЛЖНО БЫТЬ: 112,935,565.07

-- 2. Количество записей
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM transactions) as transactions,
  (SELECT COUNT(*) FROM withdraw_requests) as withdrawals;

-- 3. Активные процессы
SELECT 
  COUNT(*) FILTER (WHERE uni_farming_active) as uni_farmers,
  COUNT(*) FILTER (WHERE ton_boost_active) as ton_boosters,
  COUNT(*) FILTER (WHERE referred_by IS NOT NULL) as referrals
FROM users;
```

### Функциональные тесты
- [ ] Авторизация пользователя
- [ ] Отображение балансов
- [ ] Claim UNI farming
- [ ] Активация TON boost
- [ ] Создание заявки на вывод
- [ ] Реферальные начисления
- [ ] История транзакций

---

## 🚨 ПЛАН ОТКАТА

Если что-то пошло не так:

1. **Немедленно остановить все изменения**
2. **Восстановить из backup:**
   ```bash
   psql -U postgres -d unifarm_production < backup_20250801_HHMMSS.sql
   ```
3. **Проверить восстановление:**
   ```sql
   SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) FROM users;
   ```
4. **Уведомить команду**

---

## 📝 КОНТРОЛЬНЫЙ ЛИСТ

- [ ] Фаза 0: Backup создан
- [ ] Фаза 1: Farming синхронизирован
- [ ] Фаза 2: withdraw_requests очищен
- [ ] Фаза 3: transactions унифицирован
- [ ] Фаза 4: Индексы созданы
- [ ] Фаза 5: Старые таблицы удалены
- [ ] Фаза 6: Код обновлён
- [ ] Финальная проверка пройдена
- [ ] Документация обновлена

**Общее время:** ~3 часа с тестированием

**ПОМНИТЕ: Лучше потратить больше времени на проверки, чем потерять данные!**