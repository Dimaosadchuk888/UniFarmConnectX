# 🔧 ПЛАН ИСПРАВЛЕНИЯ ПРОБЛЕМЫ СИНХРОНИЗАЦИИ БАЛАНСА

## 📌 Суть проблемы
BatchBalanceProcessor обновляет базу данных и отправляет WebSocket уведомления БЕЗ актуальных данных о балансе. Frontend получает пустые обновления и не может обновить UI.

## 🎯 Варианты решения

### Вариант 1: МИНИМАЛЬНОЕ ИЗМЕНЕНИЕ (Рекомендуется)
**Изменить только BatchBalanceProcessor - добавить получение актуальных балансов перед отправкой уведомлений**

```typescript
// core/BatchBalanceProcessor.ts, строка 235
// БЫЛО:
if (userData) {
  notificationService.notifyBalanceUpdate({
    userId: op.userId,
    balanceUni: parseFloat(userData.balance_uni),
    balanceTon: parseFloat(userData.balance_ton),
    // ...
  });
}

// ДОЛЖНО БЫТЬ:
if (!error) {
  // Получаем актуальные балансы после обновления
  const { data: updatedUser } = await supabase
    .from('users')
    .select('balance_uni, balance_ton')
    .eq('id', op.userId)
    .single();
    
  if (updatedUser) {
    notificationService.notifyBalanceUpdate({
      userId: op.userId,
      balanceUni: parseFloat(updatedUser.balance_uni),
      balanceTon: parseFloat(updatedUser.balance_ton),
      changeAmount: op.amountUni || op.amountTon || 0,
      currency: op.amountUni ? 'UNI' : 'TON',
      source: op.source || 'batch_update',
      timestamp: new Date().toISOString()
    });
  }
}
```

**Преимущества:**
- Минимальное изменение (~10 строк кода)
- Не затрагивает архитектуру
- Быстрое решение

**Недостатки:**
- Не решает архитектурный конфликт
- Дополнительный запрос к БД

---

### Вариант 2: ПЕРЕХОД НА BALANCEMANAGER
**Заменить использование BatchBalanceProcessor на BalanceManager во всех планировщиках**

```typescript
// core/scheduler/farmingScheduler.ts, строка 142
// БЫЛО:
const batchResult = await batchProcessor.processFarmingIncome(farmerIncomes);

// ДОЛЖНО БЫТЬ:
const balanceManager = BalanceManager.getInstance();
for (const income of farmerIncomes) {
  await balanceManager.addBalance(
    income.userId,
    income.income,
    0,
    'UNI_FARMING_INCOME'
  );
}
```

**Преимущества:**
- Решает архитектурный конфликт
- Единая точка управления балансами
- WebSocket уведомления работают автоматически

**Недостатки:**
- Больше изменений кода
- Возможное снижение производительности при большом количестве фармеров

---

### Вариант 3: СОЗДАНИЕ RPC ФУНКЦИИ В SUPABASE
**Создать отсутствующую функцию increment_user_balance в базе данных**

```sql
-- Выполнить в Supabase SQL Editor
CREATE OR REPLACE FUNCTION increment_user_balance(
  p_user_id INTEGER,
  p_uni_amount NUMERIC,
  p_ton_amount NUMERIC
) RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  UPDATE users 
  SET 
    balance_uni = balance_uni + p_uni_amount,
    balance_ton = balance_ton + p_ton_amount
  WHERE id = p_user_id
  RETURNING json_build_object(
    'balance_uni', balance_uni,
    'balance_ton', balance_ton
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

**Преимущества:**
- Атомарные операции в БД
- Улучшение производительности
- Возвращает обновленные балансы

**Недостатки:**
- Требует доступа к Supabase Dashboard
- Не решает проблему с WebSocket уведомлениями

---

## ⚡ БЫСТРОЕ ВРЕМЕННОЕ РЕШЕНИЕ

### Ручная синхронизация балансов через SQL:
```sql
-- Пересчитать баланс пользователя 74 на основе транзакций
WITH balance_calc AS (
  SELECT 
    SUM(CASE 
      WHEN type IN ('FARMING_REWARD', 'REFERRAL_REWARD', 'MISSION_REWARD', 'DAILY_BONUS') 
      THEN CAST(amount_uni AS NUMERIC)
      WHEN type = 'FARMING_DEPOSIT' 
      THEN -CAST(amount_uni AS NUMERIC)
      ELSE 0 
    END) as calculated_balance
  FROM transactions
  WHERE user_id = 74
    AND status = 'completed'
)
UPDATE users 
SET balance_uni = COALESCE((SELECT calculated_balance FROM balance_calc), 0) + 1000
WHERE id = 74;
```

---

## 📋 РЕКОМЕНДАЦИЯ

1. **Немедленно**: Применить Вариант 1 (минимальное изменение) для быстрого решения
2. **В течение недели**: Реализовать Вариант 3 (RPC функция) для улучшения производительности
3. **В долгосрочной перспективе**: Рефакторинг на Вариант 2 (единый BalanceManager)

## 🚀 ДЕЙСТВИЯ ДЛЯ ПРИМЕНЕНИЯ

1. Остановить сервер
2. Применить изменения кода (Вариант 1)
3. Создать RPC функцию в Supabase (Вариант 3)
4. Запустить сервер
5. Проверить обновление балансов в UI

**Ожидаемое время исправления**: 15-30 минут