# 📊 ФИНАЛЬНЫЙ АУДИТ: TON BOOST ДЕПОЗИТЫ

## 🔍 ТЕКУЩЕЕ СОСТОЯНИЕ БД (2 августа 2025)

### Таблица `users` - основные балансы:
```
├── balance_ton: 82.08 TON (доступный баланс)
├── balance_uni: 924,977 UNI 
├── ton_farming_balance: 115 TON (ЗАСТРЯЛ - не обновляется!)
├── ton_boost_package: 2 (активный пакет)
└── ton_boost_active: true
```

### Таблица `ton_farming_data`:
```
├── farming_balance: 115 TON (дублирует users.ton_farming_balance)
├── boost_active: true
└── boost_package_id: 2
```

### Таблица `transactions`:
```
Найдено 5 транзакций BOOST_PURCHASE (28 июля):
├── -1 TON
├── -1 TON  
├── -1 TON
├── -10 TON
├── -5 TON
└── ИТОГО: -18 TON списано
```

## 📍 КУДА СИСТЕМА ХОЧЕТ ПИСАТЬ ДЕПОЗИТЫ

### Поток покупки TON Boost:
1. **BalanceManager.subtractBalance()** → списывает из `balance_ton` ✅
2. **Обновляет в users**: `ton_boost_package`, `ton_boost_rate`, `ton_boost_active` ✅
3. **TonFarmingRepository.activateBoost()** → должен добавить в `ton_farming_balance` ❌
4. **Создает транзакцию** типа `BOOST_PURCHASE` ✅

### Где происходит сбой:
```
TonFarmingRepository.activateBoost():
├── Получает текущий farming_balance (115 TON)
├── Добавляет новый депозит (+18 TON)
├── Должно стать: 115 + 18 = 133 TON
├── Пытается сохранить в ton_farming_data
├── Fallback на users.ton_farming_balance
└── ❌ НО ОБНОВЛЕНИЕ НЕ ПРОИСХОДИТ!
```

## ⚠️ КРИТИЧЕСКАЯ ПРОБЛЕМА

### Баг в методе `calculateUserTonDeposits()`:
```typescript
// Текущий код ищет только эти типы:
.in('type', ['DEPOSIT', 'TON_DEPOSIT', 'FARMING_REWARD'])

// НЕ включает 'BOOST_PURCHASE'!
```

Поэтому при создании новой записи farming_balance рассчитывается БЕЗ учета покупок boost.

## 💰 ФИНАНСОВАЯ КАРТИНА

```
БЫЛО (начало):
├── balance_ton: 100.02 TON
├── ton_farming_balance: 115 TON
└── ИТОГО: 215.02 TON

КУПИЛИ BOOST: -18 TON

СТАЛО (сейчас):
├── balance_ton: 82.08 TON (-18 ✅)
├── ton_farming_balance: 115 TON (не изменился ❌)
└── ИТОГО: 197.08 TON

ПОТЕРЯНО: 18 TON (зависли между балансами)
```

## 🎯 СХЕМА ХРАНЕНИЯ ДЕПОЗИТОВ

### Текущая модель БД после рефакторинга:

```
USERS (основная таблица):
├── balance_ton → доступный баланс для вывода
├── balance_uni → доступный баланс UNI
├── ton_farming_balance → TON в farming (основное хранилище)
├── uni_deposit_amount → UNI в farming
├── ton_boost_package → ID активного пакета
└── ton_boost_active → флаг активности

TON_FARMING_DATA (дублирующая таблица):
├── farming_balance → дублирует users.ton_farming_balance
├── boost_package_id → дублирует users.ton_boost_package
└── boost_active → дублирует users.ton_boost_active

TRANSACTIONS (история операций):
└── Все финансовые операции с типом и суммой
```

## ✅ ЧТО НУЖНО СОЕДИНИТЬ

1. **При покупке boost** деньги должны:
   - Списаться из `balance_ton` ✅ (работает)
   - Добавиться в `ton_farming_balance` ❌ (не работает)
   - Синхронизироваться с `ton_farming_data` ⚠️ (частично)

2. **Исправить баги**:
   - Добавить `BOOST_PURCHASE` в `calculateUserTonDeposits()`
   - Проверить fallback логику в `activateBoost()`
   - Убедиться что обновление `ton_farming_balance` происходит

3. **Восстановить потерянные 18 TON**:
   - Добавить их к `ton_farming_balance` (115 + 18 = 133 TON)
   - Синхронизировать с `ton_farming_data`

## 📝 РЕЗЮМЕ

После рефакторинга БД система частично сломалась:
- Деньги правильно списываются при покупке
- НО не добавляются в farming баланс
- Причина: баг в коде, который не учитывает новые транзакции
- Решение: исправить код и восстановить баланс