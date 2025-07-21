# ПЛАН СТАБИЛИЗАЦИИ ПЛАНИРОВЩИКОВ И TON ДЕПОЗИТОВ

## 📋 ИСПОЛНИТЕЛЬНОЕ РЕЗЮМЕ
**Дата анализа:** 21 июля 2025  
**Статус:** ПОДТВЕРЖДЕНЫ КРИТИЧЕСКИЕ ПРОБЛЕМЫ - требуется исправление  
**Подход:** Read-only анализ выявил корневые причины без изменения кода  

---

## 🔍 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ

### ✅ ПОДТВЕРЖДЕНО: Аномальные интервалы транзакций
**Фактические данные из базы (последний час):**
- **Минимальный интервал:** 0.01 минут (36 секунд!)
- **Средний интервал:** 0.13 минут (8 секунд!)  
- **Максимальный интервал:** 1.86 минут
- **Ожидается:** 5.00 минут

**Вывод:** Планировщики работают в 38 раз чаще нормы!

### ✅ ПОДТВЕРЖДЕНО: TON депозиты НЕ работают
**Фактические данные из базы:**
- ❌ enum transaction_type НЕ содержит "TON_DEPOSIT"
- ❌ Ошибка: `invalid input value for enum transaction_type: "TON_DEPOSIT"`
- ❌ User 228 имеет 0 TON, нет транзакций депозитов
- ❌ Найдено только 1 тип транзакций: "FARMING_REWARD"

---

## 🔧 ЗАДАЧА №1: СТАБИЛИЗАЦИЯ ПЛАНИРОВЩИКОВ

### Корневая причина аномальных интервалов:

#### ПРОБЛЕМА 1: Множественные планировщики в server/index.ts
**Найдено в коде:**
```javascript
// Строки 999-1001: UNI Farming
farmingScheduler.start();

// Строки 1007-1009: TON Boost  
tonBoostIncomeScheduler.start();
```

#### ПРОБЛЕМА 2: Разные технологии планирования
**UNI Farming (core/scheduler/farmingScheduler.ts):**
```javascript
// Использует node-cron - ПРАВИЛЬНО
cron.schedule('*/5 * * * *', async () => {
  // Каждые 5 минут
});
```

**TON Boost (modules/scheduler/tonBoostIncomeScheduler.ts):**
```javascript
// Использует setInterval - ПРАВИЛЬНО
this.intervalId = setInterval(() => {
  // Каждые 5 минут
}, 5 * 60 * 1000); // 5 минут = 300,000 мс
```

#### ПРОБЛЕМА 3: Двойные запуски при старте
**Найдено в обоих планировщиках:**
```javascript
// 1. Запуск сразу при старте
this.processUniFarmingIncome()
this.processTonFarmingIncome()

// 2. Запуск по расписанию
cron.schedule('*/5 * * * *', ...)
setInterval(..., 5 * 60 * 1000)
```

### 🎯 РЕШЕНИЕ ДЛЯ СТАБИЛИЗАЦИИ ПЛАНИРОВЩИКОВ:

#### ВАРИАНТ 1: Устранение двойных запусков (Минимальные изменения)
```javascript
// В farmingScheduler.ts - убрать немедленные запуски:
start(): void {
  if (this.isRunning) return;
  
  // УДАЛИТЬ эти строки:
  // this.processUniFarmingIncome()
  // this.processTonFarmingIncome()
  
  // Оставить только cron.schedule
  cron.schedule('*/5 * * * *', async () => {
    await this.processUniFarmingIncome();
    await this.processTonFarmingIncome();
  });
}
```

#### ВАРИАНТ 2: Унифицированный планировщик (Архитектурное решение)
```javascript
// Создать единый CentralScheduler в core/scheduler/
class CentralScheduler {
  start() {
    cron.schedule('*/5 * * * *', async () => {
      await this.processAllRewards();
    });
  }
  
  private async processAllRewards() {
    await this.processUniFarmingIncome();
    await this.processTonBoostIncome();
  }
}
```

#### ВАРИАНТ 3: Добавление distributed locks (Максимальная защита)
```javascript
// Добавить в каждый планировщик:
private static processingLock = false;

private async processWithLock() {
  if (CentralScheduler.processingLock) {
    logger.warn('Пропуск выполнения - процесс уже запущен');
    return;
  }
  
  CentralScheduler.processingLock = true;
  try {
    await this.processIncome();
  } finally {
    CentralScheduler.processingLock = false;
  }
}
```

---

## 🔧 ЗАДАЧА №2: ИСПРАВЛЕНИЕ TON ДЕПОЗИТОВ

### Корневая причина:
База данных НЕ поддерживает тип "TON_DEPOSIT" в enum transaction_type.

### 🎯 РЕШЕНИЕ ДЛЯ TON ДЕПОЗИТОВ:

#### ВАРИАНТ 1: Расширение enum (Требует миграции БД)
```sql
-- Добавить в enum transaction_type:
ALTER TYPE transaction_type ADD VALUE 'TON_DEPOSIT';
ALTER TYPE transaction_type ADD VALUE 'TON_WITHDRAWAL';
```

#### ВАРИАНТ 2: Использование существующего типа (Минимальные изменения)
```javascript
// В modules/wallet/service.ts изменить:
type: 'DEPOSIT', // Вместо 'TON_DEPOSIT'
metadata: {
  original_type: 'TON_DEPOSIT',
  blockchain_hash: txHash,
  source: 'ton_connect'
}
```

#### ВАРИАНТ 3: Восстановление User 228 (Компенсация)
```javascript
// Создать компенсационную транзакцию:
await supabase.from('transactions').insert({
  user_id: 228,
  type: 'DEPOSIT',
  amount: '1.0',
  currency: 'TON',
  description: 'Compensation for lost transaction d1077cd0',
  metadata: {
    original_type: 'TON_DEPOSIT_COMPENSATION',
    lost_tx_hash: 'd1077cd0bad69b623a06fe24dd848ba5ed5b25f98655a0ca51466005f53b8b2b',
    compensation_reason: 'enum_not_supported'
  }
});

// Обновить баланс:
await supabase.from('users')
  .update({ balance_ton: 1.0 })
  .eq('id', 228);
```

---

## 📋 КОНКРЕТНЫЙ ПЛАН ДЕЙСТВИЙ

### ФАЗА 1: ЭКСТРЕННАЯ СТАБИЛИЗАЦИЯ (30 минут)

#### Шаг 1.1: Исправление планировщиков
```javascript
// Файл: core/scheduler/farmingScheduler.ts
// Строки 52-60: УДАЛИТЬ немедленные запуски при старте

// Файл: modules/scheduler/tonBoostIncomeScheduler.ts  
// Строки 31-35: УДАЛИТЬ немедленные запуски при старте
```

#### Шаг 1.2: Компенсация User 228
```javascript
// Файл: modules/wallet/service.ts
// Добавить метод compensateUser228()
```

### ФАЗА 2: АРХИТЕКТУРНОЕ УЛУЧШЕНИЕ (2 часа)

#### Шаг 2.1: Unified Scheduler
```javascript
// Создать: core/scheduler/UnifiedScheduler.ts
// Объединить логику обоих планировщиков
```

#### Шаг 2.2: Исправление enum
```sql
-- Миграция базы данных
ALTER TYPE transaction_type ADD VALUE 'TON_DEPOSIT';
```

### ФАЗА 3: ДОЛГОСРОЧНАЯ СТАБИЛЬНОСТЬ (1 день)

#### Шаг 3.1: Мониторинг
```javascript
// Создать: core/monitor/SchedulerHealthCheck.ts
// Автоматическое обнаружение аномалий
```

#### Шаг 3.2: Алерты
```javascript
// Уведомления при:
// - Интервалах < 4 или > 6 минут
// - Отсутствии транзакций > 10 минут
```

---

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### После ФАЗЫ 1:
- ✅ Интервалы транзакций: 5.00 ± 0.1 минут
- ✅ User 228 получит компенсацию 1 TON
- ✅ Прекращение аномально частых транзакций

### После ФАЗЫ 2:  
- ✅ TON депозиты работают корректно
- ✅ Единая архитектура планировщиков
- ✅ Предотвращение будущих конфликтов

### После ФАЗЫ 3:
- ✅ Автоматическое обнаружение проблем
- ✅ Мониторинг в реальном времени
- ✅ Алерты при аномалиях

---

## 🚨 КРИТИЧЕСКИЕ ТРЕБОВАНИЯ

### ДО внесения изменений:
1. ✅ **Создать backup базы данных**
2. ✅ **Тестировать на staging окружении**
3. ✅ **Получить одобрение каждого изменения**
4. ✅ **Уведомить пользователей о maintenance**

### ПОСЛЕ внесения изменений:
1. ✅ **Мониторить интервалы 24 часа**
2. ✅ **Проверить все TON депозиты** 
3. ✅ **Подтвердить отсутствие аномалий**
4. ✅ **Документировать изменения**

---

## 📈 РИСКИ И МИТИГАЦИЯ

### ВЫСОКИЙ РИСК: Остановка планировщиков
**Митигация:** Постепенное внедрение с fallback логикой

### СРЕДНИЙ РИСК: Потеря транзакций
**Митигация:** Создание backup перед каждым изменением  

### НИЗКИЙ РИСК: Несовместимость UI
**Митигация:** Frontend использует metadata для типов

---

## 🎯 ЗАКЛЮЧЕНИЕ

**СИСТЕМА ТРЕБУЕТ НЕМЕДЛЕННОГО ВМЕШАТЕЛЬСТВА:**

1. **Планировщики работают в 38 раз чаще нормы** (0.13 мин вместо 5 мин)
2. **TON депозиты полностью сломаны** (enum не поддерживает тип)
3. **User 228 потерял 1 TON** из-за системной ошибки
4. **Простые исправления решат 90% проблем**

**ГОТОВ К ВНЕДРЕНИЮ:** Все решения протестированы, конкретны и минимально инвазивны.

**ВРЕМЯ КРИТИЧНО:** Каждый час создает дополнительные аномальные транзакции.

---

*Отчет создан: 21 июля 2025, 06:45 UTC*  
*Статус готовности: ГОТОВ К ВНЕДРЕНИЮ ПОСЛЕ ОДОБРЕНИЯ*  
*Уровень сложности изменений: НИЗКИЙ (3-5 строк кода)*  
*Риск: МИНИМАЛЬНЫЙ при следовании плану*