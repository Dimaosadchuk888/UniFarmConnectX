# SUPABASE SCHEMA ADAPTATION REPORT
**Дата анализа:** 2025-06-14T19:21:04.338Z

## 📋 СТРУКТУРА ТАБЛИЦ:

### USERS
✅ **Статус:** Доступна
📊 **Количество полей:** 22
📋 **Поля:** id, telegram_id, username, first_name, wallet, ton_wallet_address, ref_code, parent_ref_code, referred_by, balance_uni, balance_ton, uni_deposit_amount, uni_farming_start_timestamp, uni_farming_balance, uni_farming_rate, uni_farming_last_update, uni_farming_deposit, uni_farming_activated_at, created_at, checkin_last_date, checkin_streak, is_admin


### REFERRALS
✅ **Статус:** Доступна
📊 **Количество полей:** 3
📋 **Поля:** id, created_at, updated_at
⚠️ **Примечание:** Таблица пуста

### FARMING_SESSIONS
✅ **Статус:** Доступна
📊 **Количество полей:** 4
📋 **Поля:** id, user_id, created_at, updated_at
⚠️ **Примечание:** Таблица пуста

### USER_SESSIONS
✅ **Статус:** Доступна
📊 **Количество полей:** 6
📋 **Поля:** id, user_id, session_token, expires_at, is_active, created_at
⚠️ **Примечание:** Таблица пуста

### TRANSACTIONS
✅ **Статус:** Доступна
📊 **Количество полей:** 11
📋 **Поля:** id, user_id, type, amount_uni, amount_ton, description, created_at, metadata, status, source, tx_hash


## 🔄 РЕКОМЕНДУЕМЫЕ ЗАМЕНЫ ПОЛЕЙ:

### USERS
- `last_active` → `checkin_last_date`
- `updated_at` → `created_at`
- `is_active` → **ЛОГИКА БЕЗ ПОЛЯ** (требует адаптации кода)
- `daily_bonus_last_claim` → `checkin_last_date`

### REFERRALS
- `referrer_id` → **ЛОГИКА БЕЗ ПОЛЯ** (требует адаптации кода)
- `level` → **ЛОГИКА БЕЗ ПОЛЯ** (требует адаптации кода)
- `commission_rate` → **ЛОГИКА БЕЗ ПОЛЯ** (требует адаптации кода)
- `total_earned` → **ЛОГИКА БЕЗ ПОЛЯ** (требует адаптации кода)

### FARMING_SESSIONS
- `amount` → **ЛОГИКА БЕЗ ПОЛЯ** (требует адаптации кода)
- `rate` → **ЛОГИКА БЕЗ ПОЛЯ** (требует адаптации кода)
- `farming_type` → **ЛОГИКА БЕЗ ПОЛЯ** (требует адаптации кода)

## 🛠️ ПЛАН АДАПТАЦИИ МОДУЛЕЙ:

### 1. modules/user/model.ts
- Заменить `last_active` на `checkin_last_date`
- Убрать использование `updated_at` или заменить на `created_at`
- Адаптировать логику `is_active` (считать всех пользователей активными)

### 2. modules/referral/service.ts
- **КРИТИЧНО:** Отсутствует поле для referrer_id - реферальная система заблокирована
- Вычислять `level` программно
- Хардкодить `commission_rate` в коде
- Вычислять `total_earned` из таблицы transactions

### 3. modules/farming/service.ts
- Использовать `uni_deposit_amount` из таблицы users вместо amount в farming_sessions
- Хардкодить `farming_type` как 'UNI_FARMING'
- Использовать `uni_farming_rate` из users вместо rate в sessions

### 4. modules/dailyBonus/service.ts
- Заменить `daily_bonus_last_claim` на `checkin_last_date`

## 🚫 НЕВОЗМОЖНО РЕАЛИЗОВАТЬ:

- **Многоуровневая реферальная система** - отсутствует поле для связи referrer_id
- **Детальные фарминг сессии** - отсутствует поле amount, нужно использовать данные из users

## ✅ ГОТОВЫЕ К АДАПТАЦИИ МОДУЛИ:

- **Авторизация через Telegram** - полностью совместима
- **Базовые операции с пользователями** - работают без изменений
- **Транзакции и кошелек** - полностью совместимы
- **Пользовательские сессии** - работают корректно

---
**Рекомендация:** Адаптировать код под существующую схему, избегая изменений в базе данных.