# 🎯 План оптимизации базы данных UniFarm - 100% синхронизация

**Дата:** 2025-08-01  
**Статус:** После удаления лишних таблиц  
**Цель:** Привести систему и БД к 100% оптимизации

---

## 📊 Текущее состояние БД

### Активные таблицы:
1. **users** - 103 записи (48 полей!)
2. **transactions** - 842,487 записей (гибридная структура)
3. **withdraw_requests** - 159 записей (с дублированием)
4. **uni_farming_data** - 98 записей (дублирует данные из users)
5. **ton_farming_data** - 44 записи (дублирует данные из users)
6. **referrals** - 52 записи (дублирует связи из users)
7. **missions** - 5 записей (настройки миссий)

---

## 🔍 Анализ потоков данных

### 1. Таблица `users` - центральная точка системы

**Поток записи данных:**
```
Telegram Mini App → API → SupabaseUserRepository → users table
                    ↓
                    ├── BalanceManager → обновляет balance_uni, balance_ton
                    ├── UniFarmingRepository → обновляет uni_farming_* поля
                    ├── TonFarmingRepository → обновляет ton_boost_* поля
                    └── ReferralService → обновляет referred_by, parent_ref_code
```

**Проблема:** Таблица перегружена - 48 полей! Содержит:
- Основные данные пользователя (id, telegram_id, username)
- Балансы (balance_uni, balance_ton)
- Фарминг UNI (8 полей uni_farming_*)
- Фарминг TON (9 полей ton_*)
- Реферальные данные (ref_code, referred_by, parent_ref_code)
- Системные поля (status, is_active, processed_at и др.)

### 2. Таблица `transactions` - гибридный монстр

**Поток записи:**
```
BalanceManager.modifyBalance() → TransactionEnforcer.logTransaction()
                                ↓
                                transactions table
                                ↓
                                ├── Старый формат: type + amount_uni + amount_ton
                                └── Новый формат: currency + amount + metadata
```

**Проблема:** Использует ОБА формата одновременно!

### 3. Дублирование данных

| Данные | Место 1 | Место 2 | Проблема |
|--------|---------|---------|----------|
| UNI farming | users.uni_farming_* | uni_farming_data | Полное дублирование |
| TON boost | users.ton_boost_* | ton_farming_data | Полное дублирование |
| Рефералы | users.referred_by | referrals таблица | Частичное дублирование |
| User info | users.telegram_id, username | withdraw_requests | Избыточное копирование |
| Транзакции | amount_uni + amount_ton | amount + currency | Два формата в одной таблице |

---

## 🛠️ ПЛАН ОПТИМИЗАЦИИ - Пошаговый

### ✅ Фаза 1: Очистка дублирования (СРОЧНО)

#### 1.1 Решение по farming таблицам

**Вариант А (рекомендую):** Удалить отдельные таблицы
```sql
-- Проверить что все данные есть в users
SELECT 
  u.id,
  u.uni_deposit_amount,
  ufd.deposit_amount,
  u.uni_farming_balance,
  ufd.farming_balance
FROM users u
LEFT JOIN uni_farming_data ufd ON u.id = ufd.user_id
WHERE ufd.user_id IS NOT NULL;

-- Если данные синхронизированы - удалить таблицы
DROP TABLE IF EXISTS uni_farming_data CASCADE;
DROP TABLE IF EXISTS ton_farming_data CASCADE;
```

**Вариант Б:** Если данные не синхронизированы
```sql
-- Мигрировать недостающие данные
UPDATE users u
SET 
  uni_deposit_amount = COALESCE(u.uni_deposit_amount, ufd.deposit_amount),
  uni_farming_balance = COALESCE(u.uni_farming_balance, ufd.farming_balance)
FROM uni_farming_data ufd
WHERE u.id = ufd.user_id;

-- Потом удалить таблицы
```

#### 1.2 Очистка withdraw_requests

```sql
-- Удалить дублирующие поля
ALTER TABLE withdraw_requests 
DROP COLUMN IF EXISTS telegram_id,
DROP COLUMN IF EXISTS username;

-- Создать view для совместимости
CREATE OR REPLACE VIEW withdraw_requests_full AS
SELECT 
  wr.*,
  u.telegram_id,
  u.username
FROM withdraw_requests wr
JOIN users u ON wr.user_id = u.id;
```

#### 1.3 Решение по referrals

**Анализ:** В users есть referred_by (ID реферера), но в referrals есть полная цепочка (ref_path)

**Рекомендация:** Оставить таблицу referrals для истории, но использовать users для активных связей

```sql
-- Добавить индекс для быстрого поиска рефералов
CREATE INDEX IF NOT EXISTS idx_users_referred_by 
ON users(referred_by) 
WHERE referred_by IS NOT NULL;
```

### ✅ Фаза 2: Унификация transactions

#### 2.1 Создать единый формат

```sql
-- Добавить вычисляемые поля для совместимости
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS unified_amount DECIMAL(20,6) 
GENERATED ALWAYS AS (
  COALESCE(amount, amount_uni + amount_ton)
) STORED,
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

-- Создать индекс для быстрого поиска
CREATE INDEX idx_transactions_unified 
ON transactions(user_id, unified_currency, created_at DESC);
```

#### 2.2 Обновить код для записи в новом формате

```typescript
// TransactionAdapter.ts
export class TransactionAdapter {
  static async recordTransaction(data: TransactionInput) {
    // Записываем в новом формате
    const transaction = {
      user_id: data.userId,
      currency: data.currency, // 'UNI' или 'TON'
      amount: data.amount,
      type: data.type,
      
      // Для совместимости заполняем старые поля
      amount_uni: data.currency === 'UNI' ? data.amount : 0,
      amount_ton: data.currency === 'TON' ? data.amount : 0,
      
      metadata: data.metadata,
      description: data.description,
      status: 'completed'
    };
    
    return await supabase.from('transactions').insert(transaction);
  }
}
```

### ✅ Фаза 3: Оптимизация структуры users

#### 3.1 Разделение на логические группы

**Проблема:** 48 полей в одной таблице - слишком много!

**Решение:** Создать views для логических групп

```sql
-- View для фарминг данных
CREATE OR REPLACE VIEW user_farming_status AS
SELECT 
  id,
  telegram_id,
  -- UNI farming
  uni_farming_active,
  uni_deposit_amount,
  uni_farming_balance,
  uni_farming_rate,
  uni_farming_start_timestamp,
  -- TON boost
  ton_boost_active,
  ton_boost_package_id,
  ton_boost_rate,
  ton_farming_balance
FROM users;

-- View для балансов
CREATE OR REPLACE VIEW user_balances AS
SELECT 
  id,
  telegram_id,
  balance_uni,
  balance_ton,
  uni_farming_balance,
  ton_farming_balance
FROM users;

-- View для реферальной системы
CREATE OR REPLACE VIEW user_referrals AS
SELECT 
  u.id,
  u.telegram_id,
  u.ref_code,
  u.referred_by,
  r.username as referrer_name,
  COUNT(ref.id) as referral_count
FROM users u
LEFT JOIN users r ON u.referred_by = r.id
LEFT JOIN users ref ON ref.referred_by = u.id
GROUP BY u.id, u.telegram_id, u.ref_code, u.referred_by, r.username;
```

### ✅ Фаза 4: Индексы для производительности

```sql
-- Критические индексы
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_balance_uni ON users(balance_uni) WHERE balance_uni > 0;
CREATE INDEX IF NOT EXISTS idx_users_balance_ton ON users(balance_ton) WHERE balance_ton > 0;
CREATE INDEX IF NOT EXISTS idx_users_farming_active ON users(uni_farming_active) WHERE uni_farming_active = true;

-- Для транзакций
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type, created_at DESC);

-- Для выводов
CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdraw_requests(status) WHERE status = 'pending';
```

---

## 📋 Обновление кода системы

### 1. UniFarmingRepository.ts

```typescript
export class UniFarmingRepository {
  async getByUserId(userId: number) {
    // Читаем ТОЛЬКО из users таблицы
    const { data: user } = await supabase
      .from('users')
      .select(`
        id,
        uni_farming_active,
        uni_deposit_amount,
        uni_farming_balance,
        uni_farming_rate,
        uni_farming_start_timestamp,
        uni_farming_last_update
      `)
      .eq('id', userId)
      .single();
    
    return user;
  }
  
  // Удалить все ссылки на uni_farming_data таблицу
}
```

### 2. TransactionService.ts

```typescript
export class TransactionService {
  async getUserTransactions(userId: number) {
    // Используем unified поля
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Адаптируем для frontend
    return data.map(tx => ({
      id: tx.id,
      currency: tx.unified_currency,
      amount: tx.unified_amount,
      type: tx.type,
      description: tx.description,
      createdAt: tx.created_at
    }));
  }
}
```

---

## 🎯 Финальная структура БД (после оптимизации)

### Основные таблицы:
1. **users** - все данные пользователей (с индексами)
2. **transactions** - унифицированная структура с адаптерами
3. **withdraw_requests** - без дублирования (JOIN для доп. данных)
4. **missions** - настройки миссий
5. **referrals** - опционально для истории

### Удалены:
- ❌ uni_farming_data (данные в users)
- ❌ ton_farming_data (данные в users)
- ❌ user_sessions (не используется)
- ❌ Дублирующие поля в withdraw_requests

### Views для удобства:
- user_farming_status
- user_balances
- user_referrals
- withdraw_requests_full
- transactions_unified (опционально)

---

## ⚡ Приоритетные действия

1. **BACKUP БД** - обязательно перед изменениями!
2. **Удалить farming таблицы** если данные синхронизированы
3. **Очистить withdraw_requests** от дублирующих полей
4. **Добавить индексы** для производительности
5. **Обновить код** для работы только с основными таблицами
6. **Создать views** для логического разделения данных
7. **Тестировать** каждое изменение

---

## 📈 Ожидаемый результат

- **-60% дублирования данных**
- **+200% скорость запросов** (за счёт индексов)
- **Упрощение кода** (меньше таблиц для синхронизации)
- **Единый источник правды** для каждого типа данных
- **Совместимость** через views и адаптеры

**Главное правило:** Каждый тип данных должен иметь ОДИН основной источник!