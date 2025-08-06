# 🔍 ДИАГНОСТИКА: Отсутствие транзакции списания -1 TON при покупке TON Boost

**Дата:** 6 августа 2025  
**Статус:** Проблема найдена  
**Сложность исправления:** ⭐ Простая (1 строка кода)

---

## 🎯 СУТЬ ПРОБЛЕМЫ

При покупке TON Boost пакета:
- ✅ Бонусная транзакция UNI приходит правильно
- ❌ Транзакция списания -1 TON НЕ отображается в истории
- ✅ Баланс TON списывается корректно
- ❌ Пользователь не видит куда ушел его 1 TON

---

## 🔬 ТЕХНИЧЕСКИЙ АНАЛИЗ

### Где происходит покупка TON Boost:
**Файл:** `modules/boost/service.ts`  
**Метод:** `purchaseWithInternalWallet()`  
**Строки:** 334-600

### Что происходит при покупке:

1. **Строка 391-396: Списание баланса**
```typescript
const balanceResult = await balanceManager.subtractBalance(
  parseInt(userId),
  0, // amount_uni
  requiredAmount, // amount_ton (1 TON)
  'BoostService.purchase'
);
```
✅ Баланс списывается корректно через BalanceManager

2. **Строка 511-525: Создание транзакции**
```typescript
const transactionResult = await transactionService.createTransaction({
  user_id: parseInt(userId),
  type: 'BOOST_PURCHASE',
  amount_ton: -requiredAmount,  // -1 TON
  amount_uni: 0,
  currency: 'TON',
  status: 'completed',
  metadata: {
    original_type: 'TON_BOOST_PURCHASE',
    boost_package_id: boostPackage.id,
    package_name: boostPackage.name
  }
});
```
✅ Транзакция создается с правильной отрицательной суммой

---

## ❌ НАЙДЕНА ПРОБЛЕМА

### Файл: `core/TransactionService.ts`
**Строка 27:**
```typescript
'BOOST_PURCHASE': 'BOOST_PAYMENT',  // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: было FARMING_REWARD → теперь BOOST_PAYMENT
```

### НО! В базе данных нет типа `BOOST_PAYMENT`!

Проверка enum в БД:
```sql
-- Поддерживаемые типы транзакций:
'DEPOSIT', 'WITHDRAWAL', 'FARMING_REWARD', 'FARMING_DEPOSIT', 
'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD', 
'TON_DEPOSIT', 'TON_BOOST_PURCHASE'
```

**Тип `BOOST_PAYMENT` отсутствует в enum базы данных!**

Когда TransactionService пытается создать транзакцию с типом `BOOST_PAYMENT`, база данных отклоняет её из-за несуществующего типа.

---

## ✅ РЕШЕНИЕ

### Вариант 1: Быстрое исправление (1 строка)
Изменить маппинг в `core/TransactionService.ts`:
```typescript
// Строка 27 - БЫЛО:
'BOOST_PURCHASE': 'BOOST_PAYMENT',

// НАДО:
'BOOST_PURCHASE': 'TON_BOOST_PURCHASE',  // Используем существующий тип
```

### Вариант 2: Правильное решение (добавить тип в БД)
```sql
ALTER TYPE transaction_type ADD VALUE 'BOOST_PAYMENT';
```
Но это требует миграции БД.

---

## 🎨 КАК БУДЕТ ОТОБРАЖАТЬСЯ

После исправления в истории транзакций появится:
```
📦 Покупка TON Boost "Premium"
-1.000000 TON
[Дата и время]
```

С правильными стилями:
- Оранжевая иконка пакета
- Красная сумма (списание)
- Описание с названием пакета

---

## 📊 ВЛИЯНИЕ НА СИСТЕМУ

### Что изменится:
- ✅ Транзакция списания TON начнет отображаться
- ✅ История транзакций станет полной
- ✅ Пользователи увидят куда ушли их TON

### Что НЕ изменится:
- ✅ Логика списания баланса (уже работает)
- ✅ Начисление UNI бонуса (уже работает)
- ✅ Активация TON Boost (уже работает)

---

## 🚀 РЕКОМЕНДАЦИЯ

**Применить Вариант 1** - изменить 1 строку кода:
- Мгновенное исправление
- Никаких рисков
- Не требует миграции БД
- Использует уже существующий тип `TON_BOOST_PURCHASE`

Это восстановит отображение транзакций списания TON при покупке Boost пакетов.