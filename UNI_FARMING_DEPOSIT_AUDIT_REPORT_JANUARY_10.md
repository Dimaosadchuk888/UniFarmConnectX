# 🔍 АУДИТ: Несрабатывающее списание UNI при открытии farming-пакета

**Дата:** 10 января 2025  
**Статус:** ⚠️ ПРОБЛЕМА ОБНАРУЖЕНА

## 📊 Результаты анализа

### 1. Frontend цепочка отображения UNI-баланса

#### ✅ Компоненты отображения работают корректно:
- **BalanceCard.tsx** - показывает текущий баланс: `761000 UNI` для user ID 74
- **UserContext.tsx** - управляет состоянием баланса через `refreshBalance()`
- **balanceService.ts** - запрашивает данные через `/api/v2/wallet/balance`
- **WebSocket** - активен и подписан на обновления пользователя 74

#### ❌ Проблема: Баланс не обновляется после депозита
- В логах видно постоянное значение: `uniBalance: 761000`
- Флаг `uniFarmingActive: false` остается неактивным
- `uniDepositAmount: 0` не увеличивается после депозита

### 2. Backend логика списания UNI

#### ✅ Цепочка вызовов настроена правильно:

1. **UniFarmingCard.tsx** (строка 253):
   ```typescript
   correctApiRequest('/api/v2/uni-farming/deposit', 'POST', requestBody)
   ```

2. **routes.ts** (строка 43):
   ```typescript
   router.post('/deposit', requireTelegramAuth, massOperationsRateLimit, validateBody(farmingDepositSchema), farmingController.depositUni.bind(farmingController));
   ```

3. **FarmingController.depositUni()** (строки 210-266):
   - Валидирует Telegram авторизацию
   - Находит пользователя по telegram_id
   - Вызывает `farmingService.depositUniForFarming()`

4. **FarmingService.depositUniForFarming()** (строки 162-350):
   - ✅ Проверяет баланс пользователя
   - ✅ Вызывает `balanceManager.subtractBalance()` (строка 230-235)
   - ✅ Обновляет поля фарминга в таблице users
   - ✅ Создает транзакцию типа FARMING_DEPOSIT

#### ⚠️ Обнаруженная проблема в BalanceManager:

**BalanceManager.subtractBalance()** (core/BalanceManager.ts):
- Метод корректно вычисляет новый баланс
- Отправляет UPDATE запрос в Supabase
- НО: Нет WebSocket уведомления после успешного обновления!

### 3. Отсутствие WebSocket обновлений

#### ❌ Критическая проблема:
После успешного списания UNI через BalanceManager **НЕ отправляется** WebSocket уведомление об изменении баланса.

**BalanceNotificationService** существует, но:
- Не вызывается из BalanceManager после обновления
- Frontend подписан на обновления, но не получает их

### 4. Точка обрыва

**Цепочка обрывается здесь:**
1. BalanceManager успешно обновляет баланс в БД ✅
2. НО не уведомляет frontend через WebSocket ❌
3. Frontend продолжает показывать старый кэшированный баланс ❌
4. Обновление происходит только при ручном refresh страницы

## 🎯 Выводы

### Где начинается вызов:
- Frontend: `UniFarmingCard.tsx` → POST `/api/v2/uni-farming/deposit`

### Где обрывается:
- Backend: `BalanceManager.updateUserBalance()` - после успешного UPDATE в БД

### Что не происходит:
1. WebSocket уведомление об изменении баланса
2. Автоматическое обновление UI без перезагрузки
3. Сброс кэша баланса в `balanceService.ts`

### Подтверждения:
- API вызывается ✅
- Запрос попадает в контроллер ✅  
- Транзакция создается в БД ✅
- Баланс обновляется в БД ✅
- WebSocket уведомление НЕ отправляется ❌
- Frontend не получает обновление ❌

## 📋 Рекомендации для исправления

1. **Добавить вызов BalanceNotificationService в BalanceManager:**
   ```typescript
   // После успешного обновления баланса
   const notificationService = BalanceNotificationService.getInstance();
   notificationService.notifyBalanceUpdate({
     userId: user_id,
     balanceUni: newBalance.balance_uni,
     balanceTon: newBalance.balance_ton,
     changeAmount: amount_uni,
     currency: 'UNI',
     source: source || 'manual',
     timestamp: new Date().toISOString()
   });
   ```

2. **Альтернатива - принудительный refresh на frontend:**
   - После успешного депозита вызвать `refreshBalance(true)` с forceRefresh
   - Это обновит данные минуя кэш

3. **Проверить интеграцию WebSocket:**
   - Убедиться что BalanceNotificationService правильно регистрирует соединения
   - Проверить что WebSocket сообщения доходят до клиента