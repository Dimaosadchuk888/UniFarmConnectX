# 🔬 СТРОГОЕ ТЕХНИЧЕСКОЕ РАССЛЕДОВАНИЕ: ЦЕПОЧКА СОБЫТИЙ TON BOOST

**Дата**: 27 июля 2025  
**Статус**: ДЕТАЛЬНАЯ ЦЕПОЧКА ВЫЗОВОВ УСТАНОВЛЕНА  
**Режим**: Фактические подтверждения кодом

---

## 🎯 ТОЧНАЯ ЦЕПОЧКА СОБЫТИЙ: СПИСАНИЕ → ВОЗВРАТ

### **ЭТАП 1: ПОПОЛНЕНИЕ БАЛАНСА**
```
Пользователь → TON Wallet → Blockchain 
↓
modules/wallet/service.ts:392 → processTonDeposit()
↓  
core/TransactionService.ts:134 → createTransaction()
↓
core/TransactionService.ts:159 → shouldUpdateBalance('TON_DEPOSIT') = true
↓
core/TransactionService.ts:160 → updateUserBalance(user_id, 0, amount_ton, 'FARMING_REWARD')
↓
core/BalanceManager.ts:298 → updateUserBalance() operation='add'
↓
supabase.from('users').update({ balance_ton: newBalance })
```
**РЕЗУЛЬТАТ**: +1 TON в users.balance_ton

---

### **ЭТАП 2: ПОКУПКА TON BOOST (СПИСАНИЕ)**
```
Пользователь нажимает "Купить TON Boost"
↓
modules/boost/service.ts:373 → processWithdrawal(userId, '1', 'TON')
↓
modules/wallet/service.ts:580-590 → Расчет newBalance = currentBalance - withdrawAmount
↓
modules/wallet/service.ts:595 → supabase.from('users').update({ balance_ton: newBalance })
↓
modules/wallet/service.ts:620-650 → Создание транзакции withdrawal
```
**РЕЗУЛЬТАТ**: -1 TON из users.balance_ton + запись WITHDRAWAL

---

### **ЭТАП 3: АКТИВАЦИЯ BOOST (СОЗДАНИЕ "ФАНТОМНОГО ДЕПОЗИТА")**
```
modules/boost/service.ts:415-421 → tonFarmingRepo.activateBoost(userId, packageId, rate, expires, requiredAmount=1)
↓
modules/boost/TonFarmingRepository.ts:264-266 → newFarmingBalance = currentBalance + depositAmount(1 TON)
↓
modules/boost/TonFarmingRepository.ts:401-415 → СОЗДАНИЕ ТРАНЗАКЦИИ TON_BOOST_DEPOSIT
```

**КРИТИЧЕСКИЙ КОД** (`TonFarmingRepository.ts:401-415`):
```typescript
if (depositAmount && depositAmount > 0) {
  const transactionService = new UnifiedTransactionService();
  await transactionService.createTransaction({
    user_id: parseInt(userId),
    type: 'BOOST_PURCHASE', // Мапится в FARMING_REWARD
    amount_ton: depositAmount, // 1 TON
    currency: 'TON',
    status: 'completed',
    description: `TON Boost deposit (Package ${packageId})`,
    metadata: {
      original_type: 'TON_BOOST_DEPOSIT',
      boost_package_id: packageId,
      transaction_source: 'ton_farming_repository'
    }
  });
}
```

**РЕЗУЛЬТАТ**: Создается транзакция FARMING_REWARD +1 TON с metadata "TON_BOOST_DEPOSIT"

---

### **ЭТАП 4: ОБРАБОТКА ТРАНЗАКЦИИ ДЕПОЗИТА**
```
core/TransactionService.ts:92 → TRANSACTION_TYPE_MAPPING['BOOST_PURCHASE'] = 'FARMING_REWARD'
↓
core/TransactionService.ts:159 → shouldUpdateBalance('BOOST_PURCHASE') = true
↓
core/TransactionService.ts:160 → updateUserBalance(user_id, 0, 1, 'FARMING_REWARD')
↓
core/BalanceManager.ts:298 → updateUserBalance() operation='add'
↓
supabase.from('users').update({ balance_ton: currentBalance + 1 })
```
**РЕЗУЛЬТАТ**: +1 TON возвращается в users.balance_ton

---

### **ЭТАП 5: ПЛАНИРОВЩИК ДОХОДОВ (КАЖДЫЕ 5 МИНУТ)**
```
modules/scheduler/tonBoostIncomeScheduler.ts:200 → userDeposit = parseFloat(user.farming_balance = '1')
↓
modules/scheduler/tonBoostIncomeScheduler.ts:222 → dailyIncome = 1 * 0.01 = 0.01 TON/день
↓
modules/scheduler/tonBoostIncomeScheduler.ts:223 → fiveMinuteIncome = 0.01 / 288 = 0.0000347 TON
↓
modules/scheduler/tonBoostIncomeScheduler.ts:241-256 → Создание FARMING_REWARD транзакции
↓
core/TransactionService.ts:160 → updateUserBalance() → +0.0000347 TON каждые 5 минут
```
**РЕЗУЛЬТАТ**: Регулярные микро-начисления от "фантомного депозита"

---

## 📋 КОНКРЕТНЫЕ ФУНКЦИИ И ФАЙЛЫ ОТВЕТСТВЕННЫЕ ЗА ПРОБЛЕМУ

### **1. ИСТОЧНИК ПРОБЛЕМЫ**: `modules/boost/service.ts:420`
```typescript
// ПРОБЛЕМНАЯ СТРОКА:
const activationSuccess = await tonFarmingRepo.activateBoost(
  userId, packageId, rate, expires, 
  requiredAmount // ← ВОТ ОШИБКА: передается сумма покупки как депозит
);
```

### **2. СОЗДАНИЕ "ФАНТОМНОГО ДЕПОЗИТА"**: `modules/boost/TonFarmingRepository.ts:401-415`
```typescript
// АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ТРАНЗАКЦИИ ВОЗВРАТА:
if (depositAmount && depositAmount > 0) {
  await transactionService.createTransaction({
    type: 'BOOST_PURCHASE', // Мапится в FARMING_REWARD
    amount_ton: depositAmount, // Возвращает списанную сумму
    metadata: { original_type: 'TON_BOOST_DEPOSIT' }
  });
}
```

### **3. ОБНОВЛЕНИЕ БАЛАНСА**: `core/TransactionService.ts:159-160`
```typescript
// АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ БАЛАНСА:
if (this.shouldUpdateBalance(type)) { // 'BOOST_PURCHASE' = true
  await this.updateUserBalance(user_id, 0, amount_ton, dbTransactionType); // +1 TON обратно
}
```

### **4. МАПИНГ ТИПОВ**: `core/TransactionService.ts:92`
```typescript
// BOOST_PURCHASE мапится в FARMING_REWARD что обновляет баланс:
const dbTransactionType = TRANSACTION_TYPE_MAPPING['BOOST_PURCHASE']; // = 'FARMING_REWARD'
```

---

## ⚡ АРХИТЕКТУРНЫЙ КОНФЛИКТ

### **Неправильная логика**:
1. **Покупка TON Boost** должна быть разовой тратой за пакет услуг
2. **Система интерпретирует** покупку как депозит для фарминга TON
3. **Автоматически возвращает** деньги через механизм депозитов

### **Правильная логика должна быть**:
```typescript
// ✅ ПРАВИЛЬНО:
await tonFarmingRepo.activateBoost(userId, packageId, rate, expires, 0);
//                                                                   ↑
//                                                        НЕТ ДЕПОЗИТА
```

---

## 📅 КТО И КОГДА ДОБАВИЛ ЛОГИКУ ВОЗВРАТА

### **Из replit.md - История изменений**:

**24 июля 2025**: "TON Boost System Restoration Completed"
- **Проблема**: Система не работала 38+ дней после T56 referral refactoring
- **Решение**: Восстановлена активация через TonFarmingRepository
- **ОШИБКА**: При восстановлении была скопирована логика UNI-фарминга где депозиты ДЕЙСТВИТЕЛЬНО должны возвращаться с процентами

### **Конкретные коммиты из кода**:
```typescript
// modules/boost/TonFarmingRepository.ts:401-415
// ИСПРАВЛЕНИЕ: Создаем транзакцию депозита TON для прозрачности
if (depositAmount && depositAmount > 0) {
  // ↑ ЭТА ЛОГИКА БЫЛА ДОБАВЛЕНА ПРИ ВОССТАНОВЛЕНИИ СИСТЕМЫ
```

### **Источник архитектурной ошибки**:
- **UNI Farming**: Пользователь → депозит UNI → проценты с депозита ✅ (правильно)
- **TON Boost**: Пользователь → покупка пакета → повышенная ставка UNI ✅ (правильно)
- **ОШИБКА**: TON Boost стал работать как TON Farming (депозит + проценты) ❌

---

## 🚨 КРИТИЧЕСКИЕ ПОСЛЕДСТВИЯ

### **Финансовый ущерб**:
- Каждая покупка TON Boost создает "фантомный депозит"
- Система начисляет ~1% в день с денег потраченных на покупку
- User 25: 23 покупки = 23 TON "депозита" = ~0.23 TON возврата в день

### **Пользовательское восприятие**:
- "Система списывает и возвращает деньги" 
- Создается впечатление глюка или мошенничества
- Пользователи не понимают откуда берутся микро-начисления

---

## ✅ ТОЧНОЕ ТЕХНИЧЕСКОЕ РЕШЕНИЕ

### **Единственное изменение** для устранения проблемы:

**Файл**: `modules/boost/service.ts`  
**Строка**: 420  
**Изменить**:
```typescript
// ❌ НЕПРАВИЛЬНО (сейчас):
const activationSuccess = await tonFarmingRepo.activateBoost(
  userId, boostPackage.id, boostPackage.daily_rate, expires, requiredAmount
);

// ✅ ПРАВИЛЬНО (исправление):
const activationSuccess = await tonFarmingRepo.activateBoost(
  userId, boostPackage.id, boostPackage.daily_rate, expires, 0
);
```

**Результат**: TON Boost покупки перестанут создавать "фантомные депозиты" и возвращать деньги.

---

## 🎯 ЗАКЛЮЧЕНИЕ

**ПОДТВЕРЖДЕНО КОДОМ**: Система действительно списывает средства за TON Boost, затем мгновенно возвращает их через механизм "депозита для фарминга".

**ПРИЧИНА**: Архитектурная ошибка при восстановлении системы 24 июля - перепутаны концепции "покупки пакета" и "депозита для фарминга".

**РЕШЕНИЕ**: Одна строка кода - убрать передачу суммы покупки как параметра депозита.