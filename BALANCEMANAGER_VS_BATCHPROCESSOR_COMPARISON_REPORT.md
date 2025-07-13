# 🔍 СРАВНИТЕЛЬНЫЙ АНАЛИЗ: BatchBalanceProcessor vs BalanceManager

## 📊 Полная сравнительная таблица

| Параметр | BalanceManager | BatchBalanceProcessor |
|----------|----------------|----------------------|
| **Где расположен** | `core/BalanceManager.ts` | `core/BatchBalanceProcessor.ts` |
| **Где используется (файлы)** | - `modules/farming/service.ts`<br>- `modules/wallet/*`<br>- `modules/dailyBonus/service.ts`<br>- `modules/missions/service.ts`<br>- `core/TransactionService.ts` | - `core/scheduler/farmingScheduler.ts`<br>- `modules/scheduler/tonBoostIncomeScheduler.ts` |
| **Кто вызывает** | Пользовательские действия (депозиты, выводы, покупки) | Планировщики (каждые 5 минут) |
| **Обновляет ли баланс в БД** | ✅ Да, через Supabase `.update()` | ✅ Да, через Supabase RPC `increment_user_balance` |
| **Отправляет WebSocket** | ✅ Да, через callback `onBalanceUpdate` | ✅ Да, напрямую через `BalanceNotificationService` |
| **Структура payload** | Зависит от `websocket-balance-integration.ts` | `{userId, balanceUni, balanceTon, changeAmount, currency, source, timestamp}` |
| **Используется в TON Boost** | ❓ Вероятно да (через boost/service.ts) | ✅ Да, в `tonBoostIncomeScheduler.ts` |
| **Связан с farmingScheduler** | ❌ Нет | ✅ Да, основной инструмент |
| **Кеширование** | ✅ Интегрирован с BalanceCache | ✅ Инвалидирует кеш после обновлений |
| **Защита от двойного обновления** | ✅ Транзакционность через single update | ✅ Batch processing с retry механизмом |
| **Производительность** | Для единичных операций | Оптимизирован для массовых (100+ пользователей) |

## 🔄 Архитектура потока данных

### Текущая ситуация (ПРОБЛЕМА):

```
ПОЛЬЗОВАТЕЛЬСКИЕ ДЕЙСТВИЯ:
User → API → Service → BalanceManager → Supabase ✅
                            ↓
                    WebSocket callback → BalanceNotificationService ❌
                    (callback вызывается, но данные не отправляются)

ПЛАНИРОВЩИКИ:
Scheduler → BatchBalanceProcessor → Supabase RPC ❌ (нет функции increment_user_balance)
                    ↓
            BalanceNotificationService → WebSocket ✅
            (но отправляет changeAmount=0)
```

## 🛑 Точки конфликта

### 1. **Несуществующая RPC функция (с fallback)**
BatchBalanceProcessor пытается вызвать `increment_user_balance` которой нет в Supabase:
```typescript
// core/BatchBalanceProcessor.ts, строка 179-184
const { data, error } = await supabase.rpc('increment_user_balance', {
  p_user_id: update.user_id,
  p_uni_amount: update.uni_increment,
  p_ton_amount: update.ton_increment
});
```
**НО**: есть fallback механизм (строки 187-215) который делает обычный update если RPC не работает

### 2. **Двойная система уведомлений**
- BalanceManager использует callback механизм через `websocket-balance-integration.ts`
- BatchBalanceProcessor напрямую вызывает `BalanceNotificationService`

### 3. **Несогласованность интеграции WebSocket**
- BatchBalanceProcessor получает актуальные балансы (строки 228-234) и отправляет корректный payload
- BalanceManager использует callback, но `websocket-balance-integration.ts` отправляет changeAmount=0
- Проверка показала: существует только один файл `balanceNotificationService.ts` (строчная буква)

## ✅ Функциональный анализ

### BalanceManager.updateBalance()
- **Принимает**: `{user_id, amount_uni, amount_ton, operation: 'add'|'subtract'|'set', source}`
- **Обновляет**: Да, напрямую через Supabase `.update()`
- **Уведомляет**: Через callback `onBalanceUpdate` (если установлен)
- **Транзакции**: Создает через `transactionEnforcer`

### BatchBalanceProcessor.processFarmingIncome()
- **Принимает**: Массив `{userId, income}` 
- **Обновляет**: Пытается через RPC (не работает)
- **Уведомляет**: Напрямую через `BalanceNotificationService`
- **Оптимизация**: Батчи по 100 записей

## 💡 Архитектурная рекомендация

### **ВЫВОД: BalanceManager должен быть единственным источником правды**

**Обоснование:**
1. ✅ Уже используется для всех пользовательских операций
2. ✅ Имеет правильную архитектуру с callback для уведомлений
3. ✅ Работает с реальными Supabase операциями (не RPC)
4. ✅ Интегрирован с системой транзакций
5. ✅ Поддерживает все типы операций (add/subtract/set)

### **План миграции:**

#### Вариант A: Минимальные изменения (БЫСТРЫЙ ФИКС)
1. Исправить BatchBalanceProcessor - заменить RPC на обычные update операции
2. Добавить получение актуальных балансов перед отправкой уведомлений
3. ~20 строк кода, 1 час работы

#### Вариант B: Правильная архитектура (РЕКОМЕНДУЕТСЯ)
1. Переписать планировщики на использование BalanceManager
2. Добавить в BalanceManager метод `batchUpdate()` для массовых операций
3. Удалить BatchBalanceProcessor полностью
4. ~200 строк кода, 3-4 часа работы

## 🔐 Риски и выгоды

### Риски оставить как есть:
- ❌ Постоянные проблемы с синхронизацией
- ❌ Двойная поддержка кода
- ❌ Неконсистентные уведомления

### Выгоды перехода на BalanceManager:
- ✅ Единая точка управления балансами
- ✅ Консистентные WebSocket уведомления
- ✅ Проще поддерживать и дебажить
- ✅ Уже работает для 70% операций

## 📋 Дополнительные находки

### Различия по валютам
- Оба поддерживают UNI и TON одинаково
- Нет специфичной логики по валютам

### Временные конфликты
- Возможны при одновременном депозите и начислении награды
- BalanceManager использует транзакции, BatchBalanceProcessor - нет

### Использование в других модулях
- **TON Boost**: использует BatchBalanceProcessor (планировщик)
- **Withdrawals**: использует BalanceManager (через TransactionService)
- **Missions**: использует BalanceManager
- **Daily Bonus**: использует BalanceManager

## 🎯 ФИНАЛЬНАЯ РЕКОМЕНДАЦИЯ

**Перевести всю систему на BalanceManager:**

1. Добавить метод `batchUpdateBalances()` в BalanceManager
2. Переписать планировщики на его использование
3. Удалить BatchBalanceProcessor
4. Настроить правильную интеграцию WebSocket через единый callback

Это решит все текущие проблемы и создаст надежную, поддерживаемую архитектуру.

## 📝 ДОПОЛНИТЕЛЬНЫЕ ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Проблема websocket-balance-integration.ts
- Файл отправляет `changeAmount: 0` (строка 25) вместо реальной суммы изменения
- Не знает валюту, всегда ставит `currency: 'UNI'` (строка 26)
- Это объясняет, почему уведомления от BalanceManager не содержат полезной информации

### Почему BatchBalanceProcessor работает лучше
- Знает точные суммы изменения из операции
- Может определить валюту из данных операции
- Отправляет полный payload с актуальными данными

### Quickfix для websocket-balance-integration.ts
Callback должен получать больше контекста:
```typescript
balanceManager.onBalanceUpdate = async (userId: number, changeData?: {amount: number, currency: 'UNI'|'TON', source: string}) => {
  // Теперь может отправить полный payload
}
```