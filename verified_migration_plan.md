# Верифицированный план миграции дублирующих маршрутов UniFarm
*Дата: 12 июля 2025*  
*Статус: ГОТОВ К РЕАЛИЗАЦИИ*

## Резюме анализа

Проведена полная верификация 6 дублирующих маршрутов от frontend до БД. Все маршруты безопасны для миграции при соблюдении указанных условий.

## 1. GET /api/v2/wallet/balance

### Цепочка вызовов:
```
Frontend (balanceService.ts:66) 
  → correctApiRequest('/api/v2/wallet/balance?user_id=${targetUserId}')
    → server/index.ts:825-857 (текущая реализация)
      → BalanceManager.getUserBalance()
```

### Модульная реализация:
- **modules/wallet/controller.ts:157-205** - метод `getBalance()`
- **modules/wallet/directBalanceHandler.ts** - `getDirectBalance()` с авторизацией
- **modules/wallet/routes.ts:69** - зарегистрирован как `getDirectBalance`

### Различия в реализации:
| Параметр | server/index.ts | Модуль |
|----------|----------------|---------|
| Источник данных | BalanceManager | userRepository |
| Возвращаемые поля | balance_uni, balance_ton | + farming данные |
| Авторизация | requireTelegramAuth | + проверка владельца |

### ✅ Вердикт: БЕЗОПАСНО для миграции
**Условие**: Обновить frontend для ожидания расширенного формата ответа

---

## 2. POST /api/v2/wallet/withdraw

### Цепочка вызовов:
```
Frontend (WithdrawalForm.tsx) 
  → submitWithdrawal() → correctApiRequest('/api/v2/wallet/withdraw')
    → server/index.ts:858-989
      → BalanceManager + UnifiedTransactionService
```

### Модульная реализация:
- **modules/wallet/controller.ts:113-155** - метод `withdraw()`
- **modules/wallet/service.ts** - `processWithdrawal()`
- **modules/wallet/routes.ts:78** - зарегистрирован

### Особенности:
- Полная логика комиссий UNI (0.1 TON за 1000 UNI)
- Автоматическое создание withdraw_requests
- Возврат средств при отклонении

### ✅ Вердикт: БЕЗОПАСНО для миграции
**Условие**: Протестировать комиссионную модель после переключения

---

## 3. GET /api/v2/uni-farming/status

### Цепочка вызовов:
```
Frontend (UniFarmingCard.tsx, IncomeCard.tsx)
  → correctApiRequest('/api/v2/uni-farming/status?user_id=${userId}')
    → server/index.ts:683-736
      → Прямой Supabase запрос
```

### Модульная реализация:
- **modules/farming/directFarmingStatus.ts** - полная реализация
- **modules/farming/routes.ts:35** - зарегистрирован
- **modules/farming/controller.ts:60+** - `getFarmingInfo()`

### ✅ Вердикт: БЕЗОПАСНО для миграции
**Примечание**: Модуль использует тот же подход (прямой Supabase)

---

## 4. POST /api/v2/wallet/transfer

### Цепочка вызовов:
```
Frontend: НЕ ИСПОЛЬЗУЕТСЯ в production коде
  → Только тестовые файлы (test-wallet-endpoints.html)
```

### Модульная реализация:
- **modules/wallet/controller.ts** - метод `transfer()` существует
- **modules/wallet/routes.ts:79** - зарегистрирован

### ⚠️ Вердикт: ТРЕБУЕТ РЕШЕНИЯ
**Варианты**:
1. Удалить оба endpoint'а (не используется)
2. Сохранить модульную версию для будущего использования

---

## 5. GET /api/v2/wallet/transactions

### Цепочка вызовов:
```
Frontend (TonTransactions.tsx)
  → fetchTonTransactions() → correctApiRequest('/api/transactions')
    → ВНИМАНИЕ: Использует другой URL!
```

### Модульная реализация:
- **modules/wallet/controller.ts:96-111** - метод `getTransactions()`
- **modules/wallet/routes.ts:74** - зарегистрирован

### ⚠️ Вердикт: ТРЕБУЕТ ВНИМАНИЯ
**Проблема**: Frontend использует `/api/transactions`, а не `/api/v2/wallet/transactions`

---

## 6. POST /api/v2/wallet/ton-deposit

### Цепочка вызовов:
```
Frontend (TonDepositCard.tsx)
  → fetch('/api/v2/wallet/ton-deposit')
    → server/index.ts:740-824
      → BalanceManager + UnifiedTransactionService
```

### Модульная реализация:
- **modules/wallet/routes.ts:82** - зарегистрирован
- **modules/wallet/controller.ts** - НЕТ соответствующего метода!

### ❌ Вердикт: БЛОКЕР для миграции
**Требуется**: Реализовать метод `tonDeposit()` в WalletController

---

## План действий

### Фаза 1: Подготовка (1-2 часа)
1. [ ] Реализовать метод `tonDeposit()` в `modules/wallet/controller.ts`
2. [ ] Проверить маршрутизацию для `/api/transactions` в frontend
3. [ ] Решить судьбу `/api/v2/wallet/transfer`

### Фаза 2: Миграция (30 минут на маршрут)
Порядок удаления из `server/index.ts`:

1. **wallet/balance** - после проверки frontend совместимости
2. **wallet/withdraw** - после тестирования комиссий
3. **uni-farming/status** - можно сразу
4. **wallet/transactions** - после исправления URL в frontend
5. **wallet/transfer** - если решено сохранить
6. **wallet/ton-deposit** - после реализации в модуле

### Фаза 3: Тестирование (2-3 часа)
- [ ] E2E тесты для каждого мигрированного endpoint
- [ ] Проверка WebSocket интеграции
- [ ] Регрессионное тестирование UI

### Фаза 4: Документация
- [ ] Обновить ROADMAP.md
- [ ] Обновить архитектурную документацию
- [ ] Создать migration log

## Риски и митигация

1. **Риск**: Различия в формате ответов
   - **Митигация**: Временная поддержка обоих форматов

2. **Риск**: Потеря функциональности
   - **Митигация**: Покрытие тестами перед удалением

3. **Риск**: Race conditions при миграции
   - **Митигация**: Поэтапное удаление с мониторингом

## Команды для безопасного удаления

```bash
# Бэкап перед изменениями
cp server/index.ts server/index.ts.backup

# Удаление маршрута (пример для wallet/balance)
# Строки 825-857 в server/index.ts
```

## Мониторинг после миграции

Отслеживать в логах:
- 404 ошибки на удаленных маршрутах
- Изменения в метриках API
- Ошибки авторизации
- WebSocket реконнекты

## Заключение

Миграция технически выполнима, но требует:
1. Реализации недостающего метода для ton-deposit
2. Исправления URL в frontend для transactions
3. Тщательного тестирования каждого шага

Рекомендуемое время: 2 дня с полным регрессионным тестированием.