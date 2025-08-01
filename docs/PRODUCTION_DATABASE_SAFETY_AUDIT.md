# 🛡️ Production Database Safety Audit - UniFarm

**Дата:** 2025-08-01  
**Тип:** Production Safety Audit  
**Приоритет:** КРИТИЧЕСКИЙ - Сохранение данных пользователей

---

## 📊 Статистика продакшн БД (на 2025-08-01)

- **Пользователей:** 103 активных аккаунта
- **Транзакций:** 839,173 записей истории
- **Выводов:** 159 запросов на вывод
- **Активных фармеров UNI:** 49 пользователей
- **TON Boost пользователей:** 5 с активными пакетами
- **Реферальных связей:** 52 записи в referrals + связи в users
- **TON кошельков:** 21 подключенный кошелек

## ⚠️ ВАЖНО: Принципы безопасности

1. **НЕ УДАЛЯТЬ** существующие поля и таблицы
2. **НЕ ИЗМЕНЯТЬ** типы данных работающих полей
3. **НЕ НАРУШАТЬ** существующие связи между таблицами
4. **СОХРАНИТЬ** все данные пользователей, балансы, рефералы
5. **ДОКУМЕНТИРОВАТЬ** каждое изменение
6. **СОХРАНИТЬ** гибридную структуру transactions до полной миграции
7. **НЕ ТРОГАТЬ** таблицы uni_farming_data, ton_farming_data, referrals

---

## 📊 1. Анализ используемых таблиц и полей

### 1.1 Таблица `users` - КРИТИЧЕСКАЯ

**Активно используемые поля:**
- `id` - PRIMARY KEY, используется везде
- `telegram_id` - уникальный идентификатор пользователя
- `username` - отображение в интерфейсе
- `first_name`, `last_name` - данные пользователя
- `ref_code` - реферальный код пользователя
- `parent_ref_code` - код пригласившего
- `referred_by` - ID пригласившего
- `balance_uni` - баланс UNI токенов
- `balance_ton` - баланс TON
- `uni_farming_active` - статус фарминга
- `uni_deposit_amount` - сумма депозита
- `uni_farming_start_timestamp` - начало фарминга
- `uni_farming_rate` - ставка фарминга
- `uni_farming_balance` - накопленный фарминг
- `uni_farming_last_update` - последнее обновление
- `ton_boost_active` - статус буста
- `ton_boost_package_id` - ID пакета буста
- `ton_boost_rate` - ставка буста
- `created_at`, `updated_at` - временные метки

**Поля под вопросом (требуют проверки):**
- `last_active` - возможно не обновляется
- `daily_bonus_claimed_at` - использование неясно
- `tons_for_uni_exchange_rate` - курс обмена

### 1.2 Таблица `transactions` - КРИТИЧЕСКАЯ (839,173 записей!)

**ВАЖНОЕ ОТКРЫТИЕ: Таблица использует ГИБРИДНУЮ структуру!**

**Активно используемые поля (оба формата работают одновременно):**

**Старый формат (активно используется):**
- `type` - тип транзакции ("REFERRAL_REWARD", "FARMING_REWARD")
- `amount_uni` - сумма в UNI
- `amount_ton` - сумма в TON

**Новый формат (тоже используется):**
- `currency` - валюта ("UNI", "TON")
- `amount` - универсальная сумма
- `metadata` - JSON с деталями операции

**Другие критические поля:**
- `id` - PRIMARY KEY
- `user_id` - связь с users (FOREIGN KEY)
- `source_user_id` - для отслеживания рефералов
- `status` - всегда "completed"
- `description` - подробное описание
- `is_duplicate` - защита от дублирования
- `created_at`, `updated_at` - временные метки

**Неиспользуемые поля:** `source`, `tx_hash`, `action` - все NULL

**КРИТИЧНО:** Система работает с обеими структурами одновременно!

### 1.3 Таблица `withdraw_requests` - АКТИВНАЯ

**Используемые поля:**
- `id` - PRIMARY KEY
- `user_id` - связь с users
- `telegram_id` - дублирование для безопасности
- `username` - для отображения
- `amount_ton` - сумма вывода
- `ton_wallet` - адрес кошелька
- `status` - статус заявки
- `created_at`, `processed_at` - временные метки

### 1.4 ВАЖНОЕ ОБНОВЛЕНИЕ: Таблицы которые ИСПОЛЬЗУЮТСЯ в продакшене:

**По результатам анализа от 2025-08-01:**
- `uni_farming_data` - **98 записей** - АКТИВНО ИСПОЛЬЗУЕТСЯ!
- `ton_farming_data` - **44 записи** - АКТИВНО ИСПОЛЬЗУЕТСЯ!
- `referrals` - **52 записи** - АКТИВНО ИСПОЛЬЗУЕТСЯ!
- `missions` - **5 записей** - настройки миссий
- `user_sessions` - 0 записей - единственная неиспользуемая

**КРИТИЧНО:** Эти таблицы содержат реальные данные пользователей и НЕ МОГУТ быть удалены!

---

## 🔍 2. Анализ критических зависимостей

### 2.1 Модули, работающие с БД:

1. **BalanceManager** (core/BalanceManager.ts):
   - UPDATE users.balance_uni, users.balance_ton
   - Критическое логирование изменений

2. **UniFarmingRepository** (modules/farming/UniFarmingRepository.ts):
   - SELECT/UPDATE поля uni_farming_* в users
   - Fallback механизм при отсутствии uni_farming_data

3. **SupabaseUserRepository** (modules/user/service.ts):
   - Все операции с таблицей users
   - Создание, обновление, поиск пользователей

4. **TransactionEnforcer** (core/TransactionEnforcer.ts):
   - INSERT в transactions
   - Использует старый формат полей

### 2.2 Критические связи:
- users.id → transactions.user_id (FOREIGN KEY)
- users.id → withdraw_requests.user_id
- users.referred_by → users.id (self-reference)

---

## 📋 3. План безопасной миграции (обновлён с учётом реальных данных)

### Фаза 1: Анализ и backup (0 изменений в БД)

1. **Полный backup продакшн БД - ОБЯЗАТЕЛЬНО!**
   ```bash
   pg_dump unifarm_production > unifarm_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Анализ зависимостей кода от БД:**
   - Проверить все SQL запросы в коде
   - Документировать используемые поля
   - Найти все foreign key связи

3. **Создать staging копию для тестов**

### Фаза 2: Синхронизация schema.ts с реальной БД

**ВАЖНО: НЕ трогаем существующие таблицы!**

1. **Обновить schema.ts чтобы отражать реальную структуру:**
   ```typescript
   // Добавить в schema.ts существующие таблицы:
   export const uniFarmingData = pgTable('uni_farming_data', {
     // структура из реальной БД
   });
   
   export const tonFarmingData = pgTable('ton_farming_data', {
     // структура из реальной БД
   });
   ```

2. **Документировать гибридную структуру transactions:**
   - Поддержка обоих форматов полей
   - Создать адаптеры для работы с обеими структурами

### Фаза 3: Безопасные добавления (без удаления)

1. **Добавлять только новые поля/таблицы:**
   ```sql
   -- Только ADD, никаких DROP или ALTER TYPE
   ALTER TABLE users 
   ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;
   ```

2. **Создать views для совместимости:**
   ```sql
   -- View для unified доступа к транзакциям
   CREATE OR REPLACE VIEW transactions_unified AS
   SELECT 
     id,
     user_id,
     COALESCE(currency, 
       CASE 
         WHEN amount_ton > 0 THEN 'TON'
         ELSE 'UNI'
       END
     ) as currency,
     COALESCE(amount, amount_uni + amount_ton) as amount,
     type,
     status,
     description,
     metadata,
     created_at
   FROM transactions;
   ```

### Фаза 4: Постепенная миграция кода

1. **Обновить репозитории для работы с реальной структурой:**
   - UniFarmingRepository должен проверять обе таблицы
   - TransactionService должен поддерживать гибридный формат
   - ReferralService должен работать с обеими системами

2. **Добавить fallback логику:**
   ```typescript
   // Пример: читать данные из обоих мест
   async getFarmingData(userId: number) {
     // Сначала проверить users таблицу
     const userData = await this.getUserFarmingData(userId);
     
     // Потом проверить uni_farming_data
     const farmingData = await this.getUniFarmingData(userId);
     
     // Объединить данные
     return this.mergeFarmingData(userData, farmingData);
   }
   ```

### Фаза 5: Валидация (перед любыми изменениями)

1. **Проверки целостности данных:**
   ```sql
   -- Проверить балансы
   SELECT COUNT(*) FROM users WHERE balance_uni > 0;
   SELECT COUNT(*) FROM users WHERE balance_ton > 0;
   
   -- Проверить реферальные связи
   SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL;
   SELECT COUNT(*) FROM referrals;
   
   -- Проверить транзакции
   SELECT COUNT(*), type FROM transactions GROUP BY type;
   ```

2. **Мониторинг после изменений:**
   - Логировать все операции
   - Проверять балансы каждый час
   - Алерты при любых аномалиях

---

## 🚨 4. Критические предупреждения

### НЕЛЬЗЯ:
1. ❌ Удалять поля из таблицы users
2. ❌ Изменять типы данных balance_uni, balance_ton
3. ❌ Удалять или изменять transactions
4. ❌ Нарушать foreign key constraints
5. ❌ Изменять primary key

### МОЖНО:
1. ✅ Добавлять новые поля
2. ✅ Создавать новые таблицы
3. ✅ Добавлять индексы
4. ✅ Создавать views для совместимости

---

## 📊 5. Рекомендуемая новая структура

### 5.1 Минимальные изменения (безопасные):

```typescript
// Обновленная схема с сохранением совместимости
export const users = {
  // ВСЕ существующие поля остаются
  // Добавляем только новые:
  schema_version: integer().default(1),
  migrated_at: timestamp()
};

export const transactions_v2 = {
  // Новая таблица для будущих транзакций
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  amount: decimal('amount', { precision: 20, scale: 6 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  // ... остальные поля новой структуры
};
```

### 5.2 Стратегия совместимости:

1. **Views для обратной совместимости:**
   ```sql
   CREATE VIEW transactions_compatible AS
   SELECT 
     id,
     user_id,
     transaction_type as type,
     CASE 
       WHEN currency = 'UNI' THEN amount 
       ELSE '0'
     END as amount_uni,
     CASE 
       WHEN currency = 'TON' THEN amount 
       ELSE '0'
     END as amount_ton,
     -- остальные поля
   FROM transactions_v2;
   ```

2. **Триггеры для синхронизации:**
   - При записи в старую структуру → дублировать в новую
   - При записи в новую → обновлять старую

---

## 🎯 6. План действий

### Немедленные действия:
1. **Создать полный backup продакшн БД**
2. **Запустить скрипт анализа используемых полей**
3. **Документировать все SQL запросы в коде**

### Краткосрочные (1-2 недели):
1. **Создать миграционные скрипты**
2. **Добавить новые поля без удаления старых**
3. **Тестировать на копии БД**

### Долгосрочные (1-2 месяца):
1. **Постепенная миграция на новую структуру**
2. **Мониторинг и валидация**
3. **Архивация неиспользуемых данных**

---

## 🎯 7. Рекомендуемая модель синхронизации

### 7.1 Обновлённый schema.ts (добавить существующие таблицы):

```typescript
// Добавить в schema.ts для синхронизации с реальной БД:

// Существующая таблица uni_farming_data (98 записей)
export const uniFarmingData = pgTable('uni_farming_data', {
  id: uuid('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  deposit_amount: integer('deposit_amount').notNull(),
  farming_balance: decimal('farming_balance').notNull(),
  farming_rate: decimal('farming_rate').notNull(),
  is_active: boolean('is_active').notNull(),
  created_at: timestamp('created_at').notNull(),
  updated_at: timestamp('updated_at').notNull()
});

// Существующая таблица ton_farming_data (44 записи)  
export const tonFarmingData = pgTable('ton_farming_data', {
  id: uuid('id').primaryKey(),
  user_id: text('user_id').notNull(), // Внимание: string, не integer!
  boost_active: boolean('boost_active').notNull(),
  boost_package_id: integer('boost_package_id'),
  boost_rate: decimal('boost_rate').notNull(),
  ton_accumulated: decimal('ton_accumulated').notNull(),
  created_at: timestamp('created_at').notNull(),
  updated_at: timestamp('updated_at').notNull()
});

// НЕ УДАЛЯТЬ существующие таблицы из schema.ts!
```

### 7.2 Адаптеры для гибридной структуры:

```typescript
// TransactionAdapter для работы с гибридной структурой
export class TransactionAdapter {
  static toUnified(transaction: any) {
    return {
      id: transaction.id,
      user_id: transaction.user_id,
      // Поддержка обоих форматов
      currency: transaction.currency || 
        (transaction.amount_ton > 0 ? 'TON' : 'UNI'),
      amount: transaction.amount || 
        (transaction.amount_uni || 0) + (transaction.amount_ton || 0),
      type: transaction.type,
      // Остальные поля...
    };
  }
}
```

## 📝 8. Финальные выводы

### ✅ Что мы обнаружили:

1. **839,173 транзакций** - огромная история операций
2. **103 активных пользователя** с реальными балансами
3. **Таблицы uni_farming_data, ton_farming_data, referrals ИСПОЛЬЗУЮТСЯ**
4. **Гибридная структура transactions** - работают оба формата полей
5. **52 реферальные связи** активно работают
6. **21 подключенный TON кошелек**

### ⚠️ Критические риски:

1. **Удаление "неиспользуемых" таблиц приведёт к потере данных**
2. **Изменение типов полей нарушит работу системы**
3. **Нарушение foreign key связей сломает целостность**
4. **Изменение структуры transactions без адаптеров сломает историю**

### 🛡️ Безопасная стратегия:

1. **ВСЕГДА делать backup перед изменениями**
2. **Добавлять новое, НЕ удалять старое**
3. **Использовать views и адаптеры для совместимости**
4. **Тестировать на staging копии**
5. **Мониторить каждое изменение**
6. **Синхронизировать schema.ts с реальной БД, а не наоборот**

### 📋 Приоритетные действия:

1. **Немедленно:** Создать полный backup продакшн БД
2. **Срочно:** Обновить schema.ts для отражения реальной структуры
3. **Важно:** Создать адаптеры для гибридной структуры transactions
4. **Планово:** Разработать стратегию постепенной миграции

**Главный принцип:** Данные пользователей - священны. Лучше иметь избыточную структуру, чем потерять хоть один байт информации.

---

**Дата аудита:** 2025-08-01  
**Статус:** КРИТИЧЕСКИЙ - требуется осторожный подход к любым изменениям БД  
**Рекомендация:** Следовать плану безопасной миграции, начиная с backup и синхронизации schema.ts