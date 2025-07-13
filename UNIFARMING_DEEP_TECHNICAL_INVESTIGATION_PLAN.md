# 🔬 Глубокое техническое исследование UniFarming
**Дата:** 13 января 2025  
**Цель:** Полная трассировка потоков данных и план устранения проблем

---

## 📊 1. АРХИТЕКТУРНАЯ ДИАГРАММА ПОТОКОВ ДАННЫХ

### 1.1 Поток открытия депозита

```
[Frontend: UniFarmingCard] 
    ↓ POST /api/v2/uni-farming/deposit
[API Gateway: server/index.ts]
    ↓ requireTelegramAuth
[FarmingController.depositUni()]
    ↓ farmingService.depositUniForFarming()
[FarmingService.depositUniForFarming()]
    ├─→ [BalanceManager.subtractBalance()]
    │     ├─→ updateUserBalance() → Supabase.users.update()
    │     └─→ TransactionEnforcer.createRequiredTransaction()
    │           └─→ UnifiedTransactionService.createTransaction()
    │                 └─→ Supabase.transactions.insert()
    └─→ [UniFarmingRepository.addDeposit()]
          └─→ Supabase.users.update(uni_deposit_amount)
```

**✅ Работает корректно:** Баланс списывается, транзакции создаются  
**❌ Проблема:** Статусы транзакций = 'confirmed' вместо 'completed'

### 1.2 Поток начисления процентов

```
[CRON: */5 * * * *] 
    ↓
[FarmingScheduler.processUniFarmingIncome()]
    ├─→ getActiveFarmers() → Supabase.users.select()
    ├─→ calculateUniFarmingIncome() → расчет 1% в день
    └─→ processFarmingIncome()
          ├─→ [BalanceManager.addBalance()] ← ⚠️ ПРОБЛЕМА: вызывается для каждого пользователя отдельно
          │     └─→ updateUserBalance() → Supabase.users.update()
          ├─→ Supabase.transactions.insert(FARMING_REWARD)
          └─→ ReferralService.distributeReferralRewards()
```

**❌ Проблемы:**
1. Интервалы 0.22 мин вместо 5 мин (95.7% отклонение)
2. 97.2% фармеров имеют устаревшие обновления >30 мин
3. BatchBalanceProcessor не используется правильно

### 1.3 Поток обновления баланса

```
[BalanceManager.updateUserBalance()]
    ├─→ getUserBalance() → Supabase.users.select()
    ├─→ Расчет нового баланса
    ├─→ Supabase.users.update(balance_uni, balance_ton)
    ├─→ BalanceCache.set() → In-memory cache
    └─→ BalanceNotificationService.notifyBalanceUpdate()
          └─→ WebSocket.emit('balance_update')
```

**❌ Критическая проблема:** Начальный баланс 1,910,877 UNI не отражен в транзакциях

---

## 🔍 2. ДЕТАЛЬНАЯ ТРАССИРОВКА ПРОБЛЕМ

### Проблема 1: Рассинхронизация баланса (914,038 UNI)

**Корневая причина:**
```typescript
// Файл: core/BalanceManager.ts, строки 150-170
const { data: updatedUser, error: updateError } = await supabase
  .from('users')
  .update({
    balance_uni: parseFloat(newUniBalance.toFixed(6)),
    balance_ton: parseFloat(newTonBalance.toFixed(6))
  })
  .eq('id', user_id)
```

**Проблема:** Прямые SQL операции в обход BalanceManager
- Миграционная транзакция на 406,229 UNI создана без обновления баланса
- Начальный баланс ~1,910,877 UNI установлен напрямую в БД

**Доказательства:**
```sql
-- Из анализа:
Расчетный баланс: -523,675.78 UNI
Фактический баланс: 1,387,201.45 UNI
Разница: 1,910,877.23 UNI
```

### Проблема 2: Нестабильность планировщика

**Корневая причина:**
```typescript
// Файл: core/scheduler/farmingScheduler.ts, строка 165
for (const income of farmerIncomes) {
  try {
    const { BalanceManager } = await import('../BalanceManager');
    const balanceManager = new BalanceManager();
    await balanceManager.addBalance(income.userId, income.income, income.currency);
```

**Проблемы:**
1. Динамический импорт в цикле создает множество экземпляров
2. BatchBalanceProcessor игнорируется
3. Нет обновления uni_farming_last_update

**Доказательства:**
```
Средний интервал: 0.22 минут (ожидается 5.00)
Мертвые обновления: 35 из 36 фармеров (97.2%)
```

### Проблема 3: Неиспользуемые таблицы

**Корневая причина:**
```typescript
// Файл: modules/farming/UniFarmingRepository.ts
// Использует fallback на таблицу users вместо uni_farming_data
const FARMING_TABLE = this.tableExists ? 'uni_farming_data' : 'users';
```

**Проблема:** uni_farming_data пуста, система работает через users

### Проблема 4: Некорректные статусы транзакций

**Корневая причина:**
```typescript
// Файл: modules/farming/service.ts, строка 342
status: 'confirmed',  // Используем confirmed как в существующей транзакции
```

**Проблема:** Должно быть 'completed' для завершенных операций

---

## 🔧 3. ПОШАГОВЫЙ ПЛАН ИСПРАВЛЕНИЙ

### Этап 1: Стабилизация планировщика (2 часа)

**Файл:** `core/scheduler/farmingScheduler.ts`

**Изменения:**
```typescript
// Строка 30: Добавить singleton BalanceManager
private balanceManager: BalanceManager;

constructor() {
  this.balanceManager = new BalanceManager();
}

// Строка 165: Заменить цикл на batch обработку
// БЫЛО:
for (const income of farmerIncomes) {
  await balanceManager.addBalance(...)
}

// СТАЛО:
const batchOperations = farmerIncomes.map(income => ({
  userId: income.userId,
  amountUni: income.income,
  amountTon: 0,
  operation: 'add' as const,
  source: 'UNI_farming_income'
}));

await batchBalanceProcessor.processBatch(batchOperations);

// Добавить обновление uni_farming_last_update
await supabase
  .from('users')
  .update({ uni_farming_last_update: new Date().toISOString() })
  .in('id', farmerIncomes.map(f => f.userId));
```

**Обоснование:**
- Устраняет множественные экземпляры BalanceManager
- Использует batch обработку для производительности
- Обновляет метки времени для мониторинга

### Этап 2: Исправление баланса (1 час)

**Файл:** `scripts/fix-balance-discrepancy.ts`

**Создать новый скрипт:**
```typescript
// Создать миграционную транзакцию для отражения начального баланса
const INITIAL_BALANCE = 1910877.23;

await transactionService.createTransaction({
  user_id: 74,
  type: 'INITIAL_BALANCE',
  amount_uni: INITIAL_BALANCE,
  amount_ton: 0,
  currency: 'UNI',
  status: 'completed',
  description: 'Initial balance migration',
  metadata: { migration: true }
});
```

**Обоснование:**
- Создает прозрачность в истории транзакций
- Не меняет фактический баланс
- Устраняет расхождение в отчетах

### Этап 3: Исправление статусов (30 минут)

**Файл:** `modules/farming/service.ts`

**Изменение строки 342:**
```typescript
// БЫЛО:
status: 'confirmed',

// СТАЛО:
status: 'completed',
```

**Файл:** `scripts/fix-transaction-statuses.ts`

**Создать скрипт:**
```typescript
// Обновить статусы существующих транзакций
await supabase
  .from('transactions')
  .update({ status: 'completed' })
  .eq('type', 'FARMING_DEPOSIT')
  .eq('status', 'confirmed');
```

### Этап 4: Миграция на uni_farming_data (опционально, 2 часа)

**Преимущества:**
- Разделение concerns
- Улучшенная производительность
- Готовность к масштабированию

**Недостатки:**
- Риск миграции данных
- Необходимость тестирования
- Временные затраты

---

## ⚠️ 4. РИСКИ И КОНТРАРГУМЕНТЫ

### Риск 1: Остановка планировщика
**Митигация:** 
- Добавить мониторинг heartbeat
- Алерты при отсутствии транзакций >10 мин
- Fallback на ручной запуск

### Риск 2: Двойное начисление
**Митигация:**
- Проверка последнего обновления перед начислением
- Idempotency ключи для транзакций
- Лимит одного начисления за период

### Риск 3: Потеря данных при миграции
**Митигация:**
- Полный бэкап перед изменениями
- Поэтапная миграция с проверкой
- Возможность быстрого отката

---

## 💪 5. ПРЕИМУЩЕСТВА ПРЕДЛОЖЕННОГО ПОДХОДА

1. **Минимальные изменения кода**
   - Сохраняем существующую архитектуру
   - Не ломаем работающий функционал
   - Быстрое внедрение

2. **Прозрачность**
   - Все операции отражены в транзакциях
   - Легко отследить историю
   - Простая отладка

3. **Производительность**
   - Batch обработка вместо циклов
   - Меньше запросов к БД
   - Оптимизация WebSocket уведомлений

4. **Надежность**
   - Централизованное управление балансами
   - Атомарные операции
   - Консистентность данных

---

## 📋 6. ПЛАН ТЕСТИРОВАНИЯ

1. **Unit тесты:**
   - BatchBalanceProcessor с 50+ операциями
   - Расчет процентов для разных сумм
   - Обработка ошибок

2. **Integration тесты:**
   - Полный цикл депозита
   - Начисление процентов
   - WebSocket уведомления

3. **Load тесты:**
   - 1000 одновременных депозитов
   - Планировщик с 500+ фармерами
   - Производительность batch операций

---

## 🚀 7. ПОРЯДОК ВНЕДРЕНИЯ

1. **День 1:** Стабилизация планировщика (критично)
2. **День 2:** Исправление статусов и тестирование
3. **День 3:** Создание миграционных транзакций
4. **День 4:** Мониторинг и fine-tuning
5. **День 5:** Документация и обучение

**Estimated время:** 6-8 часов активной разработки

---

## ✅ ЗАКЛЮЧЕНИЕ

Предложенный план решает все критические проблемы:
- ✅ Стабилизирует планировщик
- ✅ Устраняет расхождение балансов
- ✅ Исправляет статусы транзакций
- ✅ Сохраняет существующую архитектуру

Система будет готова к production после внедрения исправлений.