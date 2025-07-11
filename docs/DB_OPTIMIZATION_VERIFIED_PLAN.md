# Верифицированный план оптимизации БД UniFarm
Дата: 11 июля 2025

## ✅ Результаты проверки использования полей

### Проверенные поля:

1. **`users.last_active`**
   - **Статус**: ❌ НЕ ИСПОЛЬЗУЕТСЯ в коде
   - **Решение**: ✅ МОЖНО УДАЛЯТЬ

2. **`users.checkin_last_date` и `checkin_streak`**  
   - **Статус**: ✅ АКТИВНО ИСПОЛЬЗУЮТСЯ в модуле `dailyBonus`
   - **Использование**: 
     - Проверка последнего получения бонуса
     - Расчет стрика (серии дней)
     - Определение размера бонуса (до 2000 UNI)
   - **Решение**: ⚠️ НЕ УДАЛЯТЬ! Добавить документацию

3. **`users.referrer_id`**
   - **Статус**: ⚠️ Требует дополнительной проверки
   - **Найдено**: Только в списке полей USER_FIELDS
   - **Решение**: Проверить реальное использование перед удалением

4. **`users.uni_farming_deposit`**
   - **Статус**: ⚠️ Требует дополнительной проверки
   - **Найдено**: В списке полей USER_FIELDS и types/user.ts
   - **Решение**: Проверить реальное использование перед удалением

## 📋 Обновленный план оптимизации

### Фаза 1: Безопасные изменения ✅

1. **Удаление `last_active`**
   ```sql
   ALTER TABLE users DROP COLUMN IF EXISTS last_active;
   ```

2. **Добавление недостающих типов транзакций**
   ```sql
   ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
   ALTER TYPE transaction_type ADD VALUE 'BOOST_PURCHASE';
   ALTER TYPE transaction_type ADD VALUE 'DAILY_BONUS';
   ALTER TYPE transaction_type ADD VALUE 'MISSION_REWARD';
   ALTER TYPE transaction_type ADD VALUE 'BOOST_REWARD';
   ```

3. **Документация активных полей**
   ```sql
   COMMENT ON COLUMN users.checkin_last_date IS 'Дата последнего получения ежедневного бонуса (АКТИВНО ИСПОЛЬЗУЕТСЯ)';
   COMMENT ON COLUMN users.checkin_streak IS 'Текущая серия дней получения бонусов (АКТИВНО ИСПОЛЬЗУЕТСЯ)';
   ```

### Фаза 2: Требуют дополнительной проверки ⚠️

1. **Проверить использование `referrer_id`**
   - Если не используется → мигрировать в `referred_by`
   - Если используется → оставить как есть

2. **Проверить использование `uni_farming_deposit`**
   - Если не используется → мигрировать в `uni_deposit_amount`
   - Если используется → оставить как есть

### Фаза 3: Оптимизация производительности 🚀

1. **Добавление индексов**
   ```sql
   CREATE INDEX idx_users_telegram_id ON users(telegram_id);
   CREATE INDEX idx_users_farming_active ON users(uni_farming_active) WHERE uni_farming_active = true;
   CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
   CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
   ```

## ⚠️ ВАЖНОЕ ПРЕДУПРЕЖДЕНИЕ

**НЕ УДАЛЯТЬ следующие поля без дополнительной проверки:**
- `checkin_last_date` - активно используется для daily bonus
- `checkin_streak` - активно используется для расчета бонусов
- `referrer_id` - требует проверки
- `uni_farming_deposit` - требует проверки

## 🔍 Команды для дополнительной проверки

```bash
# Проверить использование referrer_id
grep -r "referrer_id" --include="*.ts" --include="*.js" modules/ core/ --exclude-dir=node_modules

# Проверить использование uni_farming_deposit  
grep -r "uni_farming_deposit" --include="*.ts" --include="*.js" modules/ core/ --exclude-dir=node_modules
```

## ✅ Безопасный порядок выполнения

1. Сначала выполнить только безопасные изменения из Фазы 1
2. Провести дополнительную проверку полей из Фазы 2
3. После подтверждения выполнить оставшиеся изменения
4. Оптимизацию производительности выполнять в последнюю очередь