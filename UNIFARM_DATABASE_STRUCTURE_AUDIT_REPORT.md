# 📋 ПОЛНЫЙ АУДИТ СТРУКТУРЫ БАЗЫ ДАННЫХ UNIFARM
### Сравнительный анализ SQL-схемы и системной архитектуры

**Дата аудита**: 13 января 2025  
**Статус**: Технический анализ без изменений  
**Всего таблиц в БД**: 30

---

## 🔍 СВОДНАЯ ТАБЛИЦА ИСПОЛЬЗОВАНИЯ

| № | Таблица | Используется в системе | Модули/Файлы | Статус |
|---|---------|------------------------|--------------|--------|
| 1 | **users** | ✅ Активно | Все модули | Основная |
| 2 | **transactions** | ✅ Активно | UnifiedTransactionService, все модули | Основная |
| 3 | **uni_farming_data** | ✅ Активно | UniFarmingRepository, farming/service | Основная |
| 4 | **ton_farming_data** | ✅ Активно | TonFarmingRepository, boost/service | Основная |
| 5 | **boost_purchases** | ❌ НЕ используется | - | Пустая |
| 6 | **withdraw_requests** | ✅ Активно | wallet/service, AdminBot | Основная |
| 7 | **missions** | ✅ Активно | missions/service | Основная |
| 8 | **user_missions** | ⚠️ Частично | missions/service (через mission_progress) | Дублирует |
| 9 | **mission_progress** | ✅ Активно | missions/service | Основная |
| 10 | **daily_bonus_logs** | ✅ Активно | dailyBonus/service | Основная |
| 11 | **referrals** | ❌ НЕ используется | - | Пустая |
| 12 | **wallet** | ❌ НЕ используется | - | Устаревшая |
| 13 | **wallet_logs** | ❌ НЕ используется | - | Не внедрена |
| 14 | **farming_sessions** | ❌ НЕ используется | - | Пустая |
| 15 | **airdrops** | ⚠️ Частично | airdrop/service | Малоиспользуемая |
| 16 | **airdrop_claims** | ⚠️ Частично | airdrop/service | Малоиспользуемая |
| 17 | **airdrop_missions** | ❌ НЕ используется | - | Не внедрена |
| 18 | **user_sessions** | ❌ НЕ используется | JWT вместо sessions | Не внедрена |
| 19 | **auth_logs** | ❌ НЕ используется | - | Не внедрена |
| 20 | **boosts** | ❌ НЕ используется | - | Дублирует boost_purchases |
| 21 | **ton_boost_schedules** | ❌ НЕ используется | - | Не внедрена |
| 22 | **farming_deposits** | ❌ НЕ используется | - | Устаревшая |
| 23 | **daily_bonus_history** | ❌ НЕ используется | - | Дублирует daily_bonus_logs |
| 24 | **referral_analytics** | ❌ НЕ используется | - | Не внедрена |
| 25 | **referral_earnings** | ❌ НЕ используется | - | Не внедрена |
| 26 | **mission_templates** | ❌ НЕ используется | - | Не внедрена |
| 27 | **user_mission_claims** | ❌ НЕ используется | - | Не внедрена |
| 28 | **user_mission_completions** | ❌ НЕ используется | - | Не внедрена |
| 29 | **system_metrics** | ❌ НЕ используется | - | Не внедрена |
| 30 | **webhook_logs** | ❌ НЕ используется | - | Не внедрена |

---

## ⚠️ КРИТИЧЕСКИЕ НЕСООТВЕТСТВИЯ

### 1. **ТИПЫ ТРАНЗАКЦИЙ**
**Проблема**: Enum в БД (`type USER-DEFINED`) не соответствует используемым типам в коде

**В коде определены** (modules/transactions/types.ts):
- `FARMING_REWARD` ✅ (используется для UNI farming + TON Boost доходов)
- `FARMING_DEPOSIT` ❓ (возможно отсутствует в enum БД)
- `REFERRAL_REWARD` ❓
- `MISSION_REWARD` ❓
- `DAILY_BONUS` ❓

**Расширенные типы** (не поддерживаются БД):
- `TON_BOOST_INCOME` ❌
- `BOOST_PURCHASE` ❌
- `AIRDROP_REWARD` ❌

**Последствия**: Покупки TON Boost записываются как `FARMING_REWARD` с metadata `original_type`

### 2. **РЕФЕРАЛЬНАЯ СИСТЕМА**
**Проблема**: Таблица `referrals` пустая, система работает через поле `referred_by` в `users`

**Используется**:
- `users.referred_by` - ID пригласившего
- `users.ref_code` - реферальный код
- Начисления через `transactions` с типом `REFERRAL_REWARD`

**Не используются**:
- Таблица `referrals` (для 20-уровневой структуры)
- Таблица `referral_earnings`
- Таблица `referral_analytics`

### 3. **BOOST ПОКУПКИ**
**Проблема**: Таблица `boost_purchases` не используется

**Текущая реализация**:
- Покупки записываются в `transactions` как `FARMING_REWARD`
- Активные пакеты хранятся в `ton_farming_data`
- История покупок только в `transactions`

### 4. **ДУБЛИРУЮЩИЕ СТРУКТУРЫ**

**Миссии**:
- `missions` ✅ - основная таблица
- `user_missions` ⚠️ - частично используется
- `mission_progress` ✅ - основная для прогресса
- `airdrop_missions` ❌ - не используется
- `mission_templates` ❌ - не используется

**Daily Bonus**:
- `daily_bonus_logs` ✅ - используется
- `daily_bonus_history` ❌ - дублирует функционал

**Farming данные в `users`** (устаревшие поля):
- `uni_deposit_amount`, `uni_farming_*` - перенесены в `uni_farming_data`
- `ton_farming_*`, `ton_boost_*` - перенесены в `ton_farming_data`

---

## 📊 АРХИТЕКТУРНЫЕ ОСОБЕННОСТИ

### 1. **Централизованные сервисы**
- **UnifiedTransactionService** - все транзакции через единый сервис
- **BalanceManager** - управление балансами в таблице `users`
- **Supabase SDK** - прямые запросы вместо SQL

### 2. **Паттерны репозиториев**
- **UniFarmingRepository** - работа с `uni_farming_data` (fallback на `users`)
- **TonFarmingRepository** - работа с `ton_farming_data` (fallback на `users`)
- **SupabaseUserRepository** - основной репозиторий пользователей

### 3. **Неиспользуемые возможности БД**
- 18 из 30 таблиц (60%) не используются
- Отсутствует логирование (auth_logs, webhook_logs)
- Нет аналитики (referral_analytics, system_metrics)
- Сессии через JWT, а не user_sessions

---

## 🔧 РЕКОМЕНДАЦИИ

### 1. **Синхронизация типов транзакций**
```sql
-- Добавить отсутствующие типы в enum
ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
ALTER TYPE transaction_type ADD VALUE 'REFERRAL_REWARD';
ALTER TYPE transaction_type ADD VALUE 'MISSION_REWARD';
ALTER TYPE transaction_type ADD VALUE 'DAILY_BONUS';
ALTER TYPE transaction_type ADD VALUE 'BOOST_PURCHASE';
```

### 2. **Очистка структуры БД**
- Удалить 18 неиспользуемых таблиц
- Убрать устаревшие поля из `users`
- Объединить дублирующие таблицы миссий

### 3. **Внедрение логирования**
- Активировать `auth_logs` для безопасности
- Использовать `system_metrics` для мониторинга
- Внедрить `referral_analytics` для статистики

### 4. **Документирование**
- Создать схему используемых таблиц
- Документировать metadata в транзакциях
- Описать fallback механизмы репозиториев

---

## 📈 СТАТИСТИКА ИСПОЛЬЗОВАНИЯ

- **Активно используются**: 10 таблиц (33%)
- **Частично используются**: 3 таблицы (10%)
- **Не используются**: 17 таблиц (57%)
- **Критические таблицы**: users, transactions, farming данные
- **Проблемные области**: типы транзакций, реферальная система, boost покупки

---

## 📁 ДЕТАЛЬНАЯ КАРТА ИСПОЛЬЗОВАНИЯ ТАБЛИЦ

### **USERS** (Центральная таблица)
**Модули**: Все  
**Ключевые поля**:
- `balance_uni`, `balance_ton` - основные балансы
- `referred_by`, `ref_code` - реферальная система
- `telegram_id`, `username` - идентификация
- **Устаревшие поля**: `uni_farming_*`, `ton_farming_*`, `ton_boost_*`

### **TRANSACTIONS** (Журнал операций)
**Модули**: UnifiedTransactionService, все финансовые операции  
**Проблемы**:
- Поле `type USER-DEFINED` - неизвестный состав enum
- Дублирование: `amount`, `amount_uni`, `amount_ton`
- Используется для всех типов операций (депозиты, выводы, награды)

### **UNI_FARMING_DATA** (UNI фарминг)
**Модули**: UniFarmingRepository, modules/farming/  
**Связь**: user_id → users.id  
**Автоматический fallback на таблицу users при отсутствии**

### **TON_FARMING_DATA** (TON Boost)
**Модули**: TonFarmingRepository, modules/boost/, tonBoostIncomeScheduler  
**Особенность**: user_id хранится как TEXT (несоответствие типов)  
**Поля**: boost_active, boost_package_id, farming_rate

### **WITHDRAW_REQUESTS** (Заявки на вывод)
**Модули**: wallet/service, telegram/AdminBotController  
**Статусы**: pending → approved/rejected  
**Обработка через Telegram бота @unifarm_admin_bot**

### **MISSIONS** + **MISSION_PROGRESS**
**Модули**: missions/service, missions/controller  
**Двойная система**:
- `missions` - шаблоны заданий
- `mission_progress` - прогресс пользователей
- `user_missions` - частично дублирует функционал

### **DAILY_BONUS_LOGS**
**Модули**: dailyBonus/service  
**Записывает**: bonus_amount, day_number, streak_bonus  
**Транзакции создаются с типом DAILY_BONUS**

---

## 🔄 МАРШРУТЫ ДАННЫХ В СИСТЕМЕ

### 1. **Покупка TON Boost**
```
UI → boost/controller → boost/service → 
→ BalanceManager (списание TON)
→ ton_farming_data (активация пакета)
→ transactions (type: FARMING_REWARD, metadata: {original_type: 'BOOST_PURCHASE'})
❌ boost_purchases (НЕ используется)
```

### 2. **UNI Farming депозит**
```
UI → farming/directDeposit → 
→ BalanceManager (списание UNI)
→ uni_farming_data (сохранение депозита)
→ transactions (type: FARMING_DEPOSIT)
→ users.uni_farming_active = true
```

### 3. **Реферальные начисления**
```
farmingScheduler → ReferralService →
→ users.referred_by (получение цепочки)
→ BalanceManager (начисление комиссий)
→ transactions (type: REFERRAL_REWARD)
❌ referrals таблица (НЕ используется)
```

### 4. **Вывод средств**
```
UI → wallet/controller → wallet/service →
→ withdraw_requests (создание заявки)
→ Telegram Admin Bot (уведомление)
→ Admin approve/reject
→ BalanceManager (списание при approve)
→ transactions (type: TON_WITHDRAWAL/UNI_WITHDRAWAL)
```

---

## ✅ ЗАКЛЮЧЕНИЕ

Система UniFarm функционирует на **33% структуры БД**, при этом:
1. Основной функционал работает корректно
2. Есть значительные архитектурные расхождения
3. Множество неиспользуемых таблиц создают путаницу
4. Критически важно синхронизировать типы транзакций

**Рекомендуемый приоритет**:
1. Исправить enum типов транзакций ⚡
2. Внедрить использование `boost_purchases` 📦
3. Активировать реферальные таблицы 👥
4. Очистить неиспользуемые структуры 🗑️