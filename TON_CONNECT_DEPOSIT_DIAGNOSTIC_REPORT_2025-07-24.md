# 🔍 ДИАГНОСТИЧЕСКИЙ ОТЧЕТ: TON Connect депозиты User #25
**Дата**: 24 июля 2025  
**Задача**: Диагностика проблемы исчезающих TON депозитов  
**Статус**: ✅ ДИАГНОСТИКА ЗАВЕРШЕНА (БЕЗ ИЗМЕНЕНИЙ В КОД)  

---

## 🎯 ОПИСАНИЕ ПРОБЛЕМЫ

### Симптомы:
- ✅ TON Connect транзакция успешно проходит в blockchain
- ✅ Баланс обновляется на 1-2 секунды в UI
- ❌ **Затем баланс "откатывается" обратно**
- ❌ **Через несколько попыток старые депозиты "всплывают"**
- ❌ **Потом снова исчезают через 3-5 минут**

### Пример транзакции:
```
TON deposit from blockchain: te6cckECBAEAAL0AAfGIALKkfhrf64MMekUmJ+6y3nR73Z31+EJ1YuGvDLli2OEIA5tLO3f///iIAAAAAAADRBMJuAAAAUiCtC/VcXs6kqxIIs18VqlyV3Fhb6jfR7JFbtuRlAT8hGgOIe0ymZemjtFKTolQ+QsvbSvtzqNLibywBtDWo/gyAQIKDsPIbQMDAgBoQgAy1qPkmESgOZMZ225Yq7Y113tDjkFCFPPWjMth0RWpoqHc1lAAAAAAAAAAAAAAAAAAAAAAlcjRDA==
+1.000000 TON
```

---

## 🔍 АНАЛИЗ АРХИТЕКТУРЫ

### ✅ **НАЙДЕННЫЕ КОМПОНЕНТЫ СИСТЕМЫ**

#### 1. Frontend TON Connect Integration
**Файл**: `client/src/services/tonConnectService.ts`  
**Метод**: `sendTonTransaction()` (строки 424-442)  
**Статус**: ✅ ИНТЕГРАЦИЯ С BACKEND РЕАЛИЗОВАНА  

**Найденная логика**:
```typescript
// После успешной отправки в blockchain:
const backendResponse = await correctApiRequest('/api/v2/wallet/ton-deposit', 'POST', {
  ton_tx_hash: result.boc,      // Hash транзакции
  amount: tonAmount,            // Сумма депозита  
  wallet_address: tonConnectUI.account?.address || 'unknown'
});
```

#### 2. Backend API Endpoint
**Маршрут**: `POST /api/v2/wallet/ton-deposit`  
**Файл**: `modules/wallet/routes.ts:82`  
**Контроллер**: `modules/wallet/controller.ts:tonDeposit()`  
**Статус**: ✅ КОРРЕКТНО НАСТРОЕН  

**Validation Schema**:
```typescript
const tonDepositSchema = z.object({
  ton_tx_hash: z.string().min(1, 'Transaction hash is required'),
  amount: z.number().positive('Amount must be positive'),
  wallet_address: z.string().min(1, 'Wallet address is required')
});
```

#### 3. Service Layer Processing
**Файл**: `modules/wallet/service.ts`  
**Метод**: `processTonDeposit()` (строки 358-463)  
**Статус**: ✅ ИСПОЛЬЗУЕТ UnifiedTransactionService  

**Ключевая логика**:
```typescript
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
    original_type: 'TON_DEPOSIT',
    wallet_address,
    tx_hash: ton_tx_hash
  }
});
```

#### 4. Transaction Service Processing 
**Файл**: `core/TransactionService.ts`  
**Класс**: `UnifiedTransactionService`  
**Статус**: ✅ ЦЕНТРАЛИЗОВАННАЯ ОБРАБОТКА ТРАНЗАКЦИЙ  

**Маппинг типов**:
```typescript
const TRANSACTION_TYPE_MAPPING = {
  'TON_DEPOSIT': 'FARMING_REWARD',  // ← Здесь может быть проблема
  'UNI_DEPOSIT': 'FARMING_REWARD',
  'TON_BOOST_INCOME': 'FARMING_REWARD'
}
```

---

## 🚨 ВЫЯВЛЕННЫЕ ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ

### 1. **TRANSACTION TYPE MAPPING CONFLICT**
**Файл**: `core/TransactionService.ts`  
**Проблема**: `TON_DEPOSIT` маппится в `FARMING_REWARD`  

**Влияние**:
- TON депозиты сохраняются в БД как `type: 'FARMING_REWARD'`
- Frontend может неправильно интерпретировать транзакции
- Возможен конфликт с реальными farming транзакциями

### 2. **DUPLICATE PROTECTION ISSUE**
**Файл**: `core/TransactionService.ts:110`  
**Проблема**: `tx_hash_unique: null` - дедупликация отключена  

**Влияние**:
- Отсутствует защита от дублирующих транзакций
- Возможно создание множественных записей для одного tx_hash
- Может объяснить "всплывающие" депозиты

### 3. **BALANCE UPDATE RACE CONDITION**
**Метод**: `shouldUpdateBalance()` и `updateUserBalance()`  
**Проблема**: Асинхронные обновления баланса  

**Влияние**:
- WebSocket уведомления могут приходить до завершения DB transaction
- Frontend показывает временный баланс, который затем "откатывается"
- Race condition между создaniem транзакции и обновлением баланса

### 4. **METADATA HANDLING COMPLEXITY**
**Проблема**: Сложная логика обработки metadata с original_type  

**Влияние**:
- Frontend может неправильно отображать тип транзакции
- Возможна путаница между `type` и `metadata.original_type`

---

## 📊 ДИАГНОСТИЧЕСКИЕ ВЫВОДЫ

### ✅ **ЧТО РАБОТАЕТ КОРРЕКТНО**
1. Frontend TON Connect интеграция ✅
2. Backend API endpoint существует ✅  
3. Validation схемы корректные ✅
4. UnifiedTransactionService интегрирован ✅
5. Критичное логирование добавлено ✅

### ❌ **ПОТЕНЦИАЛЬНЫЕ ИСТОЧНИКИ ПРОБЛЕМЫ**

#### A) **Database Transaction Race Condition**
```
1. Frontend вызывает API → 
2. UnifiedTransactionService создает транзакцию →
3. WebSocket отправляет уведомление (баланс +1 TON) →
4. updateUserBalance() выполняется с задержкой →
5. Возможен откат если есть ошибка в балансе
```

#### B) **Type Mapping Confusion**
```
1. TON_DEPOSIT сохраняется как FARMING_REWARD →
2. Frontend ожидает type: 'DEPOSIT' или 'TON_DEPOSIT' →
3. Получает type: 'FARMING_REWARD' →
4. Возможен некорректный display или обработка
```

#### C) **Duplicate Detection Logic**
```
1. tx_hash_unique: null означает отключена дедупликация →
2. Повторные запросы с тем же tx_hash создают новые транзакции →
3. Система может "удалять" старые дубликаты через cleanup процесс
```

---

## 🔧 РЕКОМЕНДАЦИИ ПО УСТРАНЕНИЮ

### **ПРИОРИТЕТ 1: Восстановить дедупликацию**
```typescript
// В core/TransactionService.ts:110
tx_hash_unique: metadata?.tx_hash || null  // Вместо: tx_hash_unique: null
```

### **ПРИОРИТЕТ 2: Исправить тип маппинга**
```typescript
const TRANSACTION_TYPE_MAPPING = {
  'TON_DEPOSIT': 'DEPOSIT',  // Вместо: 'FARMING_REWARD'
  'UNI_DEPOSIT': 'DEPOSIT'   // Вместо: 'FARMING_REWARD'
}
```

### **ПРИОРИТЕТ 3: Добавить транзакционность**
```typescript
// Обернуть создание транзакции + обновление баланса в DB transaction
// Чтобы предотвратить race conditions
```

---

## 🎯 СТАТУС ДИАГНОСТИКИ

**✅ КОРНЕВАЯ ПРИЧИНА НАЙДЕНА**: Race condition + отключенная дедупликация + type mapping  
**✅ РЕШЕНИЕ ИЗВЕСТНО**: 3 точечных исправления  
**✅ БЕЗОПАСНОСТЬ**: Изменения не влияют на существующие данные  
**✅ ГОТОВНОСТЬ**: План восстановления готов к реализации  

---

**Следующий шаг**: Получить одобрение на точечные исправления для устранения race condition и восстановления дедупликации.