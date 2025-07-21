# 🏗️ АРХИТЕКТУРНЫЙ ПЛАН МИГРАЦИИ НА КОРРЕКТНУЮ СХЕМУ ИДЕНТИФИКАЦИИ

**Дата:** 21 января 2025  
**Цель:** Безопасный переход на использование telegram_id как основного идентификатора

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ

### Проблема
```
JWT Context: telegram.user.id = database_id (например, 74)
Ожидается: telegram.user.id = telegram_id (например, 999489)
```

Это приводит к:
- Неверной идентификации пользователей
- Депозиты зачисляются не тем пользователям
- Создаются дубликаты аккаунтов
- Теряются транзакции

---

## ⚠️ 1. ПОСЛЕДСТВИЯ ДЛЯ ТЕКУЩЕЙ СИСТЕМЫ

### 1.1 Что сломается при переходе

**Критические компоненты:**

1. **Все методы поиска пользователя в контроллерах**
   ```typescript
   // Сейчас (неправильно):
   getUserByTelegramId(telegram.user.id) // передается database_id
   
   // После миграции (правильно):
   getUserByTelegramId(telegram.user.telegram_id)
   ```

2. **Логика создания/поиска пользователей**
   - getOrCreateUserFromTelegram будет получать правильный telegram_id
   - Изменится поведение при первом входе пользователей

3. **Реферальная система**
   - Связи могут быть нарушены если referred_by хранит database_id

### 1.2 Потенциальные конфликты

1. **Повторное подключение кошельков**
   - Пользователь с telegram_id=111 имеет wallet="UQxx...123"
   - После миграции система может не найти эту связь

2. **Кросс-ссылки в транзакциях**
   - Если user_id в транзакциях ссылается на database_id
   - После миграции нужно сохранить эти связи

### 1.3 Пользователи с проблемными данными

**Категории проблемных записей:**
```sql
-- Пользователи без telegram_id
SELECT COUNT(*) FROM users WHERE telegram_id IS NULL;

-- Пользователи с дублирующимися telegram_id
SELECT telegram_id, COUNT(*) FROM users 
GROUP BY telegram_id HAVING COUNT(*) > 1;

-- Пользователи с wallet но без telegram_id
SELECT COUNT(*) FROM users 
WHERE ton_wallet_address IS NOT NULL AND telegram_id IS NULL;
```

---

## 🚨 2. РИСКИ МИГРАЦИИ

### 2.1 Риск появления дубликатов

**Сценарий дублирования:**
1. Пользователь входил с telegram_id=111
2. Создалась запись с id=1, telegram_id=111
3. После миграции система ищет по telegram_id
4. Если поиск не работает - создается новая запись
5. Получаем дубликат: id=1000, telegram_id=111

**Защита от дубликатов:**
```sql
-- Добавить уникальный индекс
CREATE UNIQUE INDEX idx_users_telegram_id ON users(telegram_id) 
WHERE telegram_id IS NOT NULL;
```

### 2.2 Риск потери данных

**Критические данные для сохранения:**
- Балансы (balance_uni, balance_ton)
- История транзакций
- Реферальные связи
- Активные farming сессии
- Привязанные кошельки

### 2.3 Риск рассинхронизации

**Проблемные кейсы:**
1. **Один wallet на несколько аккаунтов**
   ```
   User A: telegram_id=111, wallet="UQxx...123"
   User B: telegram_id=222, wallet="UQxx...123"
   ```
   Решение: Запретить или создать таблицу wallet_links

2. **Записи без telegram_id**
   - Гостевые аккаунты
   - Технические пользователи
   - Старые записи

---

## ✅ 3. БЕЗОПАСНЫЙ ПЛАН МИГРАЦИИ

### PHASE 1: ПОДГОТОВКА (Без изменения кода)

**Шаг 1.1: Аудит данных**
```sql
-- Создать отчет о состоянии данных
CREATE VIEW migration_audit AS
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT telegram_id) as unique_telegram_ids,
  COUNT(CASE WHEN telegram_id IS NULL THEN 1 END) as users_without_telegram_id,
  COUNT(CASE WHEN ton_wallet_address IS NOT NULL THEN 1 END) as users_with_wallet,
  COUNT(CASE WHEN telegram_id IS NULL AND ton_wallet_address IS NOT NULL THEN 1 END) as wallet_without_telegram_id
FROM users;
```

**Шаг 1.2: Резервное копирование**
```bash
# Полный бэкап базы данных
pg_dump -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME > backup_before_migration_$(date +%Y%m%d_%H%M%S).sql

# Бэкап критических таблиц
pg_dump -t users -t transactions -t referrals > critical_tables_backup.sql
```

**Шаг 1.3: Создание таблицы миграции**
```sql
CREATE TABLE migration_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100),
  affected_user_id INTEGER,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### PHASE 2: МИГРАЦИЯ ДАННЫХ

**Шаг 2.1: Исправление NULL telegram_id**
```sql
-- Для пользователей с wallet но без telegram_id
-- Вариант 1: Пометить для ручной проверки
UPDATE users 
SET telegram_id = -1 * id  -- Отрицательный ID как маркер
WHERE telegram_id IS NULL AND ton_wallet_address IS NOT NULL;

-- Вариант 2: Удалить если нет активности
DELETE FROM users 
WHERE telegram_id IS NULL 
  AND balance_uni = 0 
  AND balance_ton = 0
  AND created_at < NOW() - INTERVAL '30 days';
```

**Шаг 2.2: Разрешение дубликатов telegram_id**
```sql
-- Найти и объединить дубликаты
WITH duplicates AS (
  SELECT telegram_id, array_agg(id ORDER BY created_at) as user_ids
  FROM users 
  WHERE telegram_id IS NOT NULL
  GROUP BY telegram_id 
  HAVING COUNT(*) > 1
)
SELECT * FROM duplicates;

-- Для каждого дубликата - объединить данные в самую старую запись
```

**Шаг 2.3: Создание индексов**
```sql
-- Уникальный индекс на telegram_id
CREATE UNIQUE INDEX idx_users_telegram_id_unique 
ON users(telegram_id) 
WHERE telegram_id IS NOT NULL AND telegram_id > 0;

-- Индекс для быстрого поиска по wallet
CREATE INDEX idx_users_wallet ON users(ton_wallet_address);
```

### PHASE 3: ИЗМЕНЕНИЕ КОДА

**Шаг 3.1: Обновить все контроллеры**

Файлы для изменения:
```
modules/wallet/controller.ts
modules/missions/controller.ts  
modules/user/controller.ts
modules/farming/controller.ts
modules/referral/controller.ts
modules/boost/controller.ts
modules/dailyBonus/controller.ts
modules/tonFarming/controller.ts
```

Паттерн замены:
```typescript
// Было:
const user = await userRepository.getUserByTelegramId(telegram.user.id);

// Стало:
const user = await userRepository.getUserByTelegramId(telegram.user.telegram_id);
```

**Шаг 3.2: Обновить методы создания пользователей**
```typescript
// modules/wallet/controller.ts
const user = await userRepository.getOrCreateUserFromTelegram({
  telegram_id: telegram.user.telegram_id, // Использовать правильное поле
  username: telegram.user.username,
  first_name: telegram.user.first_name
});
```

**Шаг 3.3: Добавить логирование для отладки**
```typescript
// В начале каждого метода контроллера
logger.info('Request context', {
  jwt_user_id: telegram.user.id,
  jwt_telegram_id: telegram.user.telegram_id,
  method: req.method,
  path: req.path
});
```

### PHASE 4: ВАЛИДАЦИЯ И МОНИТОРИНГ

**Шаг 4.1: Создать дашборд метрик**
```sql
CREATE VIEW migration_metrics AS
SELECT
  'users_without_telegram_id' as metric,
  COUNT(*) as value
FROM users WHERE telegram_id IS NULL
UNION ALL
SELECT
  'duplicate_telegram_ids' as metric,
  COUNT(DISTINCT telegram_id) as value
FROM users
GROUP BY telegram_id
HAVING COUNT(*) > 1
UNION ALL
SELECT
  'orphaned_wallets' as metric,
  COUNT(*) as value
FROM users
WHERE ton_wallet_address IS NOT NULL 
  AND telegram_id IS NULL;
```

**Шаг 4.2: Мониторинг ошибок**
```typescript
// Добавить в middleware для отслеживания
app.use((err, req, res, next) => {
  if (err.message.includes('telegram_id')) {
    logger.error('Migration related error', {
      error: err.message,
      path: req.path,
      jwt: req.headers.authorization
    });
  }
  next(err);
});
```

---

## 🛡️ 4. СТРАТЕГИЯ БЕЗОПАСНОСТИ

### 4.1 Поэтапное внедрение

**Канареечное развертывание:**
1. Включить новую логику для 5% пользователей
2. Мониторить ошибки 24 часа
3. Расширить до 25%, затем 50%, затем 100%

**Feature flags:**
```typescript
const USE_TELEGRAM_ID_AUTH = process.env.USE_TELEGRAM_ID_AUTH === 'true';

if (USE_TELEGRAM_ID_AUTH) {
  user = await getUserByTelegramId(telegram.user.telegram_id);
} else {
  user = await getUserByTelegramId(telegram.user.id); // старая логика
}
```

### 4.2 Откат в случае проблем

**План отката:**
1. Восстановить код из git
2. Применить резервную копию БД
3. Очистить кэши
4. Перезапустить сервисы

**Команды отката:**
```bash
# Откат кода
git revert HEAD

# Восстановление БД
psql -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME < backup_before_migration.sql

# Очистка Redis кэша
redis-cli FLUSHALL
```

---

## 📋 5. ЧЕКЛИСТ ПРОВЕРКИ

### Pre-migration
- [ ] Создан полный бэкап БД
- [ ] Проведен аудит данных
- [ ] Исправлены NULL telegram_id
- [ ] Разрешены дубликаты
- [ ] Созданы индексы

### Post-migration
- [ ] Новые пользователи успешно регистрируются
- [ ] Существующие пользователи могут войти
- [ ] TON депозиты обрабатываются корректно
- [ ] Реферальная система работает
- [ ] Нет роста ошибок в логах
- [ ] Метрики в норме

### Метрики успеха
- Количество ошибок аутентификации < 0.1%
- Время ответа API не увеличилось
- Нет новых дубликатов telegram_id
- Все депозиты привязаны к правильным пользователям

---

## 🎯 6. ИТОГОВАЯ АРХИТЕКТУРА

### После миграции:
```
Frontend → JWT (telegram_id) → Backend → Database (telegram_id)
                ↓
         Поиск пользователя
                ↓
         getUserByTelegramId(telegram_id)
                ↓
         Уникальная идентификация
```

### Гарантии:
1. **Однозначность**: 1 telegram_id = 1 пользователь
2. **Целостность**: Все связи сохранены
3. **Производительность**: Индексы обеспечивают быстрый поиск
4. **Безопасность**: Невозможно подменить чужой аккаунт

---

## 📅 TIMELINE

1. **День 1-2**: Аудит и подготовка данных
2. **День 3**: Миграция данных в тестовой среде
3. **День 4-5**: Изменение кода и тестирование
4. **День 6**: Канареечное развертывание (5%)
5. **День 7-10**: Постепенное расширение
6. **День 11**: Полное развертывание
7. **День 12-14**: Мониторинг и исправления

---

**Документ подготовлен:** 21 января 2025  
**Статус:** Готов к обсуждению и утверждению