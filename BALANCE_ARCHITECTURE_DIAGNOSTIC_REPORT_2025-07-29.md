# 🔍 ДЕТАЛЬНЫЙ ДИАГНОСТИЧЕСКИЙ ОТЧЕТ: АРХИТЕКТУРА СИСТЕМЫ БАЛАНСОВ
**Дата**: 29.07.2025  
**Цель**: Анализ варианта 1 - восстановление синхронизации балансов

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ

### 1. ОТКЛЮЧЕННЫЕ ФУНКЦИИ (ANTI_ROLLBACK_PROTECTION)
```
❌ UnifiedTransactionService.updateUserBalance() - ПОЛНОСТЬЮ ОТКЛЮЧЕН
❌ BalanceManager.subtractBalance() - ЗАБЛОКИРОВАН
❌ TransactionsService.recalculateUserBalance() - ВЫБРАСЫВАЕТ ОШИБКУ
❌ TransactionEnforcer.enforcePolicy() - ВСЕГДА РАЗРЕШАЕТ
❌ TransactionEnforcer.detectDirectSQLUpdates() - НЕ ПРОВЕРЯЕТ
```

### 2. АКТИВНЫЕ ФУНКЦИИ
```
✅ BalanceManager.addBalance() - РАБОТАЕТ
✅ BalanceManager.setBalance() - РАБОТАЕТ  
✅ BalanceManager.updateUserBalance() - РАБОТАЕТ (но не вызывается)
✅ TransactionService.createTransaction() - СОЗДАЕТ ТРАНЗАКЦИИ
```

## 🏗️ АРХИТЕКТУРА ОБНОВЛЕНИЯ БАЛАНСОВ

### ПОТОК ДАННЫХ (КАК ДОЛЖНО РАБОТАТЬ):
```
1. Пользователь делает депозит TON
   ↓
2. WalletService.processTonDeposit()
   ↓
3. UnifiedTransactionService.createTransaction()
   ↓
4. shouldUpdateBalance(TON_DEPOSIT) = TRUE
   ↓
5. updateUserBalance() → BalanceManager.addBalance()
   ↓
6. База данных обновляется
   ↓
7. WebSocket отправляет уведомление
   ↓
8. Клиент обновляет UI
```

### ПОТОК ДАННЫХ (КАК РАБОТАЕТ СЕЙЧАС):
```
1. Пользователь делает депозит TON
   ↓
2. WalletService.processTonDeposit()
   ↓
3. UnifiedTransactionService.createTransaction()
   ↓
4. shouldUpdateBalance(TON_DEPOSIT) = TRUE
   ↓
5. updateUserBalance() → 🚨 НЕМЕДЛЕННЫЙ ВЫХОД (отключено)
   ↓
6. База данных НЕ обновляется ❌
   ↓
7. Транзакция создана, но баланс старый
   ↓
8. Клиент показывает исчезнувший депозит
```

## 🔄 СИСТЕМЫ СИНХРОНИЗАЦИИ БАЛАНСОВ

### 1. **FRONTEND (CLIENT)**
- **Кеш**: 10 секунд (`balanceService.ts`)
- **WebSocket**: Real-time обновления при получении `balance_update`
- **Автообновление**: Каждые 30 секунд через `useWebSocketBalanceSync`
- **Force refresh**: При `refreshBalance(true)` полностью очищает кеш

### 2. **BACKEND (SERVER)**
- **BalanceManager**: Централизованное управление балансами
- **TransactionService**: Должен обновлять баланс при создании транзакций
- **Планировщики**: Могут вызывать обновление балансов (farming rewards)
- **WebSocket**: Отправляет уведомления об изменениях

### 3. **БАЗА ДАННЫХ**
- **users таблица**: `balance_uni`, `balance_ton` (NUMERIC поля)
- **transactions таблица**: История всех операций
- **Constraint**: `idx_tx_hash_unique_safe` предотвращает дубликаты

## 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ ТЕКУЩЕЙ АРХИТЕКТУРЫ

### ПРОБЛЕМА 1: Транзакции без обновления балансов
```typescript
// core/TransactionService.ts строки 387-399
private async updateUserBalance(...): Promise<void> {
  // ОТКЛЮЧЕНО: updateUserBalance для предотвращения автоматических корректировок балансов
  logger.warn('[ANTI_ROLLBACK_PROTECTION] UnifiedTransactionService.updateUserBalance ОТКЛЮЧЕН', {
    reason: 'Предотвращение неправильной классификации транзакций и unexpected списаний'
  });
  
  // НЕМЕДЛЕННЫЙ ВЫХОД - НЕ ОБНОВЛЯЕМ БАЛАНСЫ АВТОМАТИЧЕСКИ
  return;
}
```
**Эффект**: TON депозиты создают транзакции, но балансы остаются старыми

### ПРОБЛЕМА 2: Конфликт систем обновления
- WebSocket может отправлять устаревшие данные
- API кеш хранит старые значения 10 секунд
- Автообновление каждые 30 секунд создает race conditions

### ПРОБЛЕМА 3: Отсутствие единого источника правды
- База данных содержит транзакции
- Но балансы не синхронизированы с транзакциями
- Клиент полагается на кешированные данные

## 💡 АНАЛИЗ ВАРИАНТА 1: ВОССТАНОВЛЕНИЕ СИНХРОНИЗАЦИИ

### ЧТО НУЖНО СДЕЛАТЬ:
1. **Включить `updateUserBalance()`** в `UnifiedTransactionService`
2. **Добавить защиту** от нежелательных откатов
3. **Усилить логирование** всех изменений балансов

### КОД ИЗМЕНЕНИЯ (ПРЕДЛОЖЕНИЕ):
```typescript
// core/TransactionService.ts
async updateUserBalance(...) {
  try {
    // ВОССТАНОВЛЕНО С ЗАЩИТОЙ
    logger.warn('[BALANCE_SYNC_RESTORED] Обновление баланса восстановлено с защитой', {
      user_id,
      amount_uni,
      amount_ton,
      type,
      timestamp: new Date().toISOString()
    });
    
    // Проверка на подозрительные операции
    if (this.isSuspiciousUpdate(user_id, amount_uni, amount_ton, type)) {
      logger.error('[SUSPICIOUS_UPDATE_BLOCKED]', { user_id, type });
      return; // Блокируем подозрительные
    }
    
    // Вызываем BalanceManager
    const { BalanceManager } = await import('./BalanceManager');
    const balanceManager = BalanceManager.getInstance();
    
    if (amount_uni > 0) {
      await balanceManager.addBalance(user_id, amount_uni, 0);
    }
    
    if (amount_ton > 0) {
      await balanceManager.addBalance(user_id, 0, amount_ton);
    }
    
  } catch (error) {
    logger.error('[updateUserBalance] Ошибка', { error });
  }
}
```

## ⚠️ ПОТЕНЦИАЛЬНЫЕ КОНФЛИКТЫ

### 1. **С отключенными функциями**
- `subtractBalance` все еще заблокирован - списания не будут работать
- `recalculateUserBalance` выбрасывает ошибку - пересчет невозможен

### 2. **С планировщиками**
- Farming планировщики могут создавать дополнительные транзакции
- Возможны race conditions при одновременных обновлениях

### 3. **С WebSocket**
- Может отправлять устаревшие данные до обновления БД
- Клиент может показывать мерцающие значения

## 📈 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### ПОЛОЖИТЕЛЬНЫЕ:
✅ Депозиты будут сразу отображаться на балансе  
✅ Исчезнет проблема с "пропадающими" средствами  
✅ Транзакции и балансы будут синхронизированы  
✅ Улучшится UX - пользователи видят актуальные данные

### РИСКИ:
⚠️ Возможно возвращение автоматических откатов  
⚠️ Потенциальные race conditions  
⚠️ Нагрузка на БД из-за частых обновлений  
⚠️ Необходим тщательный мониторинг первые 48 часов

## 🛡️ ПЛАН ЗАЩИТЫ

### 1. **Детальное логирование**
- Логировать ВСЕ изменения балансов с stack trace
- Создать отдельный лог файл для критических операций
- Алерты при подозрительных паттернах

### 2. **Валидация операций**
```typescript
isSuspiciousUpdate(user_id, amount_uni, amount_ton, type) {
  // Блокировать если:
  // - Слишком частые обновления (>10 в минуту)
  // - Огромные суммы (>1000000)
  // - Неожиданные типы транзакций
  // - Паттерны автоматических откатов
}
```

### 3. **Мониторинг**
- Dashboard с real-time метриками
- Алерты в Telegram при аномалиях
- Ежечасные отчеты первые 48 часов

## 📋 РЕКОМЕНДАЦИИ

### ПОЭТАПНОЕ ВНЕДРЕНИЕ:
1. **Этап 1**: Включить только для TON_DEPOSIT транзакций
2. **Этап 2**: Добавить UNI_DEPOSIT после 24 часов
3. **Этап 3**: Полное восстановление после 48 часов успешной работы

### FALLBACK ПЛАН:
- Сохранить текущий код в `.backup` файлах
- Подготовить скрипт быстрого отката
- Документировать все изменения

## 🏁 ЗАКЛЮЧЕНИЕ

**Вариант 1** решит проблему исчезающих балансов, но требует:
1. Тщательной реализации с защитными механизмами
2. Постоянного мониторинга первые дни
3. Готовности к быстрому откату при проблемах

Система сейчас работает в **аварийном режиме** - транзакции создаются, но балансы не обновляются. Это создает критические проблемы UX и требует срочного решения.

---
**Статус**: Готов к реализации при вашем решении  
**Риск**: Средний (с защитными мерами)  
**Приоритет**: КРИТИЧЕСКИЙ