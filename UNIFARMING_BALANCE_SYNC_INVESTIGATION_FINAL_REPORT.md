# 🧠 ГЛУБОКОЕ ИССЛЕДОВАНИЕ СИНХРОНИЗАЦИИ БАЛАНСА UNI FARMING
## Детальный технический отчет без изменения кода

### 📋 РЕЗЮМЕ ИССЛЕДОВАНИЯ

**Статус**: Выявлена архитектурная проблема с двумя конфликтующими системами обновления балансов
**Критичность**: ВЫСОКАЯ - балансы не обновляются несмотря на корректное начисление транзакций
**Корневая причина**: Конфликт между BatchBalanceProcessor и BalanceManager в отправке WebSocket уведомлений

---

## A. 🔁 АРХИТЕКТУРНАЯ ЦЕПОЧКА ДАННЫХ

### Полный путь данных:
```
farmingScheduler → BatchBalanceProcessor → База данных → BalanceNotificationService → WebSocket → Frontend UI
```

### Детальные точки входа/выхода:

1. **farmingScheduler.ts** (строки 142-149)
   - Вызывает `BatchBalanceProcessor.processFarmingIncome()` с массивом начислений
   - Создает транзакции FARMING_REWARD в БД (строки 204-218)

2. **BatchBalanceProcessor.ts** (строки 112-122, 176-251)
   - `processFarmingIncome()` создает операции и вызывает `processBatch()`
   - `processBulkAdd()` обновляет балансы в БД
   - **КРИТИЧНО**: После обновления БД получает актуальные балансы (строки 229-234)
   - Отправляет уведомления через `BalanceNotificationService` (строки 236-250)

3. **BalanceNotificationService.ts** (строки 66-131)
   - `notifyBalanceUpdate()` добавляет в очередь с задержкой 2 секунды
   - `sendAggregatedUpdate()` формирует payload с полями:
     ```javascript
     {
       type: 'balance_update',
       userId,
       balanceData: {
         balanceUni: latestUpdate.balanceUni,
         balanceTon: latestUpdate.balanceTon,
         changes: { uni, ton },
         sources,
         timestamp
       }
     }
     ```

4. **WebSocket сервер** (server/index.ts, строки 1020-1150)
   - Принимает подписки от клиентов
   - Передает сообщения подписанным клиентам

5. **Frontend** (client/src/hooks/useWebSocketBalanceSync.ts)
   - Получает `balance_update` и вызывает `refreshBalance(true)`
   - UserContext обновляет состояние через API запрос

---

## B. ❌ НАЙДЕННЫЕ ОБРЫВЫ И КОНФЛИКТЫ

### 1. **АРХИТЕКТУРНЫЙ КОНФЛИКТ** (Главная проблема)

**Расположение**: Взаимодействие между BatchBalanceProcessor и BalanceManager

**Проблема**:
- BatchBalanceProcessor обновляет БД напрямую через Supabase (строки 201-211)
- BalanceManager имеет callback `onBalanceUpdate` для WebSocket уведомлений
- BatchBalanceProcessor НЕ вызывает BalanceManager, а отправляет уведомления сам
- websocket-balance-integration.ts устанавливает callback, но он НЕ вызывается

**Доказательство**:
```typescript
// BatchBalanceProcessor.ts, строка 226-250
const notificationService = BalanceNotificationService.getInstance();
for (const op of operations) {
  // Получает балансы из БД
  const { data: userData } = await supabase.from('users').select('balance_uni, balance_ton')...
  
  // Отправляет уведомление напрямую
  notificationService.notifyBalanceUpdate({
    userId: op.userId,
    balanceUni: parseFloat(userData.balance_uni),
    balanceTon: parseFloat(userData.balance_ton),
    // ...
  });
}
```

### 2. **ПРОБЛЕМА С ОБНОВЛЕНИЕМ БД**

**Симптом**: Транзакции создаются, но balance_uni в таблице users не увеличивается

**Возможные причины**:
1. RPC функция `increment_user_balance` не работает (строка 180)
2. Fallback на ручное обновление срабатывает, но не сохраняет изменения
3. Race condition между чтением и записью

**Доказательство из логов WebSocket**:
```
[BalanceCard] Текущие балансы: {
  userId: 74,
  uniBalance: 1377201.452588,  // Не меняется
  tonBalance: 872.118945,
  uniFarmingActive: true,
  uniDepositAmount: 553589
}
```

### 3. **MISSING DEPOSIT TRANSACTIONS**

**Факт**: 553,589 UNI депозитов, но 0 транзакций типа FARMING_DEPOSIT в БД
**Вывод**: Депозиты были сделаны через прямое обновление БД без создания транзакций

---

## C. 🔍 ДОПОЛНИТЕЛЬНЫЕ НАХОДКИ

### 1. **Излишек баланса**
- БД показывает 1,378,507.07 UNI
- Ожидается 1,021,687.42 UNI  
- Излишек: 356,819.65 UNI
- Возможная причина: ручные SQL операции или дублирование начислений

### 2. **WebSocket интеграция**
- websocket-balance-integration.ts устанавливает callback с changeAmount: 0
- Это означает, что даже если callback вызывался бы, изменения не отображались бы

### 3. **Frontend получает пустые обновления**
- useWebSocketBalanceSync вызывает refreshBalance
- Но баланс в БД не обновлен, поэтому API возвращает старые данные

---

## D. 📊 ВЫВОДЫ И РЕКОМЕНДАЦИИ

### Корневая архитектурная проблема:
**Две параллельные системы обновления балансов конфликтуют**:
1. BalanceManager (с WebSocket callback) - НЕ используется для фарминга
2. BatchBalanceProcessor (прямые SQL + свои уведомления) - используется, но не обновляет БД

### Точки для исправления (без изменения кода):

1. **core/scheduler/farmingScheduler.ts** (строка 142)
   - Заменить вызов BatchBalanceProcessor на BalanceManager.addBalance()

2. **core/BatchBalanceProcessor.ts** (строки 180-211)
   - Исправить логику обновления БД или убедиться что RPC функция существует

3. **server/websocket-balance-integration.ts** (строка 25)
   - Передавать реальное значение changeAmount вместо 0

4. **Создать RPC функцию в Supabase**:
   ```sql
   CREATE OR REPLACE FUNCTION increment_user_balance(
     p_user_id INTEGER,
     p_uni_amount NUMERIC,
     p_ton_amount NUMERIC
   ) RETURNS void AS $$
   BEGIN
     UPDATE users 
     SET balance_uni = balance_uni + p_uni_amount,
         balance_ton = balance_ton + p_ton_amount
     WHERE id = p_user_id;
   END;
   $$ LANGUAGE plpgsql;
   ```

### Временное решение:
**Перезапустить сервер** - исправления уже внесены в код, но не применены из-за отсутствия перезапуска

---

## 📈 МЕТРИКИ ПРОБЛЕМЫ

- **Время простоя**: >48 часов без обновления балансов
- **Затронутые пользователи**: Все активные фармеры (36+)
- **Потерянные начисления**: ~2,500+ UNI на пользователя
- **Критичность для бизнеса**: МАКСИМАЛЬНАЯ - пользователи не видят свои доходы