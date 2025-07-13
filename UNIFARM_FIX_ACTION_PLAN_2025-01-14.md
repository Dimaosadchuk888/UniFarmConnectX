# ПЛАН ИСПРАВЛЕНИЯ ПРОБЛЕМ UNIFARM
## Дата: 14 января 2025
## Приоритет: КРИТИЧЕСКИЙ

---

## ПРОБЛЕМА 1: BOOST_PURCHASE транзакции с нулевой суммой
### Шаги исправления:
1. **Файл:** `modules/boost/service.ts`, метод `purchaseWithInternalWallet`
2. **Действие:** Убрать лишний parseFloat, т.к. boostPackage.min_amount уже число
```typescript
// БЫЛО:
const requiredAmount = parseFloat(boostPackage.min_amount || "0");

// НАДО:
const requiredAmount = boostPackage.min_amount || 0;
```
3. **Результат:** Транзакции будут создаваться с правильной суммой (1, 5, 10, 25, 100 TON)

---

## ПРОБЛЕМА 2: TON депозиты не создают транзакции
### Шаги исправления:
1. **Файл:** `modules/boost/TonFarmingRepository.ts`, метод `activateBoost`
2. **Действие:** Добавить создание транзакции депозита через UnifiedTransactionService
```typescript
// Добавить после обновления farming_balance:
const transactionService = new UnifiedTransactionService();
await transactionService.createTransaction({
  user_id: userId,
  type: 'BOOST_PURCHASE',
  amount_ton: depositAmount,
  currency: 'TON',
  status: 'completed',
  description: `TON Boost deposit`,
  metadata: {
    original_type: 'TON_BOOST_DEPOSIT',
    boost_package_id: boostPackageId
  }
});
```
3. **Результат:** Каждый депозит TON будет записан в истории транзакций

---

## ПРОБЛЕМА 3: CRON планировщик не работает
### Шаги диагностики:
1. **Проверить статус планировщика:**
```bash
# Проверить запущены ли cron задачи
ps aux | grep -E '(farming|scheduler)'

# Проверить логи планировщика
grep -n "farmingScheduler" logs/app-*.log | tail -50
```

2. **Перезапустить планировщик если нужно:**
```typescript
// В server/index.ts проверить инициализацию:
import './core/scheduler/farmingScheduler.js';
import './modules/scheduler/tonBoostIncomeScheduler.js';
```

3. **Добавить диагностику в планировщик:**
```typescript
// В начало farmingScheduler.processSchedule():
logger.info('[FarmingScheduler] Starting schedule process', {
  timestamp: new Date().toISOString(),
  activeUsers: await getActiveFarmersCount()
});
```

---

## ПРОБЛЕМА 4: Несоответствие балансов
### Шаги аудита:
1. **Создать скрипт аудита балансов:**
```sql
-- Сравнить баланс с суммой транзакций
SELECT 
  u.id,
  u.balance_uni,
  COALESCE(SUM(
    CASE 
      WHEN t.type IN ('FARMING_REWARD', 'MISSION_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS') 
      THEN t.amount_uni
      WHEN t.type IN ('FARMING_DEPOSIT', 'WITHDRAW_REQUEST') 
      THEN -t.amount_uni
      ELSE 0
    END
  ), 0) as calculated_balance,
  u.balance_uni - COALESCE(SUM(...), 0) as difference
FROM users u
LEFT JOIN transactions t ON t.user_id = u.id
WHERE u.id = 74
GROUP BY u.id, u.balance_uni;
```

2. **Создать недостающие транзакции для исторических данных**

---

## ПРОБЛЕМА 5: TON Boost доходы не отображаются отдельно
### Шаги исправления:
1. **Файл:** `client/src/components/wallet/TransactionHistory.tsx`
2. **Действие:** Использовать metadata для различения типов
```typescript
// Добавить функцию определения типа:
const getTransactionDisplayType = (transaction) => {
  if (transaction.metadata?.original_type === 'TON_BOOST_INCOME') {
    return 'TON Boost Income';
  }
  if (transaction.metadata?.original_type === 'TON_BOOST_DEPOSIT') {
    return 'TON Boost Deposit';
  }
  // ... остальные типы
  return transaction.type;
};
```

3. **Добавить иконки и цвета для разных типов**

---

## ПРОБЛЕМА 6: Транзакционная целостность
### Долгосрочное решение:
1. **Создать централизованный сервис для всех финансовых операций:**
```typescript
// core/FinancialOperationsService.ts
class FinancialOperationsService {
  async executeOperation(operation: {
    userId: number;
    amount: number;
    currency: 'UNI' | 'TON';
    type: string;
    description: string;
  }) {
    // 1. Начать транзакцию БД
    // 2. Обновить баланс
    // 3. Создать запись транзакции
    // 4. Commit или Rollback
  }
}
```

2. **Миграция всех модулей на использование этого сервиса**

---

## ПОРЯДОК ВЫПОЛНЕНИЯ

### ФАЗА 1: Критические исправления (1-2 часа)
1. ✅ Исправить двойной parseFloat (Проблема 1)
2. ✅ Добавить создание транзакций для TON депозитов (Проблема 2)
3. ✅ Проверить и перезапустить планировщики (Проблема 3)

### ФАЗА 2: UI улучшения (2-3 часа)
4. ✅ Обновить TransactionHistory для использования metadata (Проблема 5)
5. ✅ Добавить визуальное различие для разных типов транзакций

### ФАЗА 3: Аудит и восстановление (3-4 часа)
6. ✅ Провести аудит балансов vs транзакций (Проблема 4)
7. ✅ Создать недостающие транзакции для исторических данных

### ФАЗА 4: Архитектурные улучшения (долгосрочно)
8. ✅ Создать FinancialOperationsService
9. ✅ Внедрить транзакционную целостность везде

---

## ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

После выполнения Фазы 1-2:
- ✅ Новые BOOST_PURCHASE транзакции будут с правильными суммами
- ✅ TON депозиты появятся в истории
- ✅ Планировщики возобновят начисления
- ✅ Пользователи увидят разные типы транзакций

После выполнения всех фаз:
- ✅ Полная транзакционная целостность
- ✅ Прозрачная финансовая история
- ✅ Невозможность потери данных о балансах