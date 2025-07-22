# 🔐 БЕЗОПАСНЫЙ ПЛАН ИСПРАВЛЕНИЯ НАКОПИТЕЛЬНОЙ ЛОГИКИ UNI FARMING

**Дата:** 22 июля 2025  
**Приоритет:** КРИТИЧЕСКИЙ  
**Статус:** АРХИТЕКТУРНОЕ РЕШЕНИЕ ГОТОВО  

---

## 🎯 ЦЕЛЬ ИСПРАВЛЕНИЯ

Преобразовать **накопительную модель начисления** в **интервальную модель** без остановки фарминга и потери данных.

**Требуется изменить:**
- С накопления пропущенных периодов → на фиксированный текущий интервал
- С `effectivePeriods = Math.min(periods, 288)` → на `effectivePeriods = 1`

---

## 🏗️ АРХИТЕКТУРНЫЙ ПОДХОД

### Стратегия "Безопасного переключения"

#### 1. **СОЗДАНИЕ НОВОЙ ЛОГИКИ РЯДОМ СО СТАРОЙ**
Не изменяем существующий `UnifiedFarmingCalculator`, а создаем новый модуль:

```
core/farming/
├── UnifiedFarmingCalculator.ts (оригинал - сохраняем)
├── IntervalFarmingCalculator.ts (новый - интервальная логика)
└── FarmingCalculatorSwitch.ts (переключатель между версиями)
```

#### 2. **ГРАДУАЛЬНОЕ ПЕРЕКЛЮЧЕНИЕ ЧЕРЕЗ FEATURE FLAG**
```typescript
// В FarmingCalculatorSwitch.ts
export class FarmingCalculatorSwitch {
  static async calculateIncome(farmer: any): Promise<FarmingIncome | null> {
    const useIntervalLogic = process.env.USE_INTERVAL_FARMING === 'true';
    
    if (useIntervalLogic) {
      return IntervalFarmingCalculator.calculateIncome(farmer);
    } else {
      return UnifiedFarmingCalculator.calculateIncome(farmer);
    }
  }
}
```

#### 3. **ПОСТЕПЕННОЕ ВНЕДРЕНИЕ**
1. **Phase 1:** Создаем новую логику (0% пользователей)
2. **Phase 2:** Тестируем на 1 тестовом пользователе
3. **Phase 3:** Включаем для 10% пользователей  
4. **Phase 4:** Полный переход (100% пользователей)
5. **Phase 5:** Удаляем старую логику

---

## 📝 ДЕТАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

### **Phase 1: Создание новой логики (БЕЗ ИЗМЕНЕНИЯ ПРОДАКШЕНА)**

#### 1.1 Создать `IntervalFarmingCalculator.ts`
```typescript
export class IntervalFarmingCalculator {
  private static INTERVAL_MINUTES = 5;
  private static DAILY_INTERVALS = 288; // 24 * 60 / 5
  
  static async calculateIncome(farmer: any): Promise<FarmingIncome | null> {
    // Валидация депозита (копируем из оригинала)
    const depositAmount = parseFloat(farmer.uni_deposit_amount || '0');
    if (depositAmount <= 0) return null;
    
    // КЛЮЧЕВОЕ ОТЛИЧИЕ: всегда только 1 период
    const effectivePeriods = 1; // Фиксированно!
    
    // Расчет дохода за ОДИН интервал
    const rate = parseFloat(farmer.uni_farming_rate || '0.01');
    const dailyIncome = depositAmount * rate;
    const incomePerPeriod = dailyIncome / this.DAILY_INTERVALS;
    const totalIncome = incomePerPeriod * effectivePeriods; // Всегда один период
    
    // Логирование для сравнения
    logger.info('[IntervalFarmingCalculator] Fixed interval income', {
      userId: farmer.user_id,
      depositAmount,
      rate,
      periods: effectivePeriods, // всегда 1
      amount: totalIncome,
      comparison: 'interval_mode'
    });
    
    return {
      userId: farmer.user_id || farmer.id,
      amount: totalIncome,
      currency: 'UNI',
      periods: effectivePeriods,
      depositAmount,
      rate,
      lastUpdate: new Date(),
      currentTime: new Date()
    };
  }
}
```

#### 1.2 Создать `FarmingCalculatorSwitch.ts`
```typescript
export class FarmingCalculatorSwitch {
  static async calculateIncome(farmer: any): Promise<FarmingIncome | null> {
    // Проверяем флаг из переменных окружения
    const useIntervalLogic = process.env.USE_INTERVAL_FARMING === 'true';
    
    // Дополнительная защита: можно включить только для тестовых пользователей
    const testUserIds = [9999, 9998]; // Тестовые пользователи
    const isTestUser = testUserIds.includes(farmer.user_id || farmer.id);
    
    // Логируем выбор логики
    logger.info('[FarmingCalculatorSwitch] Logic selection', {
      userId: farmer.user_id,
      useIntervalLogic,
      isTestUser,
      selectedCalculator: useIntervalLogic ? 'IntervalFarmingCalculator' : 'UnifiedFarmingCalculator'
    });
    
    if (useIntervalLogic) {
      return IntervalFarmingCalculator.calculateIncome(farmer);
    } else {
      return UnifiedFarmingCalculator.calculateIncome(farmer);
    }
  }
  
  // Метод для статистики
  static getActiveCalculator(): string {
    return process.env.USE_INTERVAL_FARMING === 'true' 
      ? 'IntervalFarmingCalculator' 
      : 'UnifiedFarmingCalculator';
  }
}
```

#### 1.3 Изменить `farmingScheduler.ts` (ОДНА СТРОКА)
```typescript
// Заменить в строке 174:
// const incomeData = await UnifiedFarmingCalculator.calculateIncome(farmer);
const incomeData = await FarmingCalculatorSwitch.calculateIncome(farmer);
```

---

### **Phase 2: Безопасное тестирование**

#### 2.1 Переменные окружения для контроля
```bash
# В Replit Secrets добавить:
USE_INTERVAL_FARMING=false  # По умолчанию старая логика
FARMING_TEST_MODE=true      # Включить расширенное логирование
```

#### 2.2 Тестирование на одном пользователе
```typescript
// Добавить в FarmingCalculatorSwitch.ts:
static async calculateIncome(farmer: any): Promise<FarmingIncome | null> {
  const testUserId = parseInt(process.env.FARMING_TEST_USER_ID || '9999');
  const useIntervalLogic = farmer.user_id === testUserId;
  
  // Всех остальных обрабатываем старой логикой
  if (useIntervalLogic) {
    logger.info('[TESTING] Using IntervalFarmingCalculator for test user', {
      userId: farmer.user_id
    });
    return IntervalFarmingCalculator.calculateIncome(farmer);
  } else {
    return UnifiedFarmingCalculator.calculateIncome(farmer);
  }
}
```

#### 2.3 Мониторинг результатов
```typescript
// Добавить в IntervalFarmingCalculator.ts:
static async calculateIncome(farmer: any): Promise<FarmingIncome | null> {
  // ... расчет ...
  
  // Сравнение с старой логикой (для мониторинга)
  const oldResult = await UnifiedFarmingCalculator.calculateIncome(farmer);
  
  logger.info('[COMPARISON] Old vs New logic', {
    userId: farmer.user_id,
    oldAmount: oldResult?.amount || 0,
    newAmount: totalIncome,
    oldPeriods: oldResult?.periods || 0,
    newPeriods: 1,
    difference: (oldResult?.amount || 0) - totalIncome
  });
  
  return result;
}
```

---

### **Phase 3: Градуальное внедрение**

#### 3.1 Процентное переключение пользователей
```typescript
static async calculateIncome(farmer: any): Promise<FarmingIncome | null> {
  const rolloutPercentage = parseInt(process.env.INTERVAL_FARMING_ROLLOUT || '0');
  const userHash = farmer.user_id % 100;
  const useIntervalLogic = userHash < rolloutPercentage;
  
  // Переменные:
  // INTERVAL_FARMING_ROLLOUT=1  (1% пользователей)
  // INTERVAL_FARMING_ROLLOUT=10 (10% пользователей)
  // INTERVAL_FARMING_ROLLOUT=100 (100% пользователей)
}
```

#### 3.2 Аварийный откат
```typescript
// Переменная для мгновенного отключения новой логики
if (process.env.EMERGENCY_DISABLE_INTERVAL_FARMING === 'true') {
  logger.warn('[EMERGENCY] Interval farming disabled, using old logic');
  return UnifiedFarmingCalculator.calculateIncome(farmer);
}
```

---

## 🛡️ МЕХАНИЗМЫ БЕЗОПАСНОСТИ

### 1. **Проверки целостности**
```typescript
// В IntervalFarmingCalculator.ts добавить:
static validateIntervalIncome(income: FarmingIncome): boolean {
  const maxAllowedPerInterval = income.depositAmount * income.rate / 288;
  
  if (income.amount > maxAllowedPerInterval * 1.1) { // 10% буфер
    logger.error('[SAFETY] Interval income exceeds maximum allowed', {
      userId: income.userId,
      calculated: income.amount,
      maximum: maxAllowedPerInterval,
      depositAmount: income.depositAmount,
      rate: income.rate
    });
    return false;
  }
  
  return true;
}
```

### 2. **Мониторинг аномалий**
```typescript
// Добавить алерты на большие начисления
if (totalIncome > 100) { // Более 100 UNI за раз
  logger.error('[ANOMALY_ALERT] Large farming income detected', {
    userId: farmer.user_id,
    amount: totalIncome,
    calculator: 'IntervalFarmingCalculator',
    timestamp: new Date().toISOString()
  });
}
```

### 3. **Pause mechanism**
```typescript
// Возможность временно остановить начисления
if (process.env.FARMING_PAUSE_MODE === 'true') {
  logger.warn('[PAUSE] Farming calculations paused');
  return null;
}
```

---

## 📋 ЗАТРАГИВАЕМЫЕ ФАЙЛЫ

### **Новые файлы (создаем):**
1. `core/farming/IntervalFarmingCalculator.ts` - новая логика
2. `core/farming/FarmingCalculatorSwitch.ts` - переключатель

### **Изменяемые файлы (минимально):**
1. `core/scheduler/farmingScheduler.ts` - только строка 174 (импорт Switch)
2. `shared/schema.ts` - возможно добавление полей для мониторинга

### **НЕ затрагиваемые модули:**
- ✅ `BalanceManager` - остается без изменений
- ✅ `BatchBalanceProcessor` - остается без изменений  
- ✅ `TransactionService` - остается без изменений
- ✅ `ReferralService` - остается без изменений
- ✅ `WebSocket notifications` - остаются без изменений

---

## 🧪 ПЛАН ТЕСТИРОВАНИЯ

### **Тест 1: Сравнение результатов**
```bash
# Запустить с включенным сравнением
export FARMING_TEST_MODE=true
export INTERVAL_FARMING_ROLLOUT=1
node scripts/test-farming-calculation-comparison.js
```

### **Тест 2: Нагрузочное тестирование**
```bash
# Проверить производительность новой логики
export USE_INTERVAL_FARMING=true
node scripts/performance-test-farming.js
```

### **Тест 3: Rollback тест**
```bash
# Проверить возможность отката
export EMERGENCY_DISABLE_INTERVAL_FARMING=true
node scripts/test-farming-rollback.js
```

---

## ⚡ ЭТАПЫ ВНЕДРЕНИЯ

### **Этап 1: Подготовка (1 день)**
- ✅ Создать новые файлы
- ✅ Добавить переменные окружения
- ✅ Протестировать локально

### **Этап 2: Тестирование (2-3 дня)**
- ✅ Включить для 1 тестового пользователя
- ✅ Мониторинг результатов
- ✅ Сравнение с старой логикой

### **Этап 3: Градуальное внедрение (1 неделя)**
- ✅ 1% пользователей → 10% → 50% → 100%
- ✅ Ежедневный мониторинг
- ✅ Готовность к откату

### **Этап 4: Финализация (1 день)**
- ✅ Удаление старой логики
- ✅ Очистка кода от Switch'а
- ✅ Обновление документации

---

## 🚨 ПЛАН АВАРИЙНОГО ОТКАТА

### **Быстрый откат (30 секунд):**
```bash
# В Replit Secrets изменить:
EMERGENCY_DISABLE_INTERVAL_FARMING=true
# Перезапустить workflow
```

### **Полный откат (5 минут):**
```bash
# Откатить изменения в farmingScheduler.ts:
# FarmingCalculatorSwitch.calculateIncome → UnifiedFarmingCalculator.calculateIncome
```

### **Восстановление данных:**
- Все начисления остаются в БД
- Никаких данных не теряется
- Пользователи не заметят изменения

---

## 🎯 ИТОГОВЫЕ ГАРАНТИИ БЕЗОПАСНОСТИ

✅ **Гарантированная безопасность:** Новая логика создается рядом со старой  
✅ **Нулевое время простоя:** Farming продолжает работать на старой логике  
✅ **Мгновенный откат:** Одна переменная окружения отключает новую логику  
✅ **Постепенное внедрение:** Контролируемый переход с мониторингом  
✅ **Сохранность данных:** Никаких изменений в БД, только логика расчета  
✅ **Тестируемость:** Полное тестирование перед продакшеном  

**Результат:** Накопительная логика будет безопасно заменена на интервальную без риска для системы и пользователей.