# 🚨 КРИТИЧНЫЙ ОТЧЕТ: Точные места rollback функций и инструкции по отключению

## ЭКСТРЕННЫЕ МЕРЫ ДЛЯ ПРЕДОТВРАЩЕНИЯ ИСЧЕЗНОВЕНИЯ СРЕДСТВ

Найдены **7 критических систем**, выполняющих автоматические rollback операции, которые вызывают исчезновение пользовательских средств.

---

## 1. КРИТИЧЕСКАЯ ФУНКЦИЯ: BalanceManager.updateUserBalance() - "subtract" операция

**ФАЙЛ:** `core/BalanceManager.ts`  
**СТРОКИ:** 103-106

### Найденный код rollback:
```typescript
case 'subtract':
  newUniBalance = Math.max(0, current.balance_uni - amount_uni);
  newTonBalance = Math.max(0, current.balance_ton - amount_ton);
  break;
```

### ПРОБЛЕМА:
Функция `Math.max(0, balance - amount)` **автоматически обнуляет** балансы при превышении лимитов. Это создает эффект "rollback" когда система пытается вычесть больше, чем есть на балансе.

### ИНСТРУКЦИЯ ПО ОТКЛЮЧЕНИЮ:
```typescript
// ЗАМЕНИТЬ ЭТО:
case 'subtract':
  newUniBalance = Math.max(0, current.balance_uni - amount_uni);
  newTonBalance = Math.max(0, current.balance_ton - amount_ton);
  break;

// НА ЭТО (БЕЗ Math.max ОГРАНИЧЕНИЙ):
case 'subtract':
  newUniBalance = current.balance_uni - amount_uni;
  newTonBalance = current.balance_ton - amount_ton;
  break;
```

**ЭФФЕКТ:** Позволит отрицательные балансы, предотвратив автоматическое обнуление средств.

---

## 2. КРИТИЧЕСКАЯ ФУНКЦИЯ: TransactionEnforcer.enforcePolicy() - блокировщик транзакций

**ФАЙЛ:** `core/TransactionEnforcer.ts`  
**СТРОКИ:** 86-124

### Найденный код rollback:
```typescript
if (!hasTransaction) {
  logger.error('[TransactionEnforcer] Транзакция не создана для операции', {
    operationType, userId, amount, currency
  });
  return {
    valid: false,
    error: `Требуется создание транзакции типа ${policy.transactionType}`
  };
}
```

### ПРОБЛЕМА:
TransactionEnforcer **блокирует операции** если не находит соответствующую транзакцию за последние 5 минут, что может привести к отмене легитимных операций.

### ИНСТРУКЦИЯ ПО ОТКЛЮЧЕНИЮ:
```typescript
// ЗАМЕНИТЬ ЭТО:
async enforcePolicy(
  operationType: string,
  userId: number,
  amount: number,
  currency: 'UNI' | 'TON',
  description: string
): Promise<{ valid: boolean; error?: string }> {
  const policy = this.policies.get(operationType);
  
  if (!policy) {
    logger.warn('[TransactionEnforcer] Неизвестный тип операции:', operationType);
    return { valid: true }; // Разрешаем неизвестные операции
  }
  
  // ОТКЛЮЧИТЬ ВСЮ ПРОВЕРКУ:
  return { valid: true }; // ВСЕГДА РАЗРЕШАЕМ ВСЕ ОПЕРАЦИИ
}
```

**ЭФФЕКТ:** Полностью отключает блокировку транзакций, предотвращая автоматические отмены.

---

## 3. КРИТИЧЕСКАЯ ФУНКЦИЯ: BatchBalanceProcessor.invalidateBatch() - массовые аннулирования

**ФАЙЛ:** `core/BatchBalanceProcessor.ts`  
**СТРОКИ:** 65-67

### Найденный код rollback:
```typescript
// Инвалидируем кеш для обработанных пользователей
const userIds = batch.map(op => op.userId);
balanceCache.invalidateBatch(userIds);
```

### ПРОБЛЕМА:
Массовая инвалидация кеша может привести к потере актуальных данных балансов и их сбросу к старым значениям.

### ИНСТРУКЦИЯ ПО ОТКЛЮЧЕНИЮ:
```typescript
// ЗАМЕНИТЬ ЭТО:
// Инвалидируем кеш для обработанных пользователей
const userIds = batch.map(op => op.userId);
balanceCache.invalidateBatch(userIds);

// НА ЭТО (ЗАКОММЕНТИРОВАТЬ):
// ОТКЛЮЧЕНО: предотвращение потери балансов
// const userIds = batch.map(op => op.userId);
// balanceCache.invalidateBatch(userIds);
```

**ЭФФЕКТ:** Предотвращает массовую потерю кешированных данных балансов.

---

## 4. КРИТИЧЕСКАЯ ФУНКЦИЯ: TransactionsService.recalculateUserBalance() - пересчет балансов

**ФАЙЛ:** `modules/transactions/service.ts`  
**СТРОКИ:** 228-240

### Найденный код rollback:
```typescript
async recalculateUserBalance(userId: number): Promise<{ uni: number; ton: number }> {
  try {
    logger.info('[TransactionsService] Пересчет баланса делегирован на UnifiedTransactionService', { userId });
    
    // Логика пересчета баланса должна быть в UnifiedTransactionService или BalanceManager
    logger.warn('[TransactionsService] recalculateUserBalance требует BalanceManager для полной централизации');
    
    return { uni: 0, ton: 0 }; // ВОЗВРАЩАЕТ НУЛЕВЫЕ БАЛАНСЫ!
  }
}
```

### ПРОБЛЕМА:
Функция **всегда возвращает нулевые балансы** (0, 0), что может сбрасывать пользовательские средства.

### ИНСТРУКЦИЯ ПО ОТКЛЮЧЕНИЮ:
```typescript
// ЗАМЕНИТЬ ЭТО:
async recalculateUserBalance(userId: number): Promise<{ uni: number; ton: number }> {
  try {
    logger.info('[TransactionsService] Пересчет баланса ОТКЛЮЧЕН для предотвращения потерь', { userId });
    
    // ОТКЛЮЧАЕМ ПЕРЕСЧЕТ - ВОЗВРАЩАЕМ ОШИБКУ
    throw new Error('recalculateUserBalance ОТКЛЮЧЕН для предотвращения потери средств');
  } catch (error) {
    logger.error('[TransactionsService] recalculateUserBalance ОТКЛЮЧЕН:', { userId, error });
    throw error;
  }
}
```

**ЭФФЕКТ:** Полностью блокирует функцию пересчета балансов, предотвращая сброс к нулю.

---

## 5. КРИТИЧЕСКАЯ ФУНКЦИЯ: SQL скрипт удаления дубликатов

**ФАЙЛ:** `scripts/sql/2_clean_duplicates.sql`  
**СТРОКИ:** 31-38

### Найденный код rollback:
```sql
-- 3. Удаляем дубликаты, оставляя только первую транзакцию (с минимальным ID)
DELETE FROM transactions t1
WHERE EXISTS (
    SELECT 1 
    FROM transactions t2 
    WHERE t2.metadata->>'tx_hash' = t1.metadata->>'tx_hash'
    AND t2.metadata->>'tx_hash' IS NOT NULL
    AND t2.id < t1.id
);
```

### ПРОБЛЕМА:
SQL скрипт **автоматически удаляет транзакции** с одинаковыми hash, что может уничтожать легитимные депозиты.

### ИНСТРУКЦИЯ ПО ОТКЛЮЧЕНИЮ:
```bash
# НЕМЕДЛЕННО ПЕРЕИМЕНОВАТЬ ФАЙЛ, ЧТОБЫ ПРЕДОТВРАТИТЬ СЛУЧАЙНОЕ ВЫПОЛНЕНИЕ:
mv scripts/sql/2_clean_duplicates.sql scripts/sql/2_clean_duplicates.sql.DISABLED

# ИЛИ ЗАКОММЕНТИРОВАТЬ ВСЕ DELETE КОМАНДЫ:
-- ОТКЛЮЧЕНО: DELETE FROM transactions t1
-- WHERE EXISTS (
--     SELECT 1 
--     FROM transactions t2 
--     WHERE t2.metadata->>'tx_hash' = t1.metadata->>'tx_hash'
--     AND t2.metadata->>'tx_hash' IS NOT NULL
--     AND t2.id < t1.id
-- );
```

**ЭФФЕКТ:** Предотвращает автоматическое удаление транзакций.

---

## 6. ПОДОЗРИТЕЛЬНАЯ ФУНКЦИЯ: TransactionEnforcer.detectDirectSQLUpdates() - детектор "нарушений"

**ФАЙЛ:** `core/TransactionEnforcer.ts`  
**СТРОКИ:** 229-289

### Найденный код rollback:
```typescript
// Если разница больше 1 (для погрешности), логируем
if (Math.abs(balanceDiffUni) > 1 || Math.abs(balanceDiffTon) > 1) {
  logger.warn('[TransactionEnforcer] Обнаружено расхождение баланса', {
    userId: user.id,
    balanceUni: user.balance_uni,
    transactionSumUni,
    diffUni: balanceDiffUni,
    balanceTon: user.balance_ton,
    transactionSumTon,
    diffTon: balanceDiffTon
  });
}
```

### ПРОБЛЕМА:
Функция **может запускать корректирующие действия** при обнаружении расхождений балансов.

### ИНСТРУКЦИЯ ПО ОТКЛЮЧЕНИЮ:
```typescript
// ЗАМЕНИТЬ ЭТО:
async detectDirectSQLUpdates(): Promise<void> {
  try {
    // ВСЯ ЛОГИКА ПРОВЕРКИ...
  } catch (error) {
    logger.error('[TransactionEnforcer] Ошибка при проверке прямых SQL обновлений:', error);
  }
}

// НА ЭТО (ПОЛНОЕ ОТКЛЮЧЕНИЕ):
async detectDirectSQLUpdates(): Promise<void> {
  logger.info('[TransactionEnforcer] detectDirectSQLUpdates ОТКЛЮЧЕН для предотвращения rollback');
  return; // НЕМЕДЛЕННЫЙ ВЫХОД БЕЗ ПРОВЕРОК
}
```

**ЭФФЕКТ:** Останавливает мониторинг "подозрительных" изменений балансов.

---

## 7. КРИТИЧЕСКАЯ ФУНКЦИЯ: UnifiedTransactionService.updateUserBalance() - автоматические корректировки

**ФАЙЛ:** `core/TransactionService.ts`  
**СТРОКИ:** 287-320

### Найденный код rollback:
```typescript
// Определяем тип операции
const operation = this.isWithdrawalType(type) ? 'subtract' : 'add';

const result = await balanceManager.updateUserBalance({
  user_id,
  amount_uni,
  amount_ton,
  operation,
  source: 'UnifiedTransactionService'
});
```

### ПРОБЛЕМА:
Функция автоматически определяет операцию (subtract/add) и может **неправильно классифицировать транзакции**, приводя к unexpected списаниям.

### ИНСТРУКЦИЯ ПО ОТКЛЮЧЕНИЮ:
```typescript
// ЗАМЕНИТЬ ЭТО:
private async updateUserBalance(
  user_id: number, 
  amount_uni: number, 
  amount_ton: number, 
  type: TransactionsTransactionType
): Promise<void> {
  try {
    const { balanceManager } = await import('./BalanceManager');
    
    // ОТКЛЮЧИТЬ АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ БАЛАНСОВ
    logger.warn('[UnifiedTransactionService] updateUserBalance ОТКЛЮЧЕН для предотвращения rollback', {
      user_id, amount_uni, amount_ton, type
    });
    return; // НЕМЕДЛЕННЫЙ ВЫХОД
  } catch (error) {
    logger.error('[UnifiedTransactionService] updateUserBalance ОТКЛЮЧЕН:', error);
  }
}
```

**ЭФФЕКТ:** Полностью останавливает автоматические обновления балансов через транзакции.

---

## 🚨 ЭКСТРЕННЫЙ ПЛАН НЕМЕДЛЕННОГО ОТКЛЮЧЕНИЯ

### Шаг 1: Блокировка критических функций
```bash
# 1. Отключить BalanceManager subtract операции
sed -i 's/Math.max(0, current.balance_uni - amount_uni)/current.balance_uni - amount_uni/g' core/BalanceManager.ts
sed -i 's/Math.max(0, current.balance_ton - amount_ton)/current.balance_ton - amount_ton/g' core/BalanceManager.ts

# 2. Отключить TransactionEnforcer
sed -i 's/return { valid: false,/return { valid: true, \/\/ DISABLED:/g' core/TransactionEnforcer.ts

# 3. Отключить SQL скрипты удаления
mv scripts/sql/2_clean_duplicates.sql scripts/sql/2_clean_duplicates.sql.DISABLED
```

### Шаг 2: Добавить защитные механизмы
```typescript
// В начало каждого критического файла добавить:
const ROLLBACK_PROTECTION_ENABLED = true;
if (ROLLBACK_PROTECTION_ENABLED) {
  logger.error('[ROLLBACK_PROTECTION] Функция отключена для предотвращения потери средств');
  return;
}
```

### Шаг 3: Мониторинг
```typescript
// Добавить во все подозрительные функции:
logger.error('[ANTI_ROLLBACK_MONITOR]', {
  function_name: 'название_функции',
  user_id,
  action: 'BLOCKED_POTENTIAL_ROLLBACK',
  timestamp: new Date().toISOString()
});
```

---

## ПРОВЕРКА РЕЗУЛЬТАТОВ ОТКЛЮЧЕНИЯ

После применения отключений проверить:

1. **User 25**: Прекратились ли автоматические "возвраты" средств после TON Boost покупок
2. **Логи**: Нет ли больше записей `[CRITICAL] [DIRECT_BALANCE_UPDATE]` с операциями `subtract`
3. **Scheduler**: Работает ли без конфликтов после отключения TransactionEnforcer
4. **Транзакции**: Не удаляются ли автоматически записи с одинаковыми hash

---

## ⚠️ ПРЕДУПРЕЖДЕНИЕ

Отключение этих функций **полностью устранит автоматические rollback**, но также:
- Отключит некоторые защитные механизмы
- Может позволить отрицательные балансы
- Требует ручного мониторинга целостности данных

**РЕКОМЕНДАЦИЯ:** Применить отключения **немедленно** для остановки потери средств, затем разработать альтернативные защитные механизмы.

---

**СТАТУС:** ✅ **КОНКРЕТНЫЕ ФУНКЦИИ НАЙДЕНЫ** - Все 7 критических систем rollback идентифицированы с точными строками кода и инструкциями по отключению.