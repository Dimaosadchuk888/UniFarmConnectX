# 🚨 **АНАЛИЗ ПОТЕРИ ПЛАТЕЖЕЙ TON ДЕПОЗИТОВ**

**Дата:** 4 августа 2025  
**Критический анализ:** Почему пользователи теряют депозиты через ConnectWallet

---

## 💸 **ОСНОВНЫЕ ПРИЧИНЫ ПОТЕРИ ПЛАТЕЖЕЙ**

### **1. 🔐 JWT Token Timeout (Высокий риск)**

**Проблема:** Платеж уходит из кошелька, но система не авторизована для его обработки
**Файл:** `client/src/services/tonConnectService.ts` строки 317-476

```typescript
// 🛡️ КРИТИЧЕСКАЯ ЗАЩИТА: Защищаем TON депозиты от JWT token timeout
return await criticalOperationGuard.guardTonDeposit(async () => {
  console.log('[TON_DEPOSIT_PROTECTION] 🔒 Депозит защищен системой JWT мониторинга');
```

**Сценарий потери:**
1. Пользователь открывает приложение, JWT действителен
2. Заполняет форму депозита (2-3 минуты)
3. JWT истекает во время заполнения
4. Отправляет транзакцию - деньги уходят с кошелька
5. API вызов `/api/v2/wallet/ton-deposit` получает 401 Unauthorized
6. **РЕЗУЛЬТАТ: Деньги ушли, депозит не засчитан**

### **2. 📱 Пользователь отклоняет транзакцию (Средний риск)**

**Файл:** `client/src/services/tonConnectService.ts` строки 448-461

```typescript
if (error instanceof UserRejectsError) {
  debugLog('Пользователь отклонил транзакцию в кошельке');
  return {
    txHash: '',
    status: 'error'
  };
}
```

**Сценарий потери:**
1. Форма отправлена, транзакция создана
2. Пользователь видит подтверждение в Tonkeeper
3. Отклоняет транзакцию
4. **НО:** Некоторые кошельки могут показать "отклонено" даже при успешной отправке
5. **РЕЗУЛЬТАТ: Деньги ушли, но фронтенд считает операцию неуспешной**

### **3. 🌐 Сетевые ошибки во время API вызова (Высокий риск)**

**Файл:** `client/src/components/wallet/TonDepositCard.tsx` строки 136-148

```typescript
const response = await fetch('/api/v2/wallet/ton-deposit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token')}`
  },
  body: JSON.stringify({
    user_id: userId,
    ton_tx_hash: result.txHash,  // ← КРИТИЧНО: хэш уже получен
    amount: depositAmount,
    wallet_address: walletAddress
  })
});
```

**Сценарий потери:**
1. `sendTonTransaction()` успешно выполнен
2. Получен `result.txHash` - деньги ушли с кошелька  
3. Сетевая ошибка при вызове API (таймаут, отсутствие интернета)
4. `fetch()` падает с ошибкой
5. **РЕЗУЛЬТАТ: Деньги ушли, но бэкенд не знает о транзакции**

### **4. 🔄 Дублирование защиты блокирует валидный депозит (Средний риск)**

**Файл:** `core/TransactionService.ts` строки 114-148

```typescript
// ТОЧНАЯ проверка дублирования - только для ТОЧНО совпадающих транзакций
const { data: existingTransactions, error: checkError } = await supabase
  .from('transactions')
  .select('id, created_at, user_id, amount_ton, type, description, tx_hash_unique')
  .eq('tx_hash_unique', txHashToCheck)  
  .eq('user_id', user_id)
  .order('created_at', { ascending: false });

if (shouldBlock) {
  // КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ ЗАБЛОКИРОВАННЫХ ДЕПОЗИТОВ
  logger.error('[CRITICAL] [DEPOSIT_BLOCKED_BY_DEDUPLICATION]', {
    blocked_reason: 'PREVENTED_DUPLICATE'
  });
  return { success: false, error: 'Дублирующая транзакция' };
}
```

**Сценарий потери:**
1. Пользователь отправляет депозит, получает сетевую ошибку
2. Повторяет депозит с той же суммой через несколько минут
3. Система видит "похожую" транзакцию и блокирует как дубликат
4. **РЕЗУЛЬТАТ: Второй платеж заблокирован, деньги висят**

### **5. 🏗️ Ошибки в UnifiedTransactionService (Критический риск)**

**Файл:** `modules/wallet/service.ts` строки 411-431

```typescript
if (!result.success) {
  logger.error('[WalletService] UnifiedTransactionService вернул ошибку', {
    userId: user_id,
    txHash: ton_tx_hash,
    error: result.error
  });

  return {
    success: false,
    error: result.error || 'Ошибка создания транзакции'
  };
}
```

**Сценарий потери:**
1. API получил хэш транзакции
2. `UnifiedTransactionService.createTransaction()` падает с ошибкой
3. Баланс не обновляется, транзакция не записывается
4. **РЕЗУЛЬТАТ: Хэш зафиксирован в логах, но депозит потерян**

### **6. 💾 Ошибки базы данных (Критический риск)**

**Файл:** `core/BalanceManager.ts` строки 139-162

```typescript
const { data: updatedUser, error: updateError } = await supabase
  .from('users')
  .update({
    balance_uni: parseFloat(newUniBalance.toFixed(6)),
    balance_ton: parseFloat(newTonBalance.toFixed(6))
  })
  .eq('id', user_id)
  .select('id, balance_uni, balance_ton')
  .single();

if (updateError) {
  logger.error('[BalanceManager] Ошибка обновления баланса в БД:', {
    user_id,
    error: updateError.message
  });
  return { success: false, error: `Ошибка обновления баланса: ${updateError.message}` };
}
```

**Сценарий потери:**
1. Транзакция создается успешно
2. Обновление баланса падает с DB ошибкой
3. **РЕЗУЛЬТАТ: Транзакция записана, но баланс не обновлен**

---

## 🔍 **ОТ ЧЕГО ЗАВИСИТ КОРРЕКТНОЕ ЗАЧИСЛЕНИЕ**

### **Цепочка зависимостей для успешного депозита:**

1. **✅ TON Connect UI работает корректно**
   - Кошелек подключен и авторизован
   - `sendTransaction()` возвращает валидный BOC

2. **✅ JWT Token актуален**
   - Токен не истек во время процедуры
   - Система `criticalOperationGuard` успешно защищает операцию

3. **✅ Сетевое соединение стабильно**
   - API вызов `/api/v2/wallet/ton-deposit` доходит до сервера
   - Нет таймаутов или разрывов соединения

4. **✅ Пользователь найден или создан**
   - `getUserByTelegramId()` работает
   - При необходимости `getOrCreateUserFromTelegram()` создает аккаунт

5. **✅ Дедупликация не блокирует**
   - Хэш транзакции уникален или прошло достаточно времени
   - `checkRecentTransaction()` не находит конфликтов

6. **✅ UnifiedTransactionService создает транзакцию**
   - Валидация типа и суммы проходит успешно
   - Запись в таблицу `transactions` выполняется без ошибок

7. **✅ BalanceManager обновляет баланс**
   - Обновление таблицы `users` проходит успешно
   - Новый баланс записывается корректно

8. **✅ WebSocket уведомление отправляется**
   - Фронтенд получает сигнал об обновлении баланса
   - `refreshBalance()` синхронизирует отображение

---

## 🎯 **ОТОБРАЖЕНИЕ В UX: Критические точки**

### **1. 🔄 Автообновление баланса (СЛАБОЕ МЕСТО)**

**Файл:** `client/src/components/wallet/TonDepositCard.tsx` строки 156-158

```typescript
// Обновляем баланс
setTimeout(() => {
  refreshBalance(true);
}, 1000);
```

**Проблема:** 
- Фиксированная задержка 1 секунда может быть недостаточной
- Если `refreshBalance()` не сработает, пользователь не увидит новый баланс
- Нет повторных попыток при ошибках

### **2. 📡 WebSocket может не доставить уведомление**

**Файл:** `client/src/hooks/useWebSocketBalanceSync.ts` строки 55-64

```typescript
if (lastMessage && lastMessage.type === 'balance_update') {
  if (lastMessage.userId === userId && userId) {
    balanceCoordinator.requestUpdate(userId, 'websocket-update', true);
  }
}
```

**Проблема:**
- WebSocket соединение может быть нестабильным
- Сообщение может потеряться при сетевых проблемах
- Пользователь не видит обновление в реальном времени

### **3. 🎨 UX показывает успех до подтверждения**

**Файл:** `client/src/components/wallet/TonDepositCard.tsx` строки 152-153

```typescript
if (data.success) {
  success(`Депозит ${depositAmount} TON успешно обработан`);
  setAmount('');
```

**Проблема:**
- Сообщение об успехе показывается немедленно
- Но баланс обновляется через 1 секунду
- Создается ложное ощущение мгновенного зачисления

---

## 🛠️ **РЕКОМЕНДАЦИИ ПО УСТРАНЕНИЮ РИСКОВ**

### **1. Улучшенная обработка JWT timeout**
```typescript
// Проверка JWT перед отправкой транзакции
const isTokenValid = await validateJWTToken();
if (!isTokenValid) {
  await refreshToken();
}
```

### **2. Retry механизм для API вызовов**
```typescript
const retryDeposit = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('/api/v2/wallet/ton-deposit', {});
      if (response.ok) return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### **3. Улучшенное отображение статуса**
```typescript
// Показываем "Обработка..." вместо "Успешно"
setDepositStatus('processing');
// Проверяем баланс несколько раз
const checkBalance = setInterval(() => {
  refreshBalance(true);
}, 2000);
```

### **4. Fallback для WebSocket**
```typescript
// Если WebSocket не работает, используем polling
useEffect(() => {
  if (!isWebSocketConnected) {
    const interval = setInterval(() => {
      refreshBalance(true);
    }, 10000);
    return () => clearInterval(interval);
  }
}, [isWebSocketConnected]);
```

---

## 📊 **ВЫВОДЫ**

### **Высокий риск потери депозита:**
1. **JWT Token timeout** - деньги ушли, но API недоступен
2. **Сетевые ошибки** - транзакция выполнена, но не передана на сервер
3. **DB ошибки** - данные получены, но не сохранены

### **Средний риск:**
1. **Ложное отклонение** пользователем в кошельке
2. **Излишняя дедупликация** блокирует валидные депозиты

### **UX проблемы:**
1. **Обманчивый успех** - показываем "готово" до реального зачисления
2. **Отсутствие retry** - пользователь не знает, что делать при ошибке
3. **Слабая обратная связь** - нет индикации процесса обработки

**Система требует доработки механизмов защиты от потери депозитов и улучшения UX отображения процесса.**