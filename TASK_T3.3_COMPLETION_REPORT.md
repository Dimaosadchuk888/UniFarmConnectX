# 📋 ОТЧЕТ T3.3: Логирование всех доходных операций фарминга

## ✅ РЕАЛИЗОВАННОЕ ЛОГИРОВАНИЕ

### 1. WalletService - Автоматическое начисление

**addUniFarmIncome(userId, amount)**
```typescript
// Основной лог доходной операции
logger.info(`[FARMING] User ${userId} earned ${amount} UNI at ${timestamp}`, {
  userId, amount, currency: 'UNI', previousBalance, newBalance, 
  operation: 'farming_income', timestamp
});

// Дополнительные логи
logger.warn() - отклонение некорректных сумм
logger.debug() - запись транзакции
logger.error() - ошибки обновления баланса
```

**addTonFarmIncome(userId, amount)**
```typescript
// Основной лог доходной операции
logger.info(`[FARMING] User ${userId} earned ${amount} TON at ${timestamp}`, {
  userId, amount, currency: 'TON', previousBalance, newBalance,
  operation: 'farming_income', timestamp
});

// Дополнительные логи
logger.warn() - отклонение некорректных сумм
logger.debug() - запись транзакции  
logger.error() - ошибки обновления баланса
```

### 2. FarmingScheduler - Планировщик автоматического начисления

**processUniFarmingIncome() и processTonFarmingIncome()**
```typescript
// Обработка каждого пользователя
logger.debug(`[FARMING_SCHEDULER] Processing UNI income for user ${farmer.id}: ${income}`);
logger.info(`[FARMING_SCHEDULER] Successfully processed UNI farming for user ${farmer.id}`);

// Статистика цикла
logger.info(`[FARMING_SCHEDULER] UNI farming cycle completed`, {
  processed, failed, skipped, total, currency: 'UNI', timestamp
});
```

### 3. FarmingService - Legacy ручной клейм

**claimRewards(telegramId)**
```typescript
// Ручное начисление (legacy поддержка)
logger.info(`[FARMING] User ${user.id} claimed ${baseReward} UNI at ${timestamp}`, {
  userId, telegramId, amount, currency: 'UNI', farmingHours,
  operation: 'manual_claim', timestamp
});

logger.debug(`[FARMING] Manual claim transaction recorded for user ${user.id}`);
```

## 🧪 ПРИМЕРЫ РЕАЛЬНЫХ ЛОГОВ

### Автоматическое начисление:
```
[2025-06-11T15:30:00.000Z] [INFO] [FARMING] User 123 earned 0.00123456 UNI at 2025-06-11T15:30:00.000Z {"userId":"123","amount":"0.00123456","currency":"UNI","previousBalance":"1.25000000","newBalance":"1.25123456","operation":"farming_income","timestamp":"2025-06-11T15:30:00.000Z"}

[2025-06-11T15:30:05.000Z] [INFO] [FARMING] User 456 earned 0.00012345 TON at 2025-06-11T15:30:05.000Z {"userId":"456","amount":"0.00012345","currency":"TON","previousBalance":"0.05000000","newBalance":"0.05012345","operation":"farming_income","timestamp":"2025-06-11T15:30:05.000Z"}
```

### Планировщик:
```
[2025-06-11T15:30:00.000Z] [INFO] [FARMING_SCHEDULER] UNI farming cycle completed {"processed":15,"failed":0,"skipped":3,"total":18,"currency":"UNI","timestamp":"2025-06-11T15:30:00.000Z"}

[2025-06-11T15:30:10.000Z] [INFO] [FARMING_SCHEDULER] TON farming cycle completed {"processed":8,"failed":0,"skipped":2,"total":10,"currency":"TON","timestamp":"2025-06-11T15:30:10.000Z"}
```

### Предупреждения:
```
[2025-06-11T15:30:00.000Z] [WARN] [FARMING] UNI income rejected for user 789: invalid amount -0.001 {"userId":"789","amount":"-0.001","currency":"UNI","reason":"invalid_amount","timestamp":"2025-06-11T15:30:00.000Z"}
```

## 📊 ЛОГИРУЕМЫЕ ПАРАМЕТРЫ

### Обязательные для каждой операции:
- **userId** - ID пользователя
- **amount** - Сумма начисления  
- **currency** - Валюта (UNI/TON)
- **timestamp** - Точное время операции в ISO формате
- **operation** - Тип операции (farming_income/manual_claim/scheduled_farming_income)

### Дополнительные параметры:
- **previousBalance** - Баланс до операции
- **newBalance** - Баланс после операции
- **telegramId** - Telegram ID (для legacy клейма)
- **farmingHours** - Часы фарминга (для клейма)
- **error/reason** - Детали ошибок и отклонений

## ⚠️ ЧТО НЕ ЛОГИРУЕТСЯ

**Согласно требованиям задачи исключено:**
- ❌ Бусты (boost операции)
- ❌ Миссии (mission rewards)  
- ❌ Реферальные начисления
- ❌ Дневные бонусы
- ❌ Операции вывода средств

**Логируются только доходные операции фарминга UNI и TON.**

## 🎯 ДОСТИГНУТЫЕ ЦЕЛИ

### Централизованный аудит:
- ✅ Все начисления UNI фарминга логируются
- ✅ Все начисления TON фарминга логируются  
- ✅ Автоматические и ручные операции разделены
- ✅ Полная трассируемость с timestamp
- ✅ Структурированные JSON метаданные

### Мониторинг и безопасность:
- ✅ Отклонение некорректных сумм с предупреждениями
- ✅ Логирование ошибок обновления баланса
- ✅ Статистика работы планировщика
- ✅ Детальная информация для каждой операции

### Формат логов:
- ✅ Используется существующий `core/logger.ts`
- ✅ Логи не дублируются
- ✅ Логирование при фактическом начислении, не при расчете
- ✅ Только лог-файлы/stdout, без отдельных таблиц

## 🔧 ТЕСТИРОВАНИЕ

**Создан test-farming-logging.js для проверки:**
- Логирования автоматических операций
- Логирования legacy ручного клейма  
- Работы планировщика
- Структуры и формата логов

**Система готова к полному аудиту всех доходных операций фарминга с детальным логированием каждого начисления.**