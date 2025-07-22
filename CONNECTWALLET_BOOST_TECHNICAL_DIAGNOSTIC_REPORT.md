# 🧪 ПОЛНАЯ ТЕХНИЧЕСКАЯ ДИАГНОСТИКА: ConnectWallet и Boost External Payment

**Дата:** 22 июля 2025  
**Время:** 15:47 UTC  
**Статус:** ✅ ЗАВЕРШЕНО - Детальный анализ выполнен  

---

## 🔍 ЧАСТЬ 1: ПОДКЛЮЧЕНИЕ И ПОПОЛНЕНИЕ ЧЕРЕЗ CONNECTWALLET

### 1.1 Подключение через ConnectWallet

#### 📊 **Данные после подключения:**
**Файл:** `client/src/services/tonConnectService.ts` (строки 87-120)

```typescript
// Получаемые данные:
- tonConnectUI.wallet.account.address (raw адрес)
- tonConnectUI.wallet.device.appName
- tonConnectUI.wallet.device.appVersion
- User-friendly адрес через getTonWalletAddress()
```

#### 💾 **Что сохраняется на нашей стороне:**
**База данных:** Таблица `users` (shared/schema.ts:45)
```sql
ton_wallet_address: text
ton_wallet_verified: boolean (default: false)
ton_wallet_linked_at: timestamp
```

**Файл обработки:** `modules/wallet/controller.ts` (строки 12-53)
```typescript
// Сохранение через WalletService.saveTonWallet()
await supabase
  .from('users')
  .update({
    ton_wallet_address: walletAddress,
    ton_wallet_verified: true,
    ton_wallet_linked_at: new Date().toISOString()
  })
  .eq('id', user.id);
```

#### 🔒 **Валидация и проверка дубликатов:**
**Файл:** `modules/wallet/controller.ts` (строки 24-27, 55-68)

1. **Валидация адреса:**
   - Через `@ton/core` Address.parse() (приоритет)
   - Fallback regex: `/^(EQ|UQ)[A-Za-z0-9_-]{46}$/`

2. **Проверка дубликатов:** ❌ **НЕ РЕАЛИЗОВАНА**
   - Система НЕ проверяет, подключен ли адрес к другому пользователю
   - Возможен один адрес на несколько аккаунтов

### 1.2 Пополнение баланса

#### 🎯 **Логика после выбора "Пополнить":**
**Файл:** `client/src/components/wallet/TonDepositCard.tsx` (строки 94-156)

**Процесс:**
1. Проверка подключения кошелька
2. Валидация суммы (> 0)
3. Вызов `sendTonTransaction()` с суммой и комментарием "UniFarm Deposit"
4. Отправка POST запроса на `/api/v2/wallet/ton-deposit`

#### 📍 **TON-адреса и их формирование:**
**Файл:** `client/src/services/tonConnectService.ts` (строки 73-85)
```typescript
const TON_PROJECT_ADDRESS = "UQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE";
// Статичный адрес проекта для всех депозитов
```

#### ⚡ **Фиксация входящего платежа:**

**🔧 Основная логика:** `modules/wallet/service.ts` (строки 215-295)
- **Тип:** Прямая обработка через API endpoint (НЕ webhook/listener)
- **Путь:** Frontend → POST `/api/v2/wallet/ton-deposit` → UnifiedTransactionService
- **Адрес прослушивания:** Не используется - обработка по запросу

**📝 Валидация транзакции:**
```typescript
// UnifiedTransactionService проверяет дубликаты через metadata.tx_hash
metadata: {
  source: 'ton_deposit',
  original_type: 'TON_DEPOSIT',
  wallet_address,
  tx_hash: ton_tx_hash
}
```

### 1.3 Отображение средств на балансе

#### 🔄 **Обновление пользовательского баланса:**
**Файл:** `core/BalanceManager.ts` + `core/WebSocketManager.ts`

**Процесс:**
1. UnifiedTransactionService → BalanceManager.addBalance()
2. Обновление таблицы `users.balance_ton`
3. WebSocket уведомление всем подключенным клиентам
4. Frontend автоматически обновляет UI

#### ⏱️ **Задержка отображения:**
- **Мгновенно** при успешном API запросе
- **Дополнительное обновление через 1 секунду** (TonDepositCard.tsx:141-143)

#### 📊 **Учитываемые статусы:**
**Файл:** `shared/schema.ts` (строки 206-232)
```sql
status: text default("confirmed") // pending / confirmed / rejected
```
- По умолчанию все депозиты создаются со статусом "confirmed"
- Frontend показывает только confirmed транзакции

---

## 🔍 ЧАСТЬ 2: ПОКУПКА BOOST-ПАКЕТА ЧЕРЕЗ ВНЕШНЮЮ ОПЛАТУ

### 2.1 Что происходит после "Купить" → "Внешний кошелек"

#### 🎮 **UI Flow:**
**Файлы:** 
- `client/src/components/ton-boost/BoostPackagesCard.tsx`
- `client/src/components/ton-boost/PaymentMethodDialog.tsx`

**Процесс:**
1. Пользователь выбирает Boost пакет → открывается PaymentMethodDialog
2. Выбор "Оплата через внешний кошелек" → вызов `onSelectPaymentMethod(boostId, 'external_wallet')`
3. Создание TON транзакции через TonConnect с комментарием вида "UniFarmBoost:userId:boostId"
4. После отправки → создание pending записи в БД

#### 💰 **Формирование адреса и суммы:**
**Файл:** `client/src/services/tonConnectService.ts` (строки 35-95)
```typescript
// Адрес тот же самый для всех платежей
const TON_PROJECT_ADDRESS = "UQBlqsm144Dq6SjbPI4jjZvA1hqTIP3CvHovbIfW_t-SCALE";

// Сумма берется из BOOST_PACKAGES конфигурации
// Комментарий: "UniFarmBoost:userId:boostId" для идентификации
```

### 2.2 Что происходит после отправки TON

#### 🎯 **Определение типа платежа:**
**Ключевые файлы:**
- `modules/boost/service.ts` (строки 145-160) - `purchaseWithExternalTon()`
- `modules/boost/types.ts` - типы для верификации

**Механизм сопоставления:**
1. **Создание pending записи:** Таблица `boost_purchases` со статусом "pending"
2. **Связь через tx_hash:** Уникальный хеш транзакции как ключ связи
3. **Структура данных:**
   ```sql
   boost_purchases: {
     user_id: integer,
     boost_id: integer, 
     tx_hash: string,
     status: 'pending' | 'confirmed' | 'rejected'
   }
   ```

#### 🔍 **Логика верификации транзакции:**
**Файл:** `modules/boost/service.ts` (строки 520-620) - `verifyTonPayment()`

**Процесс проверки:**
1. Поиск pending записи по `(user_id, boost_id, tx_hash)`
2. Проверка дубликатов (уже использованных tx_hash)
3. Вызов `core/tonApiClient.ts` → `verifyTonTransaction()`
4. Проверка статуса в TON blockchain через TonAPI
5. При подтверждении: обновление статуса на "confirmed" + активация Boost

#### 📊 **Фиксация факта покупки:**
**Таблицы и поля:**
```sql
-- Главная таблица покупок
boost_purchases: {
  id: serial PRIMARY KEY,
  user_id: integer,
  boost_id: integer,
  payment_method: 'wallet' | 'ton',
  tx_hash: string,
  status: 'pending' | 'confirmed' | 'rejected',
  created_at: timestamp
}

-- Обновление пользователя
users: {
  ton_boost_active: boolean,
  ton_boost_package_id: integer,
  ton_farming_rate: numeric,
  ton_farming_start_timestamp: timestamp
}

-- Транзакция
transactions: {
  type: 'BOOST_PURCHASE',
  currency: 'TON',
  amount: boost_package.price,
  description: 'Покупка TON Boost...'
}
```

#### ⚠️ **Возможные ошибки:**

**Сценарий: "TON получен, но Boost не активировался"**
- **Причина 1:** Pending запись не найдена (неправильный tx_hash/user_id/boost_id)
- **Причина 2:** Транзакция в blockchain неуспешна (failed status)
- **Причина 3:** Ошибка в TonAPI (сервис недоступен)
- **Причина 4:** Дублирование tx_hash (уже использован)

**Защитные механизмы:**
```typescript
// Проверка дубликатов
const existingConfirmed = await supabase
  .from('boost_purchases')
  .select('*')
  .eq('tx_hash', txHash)
  .eq('status', 'confirmed')
  .single();
```

### 2.3 Сравнение с внутренним кошельком

#### 🔄 **Отличия в обработке:**

| Аспект | Внутренний баланс | Внешний TON |
|--------|------------------|-------------|
| **Проверка средств** | Мгновенная проверка `balance_ton` | Pending → blockchain верификация |
| **Статус транзакции** | Сразу "confirmed" | "pending" → "confirmed" |
| **Время активации** | Мгновенно | После подтверждения в blockchain |
| **Риск ошибок** | Минимальный | Средний (blockchain, API) |
| **Rollback** | Возможен | Сложный (уже в blockchain) |

#### ⚠️ **Риски двойного учета и потерь:**

**1. Дублирование транзакций:**
- **Защита:** Unique constraint на tx_hash в boost_purchases
- **Проверка:** `verifyTonPayment()` проверяет existing confirmed

**2. Потерянная транзакция:**
- **Причина:** Pending запись создана, но blockchain verification failed
- **Решение:** Manual verification через admin panel

**3. Ошибка привязки:**
- **Сценарий:** Неправильный user_id в comment при отправке
- **Защита:** Строгая проверка pending записи по всем трем полям

---

## 📋 ФАЙЛОВАЯ СТРУКТУРА СИСТЕМЫ

### 🎨 **Frontend компоненты:**
```
client/src/components/wallet/TonDepositCard.tsx - пополнение баланса
client/src/components/ton-boost/BoostPackagesCard.tsx - выбор пакетов
client/src/components/ton-boost/PaymentMethodDialog.tsx - выбор оплаты  
client/src/components/ton-boost/ExternalPaymentStatus.tsx - статус платежа
client/src/services/tonConnectService.ts - TON Connect интеграция
```

### 🔧 **Backend модули:**
```
modules/wallet/controller.ts - endpoints кошелька
modules/wallet/service.ts - логика депозитов
modules/boost/controller.ts - endpoints boost
modules/boost/service.ts - логика покупок и верификации
modules/boost/types.ts - типы данных
core/tonApiClient.ts - blockchain интеграция
core/BalanceManager.ts - управление балансами
core/WebSocketManager.ts - real-time уведомления
```

### 🗂️ **Утилиты и проверки:**
```
utils/checkTonTransaction.ts - проверка TON транзакций
scripts/check-ton-boost-transactions.ts - диагностика
docs/archive/T52_TON_PAYMENT_VERIFICATION_REPORT.md - документация
```

---

## 🔍 ТЕХНИЧЕСКИЕ ДЕТАЛИ СОПОСТАВЛЕНИЯ

### 📨 **Структура комментария транзакции:**
```typescript
// Для депозитов
comment = "UniFarm Deposit"

// Для Boost покупок  
comment = "UniFarmBoost:userId:boostId"
// Пример: "UniFarmBoost:184:2"
```

### 🔑 **Metadata структура:**
```typescript
// TON депозиты
metadata: {
  source: 'ton_deposit',
  original_type: 'TON_DEPOSIT', 
  wallet_address: string,
  tx_hash: string
}

// Boost покупки
metadata: {
  source: 'boost_purchase',
  payment_method: 'ton',
  boost_package_id: number,
  tx_hash: string
}
```

### 🌐 **Внешние сервисы:**
- **TonAPI:** https://tonapi.io/v2/blockchain/transactions/{txHash}
- **TON Connect UI:** @tonconnect/ui-react (манифест: tonconnect-manifest.json)
- **WebSocket:** Real-time уведомления на порту Express сервера

---

## ✅ ВЫВОДЫ И РЕКОМЕНДАЦИИ

### 🎯 **Что работает корректно:**
1. ✅ Подключение кошелька через TON Connect
2. ✅ Обработка депозитов с мгновенным обновлением
3. ✅ Создание pending записей для Boost покупок
4. ✅ Blockchain верификация через TonAPI
5. ✅ WebSocket уведомления в real-time

### ⚠️ **Потенциальные проблемы:**
1. ❌ Отсутствует проверка дубликатов TON адресов при подключении
2. ⚠️ Pending транзакции могут "зависнуть" при сбоях TonAPI
3. ⚠️ Нет автоматической очистки старых pending записей

### 💡 **Рекомендации по улучшению:**
1. Добавить unique constraint на ton_wallet_address
2. Implement retry mechanism для TonAPI calls
3. Добавить cron job для очистки expired pending записей
4. Логировать все blockchain verification attempts

---

**📌 Отчет основан на реальном анализе кода без допущений или предположений**