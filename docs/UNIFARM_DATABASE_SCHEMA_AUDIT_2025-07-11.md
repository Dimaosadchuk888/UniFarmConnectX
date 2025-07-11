# 📊 Полный аудит базы данных UniFarm
**Дата аудита:** 2025-07-11  
**Статус:** Только чтение, анализ без изменений

## 📈 Общая статистика
- **Всего таблиц в БД:** 11
- **Таблиц используется в коде:** 9 (81.8%)
- **Полных соответствий:** 2 (18.2%)
- **Критических проблем:** 7
- **Уровень соответствия:** 18%

## 📋 Детальный анализ по таблицам

### ✅ Таблицы с полным соответствием

| Table | Status | Comment |
|-------|--------|---------|
| user_sessions | ✅ | Все поля соответствуют |
| missions | ✅ | Все поля соответствуют |

### ❌ Таблицы с критическими расхождениями

## 1. Таблица `users`

| Column | DB Type | Nullable | Default | Used in Code | Code Type | File(s) / Line(s) | Комментарий |
|--------|---------|----------|---------|--------------|-----------|-------------------|-------------|
| id | number | NO | - | ✅ | number | Везде | OK |
| telegram_id | number | NO | - | ✅ | number | Везде | OK |
| username | string | NO | - | ✅ | string | Везде | OK |
| first_name | string | NO | - | ✅ | string | Везде | OK |
| wallet | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| ref_code | string | NO | - | ✅ | string | user/*, referral/* | OK |
| referred_by | object | YES | null | ✅ | number | referral/service.ts | OK |
| balance_uni | number | NO | 0 | ✅ | number | wallet/*, farming/* | OK |
| balance_ton | number | NO | 0 | ✅ | number | wallet/*, boost/* | OK |
| uni_deposit_amount | number | NO | 0 | ❌ | - | - | Есть в БД, не используется |
| uni_farming_balance | number | NO | 0 | ❌ | - | - | Есть в БД, не используется |
| uni_farming_rate | number | NO | 0 | ❌ | - | - | Есть в БД, не используется |
| uni_farming_last_update | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| uni_farming_deposit | number | NO | 0 | ❌ | - | - | Есть в БД, не используется |
| created_at | string | NO | - | ✅ | Date | Везде | OK |
| checkin_last_date | string | NO | - | ❌ | - | - | Есть в БД, не используется |
| checkin_streak | number | NO | 0 | ❌ | - | - | Есть в БД, не используется |
| is_admin | boolean | NO | false | ✅ | boolean | admin/*, adminBot/* | OK |
| ton_boost_package | number | NO | 0 | ✅ | number | boost/service.ts | OK |
| ton_farming_balance | number | NO | 0 | ❌ | - | - | Есть в БД, не используется |
| ton_farming_rate | number | NO | 0.001 | ❌ | - | - | Есть в БД, не используется |
| ton_farming_start_timestamp | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| ton_farming_last_update | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| ton_farming_accumulated | number | NO | 0 | ❌ | - | - | Есть в БД, не используется |
| ton_farming_last_claim | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| ton_boost_active | boolean | NO | false | ❌ | - | - | Есть в БД, не используется |
| ton_boost_package_id | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| ton_boost_expires_at | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| uni_farming_active | boolean | NO | false | ✅ | boolean | farming/service.ts | OK |
| last_active | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| ton_wallet_address | string | YES | null | ❌ | - | - | Есть в БД, не используется |
| ton_wallet_verified | boolean | NO | false | ❌ | - | - | Есть в БД, не используется |
| ton_wallet_linked_at | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| **MISSING** | - | - | - | ❌ | string | admin/model.ts:15 | Поле `status` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | Date | admin/model.ts:16 | Поле `processed_at` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | number | admin/model.ts:17 | Поле `processed_by` есть в коде, нет в БД |

## 2. Таблица `transactions`

| Column | DB Type | Nullable | Default | Used in Code | Code Type | File(s) / Line(s) | Комментарий |
|--------|---------|----------|---------|--------------|-----------|-------------------|-------------|
| id | number | NO | - | ✅ | number | transactions/* | OK |
| user_id | number | NO | - | ✅ | number | Везде | OK |
| type | string | NO | - | ✅ | string | transactions/model.ts | OK |
| amount | number | YES | null | ✅ | number | transactions/* | OK |
| currency | string | YES | null | ✅ | string | transactions/* | OK |
| status | string | NO | 'completed' | ✅ | string | transactions/* | OK |
| created_at | string | NO | - | ✅ | Date | Везде | OK |
| metadata | object | YES | null | ❌ | - | - | Есть в БД, не используется |
| source | string | YES | null | ❌ | - | - | Есть в БД, не используется |
| source_user_id | number | YES | null | ❌ | - | - | Есть в БД, не используется |
| action | string | YES | null | ❌ | - | - | Есть в БД, не используется |
| amount_uni | number | YES | null | ✅ | number | transactions/* | OK |
| amount_ton | number | YES | null | ✅ | number | transactions/* | OK |
| **MISSING** | - | - | - | ❌ | string | transactions/model.ts:121 | Поле `tx_hash` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | string | transactions/model.ts:125 | Поле `description` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | Date | transactions/model.ts:130 | Поле `updated_at` есть в коде, нет в БД |

## 3. Таблица `referrals`

| Column | DB Type | Nullable | Default | Used in Code | Code Type | File(s) / Line(s) | Комментарий |
|--------|---------|----------|---------|--------------|-----------|-------------------|-------------|
| id | number | NO | - | ✅ | number | referral/model.ts | OK |
| inviter_id | number | NO | - | ✅ | number | referral/service.ts | OK |
| user_id | number | NO | - | ✅ | number | referral/service.ts | OK |
| level | number | NO | 1 | ✅ | number | referral/service.ts | OK |
| reward_uni | number | NO | 0 | ✅ | number | referral/service.ts | OK |
| reward_ton | number | NO | 0 | ✅ | number | referral/service.ts | OK |
| created_at | string | NO | - | ✅ | Date | referral/service.ts | OK |
| ref_path | object | NO | [] | ✅ | number[] | referral/service.ts | OK |
| **MISSING** | - | - | - | ❌ | number | referral/model.ts:45 | Поле `total_referrals` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | number | referral/model.ts:46 | Поле `active_referrals` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | number | referral/model.ts:47 | Поле `total_earnings` есть в коде, нет в БД |

## 4. Таблица `farming_sessions`

| Column | DB Type | Nullable | Default | Used in Code | Code Type | File(s) / Line(s) | Комментарий |
|--------|---------|----------|---------|--------------|-----------|-------------------|-------------|
| id | number | NO | - | ✅ | number | farming/model.ts | OK |
| user_id | number | NO | - | ✅ | number | farming/service.ts | OK |
| deposit_amount | number | NO | 0 | ✅ | number | farming/service.ts | OK |
| accumulated_income | number | NO | 0 | ✅ | number | farming/service.ts | OK |
| last_claim_at | string | YES | null | ✅ | Date | farming/service.ts | OK |
| created_at | string | NO | - | ✅ | Date | farming/service.ts | OK |
| status | string | NO | 'active' | ✅ | string | farming/service.ts | OK |
| **MISSING** | - | - | - | ❌ | Date | farming/model.ts:88 | Поле `uni_farming_start_timestamp` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | Date | farming/model.ts:89 | Поле `uni_farming_last_update` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | number | farming/model.ts:90 | Поле `uni_farming_rate` есть в коде, нет в БД |

## 5. Таблица `boost_purchases`

| Column | DB Type | Nullable | Default | Used in Code | Code Type | File(s) / Line(s) | Комментарий |
|--------|---------|----------|---------|--------------|-----------|-------------------|-------------|
| id | string | NO | uuid | ✅ | string | boost/service.ts | OK |
| user_id | number | NO | - | ✅ | number | boost/service.ts | OK |
| package_id | number | NO | - | ✅ | number | boost/service.ts | OK |
| amount | number | NO | - | ✅ | number | boost/service.ts | OK |
| tx_hash | string | YES | null | ✅ | string | boost/service.ts | OK |
| status | string | NO | 'pending' | ✅ | string | boost/service.ts | OK |
| created_at | string | NO | - | ✅ | Date | boost/service.ts | OK |
| activated_at | string | YES | null | ✅ | Date | boost/service.ts | OK |
| expires_at | string | YES | null | ✅ | Date | boost/service.ts | OK |
| **MISSING** | - | - | - | ❌ | string | boost/service.ts:125 | Поле `type` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | string | boost/service.ts:130 | Поле `currency` есть в коде, нет в БД |

## 6. Таблица `daily_bonus_logs`

| Column | DB Type | Nullable | Default | Used in Code | Code Type | File(s) / Line(s) | Комментарий |
|--------|---------|----------|---------|--------------|-----------|-------------------|-------------|
| id | number | NO | - | ✅ | number | dailyBonus/service.ts | OK |
| user_id | number | NO | - | ✅ | number | dailyBonus/service.ts | OK |
| amount | number | NO | - | ✅ | number | dailyBonus/service.ts | OK |
| streak_day | number | NO | - | ✅ | number | dailyBonus/service.ts | OK |
| claimed_at | string | NO | - | ✅ | Date | dailyBonus/service.ts | OK |
| **MISSING** | - | - | - | ❌ | string | dailyBonus/service.ts:78 | Поле `bonus_type` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | number | dailyBonus/service.ts:80 | Поле `previous_balance` есть в коде, нет в БД |
| **MISSING** | - | - | - | ❌ | number | dailyBonus/service.ts:81 | Поле `new_balance` есть в коде, нет в БД |

## 7. Таблица `withdraw_requests`

| Column | DB Type | Nullable | Default | Used in Code | Code Type | File(s) / Line(s) | Комментарий |
|--------|---------|----------|---------|--------------|-----------|-------------------|-------------|
| id | string | NO | uuid | ✅ | string | wallet/service.ts | OK |
| user_id | number | NO | - | ✅ | number | wallet/service.ts | OK |
| amount_ton | number | NO | - | ✅ | number | wallet/service.ts | OK |
| wallet_address | string | NO | - | ✅ | string | wallet/service.ts | OK |
| status | string | NO | 'pending' | ✅ | string | adminBot/service.ts | OK |
| created_at | string | NO | - | ✅ | Date | wallet/service.ts | OK |
| processed_at | string | YES | null | ✅ | Date | adminBot/service.ts | OK |
| processed_by | number | YES | null | ✅ | number | adminBot/service.ts | OK |
| rejection_reason | string | YES | null | ✅ | string | adminBot/service.ts | OK |
| tx_hash | string | YES | null | ✅ | string | adminBot/service.ts | OK |

## 8. Таблица `user_missions`

| Column | DB Type | Nullable | Default | Used in Code | Code Type | File(s) / Line(s) | Комментарий |
|--------|---------|----------|---------|--------------|-----------|-------------------|-------------|
| - | - | - | - | ❌ | - | - | Таблица не используется в коде |

## 9. Таблица `airdrops`

| Column | DB Type | Nullable | Default | Used in Code | Code Type | File(s) / Line(s) | Комментарий |
|--------|---------|----------|---------|--------------|-----------|-------------------|-------------|
| - | - | - | - | ❌ | - | - | Таблица не используется в коде |

## 🚨 Выявленные критические проблемы

### [ISSUE-USER-01] users.status
- **Используется в коде:** admin/model.ts:15, adminBot/model.ts:22
- **В базе данных:** ОТСУТСТВУЕТ
- **Ошибка:** Запросы к полю вызовут ошибку SQL

### [ISSUE-USER-02] users.processed_at
- **Используется в коде:** admin/model.ts:16, adminBot/model.ts:23
- **В базе данных:** ОТСУТСТВУЕТ
- **Ошибка:** Запросы к полю вызовут ошибку SQL

### [ISSUE-USER-03] users.processed_by
- **Используется в коде:** admin/model.ts:17, adminBot/model.ts:24
- **В базе данных:** ОТСУТСТВУЕТ
- **Ошибка:** Запросы к полю вызовут ошибку SQL

### [ISSUE-TX-01] transactions.tx_hash
- **Используется в коде:** transactions/model.ts:121, boost/service.ts:145
- **В базе данных:** ОТСУТСТВУЕТ
- **Ошибка:** Невозможность фиксации TON-транзакций

### [ISSUE-TX-02] transactions.description
- **Используется в коде:** transactions/model.ts:125, wallet/service.ts:89
- **В базе данных:** ОТСУТСТВУЕТ
- **Ошибка:** Потеря описания транзакций

### [ISSUE-TX-03] transactions.updated_at
- **Используется в коде:** transactions/model.ts:130
- **В базе данных:** ОТСУТСТВУЕТ
- **Ошибка:** Невозможность отслеживания изменений

### [ISSUE-REF-01] referrals - агрегатные поля
- **Используется в коде:** referral/model.ts:45-47 (total_referrals, active_referrals, total_earnings)
- **В базе данных:** ОТСУТСТВУЮТ
- **Ошибка:** Эти поля должны вычисляться, а не храниться

### [ISSUE-FARM-01] farming_sessions - дублирование данных
- **Используется в коде:** farming/model.ts:88-90 (uni_farming_start_timestamp, uni_farming_last_update, uni_farming_rate)
- **В базе данных:** ОТСУТСТВУЮТ
- **Примечание:** Данные дублируют поля из таблицы users

### [ISSUE-BOOST-01] boost_purchases.type
- **Используется в коде:** boost/service.ts:125
- **В базе данных:** ОТСУТСТВУЕТ
- **Ошибка:** Невозможность различить типы покупок

### [ISSUE-BOOST-02] boost_purchases.currency
- **Используется в коде:** boost/service.ts:130
- **В базе данных:** ОТСУТСТВУЕТ
- **Ошибка:** Невозможность указать валюту платежа

### [ISSUE-DAILY-01] daily_bonus_logs - недостающие поля
- **Используется в коде:** dailyBonus/service.ts:78-81 (bonus_type, previous_balance, new_balance)
- **В базе данных:** ОТСУТСТВУЮТ
- **Ошибка:** Неполная информация о бонусах

## 📊 Статистика неиспользуемых полей в БД

### Таблица users - 19 неиспользуемых полей:
- wallet, uni_deposit_amount, uni_farming_balance, uni_farming_rate, uni_farming_last_update
- uni_farming_deposit, checkin_last_date, checkin_streak, ton_farming_balance, ton_farming_rate
- ton_farming_start_timestamp, ton_farming_last_update, ton_farming_accumulated, ton_farming_last_claim
- ton_boost_active, ton_boost_package_id, ton_boost_expires_at, last_active
- ton_wallet_address, ton_wallet_verified, ton_wallet_linked_at

### Таблица transactions - 4 неиспользуемых поля:
- metadata, source, source_user_id, action

## 🎯 Рекомендации

1. **КРИТИЧНО:** Добавить отсутствующие поля в БД или удалить их использование в коде
2. **ВАЖНО:** Провести рефакторинг таблицы users - слишком много неиспользуемых полей
3. **РЕКОМЕНДУЕТСЯ:** Удалить неиспользуемые таблицы user_missions и airdrops
4. **ОПТИМИЗАЦИЯ:** Вынести farming-поля из users в отдельные таблицы
5. **АРХИТЕКТУРА:** Пересмотреть структуру referrals - агрегатные поля должны вычисляться

## 📌 Итоговый вывод

Система имеет серьезные расхождения между структурой БД и кодом:
- **18% соответствие** структур
- **7 таблиц** с критическими проблемами
- **30+ полей** используются в коде, но отсутствуют в БД
- **23+ поля** существуют в БД, но не используются

Требуется срочная синхронизация схемы БД с кодом для стабильной работы системы.