# 🛠️ ПЛАН АРХИТЕКТУРНЫХ ИСПРАВЛЕНИЙ СИСТЕМЫ TON ДЕПОЗИТОВ
## Дата: 06.08.2025

## 📋 КОНКРЕТНЫЕ ДЕЙСТВИЯ ДЛЯ РЕШЕНИЯ ПРОБЛЕМ

### 1. ИСПРАВЛЕНИЕ ПРОБЛЕМЫ С USER_ID

#### Проблема:
- TonDepositCard отправляет `user_id` который может быть undefined
- Backend не может найти пользователя без корректного ID

#### Решение:
```typescript
// В TonDepositCard.tsx добавить проверку:
if (!userId) {
  showError('Необходима авторизация');
  return;
}
```

### 2. ИСПРАВЛЕНИЕ JWT ТОКЕНА

#### Проблема:
- Токен может отсутствовать или быть невалидным
- Нет автоматического обновления токена

#### Решение:
```typescript
// Использовать apiRequest вместо fetch
import { apiRequest } from '@/lib/queryClient';

// Заменить fetch на:
const data = await apiRequest('/api/v2/wallet/ton-deposit', {
  method: 'POST',
  body: {
    ton_tx_hash: result.txHash,
    amount: depositAmount,
    wallet_address: walletAddress
  }
});
```

### 3. ДОБАВЛЕНИЕ ДЕТАЛЬНОГО ЛОГИРОВАНИЯ

#### Проблема:
- Silent failures без понимания где именно ломается

#### Решение в TonDepositCard.tsx:
```typescript
console.log('[TON_DEPOSIT] Этап 1: Начало депозита', {
  userId,
  amount: depositAmount,
  walletAddress
});

const result = await sendTonTransaction(...);
console.log('[TON_DEPOSIT] Этап 2: Транзакция отправлена', {
  success: result?.status === 'success',
  hasHash: !!result?.txHash
});

// После отправки на backend:
console.log('[TON_DEPOSIT] Этап 3: Отправка на backend', {
  endpoint: '/api/v2/wallet/ton-deposit',
  payload: { ton_tx_hash: result.txHash, amount, wallet_address }
});
```

### 4. УЛУЧШЕНИЕ ОБРАБОТКИ ОШИБОК

#### Добавить в TonDepositCard:
```typescript
.catch(error => {
  console.error('[TON_DEPOSIT] CRITICAL ERROR:', {
    stage: 'backend_call',
    error: error.message,
    userId,
    amount: depositAmount
  });
  
  // Сохранить failed deposit для retry
  localStorage.setItem('failed_ton_deposit', JSON.stringify({
    txHash: result.txHash,
    amount: depositAmount,
    timestamp: Date.now()
  }));
});
```

### 5. АВТОМАТИЧЕСКОЕ ВОССТАНОВЛЕНИЕ

#### Добавить механизм retry для failed deposits:
```typescript
// При загрузке компонента проверять failed deposits
useEffect(() => {
  const failedDeposit = localStorage.getItem('failed_ton_deposit');
  if (failedDeposit) {
    const data = JSON.parse(failedDeposit);
    // Повторить отправку на backend
    retryFailedDeposit(data);
  }
}, []);
```

### 6. ВАЛИДАЦИЯ WALLET ADDRESS

#### Проблема:
- walletAddress может быть пустым при отправке

#### Решение:
```typescript
// Получать адрес непосредственно перед отправкой
const currentWalletAddress = await getTonWalletAddress(tonConnectUI);
if (!currentWalletAddress) {
  showError('Не удалось получить адрес кошелька');
  return;
}
```

### 7. СИНХРОНИЗАЦИЯ С BACKEND

#### Добавить в tonConnectService.ts после успешной транзакции:
```typescript
// Автоматически вызывать backend после sendTransaction
export async function sendTonTransactionWithBackend(
  tonConnectUI: TonConnectUI,
  amount: string,
  comment: string
) {
  const result = await sendTonTransaction(tonConnectUI, amount, comment);
  
  if (result?.status === 'success' && result?.txHash) {
    // Автоматически отправить на backend
    const walletAddress = await getTonWalletAddress(tonConnectUI);
    
    return await apiRequest('/api/v2/wallet/ton-deposit', {
      method: 'POST',
      body: {
        ton_tx_hash: result.txHash,
        amount: parseFloat(amount),
        wallet_address: walletAddress
      }
    });
  }
  
  return result;
}
```

### 8. УЛУЧШЕНИЕ BACKEND КОНТРОЛЛЕРА

#### В wallet/controller.ts tonDeposit:
```typescript
// Добавить более детальное логирование
logger.info('[TON_DEPOSIT_RECEIVED]', {
  has_telegram: !!telegram,
  has_user_id: !!telegram?.user?.id,
  telegram_id: telegram?.user?.telegram_id,
  body: req.body
});

// Если user_id не передан, использовать из JWT
const finalUserId = req.body.user_id || telegram.user.id;
```

## 📊 ПРИОРИТЕТ ИСПРАВЛЕНИЙ

1. **КРИТИЧНО:** Исправить передачу user_id (проверка на undefined)
2. **КРИТИЧНО:** Использовать apiRequest вместо fetch для JWT
3. **ВАЖНО:** Добавить детальное логирование на всех этапах
4. **ВАЖНО:** Валидация wallet_address перед отправкой
5. **ПОЛЕЗНО:** Механизм retry для failed deposits
6. **ПОЛЕЗНО:** Автоматическая отправка на backend в sendTonTransaction

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После внедрения этих исправлений:
- ✅ Депозиты будут надежно записываться в БД
- ✅ Будет видно где именно происходят ошибки
- ✅ Failed deposits можно будет восстановить
- ✅ JWT токены будут автоматически обновляться
- ✅ User ID всегда будет корректным

## 💡 ДОПОЛНИТЕЛЬНЫЕ УЛУЧШЕНИЯ

### Мониторинг депозитов:
```typescript
// Создать сервис мониторинга
class DepositMonitor {
  static logDeposit(stage: string, data: any) {
    const log = {
      timestamp: Date.now(),
      stage,
      ...data
    };
    
    // Отправить в analytics
    console.log('[DEPOSIT_MONITOR]', log);
    
    // Сохранить в localStorage для debugging
    const logs = JSON.parse(localStorage.getItem('deposit_logs') || '[]');
    logs.push(log);
    localStorage.setItem('deposit_logs', JSON.stringify(logs.slice(-50)));
  }
}
```

### Уведомления об ошибках:
```typescript
// При критических ошибках отправлять уведомление админу
if (error.critical) {
  notifyAdmin({
    type: 'DEPOSIT_FAILURE',
    userId,
    amount,
    error: error.message
  });
}
```

## ЗАКЛЮЧЕНИЕ

Эти исправления решат основные архитектурные проблемы:
1. Гарантируют корректную передачу данных
2. Обеспечат видимость всех этапов процесса
3. Добавят отказоустойчивость через retry механизмы
4. Улучшат обработку ошибок и восстановление

Главное - заменить `fetch` на `apiRequest` и добавить проверку `userId` перед отправкой.