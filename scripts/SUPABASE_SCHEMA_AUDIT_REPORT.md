# SUPABASE SCHEMA AUDIT REPORT

**Дата аудита**: 2025-07-09T07:40:06.444Z
**Всего таблиц**: 11
**Всего полей**: 56

## 📊 СТРУКТУРА БАЗЫ ДАННЫХ

### 📁 Таблица: `users`
**Записей**: 60
**Полей**: 32

| Поле | Тип | Nullable | Пример значения |
|------|-----|----------|----------------|
| id | number | NO | 49 |
| telegram_id | number | NO | 48 |
| username | string | NO | dev_user |
| first_name | string | NO | Dev User |
| wallet | object | YES | NULL |
| ref_code | string | NO | REF_1751400282393_5su2uc |
| referred_by | object | YES | NULL |
| balance_uni | number | NO | 110 |
| balance_ton | number | NO | 0 |
| uni_deposit_amount | number | NO | 0 |
| uni_farming_start_timestamp | object | YES | NULL |
| uni_farming_balance | number | NO | 0 |
| uni_farming_rate | number | NO | 0 |
| uni_farming_last_update | object | YES | NULL |
| uni_farming_deposit | number | NO | 0 |
| created_at | string | NO | 2025-07-01T20:04:42.393 |
| checkin_last_date | string | NO | 2025-07-01T20:12:41.434 |
| checkin_streak | number | NO | 1 |
| is_admin | boolean | NO | false |
| ton_boost_package | number | NO | 0 |
| ton_farming_balance | number | NO | 0 |
| ton_farming_rate | number | NO | 0.001 |
| ton_farming_start_timestamp | object | YES | NULL |
| ton_farming_last_update | object | YES | NULL |
| ton_farming_accumulated | number | NO | 0 |
| ton_farming_last_claim | object | YES | NULL |
| ton_boost_active | boolean | NO | false |
| ton_boost_package_id | object | YES | NULL |
| ton_boost_rate | number | NO | 0 |
| ton_boost_expires_at | object | YES | NULL |
| uni_farming_active | boolean | NO | false |
| last_active | object | YES | NULL |

### 📁 Таблица: `user_sessions`
**Записей**: 0
**Полей**: 0

### 📁 Таблица: `transactions`
**Записей**: 534179
**Полей**: 14

| Поле | Тип | Nullable | Пример значения |
|------|-----|----------|----------------|
| id | number | NO | 89729 |
| user_id | number | NO | 17 |
| type | string | NO | REFERRAL_REWARD |
| amount_uni | number | NO | 0.000065 |
| amount_ton | number | NO | 0 |
| description | string | NO | Referral L1 from User 18: 0.00 |
| created_at | string | NO | 2025-06-21T07:30:02.185 |
| metadata | object | YES | NULL |
| status | string | NO | completed |
| source | object | YES | NULL |
| tx_hash | object | YES | NULL |
| source_user_id | number | NO | 18 |
| action | object | YES | NULL |
| currency | object | YES | NULL |

### 📁 Таблица: `referrals`
**Записей**: 0
**Полей**: 0

### 📁 Таблица: `farming_sessions`
**Записей**: 0
**Полей**: 0

### 📁 Таблица: `boost_purchases`
**Записей**: 0
**Полей**: 0

### 📁 Таблица: `missions`
**Записей**: 0
**Полей**: 0

### 📁 Таблица: `user_missions`
**Записей**: 0
**Полей**: 0

### 📁 Таблица: `airdrops`
**Записей**: 0
**Полей**: 0

### 📁 Таблица: `daily_bonus_logs`
**Записей**: 0
**Полей**: 0

### 📁 Таблица: `withdraw_requests`
**Записей**: 3
**Полей**: 10

| Поле | Тип | Nullable | Пример значения |
|------|-----|----------|----------------|
| id | string | NO | 2e886aae-80fd-45ec-821b-a831d3 |
| user_id | number | NO | 48 |
| telegram_id | string | NO | 88888888 |
| username | string | NO | demo_user |
| amount_ton | number | NO | 25.5 |
| ton_wallet | string | NO | UQC7VNTwqVDNzRYvEcxw3Ls5_BLuKa |
| status | string | NO | approved |
| created_at | string | NO | 2025-07-05T10:40:43.322937+00: |
| processed_at | string | NO | 2025-07-05T11:08:54.377+00:00 |
| processed_by | string | NO | DimaOsadchuk |

