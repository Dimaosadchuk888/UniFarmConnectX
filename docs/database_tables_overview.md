# UniFarm Database Tables Overview
Generated: 2025-07-11T07:58:50.576Z

## Summary
- Tables Found: 11
- Total Rows: 596039

## Tables Structure

### users
- Columns: 36
- Rows: 64

Columns:
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

### user_sessions
- Columns: 0
- Rows: 0

### transactions
- Columns: 15
- Rows: 595958

Columns:
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

### referrals
- Columns: 0
- Rows: 0

### farming_sessions
- Columns: 0
- Rows: 0

### boost_purchases
- Columns: 0
- Rows: 0

### missions
- Columns: 18
- Rows: 5

Columns:
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

### user_missions
- Columns: 0
- Rows: 0

### airdrops
- Columns: 0
- Rows: 0

### daily_bonus_logs
- Columns: 0
- Rows: 0

### withdraw_requests
- Columns: 10
- Rows: 12

Columns:
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
