# 🔍 TON Boost Накопление - Финальный Аудит

**Дата:** 14 июля 2025
**Статус:** ✅ Аудит завершен  
**Метод:** Полная проверка без изменений кода

---

## 📊 Сводка критических проблем

| Проблема | Статус | Влияние |
|----------|--------|---------|
| Потеря средств | ❌ 10 TON (3%) | 340 TON → 330 TON |
| Рассинхронизация таблиц | ❌ Критично | ton_farming_data ≠ users |
| Отсутствие cumulative_balance | ❌ Нет аудита | Невозможно отследить накопление |
| UI использует неверные данные | ❌ Визуальный баг | deposits.reduce() вместо farming_balance |
| API возвращает tonBalance | ❌ Неверный расчет | Вместо farming_balance |
| Частичное выполнение upsert | ❌ КРИТИЧНО | farming_rate и farming_balance не обновляются |

---

## 🔍 Детальные находки

### 1. Рассинхронизация таблиц ❌
```sql
-- ton_farming_data (основная)
farming_balance: 330 TON ✅ (почти правильно)
farming_rate: 0.015
boost_package_id: 2

-- users (fallback)  
ton_farming_balance: 0 TON ❌
ton_farming_rate: 0.015
ton_boost_package_id: null ❌
```
**Проблема:** Если система использует fallback, видит 0 TON!

### 2. Потеря средств при накоплении ❌
- Всего транзакций: 37
- Сумма депозитов: 340 TON
- В БД сохранено: 330 TON
- **Потеряно: 10 TON** (последний Advanced Boost)

### 3. Отсутствие cumulative_balance в metadata ❌
```javascript
// modules/boost/service.ts строка 369-374
metadata: {
  original_type: 'TON_BOOST_PURCHASE',
  boost_package_id: boostPackage.id,
  package_name: boostPackage.name,
  daily_rate: boostPackage.daily_rate
  // ❌ НЕТ cumulative_balance!
}
```

### 4. UI использует массив deposits ❌
```typescript
// TonFarmingStatusCard.tsx строки 286-292
const deposits = farmingInfo?.data?.deposits || [];
amount = deposits.reduce((sum, deposit) => {
  return sum + parseFloat(deposit.ton_amount);
}, 0);
// НЕ использует farming_balance из БД
```

### 5. API возвращает неверные данные ❌
```javascript
// getTonBoostFarmingStatus в service.ts
deposits: [{
  amount: tonBalance.toString(), // ❌ Общий баланс вместо farming_balance
  ...
}]
```

### 6. Частичное выполнение upsert ❌❌❌
**КРИТИЧЕСКАЯ ПРОБЛЕМА:**
```
Последняя покупка: Advanced Boost
- Ожидалось: package_id=3, rate=0.02, balance+=10
- В БД: package_id=2, rate=0.015, balance не изменился
```

---

## 🔧 Корневая причина

**Частичное выполнение upsert операции** в `TonFarmingRepository.activateBoost()`:
1. Код содержит логику накопления (`currentBalance + depositToAdd`)
2. НО upsert частично выполняется или откатывается
3. В результате:
   - `boost_package_id` иногда обновляется
   - `farming_balance` и `farming_rate` - НЕТ

---

## 📋 Подтверждение кодом

### Логика накопления существует ✅
```typescript
// TonFarmingRepository.ts строки 252-255
const currentBalance = parseFloat(existingRecord.farming_balance) || 0;
const depositToAdd = depositAmount || 0;
newFarmingBalance = (currentBalance + depositToAdd).toString();
```

### Планировщик использует правильное поле ✅
```typescript
// tonBoostIncomeScheduler.ts строка 117
const userDeposit = Math.max(0, parseFloat(user.farming_balance || '0'));
```

### НО данные не сохраняются ❌
```sql
SELECT farming_balance FROM ton_farming_data WHERE user_id = 74;
-- 330 вместо 340

SELECT farming_rate FROM ton_farming_data WHERE user_id = 74;  
-- 0.015 вместо 0.02
```

---

## 🎯 Выводы

1. **Логика накопления реализована** в коде
2. **Планировщик работает правильно**
3. **Проблема в сохранении данных** - частичное выполнение upsert
4. **UI и API используют неверные источники** данных
5. **Отсутствует аудит-трейл** накопления в metadata

**Потери пользователя 74:** 10 TON (3% от 340 TON)

---

## 📝 Рекомендации (без изменения кода)

1. Проверить логи на ошибки при выполнении upsert
2. Добавить транзакционность для операции upsert
3. Синхронизировать данные между таблицами
4. Исправить UI для использования farming_balance
5. Добавить cumulative_balance в metadata транзакций