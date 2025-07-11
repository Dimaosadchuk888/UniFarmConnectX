# UniFarm Database Field Usage - Simple Search Report
Generated: 2025-07-11T08:02:54.854Z

## Summary
- Fields Searched: 13
- Fields Found: 12
- Fields Not Found: 1

## Fields Not Found in Code

| Table | Field | Status |
|-------|-------|--------|
| users | last_active | ❌ Not used |

## Fields Found in Code

| Table | Field | Files Count | Example Files |
|-------|-------|-------------|---------------|
| users | referrer_id | 4 | modules/monitor/model.ts, modules/monitor/service.ts (+2 more) |
| users | uni_farming_deposit | 1 | shared/schema.ts |
| users | checkin_last_date | 6 | modules/dailyBonus/routes.ts, modules/dailyBonus/service.ts (+4 more) |
| users | checkin_streak | 3 | modules/dailyBonus/routes.ts, modules/dailyBonus/service.ts (+1 more) |
| transactions | metadata | 2 | modules/transactions/model.ts, core/TransactionService.ts |
| transactions | source | 17 | modules/auth/controller.ts, modules/boost/service.ts (+15 more) |
| transactions | action | 17 | modules/admin/service.ts, modules/admin/types.ts (+15 more) |
| transactions | tx_hash | 6 | modules/boost/controller.ts, modules/boost/routes.ts (+4 more) |
| referrals | inviter_id | 2 | modules/referral/service.ts, shared/schema.ts |
| referrals | user_id | 67 | modules/admin/controller.ts, modules/adminBot/controller.ts (+65 more) |
| farming_sessions | user_id | 67 | modules/admin/controller.ts, modules/adminBot/controller.ts (+65 more) |
| boost_purchases | user_id | 67 | modules/admin/controller.ts, modules/adminBot/controller.ts (+65 more) |

## Recommendations

### Unused Database Fields
The following fields exist in the database but are not used in the code:

**users** table:
- last_active
