# ПЛАН ИСПРАВЛЕНИЯ ПРОБЛЕМЫ ДЕДУПЛИКАЦИИ

## 🎯 ЦЕЛЬ
Сделать так, чтобы все пользователи работали как User 25 - без блокировки депозитов дедупликацией.

## 🔍 КОРЕНЬ ПРОБЛЕМЫ
В `core/TransactionService.ts` строки 103-147:
- Дедупликация блокирует создание DEPOSIT для некоторых пользователей
- User 25 "повезло" - его транзакции не попадают под ложную дедупликацию
- Проблемные пользователи попадают под ложные срабатывания

## 🔧 РЕШЕНИЯ (в порядке приоритета)

### 1. ИСПРАВИТЬ ЛОГИКУ ДЕДУПЛИКАЦИИ
**Файл:** `core/TransactionService.ts` строки 103-147

**Проблема:** Слишком агрессивная дедупликация по tx_hash
```javascript
// ТЕКУЩАЯ ЛОГИКА (ПРОБЛЕМНАЯ):
.eq('tx_hash_unique', txHashToCheck)  // Точное совпадение
.eq('user_id', user_id)  // Только для того же пользователя
```

**Решение:** Сделать дедупликацию более точной:
- Добавить проверку по времени (не дублировать если прошло >10 минут)
- Проверять не только tx_hash, но и amount точно
- Добавить проверку статуса (не блокировать если предыдущая failed)

### 2. ДОБАВИТЬ ЛОГИРОВАНИЕ ЗАБЛОКИРОВАННЫХ ДЕПОЗИТОВ
**Цель:** Видеть когда и почему блокируются депозиты

**Добавить в место возврата error:**
```javascript
logger.error('[CRITICAL] [DEPOSIT_BLOCKED_BY_DEDUPLICATION]', {
  user_id,
  ton_tx_hash: txHashToCheck,
  amount_ton,
  blocked_reason: 'DUPLICATE_DETECTED',
  existing_transaction_id: existing.id,
  existing_created_at: existing.created_at,
  time_difference_minutes: Math.round((Date.now() - new Date(existing.created_at).getTime()) / (1000 * 60))
});
```

### 3. УЛУЧШИТЬ УСЛОВИЯ ДЕДУПЛИКАЦИИ
**Текущее условие (слишком строгое):**
```javascript
const isSameTransaction = 
  existing.user_id === user_id &&
  Math.abs(parseFloat(existing.amount_ton) - amount_ton) < 0.000001 &&
  existing.type === TRANSACTION_TYPE_MAPPING[type];
```

**Новое условие (более умное):**
```javascript
const timeDifferenceMinutes = Math.round((Date.now() - new Date(existing.created_at).getTime()) / (1000 * 60));
const isRecentDuplicate = timeDifferenceMinutes < 10; // Только последние 10 минут
const isSameAmount = Math.abs(parseFloat(existing.amount_ton) - amount_ton) < 0.000001;
const isSameUser = existing.user_id === user_id;
const existingNotFailed = existing.status !== 'failed';

const shouldBlock = isRecentDuplicate && isSameAmount && isSameUser && existingNotFailed;
```

### 4. ВОССТАНОВИТЬ ПОТЕРЯННЫЕ ДЕПОЗИТЫ
**Для 21 проблемного пользователя:**
- Найти все заблокированные депозиты по логам
- Создать компенсационные DEPOSIT записи
- Обновить балансы пользователей

## 🚀 ПОРЯДОК ВНЕДРЕНИЯ

### ЭТАП 1: КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ
1. Исправить логику дедупликации в UnifiedTransactionService
2. Добавить расширенное логирование
3. Тестировать на новых депозитах

### ЭТАП 2: ВОССТАНОВЛЕНИЕ
1. Проанализировать потерянные депозиты
2. Создать компенсационные записи
3. Уведомить пользователей о восстановлении

### ЭТАП 3: МОНИТОРИНГ
1. Отслеживать новые блокировки
2. Настроить алерты на DEPOSIT_BLOCKED_BY_DEDUPLICATION
3. Регулярно проверять статистику успешности

## 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ
- Все пользователи будут работать как User 25
- Исчезнут "потерянные" депозиты
- TON Boost будет активироваться корректно для всех
- 77.8% проблемных пользователей будут исправлены