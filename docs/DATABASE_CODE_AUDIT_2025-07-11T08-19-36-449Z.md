# Отчет полной сверки структуры БД и кода UniFarm

**Дата:** 2025-07-11T08:19:30.887Z

## 📊 Общая статистика

- **Таблиц в БД:** 11/11
- **Используется в коде:** 9/11
- **Полных соответствий:** 2
- **Критических проблем:** 7
- **Предупреждений:** 2

## ✅ Сущности с полным соответствием

- **user_sessions** - все поля соответствуют
- **missions** - все поля соответствуют

## ❌ Критические несоответствия

### users

- **[ERROR]** Поля используются в коде, но отсутствуют в БД
  - Поля: `is_active`, `status`, `processed_at`, `processed_by`, `user_id`, `type`, `amount_uni`, `amount_ton`, `currency`, `tx_hash`, `description`, `updated_at`, `uni_balance`, `ton_balance`, `filter`, `inviter_id`, `level`, `reward_uni`, `reward_ton`, `ref_path`, `referrer_user_id`, `referred_user_id`, `percentage`, `amount`, `source_type`
  - Файлы: modules/admin/model.ts, modules/adminBot/model.ts, modules/adminBot/service.ts, modules/auth/model.ts, modules/boost/model.ts, modules/boost/service.ts, modules/dailyBonus/controller.ts, modules/dailyBonus/model.ts, modules/dailyBonus/routes.ts, modules/debug/debugRoutes.ts, modules/farming/directFarmingStatus.ts, modules/farming/model.ts, modules/missions/model.ts, modules/monitor/model.ts, modules/monitor/service.ts, modules/referral/model.ts, modules/referral/service.ts, modules/scheduler/tonBoostIncomeScheduler.ts, modules/telegram/model.ts, modules/tonFarming/model.ts, modules/tonFarming/service.ts, modules/user/controller.ts, modules/user/model.ts, modules/user/service.ts, modules/wallet/controller.ts, modules/wallet/model.ts

### transactions

- **[ERROR]** Поля используются в коде, но отсутствуют в БД
  - Поля: `is_admin`, `is_active`, `processed_at`, `processed_by`, `balance_uni`, `ton_boost_package`, `ton_boost_rate`, `updated_at`, `mission_id`, `is_completed`, `completed_at`, `reward_claimed`, `reward_amount`, `balance_ton`, `referrer_id`, `ref_code`, `telegram_id`, `username`, `referred_by`, `first_name`, `uni_balance`, `ton_balance`, `uni_farming_start_timestamp`, `inviter_id`, `level`, `reward_uni`, `reward_ton`, `ref_path`, `referrer_user_id`, `referred_user_id`, `percentage`, `source_type`
  - Файлы: modules/admin/model.ts, modules/adminBot/model.ts, modules/adminBot/service.ts, modules/boost/model.ts, modules/boost/service.ts, modules/dailyBonus/model.ts, modules/farming/model.ts, modules/missions/model.ts, modules/missions/service.ts, modules/monitor/model.ts, modules/monitor/service.ts, modules/referral/model.ts, modules/referral/service.ts, modules/scheduler/tonBoostIncomeScheduler.ts, modules/tonFarming/model.ts, modules/transactions/model.ts, modules/transactions/routes.ts, modules/user/controller.ts, modules/wallet/model.ts

### referrals

- **[ERROR]** Поля используются в коде, но отсутствуют в БД
  - Поля: `total_referrals`, `active_referrals`, `total_earnings`, `referral_levels`, `top_referrers`, `user_id`, `username`, `referral_count`
  - Файлы: modules/referral/model.ts

### farming_sessions

- **[ERROR]** Поля используются в коде, но отсутствуют в БД
  - Поля: `uni_farming_start_timestamp`, `uni_farming_last_update`, `uni_farming_rate`, `//ИСПРАВЛЕНО`, `uni_deposit_amount`, `uni_farming_active`, `created_at`, `balance_uni`, `balance_ton`, `referrer_id`, `id`
  - Файлы: modules/admin/model.ts, modules/farming/model.ts, modules/farming/service.ts, modules/monitor/model.ts, modules/monitor/service.ts, modules/tonFarming/model.ts

### boost_purchases

- **[ERROR]** Поля используются в коде, но отсутствуют в БД
  - Поля: `balance_uni`, `id`, `ton_boost_package`, `ton_boost_rate`, `user_id`, `type`, `amount_uni`, `amount_ton`, `currency`, `status`, `tx_hash`, `description`, `created_at`, `updated_at`
  - Файлы: modules/boost/service.ts

### daily_bonus_logs

- **[ERROR]** Поля используются в коде, но отсутствуют в БД
  - Поля: `checkin_streak`, `amount_uni`, `user_id`, `amount`, `streak_day`, `claimed_at`, `bonus_type`, `previous_balance`, `new_balance`, `created_at`, `checkin_last_date`
  - Файлы: modules/dailyBonus/service.ts

### withdraw_requests

- **[ERROR]** Поля используются в коде, но отсутствуют в БД
  - Поля: `is_admin`, `is_active`, `balance_uni`, `balance_ton`, `type`, `amount_uni`, `description`, `ton_wallet_address`, `ton_wallet_verified`, `ton_wallet_linked_at`, `checkin_last_date`
  - Файлы: modules/adminBot/service.ts, modules/wallet/service.ts

## 🔧 Рекомендации

### HIGH: ADD_MISSING_FIELDS
Добавить отсутствующие поля в таблицу users

Поля: `is_active`, `status`, `processed_at`, `processed_by`, `user_id`, `type`, `amount_uni`, `amount_ton`, `currency`, `tx_hash`, `description`, `updated_at`, `uni_balance`, `ton_balance`, `filter`, `inviter_id`, `level`, `reward_uni`, `reward_ton`, `ref_path`, `referrer_user_id`, `referred_user_id`, `percentage`, `amount`, `source_type`

### HIGH: ADD_MISSING_FIELDS
Добавить отсутствующие поля в таблицу transactions

Поля: `is_admin`, `is_active`, `processed_at`, `processed_by`, `balance_uni`, `ton_boost_package`, `ton_boost_rate`, `updated_at`, `mission_id`, `is_completed`, `completed_at`, `reward_claimed`, `reward_amount`, `balance_ton`, `referrer_id`, `ref_code`, `telegram_id`, `username`, `referred_by`, `first_name`, `uni_balance`, `ton_balance`, `uni_farming_start_timestamp`, `inviter_id`, `level`, `reward_uni`, `reward_ton`, `ref_path`, `referrer_user_id`, `referred_user_id`, `percentage`, `source_type`

### HIGH: ADD_MISSING_FIELDS
Добавить отсутствующие поля в таблицу referrals

Поля: `total_referrals`, `active_referrals`, `total_earnings`, `referral_levels`, `top_referrers`, `user_id`, `username`, `referral_count`

### HIGH: ADD_MISSING_FIELDS
Добавить отсутствующие поля в таблицу farming_sessions

Поля: `uni_farming_start_timestamp`, `uni_farming_last_update`, `uni_farming_rate`, `//ИСПРАВЛЕНО`, `uni_deposit_amount`, `uni_farming_active`, `created_at`, `balance_uni`, `balance_ton`, `referrer_id`, `id`

### HIGH: ADD_MISSING_FIELDS
Добавить отсутствующие поля в таблицу boost_purchases

Поля: `balance_uni`, `id`, `ton_boost_package`, `ton_boost_rate`, `user_id`, `type`, `amount_uni`, `amount_ton`, `currency`, `status`, `tx_hash`, `description`, `created_at`, `updated_at`

### HIGH: ADD_MISSING_FIELDS
Добавить отсутствующие поля в таблицу daily_bonus_logs

Поля: `checkin_streak`, `amount_uni`, `user_id`, `amount`, `streak_day`, `claimed_at`, `bonus_type`, `previous_balance`, `new_balance`, `created_at`, `checkin_last_date`

### HIGH: ADD_MISSING_FIELDS
Добавить отсутствующие поля в таблицу withdraw_requests

Поля: `is_admin`, `is_active`, `balance_uni`, `balance_ton`, `type`, `amount_uni`, `description`, `ton_wallet_address`, `ton_wallet_verified`, `ton_wallet_linked_at`, `checkin_last_date`

### LOW: REVIEW_UNUSED_TABLES
Проверить необходимость неиспользуемых таблиц

Таблицы: `user_missions`, `airdrops`

