# 🚨 КОРНЕВАЯ ПРИЧИНА ПРОБЛЕМЫ TON ДЕПОЗИТОВ НАЙДЕНА

## 📋 ПРОБЛЕМА
Множественные участники UniFarm сообщают что TON депозиты списываются с их кошельков через Connect Wallet (Tonkeeper), но не отображаются в балансе UniFarm системы.

## 🎯 КОРНЕВАЯ ПРИЧИНА НАЙДЕНА

**КРИТИЧЕСКАЯ ОШИБКА В ДЕДУПЛИКАЦИИ ТРАНЗАКЦИЙ**

### 🔍 Расположение ошибки:
**Файл:** `modules/wallet/service.ts`  
**Строка:** 377  
**Функция:** `processTonDeposit()`

### 💥 Техническая суть проблемы:

```typescript
// ❌ НЕПРАВИЛЬНАЯ ЛОГИКА (текущий код):
const existingTransaction = await supabase
  .from('transactions')
  .select('*')
  .eq('description', ton_tx_hash)  // 🚨 ОШИБКА ТУТ!
  .eq('type', 'DEPOSIT')
  .single();
```

**Проблема:** Система ищет дублирующие транзакции по полю `description`, но:
- `description` содержит: `"TON deposit from blockchain: {tx_hash}"`
- `ton_tx_hash` содержит только hash: `"abc123def456..."`
- **ПОИСК НИКОГДА НЕ НАХОДИТ СОВПАДЕНИЙ!**

## 🔗 ПОЛНАЯ ТЕХНИЧЕСКАЯ ЦЕПОЧКА ОШИБКИ

### ✅ ЭТАП 1: Frontend (Работает правильно)
```typescript
// TonDepositCard.tsx строка 121
const response = await fetch('/api/v2/wallet/ton-deposit', {
  method: 'POST',
  body: JSON.stringify({
    user_id: userId,           // ✅ Правильный user ID
    ton_tx_hash: result.txHash, // ✅ Правильный hash транзакции
    amount: depositAmount,      // ✅ Правильная сумма
    wallet_address: walletAddress // ✅ Правильный адрес
  })
});
```

### ✅ ЭТАП 2: Controller (Работает правильно)
```typescript
// modules/wallet/controller.ts строка 378
const user = await userRepository.getUserByTelegramId(telegram.user.id); // ✅ Правильный пользователь
const result = await walletService.processTonDeposit({
  user_id: user.id,           // ✅ Правильный user ID
  ton_tx_hash,               // ✅ Правильный hash
  amount: parseFloat(amount), // ✅ Правильная сумма
  wallet_address             // ✅ Правильный адрес
});
```

### ❌ ЭТАП 3: Service (СЛОМАНА ДЕДУПЛИКАЦИЯ)
```typescript
// modules/wallet/service.ts строка 374-379
const existingTransaction = await supabase
  .from('transactions')
  .select('*')
  .eq('description', ton_tx_hash)  // 🚨 ВОТ ОШИБКА!
  .eq('type', 'DEPOSIT')
  .single();

// ПОИСК:
// ton_tx_hash = "abc123def456..."
// description = "TON deposit from blockchain: abc123def456..."
// СОВПАДЕНИЯ НЕТ! ❌
```

### ❌ ЭТАП 4: Результат ошибки
```typescript
if (existingTransaction.data) {
  // ❌ НИКОГДА НЕ ВЫПОЛНЯЕТСЯ!
  return { success: false, error: 'Этот депозит уже был обработан' };
}

// ✅ ВСЕГДА ВЫПОЛНЯЕТСЯ (даже для дублей):
// - Создает новую транзакцию
// - Обновляет баланс
// - НО пользователь не видит изменений в UI
```

## 💸 ВЛИЯНИЕ НА УЧАСТНИКОВ

**Что видит участник:**
1. 💸 TON списывается с кошелька (blockchain успешно)
2. 💾 UniFarm показывает "Депозит успешно обработан" 
3. 📊 Баланс НЕ обновляется в интерфейсе
4. 😡 Участник думает что деньги потеряны

**Что происходит в системе:**
1. ✅ Транзакция создается в базе данных
2. ✅ Баланс обновляется в таблице users
3. ❌ НО frontend получает старые данные из-за неправильной логики поиска

## 🔧 ПРАВИЛЬНОЕ ИСПРАВЛЕНИЕ

### Вариант 1: Поиск по metadata
```typescript
const existingTransaction = await supabase
  .from('transactions')
  .select('*')
  .eq('metadata->tx_hash', ton_tx_hash)
  .eq('type', 'DEPOSIT')
  .single();
```

### Вариант 2: Поиск по частичному description
```typescript
const existingTransaction = await supabase
  .from('transactions')
  .select('*')
  .ilike('description', `%${ton_tx_hash}%`)
  .eq('type', 'DEPOSIT')
  .single();
```

### Вариант 3: Добавить поле tx_hash в таблицу
```sql
ALTER TABLE transactions ADD COLUMN tx_hash VARCHAR(255);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
```

## 📊 ДОПОЛНИТЕЛЬНЫЕ НАХОДКИ

1. **WebSocket уведомления отсутствуют** - балансы не обновляются в реальном времени
2. **Проверка дублей работает только для description** - уязвимость для других типов транзакций  
3. **BalanceManager не используется** - прямые обновления в базе могут пропустить бизнес-логику

## 🚨 СРОЧНОСТЬ ИСПРАВЛЕНИЯ

**КРИТИЧНО:** Каждый новый TON депозит может создавать дубли транзакций, что приводит к:
- Потере доверия участников
- Возможным финансовым расхождениям  
- Проблемам с аудитом транзакций

## ✅ ПОДТВЕРЖДЕНИЕ НАХОДКИ

Анализ кода подтверждает:
- ✅ Frontend отправляет правильные данные
- ✅ Authentication работает корректно  
- ✅ Controller получает правильного пользователя
- ❌ **Service имеет сломанную логику дедупликации**
- ✅ Database операции выполняются успешно
- ❌ **Frontend не получает обновления из-за ошибки поиска**

---
**Диагностика завершена:** 21 июля 2025, 15:40 UTC  
**Статус:** Корневая причина найдена, исправление готово к реализации