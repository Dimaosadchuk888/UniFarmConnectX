# 🎯 СТРАТЕГИЯ ИДЕАЛЬНОГО ВЫПОЛНЕНИЯ - 10 из 10

**Дата:** 2025-08-01  
**Цель:** Оптимизация БД с 0% риском потери данных

---

## 🏆 МОИ РЕКОМЕНДАЦИИ ДЛЯ ИДЕАЛЬНОГО РЕЗУЛЬТАТА

### 1️⃣ ЗОЛОТЫЕ ПРАВИЛА
- **Никогда не спешите** - лучше потратить 5 часов, чем потерять 1 байт данных
- **Проверяйте дважды** - каждую команду, каждый результат
- **Документируйте всё** - каждый шаг, каждое изменение
- **Используйте транзакции** - всегда BEGIN/COMMIT/ROLLBACK
- **Тестируйте поэтапно** - после каждого изменения

### 2️⃣ ПОДГОТОВКА РАБОЧЕГО МЕСТА
```bash
# 1. Создайте папку для работы
mkdir -p ~/unifarm_migration_$(date +%Y%m%d)
cd ~/unifarm_migration_$(date +%Y%m%d)

# 2. Создайте структуру папок
mkdir -p {backups,logs,scripts,reports,csv_exports}

# 3. Начните логирование
script -a logs/migration_log_$(date +%H%M%S).txt
```

---

## 📋 ПОШАГОВЫЙ ПЛАН ВЫПОЛНЕНИЯ

### ЭТАП 1: СУПЕР-ПОДГОТОВКА (45 минут)

#### 1.1 Проверка окружения
```sql
-- Выполните в SQL консоли
SELECT version();
SELECT current_user, current_database();
SELECT pg_database_size(current_database()) / 1024 / 1024 as size_mb;
SHOW max_connections;
SELECT COUNT(*) FROM pg_stat_activity;
```

#### 1.2 Создание контрольных точек
```sql
-- Сохраните результаты КАЖДОГО запроса!
-- checkpoint_1_users.txt
SELECT id, telegram_id, username, 
       balance_uni, balance_ton,
       uni_farming_balance, ton_farming_balance,
       (balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
FROM users 
ORDER BY id;

-- checkpoint_1_summary.txt
SELECT 
  'users' as table_name, COUNT(*) as count,
  SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total_balance
FROM users
UNION ALL
SELECT 'transactions', COUNT(*), SUM(COALESCE(amount, amount_uni + amount_ton))
FROM transactions
UNION ALL
SELECT 'uni_farming_data', COUNT(*), SUM(farming_balance)
FROM uni_farming_data
UNION ALL
SELECT 'ton_farming_data', COUNT(*), SUM(farming_balance)
FROM ton_farming_data;
```

#### 1.3 Тройное резервное копирование
```bash
# 1. Полный дамп БД
pg_dump -U postgres -d $DATABASE_URL \
  --verbose \
  --format=custom \
  --file=backups/full_backup_$(date +%Y%m%d_%H%M%S).dump

# 2. SQL формат для быстрого просмотра
pg_dump -U postgres -d $DATABASE_URL \
  --verbose \
  --format=plain \
  --file=backups/full_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Отдельный backup критических таблиц
pg_dump -U postgres -d $DATABASE_URL \
  --table=users \
  --table=transactions \
  --table=uni_farming_data \
  --table=ton_farming_data \
  --data-only \
  --file=backups/critical_data_$(date +%Y%m%d_%H%M%S).sql
```

#### 1.4 CSV экспорт для Excel проверки
```sql
-- Запустите через psql с правами на запись
\COPY (SELECT * FROM users ORDER BY id) TO 'csv_exports/users_full.csv' CSV HEADER;
\COPY (SELECT * FROM uni_farming_data ORDER BY user_id) TO 'csv_exports/uni_farming_data.csv' CSV HEADER;
\COPY (SELECT * FROM ton_farming_data ORDER BY user_id) TO 'csv_exports/ton_farming_data.csv' CSV HEADER;
\COPY (SELECT * FROM transactions ORDER BY id DESC LIMIT 10000) TO 'csv_exports/transactions_recent.csv' CSV HEADER;
```

---

### ЭТАП 2: АНАЛИЗ РАСХОЖДЕНИЙ (30 минут)

#### 2.1 Детальный анализ UNI farming
```sql
-- Создайте таблицу с расхождениями
CREATE TEMP TABLE uni_farming_diff AS
SELECT 
  u.id,
  u.telegram_id,
  u.username,
  u.uni_deposit_amount as user_deposit,
  ufd.deposit_amount as farming_deposit,
  ABS(u.uni_deposit_amount - COALESCE(ufd.deposit_amount, 0)) as deposit_diff,
  u.uni_farming_balance as user_balance,
  ufd.farming_balance as farming_balance,
  ABS(u.uni_farming_balance - COALESCE(ufd.farming_balance, 0)) as balance_diff,
  u.uni_farming_active as user_active,
  ufd.is_active as farming_active,
  CASE 
    WHEN ufd.user_id IS NULL THEN 'NO_FARMING_RECORD'
    WHEN u.uni_deposit_amount > COALESCE(ufd.deposit_amount, 0) THEN 'USER_HAS_MORE'
    WHEN u.uni_deposit_amount < COALESCE(ufd.deposit_amount, 0) THEN 'FARMING_HAS_MORE'
    WHEN u.uni_farming_balance != COALESCE(ufd.farming_balance, 0) THEN 'BALANCE_DIFF'
    ELSE 'SYNCED'
  END as sync_status
FROM users u
LEFT JOIN uni_farming_data ufd ON u.id = ufd.user_id
WHERE u.uni_deposit_amount > 0 OR ufd.user_id IS NOT NULL;

-- Анализ результатов
SELECT sync_status, COUNT(*), SUM(deposit_diff), SUM(balance_diff)
FROM uni_farming_diff
GROUP BY sync_status;

-- Детали проблемных записей
SELECT * FROM uni_farming_diff 
WHERE sync_status != 'SYNCED'
ORDER BY deposit_diff DESC, balance_diff DESC;
```

#### 2.2 План действий по расхождениям
```sql
-- Для каждого типа расхождения определяем стратегию
SELECT 
  sync_status,
  COUNT(*) as count,
  'Стратегия: ' || 
  CASE sync_status
    WHEN 'USER_HAS_MORE' THEN 'Оставляем данные из users (больше)'
    WHEN 'FARMING_HAS_MORE' THEN 'Берём максимум из обеих таблиц'
    WHEN 'BALANCE_DIFF' THEN 'Берём максимальный баланс'
    WHEN 'NO_FARMING_RECORD' THEN 'Оставляем как есть в users'
  END as strategy
FROM uni_farming_diff
GROUP BY sync_status;
```

---

### ЭТАП 3: БЕЗОПАСНАЯ СИНХРОНИЗАЦИЯ (45 минут)

#### 3.1 Создание промежуточных таблиц
```sql
-- Не трогаем оригиналы! Работаем с копиями
BEGIN;

-- Копия users для экспериментов
CREATE TABLE users_migration_temp AS 
SELECT * FROM users;

-- Копия farming данных
CREATE TABLE uni_farming_migration_temp AS 
SELECT * FROM uni_farming_data;

CREATE TABLE ton_farming_migration_temp AS 
SELECT * FROM ton_farming_data;

COMMIT;
```

#### 3.2 Тестовая синхронизация на копиях
```sql
BEGIN;

-- Сначала тестируем на копиях!
UPDATE users_migration_temp u
SET 
  uni_deposit_amount = GREATEST(
    u.uni_deposit_amount, 
    COALESCE((SELECT deposit_amount FROM uni_farming_migration_temp WHERE user_id = u.id), 0)
  ),
  uni_farming_balance = GREATEST(
    u.uni_farming_balance,
    COALESCE((SELECT farming_balance FROM uni_farming_migration_temp WHERE user_id = u.id), 0)
  ),
  uni_farming_rate = COALESCE(
    (SELECT farming_rate FROM uni_farming_migration_temp WHERE user_id = u.id),
    u.uni_farming_rate,
    0.01
  ),
  uni_farming_active = u.uni_farming_active OR 
    COALESCE((SELECT is_active FROM uni_farming_migration_temp WHERE user_id = u.id), false);

-- Проверяем результат
SELECT 
  SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as new_total
FROM users_migration_temp;

-- Сравниваем с оригиналом
SELECT 
  (SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) FROM users) as original,
  (SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) FROM users_migration_temp) as after_sync,
  (SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) FROM users_migration_temp) -
  (SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) FROM users) as difference;

ROLLBACK; -- Откатываем тест
```

#### 3.3 Реальная синхронизация с проверками
```sql
-- Только после успешного теста!
BEGIN;

-- Сохраняем состояние ДО
CREATE TEMP TABLE balance_before AS
SELECT 
  id, 
  balance_uni + balance_ton + uni_farming_balance + ton_farming_balance as total
FROM users;

-- Архивируем farming таблицы
CREATE TABLE archive_uni_farming_20250801 AS 
SELECT *, NOW() as archived_at FROM uni_farming_data;

CREATE TABLE archive_ton_farming_20250801 AS 
SELECT *, NOW() as archived_at FROM ton_farming_data;

-- Выполняем синхронизацию маленькими порциями
DO $$
DECLARE
  batch_size INT := 10;
  offset_val INT := 0;
  total_users INT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM uni_farming_data;
  
  WHILE offset_val < total_users LOOP
    UPDATE users u
    SET 
      uni_deposit_amount = GREATEST(u.uni_deposit_amount, ufd.deposit_amount),
      uni_farming_balance = GREATEST(u.uni_farming_balance, ufd.farming_balance),
      uni_farming_rate = CASE 
        WHEN ufd.farming_rate > 0 THEN ufd.farming_rate 
        ELSE COALESCE(u.uni_farming_rate, 0.01)
      END,
      uni_farming_active = u.uni_farming_active OR ufd.is_active
    FROM uni_farming_data ufd
    WHERE u.id = ufd.user_id
      AND ufd.user_id IN (
        SELECT user_id 
        FROM uni_farming_data 
        ORDER BY user_id 
        LIMIT batch_size 
        OFFSET offset_val
      );
    
    offset_val := offset_val + batch_size;
    
    -- Логируем прогресс
    RAISE NOTICE 'Обработано % из % записей', offset_val, total_users;
  END LOOP;
END $$;

-- Проверяем результат
CREATE TEMP TABLE balance_after AS
SELECT 
  id, 
  balance_uni + balance_ton + uni_farming_balance + ton_farming_balance as total
FROM users;

-- Детальная проверка
SELECT 
  'Изменилось записей' as metric,
  COUNT(*) as value
FROM balance_before b
JOIN balance_after a ON b.id = a.id
WHERE b.total != a.total

UNION ALL

SELECT 
  'Сумма ДО',
  SUM(total)
FROM balance_before

UNION ALL

SELECT 
  'Сумма ПОСЛЕ',
  SUM(total)
FROM balance_after;

-- Если всё ОК - коммитим
-- COMMIT;
-- Если проблемы - откатываем
-- ROLLBACK;
```

---

### ЭТАП 4: КОНТРОЛЬНЫЕ ПРОВЕРКИ (30 минут)

#### 4.1 Проверка через API
```bash
# Проверяем работу farming через API
curl -X GET "http://localhost:3000/api/v2/uni-farming/status?user_id=1" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

# Проверяем нескольких пользователей
for user_id in 1 5 10 15 20; do
  echo "Checking user $user_id:"
  curl -s "http://localhost:3000/api/v2/uni-farming/status?user_id=$user_id" \
    -H "Authorization: Bearer $JWT_TOKEN" | jq '.farming_balance'
done
```

#### 4.2 Функциональные тесты
```sql
-- Тест 1: Все farming пользователи сохранены
SELECT 
  (SELECT COUNT(*) FROM uni_farming_data WHERE is_active = true) as before_active,
  (SELECT COUNT(*) FROM users WHERE uni_farming_active = true) as after_active;

-- Тест 2: Суммы farming балансов
SELECT 
  (SELECT SUM(farming_balance) FROM uni_farming_data) as before_sum,
  (SELECT SUM(uni_farming_balance) FROM users WHERE uni_farming_balance > 0) as after_sum;

-- Тест 3: Проверка конкретных пользователей
SELECT 
  u.id,
  u.telegram_id,
  u.uni_farming_balance as new_balance,
  ufd.farming_balance as old_balance,
  u.uni_farming_balance - ufd.farming_balance as difference
FROM users u
JOIN archive_uni_farming_20250801 ufd ON u.id = ufd.user_id
WHERE u.uni_farming_balance != ufd.farming_balance
ORDER BY ABS(u.uni_farming_balance - ufd.farming_balance) DESC
LIMIT 10;
```

---

### ЭТАП 5: ФИНАЛИЗАЦИЯ (30 минут)

#### 5.1 Создание отчёта
```sql
-- Генерируем полный отчёт о миграции
\o reports/migration_report_$(date +%Y%m%d_%H%M%S).txt

SELECT '=== ОТЧЁТ О МИГРАЦИИ ===' as title;
SELECT 'Дата: ' || NOW() as info;

SELECT '=== СТАТИСТИКА ===' as section;
SELECT 
  'Пользователей обработано' as metric,
  COUNT(*) as value
FROM users
WHERE uni_farming_balance > 0 OR uni_deposit_amount > 0;

SELECT '=== КОНТРОЛЬНЫЕ СУММЫ ===' as section;
SELECT 
  'До миграции' as period,
  SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
FROM balance_before;

SELECT 
  'После миграции' as period,
  SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total
FROM users;

\o
```

#### 5.2 Очистка временных данных
```sql
-- Только после полной уверенности в успехе!
DROP TABLE IF EXISTS users_migration_temp;
DROP TABLE IF EXISTS uni_farming_migration_temp;
DROP TABLE IF EXISTS ton_farming_migration_temp;
```

---

## 🎯 КРИТЕРИИ УСПЕХА 10 из 10

### ✅ Обязательные условия:
1. **Контрольная сумма** = 112,935,565.07 (±0.01)
2. **Потеря данных** = 0 записей
3. **Ошибки в логах** = 0
4. **API тесты** = 100% passed
5. **Время простоя** < 5 минут

### 📊 Метрики качества:
- Документация: каждый шаг записан
- Резервы: 3 типа backup созданы
- Проверки: каждое изменение проверено
- Откаты: готовы на каждом этапе
- Отчёты: полная статистика сохранена

---

## 🚨 ЧТО ДЕЛАТЬ ПРИ ПРОБЛЕМАХ

### Если контрольная сумма не сходится:
1. STOP! Не продолжайте
2. Проверьте детали расхождений
3. Найдите конкретные записи
4. Исправьте вручную
5. Повторите проверку

### Если API не работает:
1. Проверьте логи сервера
2. Перезапустите приложение
3. Очистите кеш
4. Проверьте код repositories

### Если нужен откат:
```bash
# Полный откат из backup
psql -U postgres -d unifarm_production < backups/full_backup_TIMESTAMP.sql

# Или восстановление конкретных таблиц
psql -U postgres -d unifarm_production < backups/critical_data_TIMESTAMP.sql
```

---

## 💡 ФИНАЛЬНЫЕ СОВЕТЫ

1. **Не торопитесь** - это самое важное
2. **Проверяйте каждый шаг** - дважды
3. **Держите backup под рукой** - всегда
4. **Документируйте всё** - даже мелочи
5. **Тестируйте поэтапно** - не делайте всё сразу

**Помните:** Лучше потратить целый день, но сделать идеально, чем спешить и потерять данные!

Удачи! Вы справитесь! 🍀