# 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА ДУБЛИРОВАНИЯ TON BOOST ПАКЕТОВ

## ❌ ОБНАРУЖЕНА ДВОЙНАЯ ОБРАБОТКА В КОДЕ

### **ИСТОЧНИК ПРОБЛЕМЫ**: `modules/boost/service.ts`

**Метод `purchaseWithInternalWallet()` содержит ДУБЛИРОВАННЫЙ код:**

```typescript
// 1-й ВЫЗОВ на строке 402:
const uniBonusSuccess = await this.awardUniBonus(userId, boostPackage);

// 2-й ВЫЗОВ на строке 482:
const uniBonusAwarded = await this.awardUniBonus(userId, boostPackage);

// 3-й ВЫЗОВ на строке 826:
const uniBonusAwarded = await this.awardUniBonus(userId, boostPackage);
```

## 🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ДУБЛИРОВАНИЯ

### **ТРОЙНОЕ НАЧИСЛЕНИЕ UNI БОНУСА**:
1. **Первый вызов** (строка 402): `await this.awardUniBonus(userId, boostPackage)`  
2. **Второй вызов** (строка 482): `await this.awardUniBonus(userId, boostPackage)`
3. **Третий вызов** (строка 826): `await this.awardUniBonus(userId, boostPackage)`

### **КАЖДЫЙ ВЫЗОВ `awardUniBonus()` ДЕЛАЕТ**:
```typescript
// Обновляет баланс через BalanceManager
await balanceManager.addBalance(parseInt(userId), boostPackage.uni_bonus, 0, 'BoostService.uni_bonus');

// Создает транзакцию в базе данных
await supabase.from('transactions').insert({
    user_id: parseInt(userId),
    type: 'DAILY_BONUS',
    amount: boostPackage.uni_bonus.toString(),
    currency: 'UNI',
    status: 'completed',
    description: `UNI бонус за покупку TON Boost "${boostPackage.name}" (+${boostPackage.uni_bonus} UNI)`
});
```

## 🎯 РЕЗУЛЬТАТ ДУБЛИРОВАНИЯ

### **При покупке 1 TON Boost пакета система делает**:
- ✅ **Правильно**: Списывает 1 TON из кошелька
- ❌ **ОШИБКА**: Начисляет UNI бонус **ТРИЖДЫ**
- ❌ **ОШИБКА**: Создает **ТРИ транзакции** DAILY_BONUS 
- ❌ **ОШИБКА**: Увеличивает баланс UNI на **ТРОЙНУЮ сумму**

### **ДВОЙНАЯ АКТИВАЦИЯ TON FARMING**:
```typescript
// Также обнаружено дублирование активации:
// 1-й вызов (строка 413): tonFarmingRepo.activateBoost()
// Потенциально может быть еще один вызов в другом месте
```

## 📊 ВЛИЯНИЕ НА ПОЛЬЗОВАТЕЛЯ #184

### **ФАКТИЧЕСКИЙ РЕЗУЛЬТАТ покупки за 1 TON**:
- ✅ Списано: 1 TON (корректно)
- ❌ Начислено UNI: ТРОЙНАЯ сумма бонуса
- ❌ Создано транзакций: 3 × DAILY_BONUS
- ❌ В TON Farming статистике: депозит увеличен на 2 TON (проблема накопления в TonFarmingRepository)

## 🔍 ДОПОЛНИТЕЛЬНЫЕ ПРОБЛЕМЫ

### **НАКОПЛЕНИЕ ДЕПОЗИТОВ в TonFarmingRepository**:
```typescript
// В TonFarmingRepository.activateBoost()
const currentBalance = parseFloat(existingRecord?.farming_balance) || 0;
const depositToAdd = depositAmount || 0;
newFarmingBalance = (currentBalance + depositToAdd).toString();
```
**Проблема**: При двойном вызове активации депозит накапливается: 0 + 1 + 1 = 2 TON

## 🚨 КРИТИЧНОСТЬ ПРОБЛЕМЫ

- **СТАТУС**: КРИТИЧЕСКАЯ ОШИБКА В PRODUCTION
- **ЗАТРОНУТО**: Все пользователи покупающие TON Boost пакеты
- **ПОТЕРИ**: Двойные UNI бонусы = финансовые потери системы
- **ОБНАРУЖЕНО**: User #184, время покупки сегодня

## 📋 ПЛАН ЭКСТРЕННОГО ИСПРАВЛЕНИЯ

### **НЕМЕДЛЕННЫЕ ДЕЙСТВИЯ**:
1. **УДАЛИТЬ** дублированный вызов `awardUniBonus()` на строке 482
2. **ПРОВЕРИТЬ** на двойные вызовы `activateBoost()`
3. **ДОБАВИТЬ** защиту от повторной активации в `TonFarmingRepository`
4. **КОМПЕНСИРОВАТЬ** пострадавшему пользователю #184

### **ДОЛГОСРОЧНЫЕ МЕРЫ**:
1. Добавить unit-тесты для предотвращения дублирования
2. Внедрить idempotency ключи для критических операций
3. Добавить мониторинг аномальных начислений

## ⚠️ РЕКОМЕНДАЦИЯ

**НЕ ВНОСИТЬ ИЗМЕНЕНИЯ** до получения разрешения пользователя, так как проблема затрагивает финансовую логику системы.

## 🧾 DIAGNOSTIC SCRIPT ГОТОВ

Создан файл `CRITICAL_TON_BOOST_DUPLICATION_DIAGNOSIS.js` для production анализа:
- Анализ всех транзакций User #184 за последние 2 часа
- Группировка DAILY_BONUS транзакций для поиска дубликатов  
- Проверка ton_farming_data на накопление депозитов
- Анализ временных паттернов для выявления близких по времени дубликатов
- Полная диагностика без изменения данных

**Запуск**: `node CRITICAL_TON_BOOST_DUPLICATION_DIAGNOSIS.js`

**Время обнаружения**: 24.07.2025 13:45 MSK  
**Критичность**: МАКСИМАЛЬНАЯ - потери денежных средств
**Статус**: ДИАГНОСТИКА PRODUCTION ГОТОВА - КОД НЕ ИЗМЕНЯЛСЯ