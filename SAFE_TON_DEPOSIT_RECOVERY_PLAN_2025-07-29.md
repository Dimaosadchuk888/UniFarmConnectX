# 🛠️ ПЛАН БЕЗОПАСНОГО ВОССТАНОВЛЕНИЯ СИСТЕМЫ TON ДЕПОЗИТОВ

## 📋 ЧТО НУЖНО ВОССТАНОВИТЬ

### Критические компоненты:

1. **UnifiedTransactionService.updateUserBalance()** - ПРИОРИТЕТ 1
   - Сейчас: Полностью отключена, немедленный выход
   - Нужно: Восстановить с защитой от некорректных операций
   - Влияние: TON депозиты, фарминг доходы, награды не зачисляются

2. **BalanceManager.updateUserBalance()** - ПРИОРИТЕТ 2  
   - Сейчас: Отключен Math.max(0, balance - amount)
   - Нужно: Восстановить с логированием отрицательных балансов
   - Влияние: Корректность всех операций с балансом

3. **Система мониторинга балансов** - ПРИОРИТЕТ 3
   - Сейчас: detectDirectSQLUpdates() отключен
   - Нужно: Восстановить мониторинг без агрессивных rollback

---

## 🔄 ПОШАГОВЫЙ ПЛАН ВОССТАНОВЛЕНИЯ

### ЭТАП 1: Подготовка и резервирование (10 минут)

#### 1.1 Создание backup критических файлов
```bash
cp core/TransactionService.ts core/TransactionService.ts.backup-$(date +%Y%m%d-%H%M%S)
cp core/BalanceManager.ts core/BalanceManager.ts.backup-$(date +%Y%m%d-%H%M%S)
```

#### 1.2 Проверка текущего состояния базы
```sql
-- Подсчет транзакций за последние дни
SELECT COUNT(*) as total_transactions FROM transactions 
WHERE created_at >= '2025-07-29 00:00:00';

-- Пользователи с потенциальными потерями
SELECT user_id, COUNT(*) as tx_count, MAX(created_at) as last_tx
FROM transactions 
WHERE created_at >= '2025-07-29 14:00:00'
GROUP BY user_id;
```

### ЭТАП 2: Восстановление updateUserBalance() (20 минут)

#### 2.1 Безопасное восстановление с защитой
```typescript
private async updateUserBalance(
  user_id: number, 
  amount_uni: number, 
  amount_ton: number, 
  type: TransactionsTransactionType
): Promise<void> {
  try {
    // НОВАЯ ЗАЩИТА: логируем критические операции
    logger.info('[UnifiedTransactionService] Обновление баланса', {
      user_id, amount_uni, amount_ton, type,
      timestamp: new Date().toISOString()
    });

    // ПРОВЕРКА НА РАЗУМНЫЕ ПРЕДЕЛЫ (защита от атак)
    if (amount_uni > 1000000 || amount_ton > 1000) {
      logger.error('[SECURITY] Подозрительная сумма транзакции', {
        user_id, amount_uni, amount_ton, type
      });
      return; // Блокируем подозрительные операции
    }

    // Используем BalanceManager для безопасного обновления
    const balanceManager = BalanceManager.getInstance();
    
    if (amount_uni > 0) {
      await balanceManager.addBalance(user_id, amount_uni, 0);
    }
    
    if (amount_ton > 0) {
      await balanceManager.addBalance(user_id, 0, amount_ton);
    }

    logger.info('[UnifiedTransactionService] Баланс обновлен успешно', {
      user_id, amount_uni, amount_ton
    });

  } catch (error) {
    logger.error('[UnifiedTransactionService] Ошибка обновления баланса', {
      user_id, amount_uni, amount_ton, error
    });
    // НЕ блокируем создание транзакции при ошибке баланса
  }
}
```

#### 2.2 Тестирование восстановления
```typescript
// Тестовая транзакция для проверки
const testResult = await transactionService.createTransaction({
  user_id: 999, // Тестовый пользователь
  type: 'TON_DEPOSIT',
  amount_ton: 0.01,
  description: 'Тест восстановления системы'
});
```

### ЭТАП 3: Восстановление BalanceManager (15 минут)

#### 3.1 Умное восстановление Math.max защиты
```typescript
case 'subtract':
  // НОВАЯ ЛОГИКА: разрешаем отрицательные балансы с предупреждением
  newUniBalance = current.balance_uni - amount_uni;
  newTonBalance = current.balance_ton - amount_ton;
  
  // Логируем потенциальные проблемы
  if (newUniBalance < 0) {
    logger.warn('[BalanceManager] ВНИМАНИЕ: Отрицательный UNI баланс', {
      user_id, current_balance: current.balance_uni, 
      subtract_amount: amount_uni, result: newUniBalance
    });
  }
  
  if (newTonBalance < 0) {
    logger.warn('[BalanceManager] ВНИМАНИЕ: Отрицательный TON баланс', {
      user_id, current_balance: current.balance_ton,
      subtract_amount: amount_ton, result: newTonBalance
    });
  }
  break;
```

### ЭТАП 4: Восстановление мониторинга (10 минут)

#### 4.1 Мягкий мониторинг без rollback
```typescript
async detectDirectSQLUpdates(userId: number): Promise<void> {
  // МЯГКИЙ МОНИТОРИНГ: только логирование, без действий
  logger.info('[TransactionEnforcer] Проверка целостности балансов', {
    userId, timestamp: new Date().toISOString()
  });
  
  // Логируем расхождения без корректировок
  if (Math.abs(balanceDiffUni) > 1 || Math.abs(balanceDiffTon) > 1) {
    logger.warn('[TransactionEnforcer] Обнаружено расхождение (без действий)', {
      userId, diffUni: balanceDiffUni, diffTon: balanceDiffTon
    });
  }
}
```

---

## 🔒 МЕРЫ БЕЗОПАСНОСТИ

### Защита от поломки:

1. **Постепенное развертывание**
   - Сначала тестируем на staging
   - Затем включаем для 1-2 пользователей
   - Полное развертывание после успешных тестов

2. **Мониторинг восстановления**
   - Отслеживаем логи в реальном времени
   - Проверяем балансы тестовых пользователей
   - Готовность к быстрому rollback

3. **Лимиты безопасности**
   - Максимальные суммы транзакций
   - Частотные ограничения
   - Предупреждения о подозрительной активности

### Критерии успеха:
- ✅ Тестовый TON депозит зачисляется корректно
- ✅ Баланс обновляется в базе данных
- ✅ WebSocket уведомления работают  
- ✅ Нет критических ошибок в логах

---

## 📊 ПЛАН КОМПЕНСАЦИИ ПОЛЬЗОВАТЕЛЕЙ

### User 25 (немедленная компенсация):
```sql
-- Проверяем текущий баланс
SELECT id, balance_ton, balance_uni FROM users WHERE id = 25;

-- Компенсируем 2 депозита (предположительно по 1 TON каждый)
-- ВНИМАНИЕ: суммы нужно уточнить из логов или blockchain данных
```

### Остальные пользователи:
1. Анализ всех транзакций с 29.07.2025 14:00
2. Выявление "потерянных" депозитов  
3. Массовая компенсация через транзакции

---

## ⚠️ РИСКИ И ПРЕДОСТОРОЖНОСТИ

### Высокие риски:
- **Дублирование компенсаций** - если баланс уже был частично восстановлен
- **Массовые ошибки** - если логика восстановления неверна
- **Cascade эффекты** - влияние на другие части системы

### Снижение рисков:
- **Тестирование на копии БД** перед production
- **Поэтапное включение** функций
- **Постоянный мониторинг** логов и балансов
- **Готовность к откату** изменений

---

## 🎯 ИТОГОВЫЕ РЕКОМЕНДАЦИИ

### Последовательность действий:
1. **Backup + тестирование** восстановленной логики
2. **Постепенное включение** updateUserBalance() 
3. **Мониторинг** первых депозитов после восстановления
4. **Компенсация** пострадавших пользователей
5. **Полная проверка** системы целостности

### Критерии готовности к production:
- Успешные тесты на staging ✅
- Корректная работа с тестовыми депозитами ✅  
- Отсутствие критических ошибок ✅
- Подтверждение зачисления средств пользователям ✅

**Время выполнения**: 1-2 часа с учетом тестирования
**Команда**: Требуется мониторинг всех этапов
**Rollback план**: Восстановление backup файлов в случае проблем