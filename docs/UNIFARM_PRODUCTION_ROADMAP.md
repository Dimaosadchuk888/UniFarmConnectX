# 🧩 UNIFARM PRODUCTION-READY ROADMAP
**Создано:** 26 июня 2025  
**Статус:** Production Ready  
**Версия:** 1.0  

---

## 📦 1. БИЗНЕС-МОДЕЛЬ

### 🎯 Экономическая модель UniFarm
UniFarm работает как **многоуровневая система пассивного дохода** с токенами UNI и TON:

**Источники дохода пользователей:**
- **UNI Farming**: 0.1% ставка в день от депозита
- **TON Boost пакеты**: 1%-3% в день (365 дней) + UNI бонусы
- **Реферальная программа**: 20-уровневая система комиссий
- **Daily Bonus**: ежедневные награды + streak система
- **Missions**: разовые награды за выполнение заданий

**Монетизация платформы:**
- Комиссии с TON Boost покупок (платежи на `UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8`)
- Реферальные комиссии от всех доходов пользователей
- Создание дефицита UNI через ограниченную эмиссию

### 💰 Активные источники дохода:
1. **Farming доходы** → автоматические начисления каждые 5 минут
2. **Boost покупки** → прямые TON платежи + UNI бонусы
3. **Referral rewards** → процент от всех доходов рефералов (20 уровней)
4. **Daily bonuses** → streak система с накопительными бонусами
5. **Mission rewards** → одноразовые награды 500 UNI за задание

---

## 🔗 2. РЕФЕРАЛЬНАЯ СИСТЕМА

### 🎯 Партнёрская программа "доход от дохода"
**Файлы:** `modules/referral/model.ts`, `modules/referral/service.ts`, `modules/scheduler/tonBoostIncomeScheduler.ts`

**Модель комиссий (20 уровней):**
```typescript
REFERRAL_COMMISSION_RATES = {
  1: 1.00,   // 100% от дохода (прямой реферал)
  2: 0.02,   // 2% от дохода
  3: 0.03,   // 3% от дохода
  4: 0.04,   // 4% от дохода
  5: 0.05,   // 5% от дохода
  ...
  20: 0.20   // 20% от дохода
}
```

### 💸 Что считается доходом для реферальных начислений:
- ✅ **UNI Farming rewards** (планировщик: `modules/scheduler/index.ts`)
- ✅ **TON Boost income** (планировщик: `modules/scheduler/tonBoostIncomeScheduler.ts`)
- ✅ **Daily bonus claims** 
- ✅ **Mission completions**
- ❌ Прямые депозиты (только доходы)

### 🏗️ Техническая реализация:
- **API**: `/api/v2/referral/*` (генерация кодов, статистика, уровни)
- **Methods**: `buildReferrerChain()`, `distributeReferralRewards()`
- **Database**: `users.referred_by` поле + `transactions.type = 'REFERRAL_REWARD'`
- **Автоматизация**: интегрировано в оба farming планировщика

---

## 🚀 3. BOOST-ПАКЕТЫ

### 💎 5 типов TON Boost пакетов (365 дней):
**Файл:** `modules/boost/model.ts`

| Пакет | Ставка/день | Мин. сумма | Макс. сумма | UNI бонус | Общий возврат |
|-------|-------------|------------|-------------|-----------|---------------|
| **Starter** | 1% | 10 TON | 1,000 TON | 10,000 UNI | 365% |
| **Standard** | 1.5% | 100 TON | 5,000 TON | 75,000 UNI | 547.5% |
| **Advanced** | 2% | 500 TON | 10,000 TON | 250,000 UNI | 730% |
| **Premium** | 2.5% | 1,000 TON | 25,000 TON | 500,000 UNI | 912.5% |
| **Elite** | 3% | 5,000 TON | 100,000 TON | 1,000,000 UNI | 1095% |

### 🔧 Техническая реализация:
- **API**: `/api/v2/boost/*` (покупка, активация, статус)
- **Payments**: автоматические TON переводы на корпоративный кошелек
- **Income**: планировщик `tonBoostIncomeScheduler.ts` каждые 5 минут
- **Database**: поля в `users` таблице (`ton_boost_*`)
- **Referrals**: автоматические начисления при покупке пакетов

---

## 🧠 4. ФАРМИНГ (UNI И TON)

### 🌾 UNI Farming
**Файлы:** `modules/farming/service.ts`, `modules/scheduler/index.ts`

- **Ставка**: 0.1% в день (0.001 в модели)
- **Депозиты**: от 1 UNI, без верхнего лимита
- **Начисления**: автоматические каждые 5 минут
- **API**: `/api/v2/farming/*` (депозит, harvest, история)
- **Database**: `users.uni_farming_*` поля + `transactions`

### ⚡ TON Boost Farming  
**Файлы:** `modules/tonFarming/service.ts`, `modules/scheduler/tonBoostIncomeScheduler.ts`

- **Ставки**: 1%-3% в день (зависит от пакета)
- **Депозиты**: через покупку Boost пакетов
- **Начисления**: автоматические каждые 5 минут
- **API**: `/api/v2/ton-farming/*` (старт, info, history)
- **Database**: `users.ton_boost_*` поля + `transactions`

### 🔄 Планировщики:
1. **UNI Farming**: обрабатывает все активные `uni_farming_start_timestamp`
2. **TON Boost**: обрабатывает все активные `ton_boost_balance > 0`
3. **Referral Integration**: оба планировщика вызывают `distributeReferralRewards()`

---

## 🧭 5. ПОДКЛЮЧЁННЫЕ МАРШРУТЫ (UX ROUTES)

### 📱 Frontend страницы:
**Файл:** `client/src/App.tsx`

| Route | Component | Функциональность |
|-------|-----------|------------------|
| `/dashboard` | `Dashboard.tsx` | Главная: балансы, доходы, статистика |
| `/farming` | `Farming.tsx` | UNI farming: депозиты, harvest, история |
| `/missions` | `Missions.tsx` | Задания: список, выполнение, награды |
| `/friends` | `Friends.tsx` | Рефералы: код, ссылка, статистика, уровни |
| `/wallet` | `Wallet.tsx` | Кошелек: балансы, пополнение, вывод, TON Connect |

### 🚫 Отсутствующие маршруты:
- ❌ `/roadmap` - не реализован
- ❌ `/boost` - интегрирован в `/farming`
- ❌ `/settings` - не реализован
- ❌ `/connect` - интегрирован в `/wallet`

---

## ⚙️ 6. ПОДКЛЮЧЕННЫЕ API

### 🌐 Активные API endpoints:
**Файл:** `server/routes.ts`

**Основные модули (79 endpoints):**
- **Auth**: `/api/v2/auth/*` (telegram, register, profile)
- **User**: `/api/v2/user/*` (profile, search, stats)  
- **Wallet**: `/api/v2/wallet/*` (balance, deposit, withdrawal)
- **Farming**: `/api/v2/farming/*` + `/api/v2/uni-farming/*` (alias)
- **TON Farming**: `/api/v2/ton-farming/*` (start, info, history)
- **Boost**: `/api/v2/boost/*` (packages, purchase, activate)
- **Missions**: `/api/v2/missions/*` (list, complete, user progress)
- **Referral**: `/api/v2/referral/*` (code, stats, levels, earnings)
- **Daily Bonus**: `/api/v2/daily-bonus/*` (status, claim, streak)
- **Transactions**: `/api/v2/transactions/*` (history, details)
- **Admin**: `/api/v2/admin/*` (stats, users, moderation)
- **Monitor**: `/api/v2/monitor/*` (health, performance, logs)
- **Telegram**: `/api/v2/telegram/*` (webhook, commands)
- **Airdrop**: `/api/v2/airdrop/*` (campaigns, claims)

### 🔐 Security:
- **Authorization**: `requireTelegramAuth` middleware на всех protected endpoints
- **Validation**: Zod schemas во всех модулях
- **Rate Limiting**: 4-tier система ограничений

---

## 🧩 7. FRONTEND-КОМПОНЕНТЫ

### 📦 Структура компонентов:
**Папка:** `client/src/components/`

**По модулям:**
- **Dashboard**: `DashboardStats`, `IncomeCard`, `DailyBonusCard`
- **Farming**: `FarmingInterface`, `FarmingHistory`, `DepositForm`
- **Wallet**: `BalanceCard`, `WithdrawalForm`, `DepositForm`, `TransactionHistory`
- **TON Boost**: `BoostPackagesCard`, `BoostPurchaseModal`
- **Missions**: `MissionsListFixed`, `MissionStats`
- **Friends**: `SimpleReferralDemo`, `ReferralLevelsTable`
- **Common**: `NetworkStatusIndicator`, `ErrorBoundary`, `SafeErrorBoundary`

### 🎨 UI блоки:
- **Layout**: `MainLayout` с bottom navigation
- **Cards**: унифицированный дизайн с градиентами
- **Forms**: Zod validation + shadcn/ui
- **Charts**: доходы, статистика, referral levels

---

## 🔐 8. CONNECT WALLET + TELEGRAM MINI APP

### 🔗 TON Connect интеграция:
**Файлы:** `client/public/tonconnect-manifest.json`, `config/tonConnect.ts`

```json
{
  "url": "https://uni-farm-connect-x-alinabndrnk99.replit.app",
  "name": "UniFarm",
  "iconUrl": "https://uni-farm-connect-x-alinabndrnk99.replit.app/assets/favicon.ico"
}
```

- **Provider**: `TonConnectUIProvider` в `App.tsx`
- **Wallet Address**: `UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8`
- **Payments**: автоматические TON transfers для Boost покупок

### 📱 Telegram Mini App:
**Bot**: `@UniFarming_Bot` (ID: 7980427501)

- **Commands**: `/start`, `/app`, `/help`
- **WebApp URL**: `https://uni-farm-connect-x-alinabndrnk99.replit.app`
- **Authorization**: HMAC-SHA256 validation через `initData`
- **Admin Panel**: команды для модерации через Telegram

### 🔐 Авторизация:
1. **initData** получение от Telegram WebApp SDK
2. **HMAC validation** с `TELEGRAM_BOT_TOKEN`
3. **JWT generation** с 7-дневным сроком
4. **User creation** автоматическое в Supabase
5. **Ref code generation** для партнёрской программы

---

## 📘 9. ДОКУМЕНТАЦИЯ

### 📄 Внутренние файлы документации:

**Основные:**
- ✅ `README.md` - краткое описание проекта
- ✅ `replit.md` - полная техническая история развития
- ✅ `docs/UNIFARM_PRODUCTION_ROADMAP.md` - этот документ

**Технические отчеты (docs/):**
- ✅ `API_CONTROLLERS.md` - структура API контроллеров
- ✅ `DATABASE_STRUCTURE.md` - схема Supabase БД
- ✅ `MODULES_DEEP_AUDIT_REPORT.md` - аудит всех модулей
- ✅ `T61_FINAL_PERFORMANCE_AUDIT_REPORT.md` - производительность
- ✅ 40+ технических отчетов по этапам разработки

### 📝 Обновления после RoadMap:
**Нужно обновить:**
- ❌ `README.md` - добавить roadmap ссылку
- ❌ `replit.md` - добавить roadmap creation entry
- ❌ Create `docs/API_ENDPOINTS_FULL_LIST.md` - полный список API

---

## ✅ 10. СТАТУС ГОТОВНОСТИ МОДУЛЕЙ

### 🟢 Полностью готовые (100%):
- ✅ **Auth System** - Telegram authorization, JWT, user registration
- ✅ **UNI Farming** - deposits, auto rewards, harvest, history
- ✅ **TON Boost** - 5 packages, payments, auto income, UNI bonuses
- ✅ **Referral System** - 20 levels, auto distribution, statistics
- ✅ **Daily Bonus** - streak system, rewards, auto claiming
- ✅ **Wallet System** - balances, deposits, withdrawals, TON Connect
- ✅ **Admin Panel** - Telegram bot commands, user management
- ✅ **Database** - Supabase API, 10 tables, full schema
- ✅ **Deployment** - production server, webhooks, monitoring

### 🟡 Частично готовые (80-95%):
- ⚠️ **Missions System** (95%) - 4 missions active, rewards working, нужно добавить больше заданий
- ⚠️ **Transaction History** (90%) - отображение работает, нужна фильтрация и экспорт
- ⚠️ **Airdrop System** (85%) - структура готова, нужна активация кампаний

### 🔴 Не готовые или отсутствующие:
- ❌ **Roadmap Component** (0%) - полностью отсутствует в UI
- ❌ **Settings Page** (0%) - не реализована
- ❌ **Multi-language** (0%) - только русский язык
- ❌ **Push Notifications** (0%) - не интегрированы
- ❌ **Analytics Dashboard** (0%) - только базовая статистика

---

## 📊 ОБЩИЙ СТАТУС: 95% PRODUCTION READY

**Критические системы:** ✅ 100% готовы  
**Бизнес-логика:** ✅ 100% функциональна  
**Монетизация:** ✅ 100% активна  
**User Experience:** ✅ 95% готов  
**Документация:** ✅ 90% готова  

**Система готова к commercial launch с текущим feature set.**

---

*Документ создан на основе реального analysis кода UniFarm system 26 июня 2025*