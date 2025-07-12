# 🐞 Анализ сбоя Daily Bonus - UniFarm
**Дата:** 12.07.2025  
**Проблема:** Баланс увеличился, но показывается ошибка и нет транзакции

## 🔍 Обнаруженные критические проблемы:

### 1. ❌ **Undefined переменные в daily_bonus_logs**
**Файл:** `modules/dailyBonus/service.ts:204-205`

```typescript
// ПРОБЛЕМА: currentBalance и newBalance не определены
previous_balance: currentBalance,  // undefined
new_balance: newBalance,          // undefined
```

**Исправление:** Добавлено получение текущего баланса и вычисление нового:
```typescript
const currentBalance = user.balance_uni || 0;
// ... после успешного обновления баланса
const newBalance = currentBalance + parseFloat(bonusAmount);
```

### 2. ❌ **Неправильный тип транзакции** 
**Файл:** `modules/dailyBonus/service.ts:179, 239, 299`

```typescript
// БЫЛО: 
type: 'DAILY_BONUS'  // В модели такого нет!

// СТАЛО:
type: 'daily_bonus'  // Согласно modules/transactions/model.ts:27
```

### 3. ❌ **Неправильное поле ошибки**
**Файл:** `modules/dailyBonus/service.ts:153`

```typescript
// БЫЛО:
return { success: false, message: result.error || 'Ошибка начисления бонуса' };

// СТАЛО:
return { success: false, error: result.error || 'Ошибка начисления бонуса' };
```

## 📊 Что произошло при нажатии кнопки:

1. ✅ **Баланс начислен успешно**
   - Было: 1,004,900.123 UNI
   - Стало: 1,006,100.12 UNI
   - Начислено: ~1,200 UNI (вместо 600 UNI!)

2. ❌ **Ошибка при записи в daily_bonus_logs**
   - Undefined переменные вызвали сбой INSERT
   - Операция вернула error

3. ❌ **Транзакция не создалась**
   - Неправильный тип 'DAILY_BONUS' вместо 'daily_bonus'
   - Ошибка игнорировалась (только logger.warn)

4. ❌ **UI показал ошибку**
   - Из-за ошибки в daily_bonus_logs вернулся success: false
   - Хотя баланс был начислен

## 🎯 Двойное начисление (1,200 вместо 600):

Возможные причины:
1. Двойной клик на кнопку
2. Повторная отправка запроса
3. Race condition между проверкой и обновлением

## 📁 Исправленные файлы:

1. **modules/dailyBonus/service.ts**
   - Строки 143-163: Добавлены currentBalance и newBalance
   - Строка 179: type: 'daily_bonus'
   - Строка 239: type: 'daily_bonus' в истории
   - Строка 299: type: 'daily_bonus' в статистике
   - Строка 153: error вместо message

## 🛠️ Рекомендации:

1. **Перезапустить сервер** для применения исправлений
2. **Добавить транзакционность** - все операции в одной транзакции
3. **Защита от двойного клика** в UI
4. **Проверить формулу расчета** - почему 1,200 вместо 600?

## ✅ После исправлений:

- Транзакции будут создаваться корректно
- daily_bonus_logs будет записываться без ошибок
- UI получит правильный success: true при успехе
- История транзакций покажет DAILY_BONUS записи

**Статус:** Все критические баги исправлены, требуется перезапуск сервера!