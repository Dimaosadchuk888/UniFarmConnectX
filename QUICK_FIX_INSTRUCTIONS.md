# 🔧 БЫСТРОЕ ИСПРАВЛЕНИЕ БАЗЫ ДАННЫХ

Ошибка "enum label already exists" означает, что некоторые типы уже добавлены. Это хорошо!

## ВЫПОЛНИТЕ ЭТИ КОМАНДЫ В SUPABASE SQL EDITOR:

### 1. Критическое поле last_active (ОБЯЗАТЕЛЬНО!)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();
```

### 2. Критические поля amount и currency (ОБЯЗАТЕЛЬНО!)
```sql
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS amount NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);
```

### 3. Проверьте результат:
```sql
-- Проверка полей
SELECT 
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_active') as has_last_active,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount') as has_amount,
  COUNT(*) as transaction_types_count
FROM pg_enum 
WHERE enumtypid = 'transaction_type'::regtype;
```

## АЛЬТЕРНАТИВА: Используйте безопасный скрипт
Файл `scripts/sync-database-safe.sql` проверяет существование элементов перед добавлением.

## ПОСЛЕ ВЫПОЛНЕНИЯ:
- ✅ Поле users.last_active должно существовать
- ✅ Поля transactions.amount и currency должны существовать
- ✅ Должно быть минимум 10 типов транзакций

Система заработает корректно!