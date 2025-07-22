# 🚀 ФИНАЛЬНЫЙ ПЛАН ВНЕДРЕНИЯ УВЕДОМЛЕНИЙ UNIFARM
*Дата: 22 июля 2025*  
*Статус: Production-ready implementation plan*

## 📋 ФИНАЛЬНАЯ ТАБЛИЦА УВЕДОМЛЕНИЙ

### ✅ ОБЯЗАТЕЛЬНЫЕ К ВНЕДРЕНИЮ (12 критических)

| Файл | Строка | Действие | Тип | Текст уведомления | Сценарий |
|------|--------|----------|-----|-------------------|-----------|
| `client/src/contexts/webSocketContext.tsx` | + | **ДОБАВИТЬ** | error | "Соединение с сервером потеряно" | WebSocket disconnect |
| `client/src/contexts/webSocketContext.tsx` | + | **ДОБАВИТЬ** | success | "Соединение восстановлено" | WebSocket reconnect |
| `client/src/lib/correctApiRequest.ts` | 120 | **ДОБАВИТЬ** | info | "Обновляем токен авторизации..." | JWT refresh process |
| `client/src/contexts/userContext.tsx` | + | **ДОБАВИТЬ** | error | "Сессия истекла, перезагружаем..." | JWT token expired |
| `client/src/components/shared/TransactionHistory.tsx` | + | **ДОБАВИТЬ** | error | "Не удалось загрузить историю транзакций" | API loading error |
| `client/src/components/farming/UniFarmingCard.tsx` | + | **ДОБАВИТЬ** | success | "Доход от фарминга начислен" | Automatic income |
| `client/src/services/tonConnectService.ts` | + | **ДОБАВИТЬ** | info | "Ожидаем подтверждение в блокчейне..." | TON transaction pending |
| `client/src/services/tonConnectService.ts` | + | **ДОБАВИТЬ** | success | "Транзакция подтверждена в блокчейне" | TON transaction confirmed |
| `client/src/components/ton-boost/TonBoostPackagesCard.tsx` | + | **ДОБАВИТЬ** | error | "Ошибка при загрузке пакетов" | Boost packages load error |
| `client/src/components/wallet/BalanceCard.tsx` | + | **ДОБАВИТЬ** | error | "Ошибка при обновлении баланса" | Balance refresh error |
| `server/modules/*/controller.ts` | + | **ДОБАВИТЬ** | - | API standardized errors | Backend error responses |
| `client/src/lib/correctApiRequest.ts` | 160+ | **ДОБАВИТЬ** | error | "Сервер временно недоступен" | 502, 503, 504 errors |

### 🔧 ТРЕБУЮЩИЕ ИСПРАВЛЕНИЯ (8 существующих)

| Файл | Строка | Действие | Старый текст | Новый текст | Обоснование |
|------|--------|----------|--------------|-------------|-------------|
| `TonDepositCard.tsx` | 99 | **ИСПРАВИТЬ** | "Введите корректную сумму" | "Введите сумму больше 0" | Более конкретно |
| `WithdrawalForm.tsx` | 118 | **ИСПРАВИТЬ** | "Недостаточно средств. Доступно: X" | "Недостаточно средств" | Убрать техническую информацию |
| `PaymentMethodDialog.tsx` | 105 | **ИСПРАВИТЬ** | "Транзакция отменена" | "Платеж отменен" | Более понятно |
| `UnifiedBalanceDisplay.tsx` | 61 | **ИСПРАВИТЬ** | "Баланс обновлен в реальном времени" | "Баланс обновлен" | Избыточная информация |
| `correctApiRequest.ts` | 154 | **ИСПРАВИТЬ** | "Слишком много запросов" | "Попробуйте через несколько секунд" | User-friendly |
| `correctApiRequest.ts` | 176 | **ИСПРАВИТЬ** | "Ошибка сервера" | "Временные проблемы с сервером" | Более мягко |
| `correctApiRequest.ts` | 188 | **ИСПРАВИТЬ** | "Проблемы с сетью" | "Проверьте подключение к интернету" | Конкретное действие |
| `TonDepositCard.tsx` | 88 | **ИСПРАВИТЬ** | "Ошибка при подключении кошелька" | "Не удалось подключить кошелек" | Проще |

### ✅ ПРАВИЛЬНЫЕ УВЕДОМЛЕНИЯ (сохранить как есть)

| Файл | Строка | Тип | Текст | Статус |
|------|--------|-----|-------|-------|
| `TonDepositCard.tsx` | 80 | success | "Кошелек успешно подключен" | ✅ Отлично |
| `TonDepositCard.tsx` | 143 | success | "Депозит успешно отправлен" | ✅ Отлично |
| `WithdrawalForm.tsx` | 152 | success | "Заявка на вывод создана" | ✅ Отлично |
| `UnifiedBalanceDisplay.tsx` | 76 | success | "Баланс успешно обновлен" | ✅ Отлично |
| `PaymentMethodDialog.tsx` | 101 | success | "Транзакция отправлена" | ✅ Отлично |

---

## 🛠️ ПРАКТИЧЕСКИЕ ИЗМЕНЕНИЯ КОДА

### 1. WebSocket Status Notifications
```typescript
// client/src/contexts/webSocketContext.tsx
import { useToast } from '@/hooks/use-toast';

const WebSocketProvider = ({ children }) => {
  const { toast } = useToast();
  
  useEffect(() => {
    socket.on('disconnect', () => {
      toast({
        title: "Соединение с сервером потеряно",
        variant: "destructive"
      });
    });
    
    socket.on('connect', () => {
      toast({
        title: "Соединение восстановлено",
      });
    });
  }, []);
};
```

### 2. JWT Token Refresh Notification
```typescript
// client/src/lib/correctApiRequest.ts (строка 120)
if (refreshResult.success) {
  console.log('[correctApiRequest] ✅ Токен успешно обновлен, повторяем запрос...');
  
  // ДОБАВИТЬ:
  toast({
    title: "Обновляем токен авторизации...",
    variant: "default",
    duration: 2000
  });
  
  return correctApiRequest(url, method, body, headers, retryCount + 1);
}
```

### 3. Transaction History Error Handling
```typescript
// client/src/components/shared/TransactionHistory.tsx
const { data: transactions, isLoading, error } = useQuery({
  queryKey: ['/api/v2/transactions', userId],
  queryFn: async () => {
    try {
      return await correctApiRequest(`/api/v2/transactions?user_id=${userId}`);
    } catch (err) {
      // ДОБАВИТЬ:
      toast({
        title: "Не удалось загрузить историю транзакций",
        variant: "destructive"
      });
      throw err;
    }
  }
});
```

### 4. Balance Refresh Error Handling
```typescript
// client/src/components/wallet/BalanceCard.tsx (или UnifiedBalanceDisplay.tsx)
const handleRefresh = useCallback(async () => {
  try {
    await refreshBalance();
    // existing success notification
  } catch (error) {
    // ДОБАВИТЬ:
    toast({
      title: "Ошибка при обновлении баланса",
      description: "Попробуйте еще раз через несколько секунд",
      variant: "destructive"
    });
  } finally {
    setIsRefreshing(false);
  }
}, [refreshBalance]);
```

### 5. TON Transaction Status Tracking
```typescript
// client/src/services/tonConnectService.ts
export const sendTonTransaction = async (tonConnectUI, amount, comment) => {
  try {
    // ДОБАВИТЬ перед отправкой:
    toast({
      title: "Ожидаем подтверждение в блокчейне...",
      duration: 5000
    });
    
    const result = await tonConnectUI.sendTransaction(transaction);
    
    if (result?.boc) {
      // ДОБАВИТЬ после успешной отправки:
      toast({
        title: "Транзакция подтверждена в блокчейне"
      });
    }
    
    return result;
  } catch (error) {
    // existing error handling
  }
};
```

### 6. Server Error Standardization
```typescript
// client/src/lib/correctApiRequest.ts
// ЗАМЕНИТЬ строки 154-158:
if (response.status === 429) {
  const now = Date.now();
  if (now - lastRateLimitToastTime > RATE_LIMIT_TOAST_COOLDOWN) {
    lastRateLimitToastTime = now;
    toast({
      title: "Попробуйте через несколько секунд", // БЫЛО: "Слишком много запросов"
      variant: "destructive"
    });
  }
}

// ЗАМЕНИТЬ строки 176-180:
if (response.status >= 500) {
  toast({
    title: "Временные проблемы с сервером", // БЫЛО: "Ошибка сервера"
    variant: "destructive"
  });
}

// ЗАМЕНИТЬ строки 188-192:
if (error.name === 'TypeError' && error.message.includes('fetch')) {
  toast({
    title: "Проверьте подключение к интернету", // БЫЛО: "Проблемы с сетью"
    variant: "destructive"
  });
}
```

---

## 🎯 ПРИОРИТЕТЫ ВНЕДРЕНИЯ

### **Phase 1 (Критично - 1 день):**
1. WebSocket connection status
2. JWT token refresh feedback
3. Server error message improvements
4. Balance refresh error handling

### **Phase 2 (Важно - 2 дня):**
5. Transaction history error states
6. TON transaction status tracking
7. Form validation message improvements

### **Phase 3 (Полировка - 1 день):**
8. Boost packages loading errors
9. Farming income notifications
10. Minor text improvements

---

## 📊 ИТОГО К ВНЕДРЕНИЮ

- **Новых уведомлений:** 12
- **Исправлений текстов:** 8
- **Файлов к изменению:** 8
- **Оценка времени:** 3-4 дня
- **Риск для production:** Минимальный (только UI уведомления)

**Все изменения касаются только toast уведомлений, без правок в основном интерфейсе или переводах.**