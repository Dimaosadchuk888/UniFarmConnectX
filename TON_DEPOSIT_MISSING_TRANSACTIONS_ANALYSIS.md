# 🔍 АНАЛИЗ: ПОЧЕМУ НЕКОТОРЫЕ ДЕПОЗИТЫ НЕ СОЗДАЮТ ТРАНЗАКЦИИ

## Дата: 06.08.2025
## Статус: ДЕТАЛЬНЫЙ АНАЛИЗ БЕЗ ИЗМЕНЕНИЙ КОДА

---

## 🎯 ПРОБЛЕМА
В некоторых случаях TON депозиты:
- ✅ TON списывается с кошелька пользователя
- ❌ Транзакция НЕ появляется в базе данных
- ❌ Депозит НЕ отображается в интерфейсе
- ❌ Баланс НЕ увеличивается

## 📊 ПОЛНАЯ ЦЕПОЧКА ОБРАБОТКИ ДЕПОЗИТА

### 1️⃣ **Frontend: Инициация транзакции**
```
client/src/services/tonConnectService.ts -> sendTonTransactionWithBackend()
```
- Пользователь нажимает кнопку депозита
- Транзакция отправляется через TON Connect
- Получаем BOC (Bag of Cells) данные транзакции

### 2️⃣ **Frontend: Отправка на Backend**
```javascript
await apiRequest('/api/v2/wallet/ton-deposit', {
  method: 'POST',
  body: {
    ton_tx_hash: result.txHash,  // BOC данные
    amount: parseFloat(amount),
    wallet_address: walletAddress
  }
})
```

### 3️⃣ **Backend: Обработка запроса**
```
modules/wallet/controller.ts -> tonDeposit()
```
- Валидация JWT токена
- Получение пользователя
- Вызов walletService.processTonDeposit()

### 4️⃣ **Backend: Создание транзакции**
```
modules/wallet/service.ts -> processTonDeposit()
core/TransactionService.ts -> createTransaction()
```
- Проверка дубликатов
- Создание записи в БД
- Обновление баланса

---

## ⚠️ КРИТИЧЕСКИЕ ТОЧКИ ОТКАЗА

### 🔴 **ТОЧКА ОТКАЗА #1: JWT TOKEN EXPIRED**
**Локация:** `client/src/lib/queryClient.ts -> apiRequest()`

**Что происходит:**
1. JWT токен истекает (TTL = 24 часа)
2. apiRequest отправляет запрос с невалидным токеном
3. Backend возвращает 401 "Authentication required"
4. Frontend НЕ перезапрашивает токен автоматически
5. Депозит сохраняется в localStorage как "failed_ton_deposit"

**Симптомы:**
- В консоли: `401 Unauthorized`
- TON списан, но транзакция не создана
- Данные сохранены в localStorage для retry

**Почему проявляется не у всех:**
- Зависит от времени последнего входа
- Активные пользователи имеют свежие токены
- Неактивные пользователи сталкиваются с проблемой

---

### 🔴 **ТОЧКА ОТКАЗА #2: USER ID MISMATCH**
**Локация:** `modules/wallet/controller.ts -> tonDeposit()`

**Что происходит:**
1. JWT содержит `user_id` из базы данных
2. Но код иногда использует `telegram_id` вместо `user_id`
3. Создается новый пользователь с дублированным telegram_id
4. Депозит записывается не тому пользователю

**Симптомы:**
- Транзакция создается, но для другого user_id
- В базе появляются дубликаты пользователей
- Депозит не видно в интерфейсе текущего пользователя

**Исправлено:** 05-06.08.2025, но старые депозиты потеряны

---

### 🔴 **ТОЧКА ОТКАЗА #3: NETWORK TIMEOUT**
**Локация:** `client/src/services/tonConnectService.ts -> sendTonTransactionWithBackend()`

**Что происходит:**
1. Транзакция успешно отправлена в блокчейн
2. Запрос к backend зависает (timeout)
3. Frontend получает network error
4. Транзакция НЕ регистрируется в БД

**Симптомы:**
- В консоли: `Failed to fetch` или `Network error`
- TON списан, транзакция в блокчейне есть
- В базе данных записи нет

**Механизм восстановления:**
```javascript
// Сохраняется в localStorage
localStorage.setItem('failed_ton_deposit', JSON.stringify({
  txHash: result.txHash,
  amount: parseFloat(amount),
  walletAddress,
  timestamp: Date.now(),
  error: 'Network error'
}));
```

---

### 🔴 **ТОЧКА ОТКАЗА #4: BOC HASH EXTRACTION FAILURE**
**Локация:** `modules/wallet/service.ts -> processTonDeposit()`

**Что происходит:**
1. Frontend отправляет BOC данные (начинаются с "te6...")
2. Backend пытается извлечь hash из BOC
3. Функция extractHashFromBoc() падает с ошибкой
4. Используется BOC как hash (неправильно!)
5. Проверка дубликатов не работает корректно

**Симптомы:**
- Множественные дубликаты одной транзакции
- Или наоборот - валидные депозиты отклоняются как дубликаты
- В логах: `[WalletService] Ошибка извлечения hash из BOC`

---

### 🔴 **ТОЧКА ОТКАЗА #5: DATABASE CONSTRAINT VIOLATION**
**Локация:** `core/TransactionService.ts -> createTransaction()`

**Что происходит:**
1. Все проверки пройдены
2. Попытка INSERT в таблицу transactions
3. Нарушение unique constraint (например, по tx_hash)
4. Транзакция откатывается
5. Ошибка не обрабатывается корректно

**Симптомы:**
- В логах: `duplicate key value violates unique constraint`
- TON списан, но транзакция не создана
- Пользователь видит общую ошибку

---

## 🔍 ПОЧЕМУ ПРОБЛЕМА ПРОЯВЛЯЕТСЯ НЕ У ВСЕХ

### ✅ **Работает у пользователей которые:**
1. Недавно вошли в систему (свежий JWT токен)
2. Имеют стабильное интернет-соединение
3. Делают первый депозит (нет риска дубликатов)
4. Используют правильный user_id в системе

### ❌ **НЕ работает у пользователей которые:**
1. Долго не заходили (истекший JWT токен)
2. Имеют нестабильное соединение (network timeouts)
3. Пытаются повторить неудачный депозит
4. Имеют несоответствие user_id/telegram_id
5. Столкнулись с race condition при множественных депозитах

---

## 📝 ЛОГИ ДЛЯ ДИАГНОСТИКИ

### Frontend Console:
```javascript
[TON_TRANSACTION_WITH_BACKEND] Starting transaction
[TON_TRANSACTION_WITH_BACKEND] Transaction sent, BOC received
[TON_TRANSACTION_WITH_BACKEND] Sending to backend
// Здесь происходит сбой
[TON_TRANSACTION_WITH_BACKEND] Backend call failed
// Или
401 Unauthorized - Authentication required
```

### Backend Logs:
```
[TON_DEPOSIT_RECEIVED] - входящий запрос
[TelegramAuth] JWT token validation failed - если проблема с токеном
[TON_DEPOSIT] Missing required fields - если не хватает данных
[WalletService] Ошибка извлечения hash из BOC - проблема с BOC
[UnifiedTransactionService] Дубликат транзакции обнаружен - если дубликат
```

---

## 🛠️ МЕХАНИЗМЫ ВОССТАНОВЛЕНИЯ

### 1. **LocalStorage Recovery**
Frontend сохраняет неудачные депозиты:
- `pending_ton_deposit` - ожидающие обработки
- `failed_ton_deposit` - неудачные попытки

### 2. **Manual Retry**
При загрузке компонента проверяется localStorage и делается повторная попытка.

### 3. **JWT Token Recovery**
Система пытается обновить токен каждые 30 секунд через `useJwtTokenWatcher`.

---

## ⚠️ ГЛАВНЫЕ ВЫВОДЫ

### 🎯 **Корневые причины потери транзакций:**

1. **JWT Token Expiration** - самая частая причина
   - Токен истекает через 24 часа
   - Нет автоматического refresh при 401 ошибке
   - apiRequest не retry с новым токеном

2. **Network Failures** 
   - Timeout между frontend и backend
   - Транзакция в блокчейне есть, в БД нет

3. **User ID Architecture Issues**
   - Путаница между user_id и telegram_id
   - Создание дубликатов пользователей

4. **BOC Processing Errors**
   - Неправильное извлечение hash из BOC
   - Некорректная проверка дубликатов

5. **Database Constraints**
   - Unique constraint violations
   - Неправильная обработка ошибок БД

---

## 🚨 КРИТИЧЕСКОЕ ЗАМЕЧАНИЕ

**Проблема НЕ в том, что транзакция создается без обновления баланса** (это уже исправлено).

**Проблема в том, что транзакция вообще НЕ СОЗДАЕТСЯ** из-за сбоев на разных этапах цепочки обработки.

Основная причина - **отсутствие надежной обработки ошибок и retry механизмов** на критических этапах.

---

## 📋 РЕКОМЕНДАЦИИ (БЕЗ ИЗМЕНЕНИЯ КОДА)

1. **Реализовать автоматический refresh JWT токена при 401 ошибке**
2. **Добавить retry механизм в apiRequest с exponential backoff**
3. **Улучшить обработку network errors с автоматическим retry**
4. **Создать background job для обработки pending депозитов**
5. **Добавить webhook от блокчейна для подтверждения транзакций**
6. **Реализовать idempotency keys для предотвращения дубликатов**
7. **Улучшить логирование на каждом этапе обработки**

---

**Автор:** Replit Agent
**Дата:** 06.08.2025
**Статус:** Анализ завершен, код не изменялся