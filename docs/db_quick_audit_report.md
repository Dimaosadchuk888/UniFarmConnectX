# UniFarm Database Quick Audit Report
Generated: 2025-07-11T08:00:48.860Z

## Database Overview
- Total Tables: 11
- Tables with Data: 4
- Empty Tables: 7

## Empty Tables (No Data)
- user_sessions
- referrals
- farming_sessions
- boost_purchases
- user_missions
- airdrops
- daily_bonus_logs

## Critical Tables Analysis

### users
- Columns: 36
- Rows: 64

**Columns:**
- id
- telegram_id
- username
- first_name
- wallet
- ref_code
- referred_by
- balance_uni
- balance_ton
- uni_deposit_amount
- uni_farming_start_timestamp
- uni_farming_balance
- uni_farming_rate
- uni_farming_last_update
- uni_farming_deposit
- created_at
- checkin_last_date
- checkin_streak
- is_admin
- ton_boost_package
- ton_farming_balance
- ton_farming_rate
- ton_farming_start_timestamp
- ton_farming_last_update
- ton_farming_accumulated
- ton_farming_last_claim
- ton_boost_active
- ton_boost_package_id
- ton_boost_rate
- ton_boost_expires_at
- uni_farming_active
- last_active
- referrer_id
- ton_wallet_address
- ton_wallet_verified
- ton_wallet_linked_at

**⚠️ Fields in DB but possibly not used in code:**
- uni_farming_deposit
- checkin_last_date
- checkin_streak
- referrer_id

### transactions
- Columns: 15
- Rows: 595958

**Columns:**
- id
- user_id
- type
- amount_uni
- amount_ton
- description
- created_at
- metadata
- status
- source
- tx_hash
- source_user_id
- action
- currency
- amount

**⚠️ Fields in DB but possibly not used in code:**
- metadata
- source
- action

### missions
- Columns: 18
- Rows: 5

**Columns:**
- id
- title
- description
- mission_type
- target_value
- reward_amount
- reward_type
- requirements
- start_date
- end_date
- is_active
- is_repeatable
- sort_order
- created_at
- updated_at
- reward_uni
- reward_ton
- status

### withdraw_requests
- Columns: 10
- Rows: 12

**Columns:**
- id
- user_id
- telegram_id
- username
- amount_ton
- ton_wallet
- status
- created_at
- processed_at
- processed_by

## Code vs Database Analysis

### Potential Missing Database Fields
*Fields referenced in code but not found in database:*

- last_active (found in modules/user/controller.ts)
- farming_reward (found in core/constants.ts (as transaction type))