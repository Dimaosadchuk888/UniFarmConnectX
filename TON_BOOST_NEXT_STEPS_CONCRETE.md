# 🎯 КОНКРЕТНЫЙ ПЛАН ДЕЙСТВИЙ: TON Boost

**Приоритет:** Унификация с UNI Farming для исправления потери средств  
**Время:** 1-2 часа на реализацию  

---

## 📋 ШАГ 1: Изменить логику накопления (30 минут)

### Файл: `modules/boost/TonFarmingRepository.ts`

**Найти метод:** `activateBoost()` (строка ~243)

**Изменить:**
```typescript
// БЫЛО: просто обновление записи
// СТАЛО: накопление суммы
async activateBoost(userId: number, depositAmount: number, boostPackageId: number) {
  const existing = await this.getByUserId(userId);
  
  if (existing) {
    // Накопление вместо замены
    const newBalance = existing.farming_balance + depositAmount;
    
    const { error } = await supabase
      .from('ton_farming_data')
      .update({
        farming_balance: newBalance,  // Суммируем!
        boost_package_id: boostPackageId,
        farming_rate: this.getPackageRate(boostPackageId),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
  } else {
    // Первая покупка - создаем запись
    await this.create({
      user_id: userId,
      farming_balance: depositAmount,
      boost_package_id: boostPackageId,
      farming_rate: this.getPackageRate(boostPackageId)
    });
  }
}
```

---

## 📋 ШАГ 2: Передать сумму депозита (15 минут)

### Файл: `modules/boost/service.ts`

**Найти:** `purchaseWithInternalWallet()` (строка ~350)

**Изменить:**
```typescript
// Передаем сумму депозита в activateBoost
const result = await TonFarmingRepository.activateBoost(
  user.id,
  requiredAmount,  // <-- ДОБАВИТЬ этот параметр
  boost_package_id
);
```

---

## 📋 ШАГ 3: Решить вопрос со ставками (15 минут)

### Вариант A: Фиксированная ставка (ПРОСТОЙ)
```typescript
// Всегда использовать максимальную ставку последнего пакета
farming_rate: this.getPackageRate(boostPackageId)
```

### Вариант B: Средневзвешенная ставка (СПРАВЕДЛИВЫЙ)
```typescript
// Рассчитать среднюю ставку
const oldAmount = existing.farming_balance;
const oldRate = existing.farming_rate;
const newAmount = depositAmount;
const newRate = this.getPackageRate(boostPackageId);

const weightedRate = (oldAmount * oldRate + newAmount * newRate) / 
                    (oldAmount + newAmount);
```

**Рекомендую:** Вариант A для простоты

---

## 📋 ШАГ 4: Добавить metadata в транзакции (15 минут)

### Файл: `modules/boost/service.ts`

**Найти:** создание транзакции BOOST_PURCHASE (строка ~361)

**Добавить:**
```typescript
metadata: {
  original_type: 'TON_BOOST_PURCHASE',
  boost_package_id: boost_package_id,
  package_name: boostPackage.name,
  daily_rate: boostPackage.daily_rate,
  cumulative_balance: user.farming_balance + requiredAmount  // Новый баланс
}
```

---

## 📋 ШАГ 5: UI индикатор накопления (30 минут)

### Файл: `client/src/components/ton-boost/TonBoostStatus.tsx`

**Добавить отображение:**
```tsx
// Показать историю депозитов
<div className="mt-4 p-3 bg-gray-50 rounded">
  <h4 className="font-medium">Ваши депозиты TON Boost:</h4>
  <div className="text-sm text-gray-600 mt-2">
    <p>Всего внесено: {totalDeposited} TON</p>
    <p>Активный баланс: {farmingBalance} TON</p>
    <p>Текущая ставка: {currentRate * 100}% в день</p>
  </div>
</div>
```

---

## 📋 ШАГ 6: Тестирование (15 минут)

### Тестовый сценарий:
1. Купить пакет за 5 TON → `farming_balance = 5`
2. Купить пакет за 10 TON → `farming_balance = 15`
3. Проверить начисления → доход от 15 TON

### SQL для проверки:
```sql
-- Проверить накопление
SELECT user_id, farming_balance, boost_package_id, farming_rate
FROM ton_farming_data 
WHERE user_id = 74;

-- Проверить транзакции
SELECT type, amount, metadata
FROM transactions
WHERE user_id = 74 
AND type = 'BOOST_PURCHASE'
ORDER BY created_at DESC;
```

---

## ⚠️ ВАЖНЫЕ МОМЕНТЫ:

1. **НЕ ТРОГАТЬ** существующие балансы пользователей
2. **НЕ СОЗДАВАТЬ** миграции для возврата средств
3. **ПРОТЕСТИРОВАТЬ** на новом тестовом пользователе
4. **БЭКАП** таблицы ton_farming_data перед изменениями

---

## 🔥 АЛЬТЕРНАТИВА (если нужна гибкость):

Добавить флаг выбора при покупке:
```typescript
// В UI добавить checkbox
[ ] Добавить к существующему балансу
[ ] Заменить текущий пакет

// В коде
if (addToExisting) {
  // Накопление
  newBalance = existing.farming_balance + amount;
} else {
  // Замена
  newBalance = amount;
}
```

---

**Итого времени:** ~1.5 часа  
**Сложность:** Низкая  
**Риск:** Минимальный (только для новых покупок)