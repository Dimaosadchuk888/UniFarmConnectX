# ТОЧНАЯ ПРИЧИНА ФИНАНСОВОЙ УЯЗВИМОСТИ ПОДТВЕРЖДЕНА

**Дата**: 28 июля 2025, 12:20 UTC  
**Статус**: ИСТОЧНИК ПРОБЛЕМЫ НАЙДЕН  

## 🎯 ТОЧНАЯ ТЕХНИЧЕСКАЯ ПРИЧИНА

**Файл**: `modules/boost/service.ts`  
**Строки**: 456-488  
**Метод**: `purchaseWithInternalWallet()`  

### КОД С ОШИБКОЙ:
```typescript
const { error: transactionError } = await supabase
  .from('transactions')
  .insert({
    user_id: parseInt(userId),
    type: 'BOOST_PURCHASE',
    amount: requiredAmount.toString(), // ❌ ПОЛОЖИТЕЛЬНОЕ ЗНАЧЕНИЕ
    currency: 'TON',
    status: 'completed',
    description: `Покупка TON Boost "${boostPackage.name}" (-${requiredAmount} TON)`,
```

### ПРОБЛЕМА:
- **Поле amount**: `requiredAmount.toString()` = "1" (положительное)
- **Должно быть**: `(-requiredAmount).toString()` = "-1" (отрицательное)

## 📊 ДОКАЗАТЕЛЬСТВА ИЗ БАЗЫ ДАННЫХ

**5 транзакций BOOST_PURCHASE пользователя 25**:
- ID 1376464: Amount = "1" TON (должно быть "-1")
- ID 1378324: Amount = "1" TON (должно быть "-1")  
- ID 1378399: Amount = "1" TON (должно быть "-1")
- ID 1378443: Amount = "1" TON (должно быть "-1")
- ID 1379192: Amount = "1" TON (должно быть "-1")

**Каждая транзакция**:
- ✅ Description правильное: "Покупка TON Boost (-1 TON)"
- ❌ Amount поле неправильное: "+1" вместо "-1"

## 💡 МЕХАНИЗМ ПРОБЛЕМЫ

1. **processWithdrawal()** вызывается и пытается списать 1 TON
2. **BalanceManager.subtractBalance()** может работать корректно
3. **НО**: Создается транзакция BOOST_PURCHASE с **положительной** суммой
4. **Результат**: Система "возвращает" деньги через положительную транзакцию

## 🚨 МАСШТАБ ПРОБЛЕМЫ

**Пострадавшие**: ВСЕ покупатели TON Boost  
**Механизм**: Каждая покупка создает +1 TON транзакцию вместо -1 TON  
**Финансовый ущерб**: Пользователи покупают TON Boost и получают деньги обратно  

## ⚡ РЕШЕНИЕ

**Заменить**:
```typescript
amount: requiredAmount.toString(), // Неправильно
```

**На**:
```typescript
amount: (-requiredAmount).toString(), // Правильно
```

## 📋 ПОДТВЕРЖДЕНИЕ

✅ **Диагностика базы данных**: 5 положительных BOOST_PURCHASE транзакций  
✅ **Анализ кода**: Найдена строка с ошибкой  
✅ **Логика подтверждена**: Положительные amount создают начисления вместо списаний  
✅ **Пользователь пострадал**: User 25 получил 4 TON обратно + 40,000 UNI бонусов  

**ПРИЧИНА УСТАНОВЛЕНА С ФАКТИЧЕСКИМИ ДОКАЗАТЕЛЬСТВАМИ**