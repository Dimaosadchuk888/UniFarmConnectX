# Анализ проблемы обновления TON баланса после успешных транзакций

## Постановка проблемы
После успешного решения основной проблемы эмуляции TON Connect ("Мы не смогли промоделировать транзакцию") пользователь сообщил о новой проблеме: TON баланс не обновляется в UI после успешных транзакций, несмотря на корректную обработку на backend.

## Детальный анализ цепочки обновления баланса

### Frontend Flow (client/src/components/wallet/TonDepositCard.tsx)
```javascript
const handleDeposit = async () => {
  // 1. Отправка TON через TON Connect
  const result = await sendTonTransaction(tonConnectUI, depositAmount.toString(), 'UniFarm Deposit');
  
  // 2. Уведомление backend о транзакции
  if (result && result.status === 'success' && result.txHash) {
    const response = await fetch('/api/v2/wallet/ton-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token')}`
      },
      body: JSON.stringify({
        user_id: userId,
        ton_tx_hash: result.txHash,
        amount: depositAmount,
        wallet_address: walletAddress
      })
    });
    
    // 3. Принудительное обновление баланса через UserContext
    if (data.success) {
      setTimeout(() => {
        refreshBalance(true); // forceRefresh = true
      }, 1000);
    }
  }
}
```

### Backend Processing Chain
1. **Controller** (modules/wallet/controller.ts):
   ```javascript
   async tonDeposit(req, res, next) {
     const result = await walletService.processTonDeposit({
       user_id: user.id,
       ton_tx_hash,
       amount: parseFloat(amount),
       wallet_address
     });
   }
   ```

2. **Service** (modules/wallet/service.ts):
   ```javascript
   async processTonDeposit(params) {
     // Обновление баланса через BalanceManager
     const balanceResult = await BalanceManager.addBalance(user_id, amount, 'TON');
     
     // Создание транзакции через UnifiedTransactionService
     const transactionResult = await UnifiedTransactionService.createTransaction({
       user_id,
       amount,
       type: 'DEPOSIT',
       currency: 'TON',
       status: 'completed',
       description: ton_tx_hash,
       metadata: {
         source: 'ton_deposit',
         wallet_address,
         tx_hash: ton_tx_hash
       }
     });
   }
   ```

3. **BalanceManager** (core/BalanceManager.ts):
   ```javascript
   async updateUserBalance(data) {
     // Обновление в Supabase
     const { data: updatedUser, error: updateError } = await supabase
       .from('users')
       .update({
         balance_uni: parseFloat(newUniBalance.toFixed(6)),
         balance_ton: parseFloat(newTonBalance.toFixed(6))
       })
       .eq('id', user_id);
     
     // WebSocket уведомление
     if (this.onBalanceUpdate) {
       this.onBalanceUpdate(changeData);
     }
   }
   ```

4. **WebSocket Integration** (server/websocket-balance-integration.ts):
   ```javascript
   balanceManager.onBalanceUpdate = async (changeData) => {
     notificationService.notifyBalanceUpdate({
       userId: changeData.userId,
       balanceUni: changeData.newBalanceUni,
       balanceTon: changeData.newBalanceTon,
       changeAmount: changeAmount,
       currency: primaryCurrency,
       source: changeData.source,
       timestamp: new Date().toISOString()
     });
   };
   ```

### Frontend Balance Fetching (client/src/contexts/userContext.tsx)
```javascript
const refreshBalance = useCallback(async (forceRefresh: boolean = false) => {
  const balance = await fetchBalance(currentUserId, forceRefresh);
  dispatch({ type: 'SET_BALANCE', payload: balance });
}, [state.userId]);
```

### Balance Service (client/src/services/balanceService.ts)
```javascript
export async function fetchBalance(userId: number, forceRefresh: boolean = false): Promise<Balance> {
  // Кэш с TTL 10 секунд
  if (!forceRefresh && balanceCache.data && (now - balanceCache.timestamp) < 10000) {
    return balanceCache.data;
  }
  
  // Принудительная очистка кэша при forceRefresh
  if (forceRefresh) {
    balanceCache = {};
  }
  
  const response = await correctApiRequest(`/api/v2/wallet/balance?user_id=${targetUserId}`, 'GET');
}
```

## Выявленные потенциальные проблемы

### 1. Race Condition в refreshBalance
**Проблема**: В TonDepositCard.tsx используется `setTimeout(() => refreshBalance(true), 1000)` для обновления баланса. Однако есть защита от повторных вызовов в UserContext:

```javascript
if (refreshInProgressRef.current) {
  return; // Блокирует новые запросы
}
```

**Возможное решение**: Убрать setTimeout или использовать более надежный механизм ожидания завершения предыдущего обновления.

### 2. Кэширование в balanceService
**Проблема**: TTL кэша составляет 10 секунд, но forceRefresh должен полностью очищать кэш:

```javascript
if (forceRefresh) {
  balanceCache = {}; // Очистка всего объекта
}
```

**Статус**: Логика выглядит корректной.

### 3. WebSocket уведомления
**Проблема**: WebSocket уведомления должны автоматически обновлять баланс в UI, но возможны проблемы с:
- Подключением WebSocket
- Обработкой сообщений в frontend
- Интеграцией с UserContext

### 4. Проверка userId в balanceService
**Проблема**: В balanceService есть сложная логика получения userId из JWT, которая может не совпадать с переданным userId:

```javascript
const payload = JSON.parse(atob(jwtToken.split('.')[1]));
targetUserId = payload.userId || payload.user_id;
```

## Рекомендации для диагностики

### 1. Проверить реальные логи
- Логи BalanceManager при обновлении баланса
- Логи WebSocket уведомлений
- Логи balanceService при принудительном обновлении

### 2. Проверить состояние WebSocket
- Статус подключения в браузере
- Получение сообщений balance_update
- Обработка этих сообщений в UserContext

### 3. Проверить синхронизацию userId
- Соответствие userId в TonDepositCard, backend и balanceService
- Правильность извлечения userId из JWT токена

### 4. Временная диагностика
Добавить временные логи в ключевые точки для отслеживания полного flow.

## Следующие шаги
1. Проверить browser console logs на предмет ошибок WebSocket
2. Добавить детальное логирование в refreshBalance
3. Проверить соответствие userId между компонентами
4. При необходимости - оптимизировать механизм обновления баланса

---
**Дата создания**: 20 июля 2025
**Статус**: Анализ завершен, готов к диагностике