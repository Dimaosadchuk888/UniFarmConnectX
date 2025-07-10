# 🔍 РЕТРОСПЕКТИВНЫЙ АУДИТ: Регресс WebSocket уведомлений при списании UNI

**Дата:** 10 января 2025  
**Статус:** ⚠️ ПРИЧИНА РЕГРЕССА УСТАНОВЛЕНА

## 📊 Результаты ретроспективного анализа

### 1. Хронология внедрения систем

#### ✅ 4 июля 2025 - Внедрение BalanceNotificationService
- Создан `core/balanceNotificationService.ts` 
- Интегрирован в планировщики:
  - `core/scheduler/farmingScheduler.ts` - для UNI farming доходов
  - `modules/scheduler/tonBoostIncomeScheduler.ts` - для TON boost доходов
- WebSocket хэндлер в `server/index.ts` регистрирует соединения

#### ✅ 6 июля 2025 - Создание BalanceManager
- Коммит: `4fe0ae404` - "Unify balance and transaction handling"
- Создан `core/BalanceManager.ts` для централизации всех операций с балансами
- Заменил 4 дублирующих реализации обновления баланса

### 2. Где произошел разрыв

#### ❌ Критическая точка регресса:
При создании BalanceManager **НЕ была добавлена интеграция** с BalanceNotificationService!

**Почему работало раньше:**
- Планировщики фарминга напрямую обновляли баланс через SQL
- После обновления вызывали `BalanceNotificationService.notifyBalanceUpdate()`
- WebSocket уведомления доставлялись на frontend

**Почему перестало работать:**
- BalanceManager стал единой точкой обновления балансов
- Все модули (включая FarmingService) теперь используют `BalanceManager.subtractBalance()`
- НО BalanceManager **не вызывает** BalanceNotificationService после обновления!

### 3. Анализ кода

#### В планировщике (работает ✅):
```typescript
// core/scheduler/farmingScheduler.ts строки 120-130
// После обновления баланса напрямую через SQL:
const balanceService = BalanceNotificationService.getInstance();
balanceService.notifyBalanceUpdate({
  userId: farmer.id,
  balanceUni: parseFloat(farmer.balance_uni || '0') + parseFloat(income),
  balanceTon: parseFloat(farmer.balance_ton || '0'),
  changeAmount: parseFloat(income),
  currency: 'UNI',
  source: 'farming',
  timestamp: new Date().toISOString()
});
```

#### В BalanceManager (НЕ работает ❌):
```typescript
// core/BalanceManager.ts строки 130-160
// После успешного обновления:
logger.info('[BalanceManager] Баланс успешно обновлен', {...});
return { success: true, newBalance };
// НЕТ вызова BalanceNotificationService!
```

### 4. Подтверждение причины

#### WebSocket инфраструктура работает:
- ✅ WebSocket соединение активно (видно в логах: "Подписка на обновления пользователя: 74")
- ✅ BalanceNotificationService регистрирует соединения
- ✅ Frontend слушает события `balance_update`

#### Но уведомления не отправляются при депозите:
- ❌ FarmingService → BalanceManager → Supabase ✅ → КОНЕЦ (нет уведомления)
- ✅ FarmingScheduler → Supabase ✅ → BalanceNotificationService ✅ → WebSocket ✅

## 🎯 Выводы

### Точная причина регресса:
**При рефакторинге 6 июля 2025** и создании централизованного BalanceManager была упущена интеграция с BalanceNotificationService, которая работала в планировщиках с 4 июля.

### Почему это не было замечено сразу:
1. Планировщики продолжали работать корректно (они не используют BalanceManager)
2. Баланс обновлялся в БД корректно
3. При перезагрузке страницы данные отображались правильно
4. Проблема проявлялась только в реальном времени при депозитах

### Что сломалось:
- Мгновенное обновление баланса при покупке farming пакетов
- Реал-тайм отображение списаний UNI
- Автоматическое обновление UI без перезагрузки

### Где вызывается уведомление:
- ✅ В планировщиках (farmingScheduler, tonBoostIncomeScheduler)
- ❌ НЕ вызывается в BalanceManager

### Предложение по исправлению:
Добавить вызов BalanceNotificationService в метод `updateUserBalance` класса BalanceManager после успешного обновления баланса в БД (строка ~160).