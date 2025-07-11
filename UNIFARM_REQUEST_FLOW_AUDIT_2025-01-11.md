# 🔍 АУДИТ СХЕМЫ ЗАПРОСОВ И ВЗАИМОДЕЙСТВИЙ UNIFARM

**Дата:** 11 января 2025  
**Статус:** Полный технический аудит без изменения кода  
**Автор:** AI Agent

---

## 📋 ОГЛАВЛЕНИЕ

1. [Авторизация и JWT](#1-авторизация-и-jwt)
2. [Покупка Boost-пакетов](#2-покупка-boost-пакетов)
3. [Начисление Boost-дохода (cron)](#3-начисление-boost-дохода-cron)
4. [Депозит UNI и фарминг](#4-депозит-uni-и-фарминг)
5. [Daily Bonus](#5-daily-bonus)
6. [Referral система](#6-referral-система)
7. [TON кошелек](#7-ton-кошелек)
8. [WebSocket обновления](#8-websocket-обновления)
9. [Сводная таблица](#9-сводная-таблица)
10. [Архитектурные выводы](#10-архитектурные-выводы)

---

## 1. АВТОРИЗАЦИЯ И JWT

### 📍 Схема взаимодействия:

```
UI: client/src/contexts/UserContext.tsx (handleTelegramAuth)
↓ POST /api/v2/auth/login
Middleware: core/middleware/telegramAuth.ts
↓ validateTelegramInitData() - проверка HMAC подписи
Controller: modules/auth/controller.ts:login()
↓ AuthService.authenticateUser()
Service: modules/auth/service.ts
↓ UserService.getUserByTelegramId() 
↓ UserService.createUser() (если новый)
Repository: modules/user/repository.ts
↓ Supabase.from('users').select()
Таблицы: users
↓ JWT генерация: jsonwebtoken.sign()
Response: { token, user, isNewUser }
```

### 🔒 Защита и валидация:
- ✅ **requireTelegramAuth** middleware на всех защищенных endpoints
- ✅ HMAC-SHA256 проверка подписи Telegram
- ✅ JWT токен с 7-дневным сроком жизни
- ✅ Автоматическое создание пользователя при первой авторизации
- ✅ Генерация уникального ref_code

---

## 2. ПОКУПКА BOOST-ПАКЕТОВ

### 📍 Схема взаимодействия (внутренний кошелек):

```
UI: client/src/components/ton-boost/BoostPackagesCard.tsx
↓ POST /api/v2/boost/purchase
Controller: modules/boost/controller.ts:purchaseBoost()
↓ BoostService.purchaseBoost(userId, boostId, 'wallet')
Service: modules/boost/service.ts
↓ getBoostPackageById() - получение пакета
↓ purchaseWithInternalWallet()
  ↓ WalletService.getWalletDataByUserId()
  ↓ проверка баланса TON
  ↓ WalletService.processWithdrawal() - списание TON
  ↓ BalanceManager.subtractBalance()
  ↓ Supabase.update({ ton_boost_package, ton_boost_rate })
  ↓ awardUniBonus() - начисление UNI бонуса
  ↓ createBoostPurchase() - запись о покупке
  ↓ создание транзакции type: 'FARMING_REWARD'
Таблицы: users, transactions, boost_purchases
```

### 📍 Схема взаимодействия (внешний TON кошелек):

```
UI: PaymentMethodDialog.tsx → sendTonTransaction()
↓ TonConnect UI → блокчейн транзакция
↓ POST /api/v2/boost/verify-ton-payment
Controller: modules/boost/controller.ts:verifyTonPayment()
↓ BoostService.verifyTonPayment(txHash, userId, boostId)
Service: modules/boost/service.ts
  ↓ проверка дубликатов tx_hash
  ↓ checkTonTransaction() - проверка в блокчейне
  ↓ активация Boost при подтверждении
  ↓ обновление boost_purchases status: 'confirmed'
Таблицы: boost_purchases, users
```

### 🔒 Защита и валидация:
- ✅ Проверка достаточности баланса перед списанием
- ✅ Защита от дубликатов tx_hash
- ✅ Немедленная активация планировщика после покупки
- ❌ Referral награды начисляются НЕПРАВИЛЬНО (при покупке, а не от дохода)

---

## 3. НАЧИСЛЕНИЕ BOOST-ДОХОДА (CRON)

### 📍 Схема взаимодействия:

```
CRON: каждые 5 минут
↓ modules/scheduler/tonBoostIncomeScheduler.ts
Scheduler: processScheduledTasks()
↓ Supabase.from('users').select()
  .not('ton_boost_package', 'is', null)
  .gte('balance_ton', 10)
↓ Для каждого пользователя:
  ↓ getBoostPackageById() - получение ставки
  ↓ calculateIncome() - расчет дохода за 5 минут
  ↓ Supabase.update({ balance_ton: +income })
  ↓ создание транзакции type: 'TON_BOOST_INCOME'
  ↓ ReferralService.distributeReferralRewards()
    ↓ buildReferrerChain() - построение цепочки
    ↓ calculateCommissions() - расчет %
    ↓ BalanceManager.addBalance() для каждого уровня
    ↓ создание транзакций type: 'REFERRAL_REWARD'
Таблицы: users, transactions, referral_earnings
```

### 🔄 Автоматизация:
- ✅ Запуск из server/index.ts
- ✅ Независимое выполнение каждые 5 минут
- ✅ Правильное начисление referral от дохода
- ✅ Логирование всех операций

---

## 4. ДЕПОЗИТ UNI И ФАРМИНГ

### 📍 Схема взаимодействия (депозит):

```
UI: client/src/components/farming/UniFarmingCard.tsx
↓ POST /api/v2/farming/deposit
Controller: modules/farming/controller.ts:depositUni()
↓ FarmingService.depositUniForFarming(userId, amount)
Service: modules/farming/service.ts
  ↓ UserRepository.getUserById()
  ↓ проверка баланса UNI
  ↓ ПРЯМОЕ обновление Supabase (минуя BalanceManager!)
    - balance_uni: -amount
    - uni_deposit_amount: +amount
    - uni_farming_active: true
    - uni_farming_start_timestamp
    - uni_farming_rate: 0.01
  ↓ создание транзакции type: 'FARMING_REWARD' (отрицательная)
Таблицы: users, transactions
```

### 📍 Схема начисления дохода (cron):

```
CRON: каждые 5 минут
↓ core/scheduler/farmingScheduler.ts
Scheduler: processUniFarmingIncome()
↓ Supabase.from('users').select()
  .eq('uni_farming_active', true)
↓ Для каждого фармера:
  ↓ calculateUniFarmingIncome() - расчет дохода
  ↓ Supabase.update({ balance_uni: +income })
  ↓ создание сессии в farming_sessions
  ↓ создание транзакции type: 'FARMING_REWARD'
  ↓ ReferralService.distributeReferralRewards()
  ↓ WebSocket уведомление (НЕ РАБОТАЕТ)
Таблицы: users, farming_sessions, transactions
```

### ⚠️ Проблемы:
- ❌ Депозит минует BalanceManager (прямой SQL)
- ❌ Таблица farming_sessions пустая (нет INSERT при депозите)
- ❌ WebSocket уведомления не отправляются

---

## 5. DAILY BONUS

### 📍 Схема взаимодействия:

```
UI: client/src/components/daily-bonus/SimpleDailyBonusCard.tsx
↓ POST /api/v2/daily-bonus/claim
Controller: modules/dailyBonus/controller.ts:claimDailyBonus()
↓ DailyBonusService.claimDailyBonus(userId)
Service: modules/dailyBonus/service.ts
  ↓ Supabase.from('users').select() - проверка пользователя
  ↓ проверка last_claim_date (не чаще 1 раз в день)
  ↓ calculateBonusAmount() - расчет суммы (базовая + стрик)
  ↓ BalanceManager.addBalance() - централизованное начисление
  ↓ обновление checkin_streak и checkin_last_date
  ↓ создание транзакции type: 'DAILY_BONUS'
  ↓ запись в daily_bonus_logs
Таблицы: users, transactions, daily_bonus_logs
```

### 🔒 Защита и валидация:
- ✅ Проверка времени последнего получения
- ✅ Автоматический расчет стрика
- ✅ Централизованное обновление через BalanceManager
- ✅ Полное логирование в daily_bonus_logs

---

## 6. REFERRAL СИСТЕМА

### 📍 Схема взаимодействия (регистрация):

```
UI: передача ref_code при авторизации
↓ AuthService.authenticateUser()
Service: modules/auth/service.ts
  ↓ если есть ref_code:
    ↓ ReferralService.processReferral(refCode, newUserId)
    ↓ поиск пользователя по ref_code
    ↓ проверка на самоприглашение
    ↓ Supabase.update({ referred_by: inviterId })
    ↓ создание записи в таблице referrals
Таблицы: users, referrals
```

### 📍 Схема начисления комиссий:

```
Источник: UNI Farming или TON Boost планировщики
↓ ReferralService.distributeReferralRewards(userId, amount, currency)
Service: modules/referral/service.ts
  ↓ buildReferrerChain() - построение цепочки до 20 уровней
  ↓ calculateReferralCommissions() - расчет % для каждого уровня
    - Уровень 1: 100% от дохода
    - Уровень 2: 2%
    - Уровень 3: 3%
    - ...
    - Уровень 20: 20%
  ↓ Для каждого уровня:
    ↓ BalanceManager.addBalance()
    ↓ создание записи в referral_earnings
    ↓ создание транзакции type: 'REFERRAL_REWARD'
Таблицы: users, referral_earnings, transactions
```

### 🎯 Особенности:
- ✅ 20-уровневая система (максимальная глубина)
- ✅ Автоматическое начисление от фактического дохода
- ✅ Суммарная нагрузка 212% на каждый доход
- ❌ Таблица referrals пустая (нет INSERT в processReferral)

---

## 7. TON КОШЕЛЕК

### 📍 Схема подключения:

```
UI: client/src/components/ton-boost/BoostPackagesCard.tsx
↓ TonConnectButton → TonConnect UI
↓ tonConnectUI.connectWallet()
↓ Получение адреса кошелька
❌ НЕТ API endpoint для сохранения адреса!
```

### ⚠️ Проблемы:
- ❌ Адрес кошелька не сохраняется в БД
- ❌ Поля ton_wallet_address есть в БД, но не используются
- ❌ Нет endpoint /api/v2/wallet/connect-ton

---

## 8. WEBSOCKET ОБНОВЛЕНИЯ

### 📍 Схема уведомлений:

```
Источник: BalanceManager.updateBalance()
↓ BalanceNotificationService.notifyBalanceUpdate()
Service: core/balanceNotificationService.ts
  ↓ добавление в очередь pendingUpdates
  ↓ таймаут 2 секунды для агрегации
  ↓ sendAggregatedUpdate()
    ↓ WebSocketService.emitToUser() (НЕ РЕАЛИЗОВАН)
```

### ⚠️ Проблемы:
- ❌ WebSocketService не создан
- ❌ Socket.IO сервер не настроен
- ❌ Клиент WebSocketProvider пустой

---

## 9. СВОДНАЯ ТАБЛИЦА

| Сценарий | API Endpoint | Слои до БД | Централизовано? | Таблицы | Тип транзакции |
|----------|--------------|------------|-----------------|---------|----------------|
| JWT авторизация | POST /api/v2/auth/login | Controller → Service → Repository | ✅ BalanceManager | users | - |
| Покупка Boost (wallet) | POST /api/v2/boost/purchase | Controller → Service → WalletService | ✅ BalanceManager | users, transactions, boost_purchases | FARMING_REWARD |
| Покупка Boost (TON) | POST /api/v2/boost/verify-ton-payment | Controller → Service | ❌ Прямой Supabase | boost_purchases, users | - |
| UNI депозит | POST /api/v2/farming/deposit | Controller → Service | ❌ Прямой Supabase | users, transactions | FARMING_REWARD (отриц.) |
| UNI farming доход | CRON каждые 5 мин | Scheduler → Service | ❌ Прямой Supabase | users, farming_sessions, transactions | FARMING_REWARD |
| TON Boost доход | CRON каждые 5 мин | Scheduler → Service | ❌ Прямой Supabase | users, transactions | TON_BOOST_INCOME |
| Daily Bonus | POST /api/v2/daily-bonus/claim | Controller → Service | ✅ BalanceManager | users, transactions, daily_bonus_logs | DAILY_BONUS |
| Referral регистрация | В процессе auth/login | AuthService → ReferralService | ❌ Прямой Supabase | users, referrals | - |
| Referral награды | Из планировщиков | ReferralService | ✅ BalanceManager | users, referral_earnings, transactions | REFERRAL_REWARD |
| TON кошелек | - | - | ❌ НЕ РЕАЛИЗОВАНО | - | - |
| WebSocket | - | BalanceNotificationService | ❌ НЕ РАБОТАЕТ | - | - |

---

## 10. АРХИТЕКТУРНЫЕ ВЫВОДЫ

### ✅ ЦЕНТРАЛИЗОВАННЫЕ КОМПОНЕНТЫ:

1. **BalanceManager** - единая точка управления балансами
   - Используется в: Daily Bonus, Referral rewards, Boost покупка (wallet)
   - Автоматическое логирование всех операций
   - Защита от race conditions

2. **requireTelegramAuth** middleware - защита всех endpoints
   - JWT валидация на каждом запросе
   - Автоматическое добавление user в req

3. **Планировщики** - автоматизация начислений
   - UNI Farming и TON Boost работают независимо
   - Правильное начисление referral от дохода

### ❌ ПРОБЛЕМНЫЕ ЗОНЫ:

1. **Прямые SQL запросы** минуя BalanceManager:
   - UNI farming депозит
   - Планировщики начислений
   - TON платежи

2. **Недореализованные компоненты**:
   - WebSocket уведомления (сервис создан, но не работает)
   - TON wallet сохранение адреса
   - Таблица referrals не заполняется

3. **Архитектурные несоответствия**:
   - Типы транзакций: используется FARMING_REWARD для покупок Boost
   - farming_sessions не создаются при депозитах
   - Referral награды при покупке Boost (должны быть от дохода)

### 🎯 РЕКОМЕНДАЦИИ:

1. Перевести ВСЕ операции с балансом через BalanceManager
2. Реализовать WebSocket сервер для real-time обновлений
3. Добавить endpoint для сохранения TON wallet адреса
4. Исправить типы транзакций (добавить BOOST_PURCHASE)
5. Заполнять таблицу referrals при регистрации

---

**Конец аудита**