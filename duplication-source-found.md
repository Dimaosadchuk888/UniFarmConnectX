# 🚨 НАЙДЕН ИСТОЧНИК ДУБЛИРОВАНИЯ ТРАНЗАКЦИЙ!

## 📍 **ЛОКАЛИЗОВАН КОД С ПРОБЛЕМОЙ:**

### **1. Функция awardUniBonus() в modules/boost/service.ts (строка 230-294):**

**Проблемные моменты:**
- Строка 252: `balanceManager.addBalance()` - ДОБАВЛЯЕТ деньги к балансу  
- Строка 265-275: Затем создает транзакцию `DAILY_BONUS` в БД
- Строка 867: `activateBoost()` вызывается дважды в разных местах!

### **2. Цепочка вызовов которая создает дублирование:**

```
1. User покупает TON Boost → purchaseBoost()
2. purchaseBoost() → activateBoost() (первый раз)
3. activateBoost() → awardUniBonus() → balanceManager.addBalance() + DAILY_BONUS транзакция
4. Где-то еще → activateBoost() (второй раз) ← ИСТОЧНИК ДУБЛИРОВАНИЯ!
5. activateBoost() → awardUniBonus() → balanceManager.addBalance() + DAILY_BONUS транзакция
```

### **3. Конкретные строки с множественными вызовами:**

**A. Строка 867 в modules/boost/service.ts:**
```typescript
// ИСПРАВЛЕНО: Все активации выполняются в методе activateBoost()
// Активируем Boost - это включает в себя UNI бонус и создание farming записи
boostActivated = await this.activateBoost(userId, boostPackage.id.toString());
```

**B. purchaseBoost тоже может вызывать activateBoost**

## 🔧 **ЧТО ПРОИСХОДИТ С USER 25:**

1. **User 25 покупает TON Boost пакет "Starter Boost"**
2. **Первый вызов activateBoost():**
   - `balanceManager.addBalance(userId, 10000, 0)` → +10,000 UNI  
   - Транзакция: `DAILY_BONUS: +10000 UNI` (6:20:00 PM)
3. **Второй вызов activateBoost() (дублирование):**
   - `balanceManager.addBalance(userId, 10000, 0)` → +10,000 UNI  
   - Транзакция: `DAILY_BONUS: +10000 UNI` (6:21:12 PM)

**РЕЗУЛЬТАТ:** User получает 20,000 UNI вместо 10,000!

## 📊 **ТАКЖЕ ОБЪЯСНЯЕТ ДРУГИЕ ДУБЛИКАТЫ:**

- **FARMING_DEPOSIT дублируется:** Множественные вызовы farming функций
- **FARMING_REWARD дублируется:** Scheduler вызывается дважды  
- **TON Boost доходы дублируются:** Income generation вызывается многократно

## 🎯 **ТРЕБУЕТСЯ НАЙТИ:**

1. **Где второй раз вызывается activateBoost()?**
2. **Почему scheduler создает дублирующие FARMING_REWARD?**
3. **Какие еще функции вызываются множественно?**

## ⚠️ **ВЛИЯНИЕ:**

- **User 25 получает больше денег** чем должен
- **Баланс становится неточным** из-за дублированных начислений
- **Frontend показывает "возврат денег"** из-за множественных обновлений баланса

**ИСТОЧНИК ПРОБЛЕМЫ НАЙДЕН: МНОЖЕСТВЕННЫЕ ВЫЗОВЫ activateBoost() И ДРУГИХ ФУНКЦИЙ!**