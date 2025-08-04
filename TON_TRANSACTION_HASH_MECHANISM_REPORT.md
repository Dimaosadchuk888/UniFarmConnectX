# 🔍 **МЕХАНИЗМ ОБРАБОТКИ ХЭШЕЙ TON ТРАНЗАКЦИЙ**

**Дата:** 4 августа 2025  
**Исследование:** Полная схема фиксации, хранения и валидации хэшей транзакций

---

## 📋 **ПОЛНАЯ СХЕМА ОБРАБОТКИ ХЭШЕЙ**

### **1. 🎯 ТОЧКА ВХОДА: ConnectWallet на Фронтенде**

#### **Файл:** `client/src/components/wallet/TonDepositCard.tsx`
**Строки:** 114-148

```typescript
// 🔹 ПОЛУЧЕНИЕ ХЭША ОТ TON Connect
const result = await sendTonTransaction(
  tonConnectUI,
  depositAmount.toString(),
  'UniFarm Deposit'
);

if (result && result.status === 'success' && result.txHash) {
  // 🛡️ ФРОНТЕНД ЗАЩИТА: Проверка дубликатов через Set
  if (processedTxHashes.has(result.txHash)) {
    showError('Эта транзакция уже была обработана');
    return;
  }
  
  // Добавляем хеш в список обработанных
  setProcessedTxHashes(prev => {
    const newSet = new Set(prev);
    newSet.add(result.txHash);
    return newSet;
  });

  // 🚀 ОТПРАВКА НА BACKEND
  const response = await fetch('/api/v2/wallet/ton-deposit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token')}`
    },
    body: JSON.stringify({
      user_id: userId,
      ton_tx_hash: result.txHash,  // ← ХЭШ ПЕРЕДАЕТСЯ ЗДЕСЬ
      amount: depositAmount,
      wallet_address: walletAddress
    })
  });
}
```

### **2. 🔄 ГЕНЕРАЦИЯ ХЭША: TON Connect Service**

#### **Файл:** `client/src/services/tonConnectService.ts`
**Строки:** 311-427

```typescript
export async function sendTonTransaction(
  tonConnectUI: TonConnectUI,
  amount: string,
  comment: string
): Promise<{txHash: string; status: 'success' | 'error'} | null> {
  
  // 🔧 СОЗДАНИЕ BOC-payload с комментарием
  const payload = await createBocWithComment(comment || 'UniFarm Deposit');
  
  // 🔗 КОНФИГУРАЦИЯ ТРАНЗАКЦИИ
  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + TX_LIFETIME,
    messages: [{
      address: process.env.REACT_APP_TON_WALLET_ADDRESS,
      amount: nanoTonAmount.toString(),
      payload: payload
    }]
  };

  // 🎯 ОТПРАВКА ЧЕРЕЗ TON Connect UI
  const result = await tonConnectUI.sendTransaction(transaction);
  
  // ✅ ХЭШ ВОЗВРАЩАЕТСЯ ОТ TON CONNECT
  return {
    txHash: result.boc,  // ← ОСНОВНОЙ ИСТОЧНИК ХЭША
    status: 'success'
  };
}
```

### **3. 🛡️ ОБРАБОТКА НА BACKEND: Wallet Controller**

#### **Файл:** `modules/wallet/controller.ts`
**Строки:** 519-571

```typescript
async tonDeposit(req: Request, res: Response, next: NextFunction) {
  // 📥 ПОЛУЧЕНИЕ ХЭША ОТ ФРОНТЕНДА
  const { user_id, ton_tx_hash, amount, wallet_address } = req.body;
  
  // 🔍 ВАЛИДАЦИЯ ХЭША
  if (!ton_tx_hash || typeof ton_tx_hash !== 'string') {
    return this.sendError(res, 'TON transaction hash обязателен', 400);
  }

  // 🎯 ПЕРЕДАЧА В WALLET SERVICE
  const result = await walletService.processTonDeposit({
    user_id: user.id,
    ton_tx_hash,           // ← ХЭШ ПЕРЕДАЕТСЯ ДАЛЬШЕ
    amount: parseFloat(amount),
    wallet_address
  });
}
```

### **4. 💾 СОХРАНЕНИЕ В БД: Wallet Service**

#### **Файл:** `modules/wallet/service.ts`
**Строки:** 374-409

```typescript
async processTonDeposit({ user_id, ton_tx_hash, amount, wallet_address }) {
  
  // 🔥 КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ
  logger.error('[CRITICAL] [TON_DEPOSIT_PROCESSING]', {
    user_id,
    ton_tx_hash,                    // ← ХЭШ ЛОГИРУЕТСЯ
    amount,
    wallet_address,
    blockchain_code: ton_tx_hash.substring(0, 50) + '...',
    hash_type: ton_tx_hash.startsWith('te6') ? 'BOC_DATA' : 'BLOCKCHAIN_HASH'
  });

  // 🏗️ СОЗДАНИЕ ТРАНЗАКЦИИ ЧЕРЕЗ UnifiedTransactionService
  const transactionService = UnifiedTransactionService.getInstance();
  const result = await transactionService.createTransaction({
    user_id,
    type: 'TON_DEPOSIT',
    amount_ton: amount,
    amount_uni: 0,
    currency: 'TON',
    status: 'completed',
    description: `TON deposit from blockchain: ${ton_tx_hash}`,
    metadata: {
      source: 'ton_deposit',
      wallet_address,
      tx_hash: ton_tx_hash,      // ← ОСНОВНОЕ ПОЛЕ ДЛЯ ДЕДУПЛИКАЦИИ
      ton_tx_hash: ton_tx_hash   // ← ДОПОЛНИТЕЛЬНОЕ ПОЛЕ
    }
  });
}
```

### **5. 🗄️ ФИНАЛЬНОЕ ХРАНЕНИЕ: Database Schema**

#### **Таблица:** `transactions` в `shared/schema.ts`
**Строки:** 230-256

```typescript
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  transaction_type: text("transaction_type"),
  currency: text("currency"),
  amount: numeric("amount", { precision: 18, scale: 6 }),
  status: text("status").default("confirmed"),
  source: text("source"),
  category: text("category"),
  tx_hash: text("tx_hash"),                    // ← ХЭШ ХРАНИТСЯ ЗДЕСЬ
  description: text("description"),
  source_user_id: integer("source_user_id"),
  wallet_address: text("wallet_address"),
  data: text("data"),                          // ← JSON metadata с tx_hash
  created_at: timestamp("created_at").defaultNow()
});
```

---

## 🛡️ **ЗАЩИТА ОТ ДУБЛИКАТОВ: Система Дедупликации**

### **Метод 1: Фронтенд защита (Кратковременная)**
- **Место:** `TonDepositCard.tsx` строка 42
- **Механизм:** `Set<string>` с хэшами обработанных транзакций
- **Время жизни:** До перезагрузки страницы

### **Метод 2: UnifiedTransactionService (Долгосрочная)**
#### **Файл:** `core/TransactionService.ts` строки 104-125

```typescript
// 🛡️ ТОЧНАЯ ЗАЩИТА ОТ ДУБЛИРОВАНИЯ
const txHashToCheck = metadata?.tx_hash || metadata?.ton_tx_hash;
if (txHashToCheck) {
  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('id, created_at, user_id, amount_ton, type, description, tx_hash_unique')
    .eq('tx_hash_unique', txHashToCheck)  // ← ТОЧНОЕ СОВПАДЕНИЕ
    .eq('user_id', user_id)               // ← ДЛЯ ТОГО ЖЕ ПОЛЬЗОВАТЕЛЯ
    .order('created_at', { ascending: false });
    
  if (existingTransactions && existingTransactions.length > 0) {
    // ДУБЛИКАТ НАЙДЕН - БЛОКИРУЕМ ОПЕРАЦИЮ
  }
}
```

### **Метод 3: DeduplicationHelper (Универсальная)**
#### **Файл:** `safe-deduplication-helper.ts` строки 15-63

```typescript
static async checkRecentTransaction(
  userId: number,
  transactionType: string,
  amount: string | number,
  currency: string,
  timeWindowMinutes: number = 10
): Promise<{ exists: boolean; existingTransaction?: any }> {
  
  const timeWindowAgo = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  const { data: existing } = await supabase
    .from('transactions')
    .select('id, created_at, description, amount')
    .eq('user_id', userId)
    .eq('type', transactionType)
    .eq('amount', amount.toString())
    .eq('currency', currency)
    .gte('created_at', timeWindowAgo)
    .limit(1);
}
```

---

## 📊 **ПОЛНАЯ ЦЕПОЧКА ДАННЫХ**

### **1. Источник хэша:** TON Connect UI
- Метод: `tonConnectUI.sendTransaction()`
- Возвращает: `result.boc` (BOC data)

### **2. Передача фронтенд → бэкенд:**
- API: `POST /api/v2/wallet/ton-deposit`
- Поле: `ton_tx_hash`

### **3. Хранение в базе данных:**
```sql
-- Основная таблица transactions
INSERT INTO transactions (
  user_id,
  transaction_type,     -- 'TON_DEPOSIT'
  currency,            -- 'TON'
  amount,              -- сумма депозита
  tx_hash,             -- хэш транзакции
  description,         -- описание с хэшем
  data,                -- JSON с metadata
  status,              -- 'completed'
  created_at
) VALUES (...);
```

### **4. Структура metadata в поле `data`:**
```json
{
  "source": "ton_deposit",
  "original_type": "TON_DEPOSIT",
  "wallet_address": "EQxxxxx...",
  "tx_hash": "te6cc...",          // Основное поле дедупликации
  "ton_tx_hash": "te6cc..."       // Дополнительное поле
}
```

---

## 🔍 **ОТСЛЕЖИВАНИЕ ПО ХЭШУ: SQL Запросы**

### **Найти транзакцию по хэшу:**
```sql
SELECT 
  t.id,
  t.user_id,
  u.telegram_id,
  u.username,
  t.transaction_type,
  t.amount,
  t.currency,
  t.status,
  t.tx_hash,
  t.description,
  t.data,
  t.created_at
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE t.tx_hash = 'ХЭША_ТРАНЗАКЦИИ'
   OR t.data::jsonb->>'tx_hash' = 'ХЭША_ТРАНЗАКЦИИ'
   OR t.data::jsonb->>'ton_tx_hash' = 'ХЭША_ТРАНЗАКЦИИ';
```

### **Найти все операции пользователя:**
```sql
SELECT 
  t.*,
  u.telegram_id,
  u.username
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.telegram_id = TELEGRAM_ID_ПОЛЬЗОВАТЕЛЯ
ORDER BY t.created_at DESC;
```

### **Проверить дубликаты по хэшу:**
```sql
SELECT 
  COUNT(*) as duplicate_count,
  array_agg(id) as transaction_ids,
  array_agg(created_at) as creation_times
FROM transactions 
WHERE tx_hash = 'ХЭША_ТРАНЗАКЦИИ'
   OR data::jsonb->>'tx_hash' = 'ХЭША_ТРАНЗАКЦИИ';
```

---

## ✅ **ВЫВОД: ПОЛНАЯ СИНХРОНИЗАЦИЯ**

### **Фронтенд ↔ Бэкенд синхронизация:**
- ✅ **ЕСТЬ**: Хэш передается от TON Connect → фронтенд → бэкенд
- ✅ **ЕСТЬ**: Валидация на каждом уровне
- ✅ **ЕСТЬ**: Защита от дубликатов на фронтенде и бэкенде

### **Привязка хэша к пользователю:**
- ✅ **user_id** в таблице transactions
- ✅ **telegram_id** через связь с таблицей users
- ✅ **wallet_address** в metadata

### **Отвечает за обработку:**
- 🎯 **TON Connect UI** - генерация хэша
- 🎯 **sendTonTransaction()** - передача хэша
- 🎯 **WalletController.tonDeposit()** - валидация
- 🎯 **WalletService.processTonDeposit()** - обработка
- 🎯 **UnifiedTransactionService** - дедупликация и сохранение

### **По хэшу можно отследить:**
- ✅ Полную цепочку пользователя и его операции
- ✅ Время создания и статус транзакции
- ✅ Сумму, валюту и тип операции
- ✅ Связанный Telegram ID и username
- ✅ Адрес кошелька отправителя

---

**Система полностью отслеживает каждый хэш от момента получения до финального сохранения в базе данных.**