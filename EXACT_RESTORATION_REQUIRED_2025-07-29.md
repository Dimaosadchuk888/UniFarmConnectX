# 🎯 ТОЧНЫЙ СПИСОК ВОССТАНОВЛЕНИЯ - БЕЗ НОВЫХ ФУНКЦИЙ

## ЧТО НУЖНО ВОССТАНОВИТЬ (было отключено 29.07.2025)

### 1. UnifiedTransactionService.updateUserBalance() - КРИТИЧНО ДЛЯ TON ДЕПОЗИТОВ

**Файл**: `core/TransactionService.ts`  
**Строки**: 387-399

**СЕЙЧАС (сломано)**:
```typescript
private async updateUserBalance(...): Promise<void> {
  // ОТКЛЮЧЕНО: updateUserBalance для предотвращения автоматических корректировок балансов
  logger.warn('[ANTI_ROLLBACK_PROTECTION] UnifiedTransactionService.updateUserBalance ОТКЛЮЧЕН');
  // НЕМЕДЛЕННЫЙ ВЫХОД - НЕ ОБНОВЛЯЕМ БАЛАНСЫ АВТОМАТИЧЕСКИ
  return;
}
```

**НУЖНО ВОССТАНОВИТЬ (как было до 29.07.2025)**:
```typescript
private async updateUserBalance(
  user_id: number, 
  amount_uni: number, 
  amount_ton: number, 
  type: TransactionsTransactionType
): Promise<void> {
  try {
    // Используем BalanceManager для обновления баланса
    const balanceManager = BalanceManager.getInstance();
    
    if (amount_uni > 0) {
      await balanceManager.addBalance(user_id, amount_uni, 0);
    }
    
    if (amount_ton > 0) {
      await balanceManager.addBalance(user_id, 0, amount_ton);
    }

    logger.info('[UnifiedTransactionService] Баланс обновлен', {
      user_id, amount_uni, amount_ton
    });

  } catch (error) {
    logger.error('[UnifiedTransactionService] Ошибка обновления баланса', {
      user_id, error
    });
  }
}
```

---

### 2. BalanceManager.updateUserBalance() - КРИТИЧНО ДЛЯ КОРРЕКТНОСТИ ОПЕРАЦИЙ

**Файл**: `core/BalanceManager.ts`  
**Строки**: 103-106

**СЕЙЧАС (сломано)**:
```typescript
case 'subtract':
  // Math.max(0, balance - amount) ОТКЛЮЧЕН - разрешены отрицательные балансы
  newUniBalance = current.balance_uni - amount_uni;
  newTonBalance = current.balance_ton - amount_ton;
  // + логирование отрицательных балансов
  break;
```

**НУЖНО ВОССТАНОВИТЬ (как было до 29.07.2025)**:
```typescript
case 'subtract':
  newUniBalance = Math.max(0, current.balance_uni - amount_uni);
  newTonBalance = Math.max(0, current.balance_ton - amount_ton);
  break;
```

---

### 3. TransactionEnforcer.enforcePolicy() - МЕНЕЕ КРИТИЧНО

**Файл**: `core/TransactionEnforcer.ts`  
**Строки**: 89-108

**СЕЙЧАС (сломано)**: Все операции автоматически разрешены

**НУЖНО ВОССТАНОВИТЬ**: Логику блокировки подозрительных операций (как было до 29.07.2025)

---

## ЧТО НЕ НУЖНО ВОССТАНАВЛИВАТЬ

### 1. BatchBalanceProcessor.invalidateBatch() - НЕ КРИТИЧНО
- Массовая инвалидация кеша балансов
- Отключение не влияет на TON депозиты
- **ОСТАВИТЬ ОТКЛЮЧЕННЫМ**

### 2. TransactionsService.recalculateUserBalance() - НЕ КРИТИЧНО  
- Функция возвращала нулевые балансы (0, 0)
- Блокирована специально из-за багов
- **ОСТАВИТЬ ЗАБЛОКИРОВАННЫМ**

### 3. TransactionEnforcer.detectDirectSQLUpdates() - НЕ КРИТИЧНО
- Детектор "подозрительных" изменений балансов
- Не влияет напрямую на обработку депозитов
- **МОЖНО ОСТАВИТЬ ОТКЛЮЧЕННЫМ**

### 4. SQL скрипт удаления дубликатов - НЕ КРИТИЧНО
- Переименован в `.DISABLED_ROLLBACK_PROTECTION`
- Не влияет на текущую обработку депозитов
- **ОСТАВИТЬ ОТКЛЮЧЕННЫМ**

---

## ПРИОРИТЕТЫ ВОССТАНОВЛЕНИЯ

### ПРИОРИТЕТ 1 (КРИТИЧНО - БЕЗ ЭТОГО TON ДЕПОЗИТЫ НЕ РАБОТАЮТ):
1. **UnifiedTransactionService.updateUserBalance()** - восстановить полностью
2. **BalanceManager subtract операция** - восстановить Math.max(0, balance - amount)

### ПРИОРИТЕТ 2 (ЖЕЛАТЕЛЬНО):
3. **TransactionEnforcer.enforcePolicy()** - восстановить логику безопасности

### НЕ ТРОГАТЬ (ПРАВИЛЬНО ОТКЛЮЧЕНЫ):
- BatchBalanceProcessor.invalidateBatch()
- TransactionsService.recalculateUserBalance()  
- TransactionEnforcer.detectDirectSQLUpdates()
- SQL скрипт дедупликации

---

## ПЛАН МИНИМАЛЬНОГО ВОССТАНОВЛЕНИЯ

### Шаг 1: Восстановить updateUserBalance в TransactionService
- Убрать `return;` 
- Вернуть логику вызова BalanceManager

### Шаг 2: Восстановить Math.max в BalanceManager
- Вернуть `Math.max(0, balance - amount)` в subtract операциях

### Шаг 3: Тестирование
- Проверить что TON депозиты зачисляются
- Проверить что балансы не уходят в минус

**РЕЗУЛЬТАТ**: TON депозиты снова будут зачисляться пользователям, система вернется к стабильному состоянию до 29.07.2025