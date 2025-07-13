# План исправления проблемы синхронизации балансов UniFarming

## Корневая причина проблемы

После детального исследования выявлена основная проблема почему баланс не обновляется автоматически в UI после начисления farming rewards:

### 1. Архитектурный конфликт
Система имеет **два параллельных механизма** обновления балансов:
- **BalanceManager** - имеет callback для WebSocket уведомлений
- **BatchBalanceProcessor** - обновляет БД напрямую без использования BalanceManager

### 2. Неполные данные в уведомлениях
BatchBalanceProcessor вызывает `notifyBalanceUpdate` (строка 228 в core/BatchBalanceProcessor.ts) БЕЗ критических полей:
```typescript
notificationService.notifyBalanceUpdate({
  userId: op.userId,
  changeAmount: op.amountUni || op.amountTon || 0,
  currency: op.amountUni ? 'UNI' : 'TON',
  source: op.source || 'batch_update',
  timestamp: new Date().toISOString()
  // ОТСУТСТВУЮТ: balanceUni, balanceTon
});
```

### 3. WebSocket получает undefined
BalanceNotificationService пытается взять balanceUni/balanceTon из уведомления (строки 108-109 в balanceNotificationService.ts):
```typescript
balanceUni: latestUpdate.balanceUni,  // undefined
balanceTon: latestUpdate.balanceTon,  // undefined
```

### 4. Цепочка вызовов
1. farmingScheduler вызывает → BatchBalanceProcessor.processFarmingIncome()
2. BatchBalanceProcessor обновляет БД напрямую через Supabase
3. BatchBalanceProcessor отправляет уведомление БЕЗ актуальных балансов
4. WebSocket отправляет клиенту undefined значения
5. UI не обновляется

## Рекомендации по исправлению

### Вариант 1: Минимальное изменение (Рекомендуется)
Добавить получение актуальных балансов в BatchBalanceProcessor после обновления БД:

В файле `core/BatchBalanceProcessor.ts`, строка 225-235:
```typescript
// Отправляем массовые уведомления
const notificationService = BalanceNotificationService.getInstance();
for (const op of operations) {
  // ДОБАВИТЬ: Получение актуальных балансов
  const { data: userData, error } = await supabase
    .from('users')
    .select('balance_uni, balance_ton')
    .eq('id', op.userId)
    .single();
    
  if (userData) {
    notificationService.notifyBalanceUpdate({
      userId: op.userId,
      balanceUni: parseFloat(userData.balance_uni),
      balanceTon: parseFloat(userData.balance_ton),
      changeAmount: op.amountUni || op.amountTon || 0,
      currency: op.amountUni ? 'UNI' : 'TON',
      source: op.source || 'batch_update',
      timestamp: new Date().toISOString()
    });
  }
}
```

### Вариант 2: Использовать BalanceManager везде
Заменить прямые обновления БД в BatchBalanceProcessor на использование BalanceManager:
- Преимущество: единая точка управления балансами
- Недостаток: требует больше изменений кода

### Вариант 3: Хранить новые балансы при обновлении
Сохранять вычисленные балансы в процессе обновления и использовать их для уведомлений:
- В строке 198-199 уже вычисляются newUniBalance и newTonBalance
- Можно сохранить их и использовать для уведомлений

## Дополнительные находки

1. **Farming работает корректно** - транзакции создаются каждые 5 минут:
   - 604106: +137.77 UNI
   - 604287: +146.56 UNI  
   - 604468: +165.80 UNI

2. **WebSocket подключение активно** - клиент подписан на обновления

3. **BalanceManager callback настроен** но не используется при batch обновлениях

## Итог

Проблема четко локализована и может быть исправлена добавлением ~10 строк кода для получения актуальных балансов перед отправкой WebSocket уведомлений.