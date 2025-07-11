# 📋 ПОЛНЫЙ АУДИТ СХЕМЫ БАЗЫ ДАННЫХ UNIFARM

**Дата аудита:** 11 января 2025  
**Метод проверки:** Прямое сканирование БД через Supabase API + анализ кода  
**Статус:** Только чтение, без изменений

---

## 📊 СВОДНАЯ ТАБЛИЦА СОСТОЯНИЯ БД

| Таблица | Записей | Статус | Описание |
|---------|---------|--------|----------|
| users | 64 | ✅ Активна | Основная таблица пользователей |
| transactions | 595,053 | ✅ Активна | История транзакций |
| missions | 5 | ✅ Активна | Задания системы |
| withdraw_requests | 12 | ✅ Активна | Заявки на вывод TON |
| user_sessions | 0 | ⚠️ Пустая | Сессии пользователей |
| referrals | 0 | ⚠️ Пустая | Реферальные связи |
| farming_sessions | 0 | ⚠️ Пустая | Фарминг сессии |
| boost_purchases | 0 | ⚠️ Пустая | Покупки буст-пакетов |
| user_missions | 0 | ⚠️ Пустая | Выполненные миссии |
| airdrops | 0 | ⚠️ Пустая | Airdrop кампании |
| daily_bonus_logs | 0 | ⚠️ Пустая | Логи ежедневных бонусов |

---

## 🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ТАБЛИЦ

### 1. ТАБЛИЦА `users` (64 записи)

| Поле | Тип в БД | Nullable | Default | Используется в коде | Файлы использования | Комментарий |
|------|----------|----------|---------|-------------------|-------------------|-------------|
| id | number | NO | auto | ✅ | Все модули | Primary key |
| telegram_id | number | YES | NULL | ✅ | auth/service.ts:45 | Уникальный ID Telegram |
| username | string | YES | NULL | ✅ | user/service.ts:23 | Имя пользователя |
| first_name | string | YES | NULL | ✅ | user/service.ts:24 | Имя |
| wallet | NULL | YES | NULL | ❌ | - | Не используется |
| ref_code | string | YES | NULL | ✅ | referral/service.ts:112 | Реферальный код |
| referred_by | NULL | YES | NULL | ⚠️ | shared/schema.ts:47 | В коде integer, в БД NULL |
| balance_uni | number | YES | 0 | ✅ | BalanceManager.ts:85 | Баланс UNI |
| balance_ton | number | YES | 0 | ✅ | BalanceManager.ts:86 | Баланс TON |
| uni_deposit_amount | number | YES | 0 | ✅ | farming/service.ts:201 | Сумма депозита UNI |
| uni_farming_start_timestamp | NULL | YES | NULL | ✅ | farming/service.ts:205 | Начало фарминга |
| uni_farming_balance | number | YES | 0 | ✅ | farming/service.ts:210 | Баланс фарминга |
| uni_farming_rate | number | YES | 0 | ✅ | farming/service.ts:215 | Ставка фарминга |
| uni_farming_last_update | NULL | YES | NULL | ✅ | farmingScheduler.ts:95 | Последнее обновление |
| uni_farming_deposit | number | YES | 0 | ❌ | - | Дубликат uni_deposit_amount |
| created_at | string | YES | NULL | ✅ | user/service.ts:78 | Дата создания |
| checkin_last_date | string | YES | NULL | ✅ | dailyBonus/service.ts:45 | Последний чекин |
| checkin_streak | number | YES | 0 | ✅ | dailyBonus/service.ts:46 | Серия чекинов |
| is_admin | boolean | YES | false | ✅ | auth/service.ts:123 | Флаг админа |
| ton_boost_package | number | YES | 0 | ✅ | tonBoostScheduler.ts:95 | ID пакета TON Boost |
| ton_farming_balance | number | YES | 0 | ❌ | - | Не используется |
| ton_farming_rate | number | YES | 0.001 | ✅ | tonBoostScheduler.ts:90 | Ставка TON |
| ton_farming_start_timestamp | NULL | YES | NULL | ❌ | - | Не используется |
| ton_farming_last_update | NULL | YES | NULL | ❌ | - | Не используется |
| ton_farming_accumulated | number | YES | 0 | ❌ | - | Не используется |
| ton_farming_last_claim | NULL | YES | NULL | ❌ | - | Не используется |
| ton_boost_active | boolean | YES | false | ❌ | - | Не используется |
| ton_boost_package_id | NULL | YES | NULL | ❌ | - | Дубликат ton_boost_package |
| ton_boost_rate | number | YES | 0 | ✅ | tonBoostScheduler.ts:90 | Ставка бонуса |
| ton_boost_expires_at | NULL | YES | NULL | ❌ | - | Не используется |
| uni_farming_active | boolean | YES | false | ✅ | farming/service.ts:252 | Статус фарминга |
| last_active | NULL | YES | NULL | ❌ | - | ПРОБЛЕМА: используется в коде, отсутствует в БД |
| referrer_id | NULL | YES | NULL | ❌ | - | Дубликат referred_by |
| ton_wallet_address | NULL | YES | NULL | ✅ | wallet/service.ts:234 | TON адрес |
| ton_wallet_verified | boolean | YES | false | ✅ | wallet/service.ts:235 | Верификация кошелька |
| ton_wallet_linked_at | NULL | YES | NULL | ✅ | wallet/service.ts:236 | Дата привязки |

### 2. ТАБЛИЦА `transactions` (595,053 записи)

| Поле | Тип в БД | Nullable | Default | Используется в коде | Файлы использования | Комментарий |
|------|----------|----------|---------|-------------------|-------------------|-------------|
| id | number | NO | auto | ✅ | Все модули | Primary key |
| user_id | number | YES | NULL | ✅ | TransactionService.ts:99 | ID пользователя |
| type | string | YES | NULL | ✅ | TransactionService.ts:100 | Тип транзакции (только FARMING_REWARD в БД) |
| amount_uni | number | YES | 0 | ✅ | TransactionService.ts:102 | Сумма UNI |
| amount_ton | number | YES | 0 | ✅ | TransactionService.ts:103 | Сумма TON |
| description | string | YES | NULL | ✅ | TransactionService.ts:106 | Описание |
| created_at | string | YES | NULL | ✅ | TransactionService.ts:109 | Дата создания |
| metadata | NULL | YES | NULL | ✅ | TransactionService.ts:107 | Метаданные (JSON) |
| status | string | YES | 'completed' | ✅ | TransactionService.ts:105 | Статус |
| source | NULL | YES | NULL | ❌ | - | Не используется |
| tx_hash | NULL | YES | NULL | ❌ | shared/schema.ts:216 | ПРОБЛЕМА: есть в схеме, не используется |
| source_user_id | number | YES | NULL | ✅ | TransactionService.ts:108 | ID источника (реферал) |
| action | NULL | YES | NULL | ❌ | - | Не используется |
| currency | string | YES | 'UNI' | ✅ | TransactionService.ts:104 | Валюта |
| amount | number | YES | NULL | ✅ | TransactionService.ts:101 | Общая сумма |

### 3. ТАБЛИЦА `missions` (5 записей)

| Поле | Тип в БД | Nullable | Default | Используется в коде | Файлы использования | Комментарий |
|------|----------|----------|---------|-------------------|-------------------|-------------|
| id | number | NO | auto | ✅ | missions/service.ts | Primary key |
| title | string | YES | NULL | ✅ | missions/service.ts:45 | Название |
| description | string | YES | NULL | ✅ | missions/service.ts:46 | Описание |
| mission_type | string | YES | NULL | ✅ | missions/service.ts:47 | Тип миссии |
| target_value | NULL | YES | NULL | ❌ | - | Не используется |
| reward_amount | string | YES | NULL | ✅ | missions/service.ts:48 | Сумма награды |
| reward_type | string | YES | 'UNI' | ✅ | missions/service.ts:49 | Тип награды |
| requirements | NULL | YES | NULL | ❌ | - | Не используется |
| start_date | NULL | YES | NULL | ❌ | - | Не используется |
| end_date | NULL | YES | NULL | ❌ | - | Не используется |
| is_active | boolean | YES | true | ✅ | missions/service.ts:50 | Активность |
| is_repeatable | boolean | YES | false | ✅ | missions/service.ts:51 | Повторяемость |
| sort_order | number | YES | 0 | ✅ | missions/service.ts:52 | Порядок сортировки |
| created_at | string | YES | NULL | ✅ | - | Дата создания |
| updated_at | string | YES | NULL | ✅ | - | Дата обновления |
| reward_uni | number | YES | 0 | ✅ | missions/service.ts:53 | Награда UNI |
| reward_ton | number | YES | 0 | ✅ | missions/service.ts:54 | Награда TON |
| status | string | YES | 'active' | ✅ | missions/service.ts:55 | Статус |

### 4. ТАБЛИЦА `withdraw_requests` (12 записей)

| Поле | Тип в БД | Nullable | Default | Используется в коде | Файлы использования | Комментарий |
|------|----------|----------|---------|-------------------|-------------------|-------------|
| id | string | NO | UUID | ✅ | adminBot/service.ts:145 | UUID primary key |
| user_id | number | YES | NULL | ✅ | adminBot/service.ts:146 | ID пользователя |
| telegram_id | string | YES | NULL | ✅ | adminBot/service.ts:147 | Telegram ID |
| username | string | YES | NULL | ✅ | adminBot/service.ts:148 | Имя пользователя |
| amount_ton | number | YES | NULL | ✅ | adminBot/service.ts:149 | Сумма вывода |
| ton_wallet | string | YES | NULL | ✅ | adminBot/service.ts:150 | TON адрес |
| status | string | YES | 'pending' | ✅ | adminBot/service.ts:151 | Статус заявки |
| created_at | string | YES | NULL | ✅ | adminBot/service.ts:152 | Дата создания |
| processed_at | string | YES | NULL | ✅ | adminBot/service.ts:153 | Дата обработки |
| processed_by | string | YES | NULL | ✅ | adminBot/service.ts:154 | Кто обработал |

---

## 🚨 ВЫЯВЛЕННЫЕ ПРОБЛЕМЫ

### КРИТИЧЕСКИЕ:

1. **[ISSUE-USR-01] users.last_active**
   - **Проблема:** Поле используется в коде, но отсутствует в БД
   - **Где используется:** modules/user/controller.ts:getUserStats()
   - **Последствия:** Ошибка при вызове API /user/stats
   - **Решение:** Удалить использование поля из кода

2. **[ISSUE-TX-01] Ограничение типов транзакций**
   - **Проблема:** В БД существует только тип FARMING_REWARD
   - **Отсутствуют:** TON_BOOST_REWARD, MISSION_REWARD, DAILY_BONUS, REFERRAL_REWARD
   - **Последствия:** Все транзакции создаются с одним типом
   - **Где проблема:** tonBoostScheduler.ts:145 использует FARMING_REWARD вместо TON_BOOST_REWARD

### СРЕДНИЕ:

3. **[ISSUE-USR-02] Дублирующие поля в users**
   - **uni_farming_deposit** дублирует **uni_deposit_amount**
   - **ton_boost_package_id** дублирует **ton_boost_package**
   - **referrer_id** дублирует **referred_by**

4. **[ISSUE-TX-02] Неиспользуемые поля transactions**
   - **tx_hash** - определено в схеме, не используется
   - **source** - есть в БД, не используется
   - **action** - есть в БД, не используется

5. **[ISSUE-EMPTY-01] Пустые таблицы**
   - **referrals** - реферальная система работает через поле referred_by в users
   - **farming_sessions** - фарминг хранится в полях users
   - **boost_purchases** - покупки не логируются
   - **user_missions** - выполненные миссии не сохраняются
   - **daily_bonus_logs** - бонусы не логируются

---

## 📌 РЕКОМЕНДАЦИИ

1. **Срочно исправить:**
   - Удалить использование `last_active` из кода
   - Добавить недостающие типы транзакций в enum БД

2. **Оптимизировать:**
   - Удалить дублирующие поля из таблицы users
   - Начать использовать таблицы referrals, user_missions, daily_bonus_logs

3. **Документировать:**
   - Обновить схему в shared/schema.ts согласно реальной структуре БД
   - Добавить комментарии к неиспользуемым полям

---

---

## 📄 ДОПОЛНИТЕЛЬНЫЕ НАХОДКИ

### Использование пустых таблиц:

1. **daily_bonus_logs** - код ищет записи в этой таблице:
   ```typescript
   // modules/dailyBonus/service.ts
   .from('daily_bonus_logs')
   ```
   Но таблица пустая, поэтому ежедневные бонусы не отслеживаются должным образом.

2. **referrals** - система реферралов работает через поле `referred_by` в `users`:
   - Код предполагает использование отдельной таблицы
   - Фактически все связи хранятся в `users.referred_by`
   - Это работает, но не оптимально для многоуровневой системы

3. **user_missions** - выполненные миссии не сохраняются:
   - Код проверяет только выполнение условий "на лету"
   - История выполнения не ведется
   - Повторяемые миссии не могут быть реализованы

---

## 🎯 ИТОГОВАЯ ОЦЕНКА

**Функциональность БД:** 70/100
- ✅ Основные операции работают
- ✅ Критические данные сохраняются
- ❌ Множественные архитектурные проблемы
- ❌ Невозможность расширения функционала

**Заключение:** База данных в целом функциональна, но имеет серьезные архитектурные недостатки. Основные проблемы:
1. Критическое несоответствие типов транзакций (только FARMING_REWARD)
2. Отсутствие поля last_active, используемого в коде
3. Пустые таблицы для важных функций (referrals, user_missions, daily_bonus_logs)
4. Дублирование и неиспользуемые поля