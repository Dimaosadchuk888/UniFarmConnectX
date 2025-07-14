# 🧪 Отчет: Исследование отображения данных в карточке TON Farming

**Дата:** 14 января 2025  
**Статус:** ✅ Исследование завершено  
**Тип:** Диагностика без изменения кода

## 📋 Исследуемая проблема
Карточка TON Farming на вкладке "Фарминг" отображает некорректные значения:
- Общая сумма инвестированных TON показывает 666.22 вместо 362
- Доход рассчитывается от всего баланса кошелька, а не от суммы депозита

## 1. 🔍 Проверка источника данных

### API Endpoint
- **URL:** `/api/v2/boost/farming-status?user_id=74`
- **Метод:** `BoostService.getTonBoostFarmingStatus()`
- **Файл:** `modules/boost/service.ts` (строки 878-987)

### Что возвращает API:
```json
{
  "totalTonRatePerSecond": "0.00000023",
  "totalUniRatePerSecond": "0",
  "dailyIncomeTon": "6.662255",
  "dailyIncomeUni": "0",
  "deposits": [{
    "id": 1,
    "package_name": "Starter Boost",
    "amount": "666.22553",  // ← Здесь проблема!
    "rate": "1",
    "status": "active"
  }]
}
```

## 2. 📊 Анализ данных в базе

### Таблица users (user_id = 74):
- `balance_ton`: 666.22553 TON ✅
- `ton_boost_package`: 1 ✅
- `ton_farming_balance`: НЕ СУЩЕСТВУЕТ ❌
- `ton_farming_rate`: 0.015 ✅

### Таблица ton_farming_data (user_id = 74):
- `farming_balance`: 362 TON ✅ (реальная сумма депозитов)
- `farming_rate`: 0.0001 ✅
- `boost_package_id`: 1 ✅
- `status`: active ✅

## 3. ❌ Выявленная проблема

### Backend (modules/boost/service.ts, строка 971):
```javascript
deposits: [{
  id: activeBoostId,
  package_name: boostPackage.name,
  amount: tonBalance.toString(),  // ← Использует balance_ton!
  rate: dailyRate.toString(),
  status: 'active'
}]
```

**Проблема:** API возвращает `balance_ton` (666.22) вместо `farming_balance` (362)

### Frontend (TonFarmingStatusCard.tsx, строки 284-302):
```javascript
// Рассчитываем общую сумму из массива депозитов
let amount = 0;
const deposits = farmingInfo?.data?.deposits || [];
if (Array.isArray(deposits) && deposits.length > 0) {
  amount = deposits.reduce((sum, deposit) => {
    const depositAmount = typeof deposit.ton_amount === 'string' ? 
      parseFloat(deposit.ton_amount) : (deposit.ton_amount || 0);
    return sum + (isNaN(depositAmount) ? 0 : depositAmount);
  }, 0);
}
```

**Frontend работает правильно** - суммирует значения из массива deposits

## 4. 📈 Влияние на расчеты

### Текущий расчет дохода (неправильный):
- База: 666.22553 TON (весь баланс)
- Ставка: 1% в день
- Доход: 6.66 TON/день

### Правильный расчет:
- База: 362 TON (сумма депозитов)
- Ставка: 1% в день  
- Доход: 3.62 TON/день

**Разница:** 3.04 TON/день лишнего отображения

## 5. ✅ Что работает корректно

1. **Планировщик TON Boost** (`tonBoostIncomeScheduler.ts`, строка 117):
   ```javascript
   const userDeposit = Math.max(0, parseFloat(user.farming_balance || '0'));
   ```
   Использует правильное поле `farming_balance` для расчета реальных начислений

2. **Frontend компонент** правильно обрабатывает данные от API

3. **TonFarmingRepository** имеет метод `getByUserId()` для получения farming_balance

## 6. 🔗 Цепочка данных

```
База данных (ton_farming_data)
    ↓
    farming_balance = 362 TON
    ↓
BoostService.getTonBoostFarmingStatus()
    ↓
    ❌ Берет balance_ton = 666.22 вместо farming_balance
    ↓
API Response (deposits[0].amount = "666.22553")
    ↓
Frontend TonFarmingStatusCard
    ↓
    Отображает 666.22 TON
```

## 7. 📌 Точная причина проблемы

Метод `getTonBoostFarmingStatus` в `modules/boost/service.ts`:
1. Получает данные только из таблицы `users`
2. Не использует `TonFarmingRepository` для получения `farming_balance`
3. Возвращает `balance_ton` в поле `amount` депозита

## 8. ❌ Поля, которые не используются

- `farming_balance` из таблицы `ton_farming_data` - не используется для отображения
- `ton_farming_balance` в таблице `users` - поле не существует

## 9. 🎯 Рекомендации для исправления

1. Модифицировать `getTonBoostFarmingStatus` для использования `TonFarmingRepository`
2. Получать `farming_balance` из `ton_farming_data` вместо `balance_ton`
3. Альтернатива: добавить поле `farming_balance` в ответ API отдельно

## 10. 📊 Итоговая таблица

| Поле | Где отображается | Откуда берется | Правильное значение | Текущее значение |
|------|------------------|----------------|---------------------|------------------|
| Общая сумма | UI карточка | deposits[].amount | 362 TON | 666.22 TON ❌ |
| Доход в сутки | UI карточка | Расчет от amount | 3.62 TON | 6.66 TON ❌ |
| Реальные начисления | Транзакции | farming_balance | 3.62 TON | 3.62 TON ✅ |

## Заключение

Проблема локализована в backend методе `getTonBoostFarmingStatus`, который использует неправильное поле для возврата суммы депозита. Frontend работает корректно. Планировщик начисляет правильные суммы. Требуется минимальное изменение в backend для исправления отображения.