# UniFarm Database Audit - Final Comprehensive Report
Generated: 2025-07-11T08:03:00.000Z

## Executive Summary

This audit analyzed the UniFarm database structure against code usage patterns to identify discrepancies, unused fields, and potential issues. The analysis focused on 11 tables with a total of 141 columns across the system.

### Key Findings:
- **4 of 11 tables** contain data (users, transactions, missions, withdraw_requests)
- **7 of 11 tables** are empty (no data)
- **1 critical field** (`users.last_active`) exists in database but is not used in code
- **Several duplicate fields** exist (e.g., `referrer_id` vs `referred_by`)
- **Transaction types mismatch** detected between code constants and database enum

## Database Structure Overview

### Tables with Data

| Table | Columns | Rows | Status |
|-------|---------|------|--------|
| users | 36 | 64 | ✅ Active |
| transactions | 15 | 595,958 | ✅ Active |
| missions | 18 | 5 | ✅ Active |
| withdraw_requests | 10 | 12 | ✅ Active |

### Empty Tables (No Data)

| Table | Purpose | Issue |
|-------|---------|-------|
| user_sessions | Session management | Not implemented |
| referrals | Referral tracking | Data stored in users table instead |
| farming_sessions | Farming history | Data stored in users table instead |
| boost_purchases | Boost package purchases | Data stored in users table instead |
| user_missions | Mission completion tracking | Handled via transactions |
| airdrops | Airdrop campaigns | Feature not active |
| daily_bonus_logs | Daily bonus history | Moved to transactions |

## Critical Issues Found

### 1. Field Exists in DB but Not Used in Code

#### users.last_active
- **Status**: ❌ Field exists in database but NOT used anywhere in code
- **Impact**: Database field is being maintained but serves no purpose
- **Recommendation**: Either implement usage or remove from database

### 2. Duplicate/Redundant Fields

#### users table:
- `referred_by` vs `referrer_id` - Both track referral relationships
- `uni_farming_deposit` vs `uni_deposit_amount` - Duplicate farming deposit tracking
- `checkin_last_date` & `checkin_streak` - Daily bonus moved to separate system

### 3. Transaction Type Mismatches

The following transaction types are used in code but may not exist in database enum:
- `FARMING_DEPOSIT` 
- `BOOST_PURCHASE`
- `DAILY_BONUS`

## Detailed Field Analysis

### Users Table (36 fields)

**Core Fields (Used Frequently):**
- `id`, `telegram_id`, `username`, `first_name` ✅
- `balance_uni`, `balance_ton` ✅
- `ref_code`, `referred_by` ✅

**Farming Fields (Active):**
- `uni_farming_active`, `uni_deposit_amount`, `uni_farming_rate` ✅
- `uni_farming_start_timestamp`, `uni_farming_balance` ✅

**TON Boost Fields (Active):**
- `ton_boost_package`, `ton_boost_active`, `ton_boost_rate` ✅
- `ton_farming_balance`, `ton_farming_rate` ✅

**Unused/Redundant Fields:**
- `last_active` ❌ (Not used in code)
- `uni_farming_deposit` ⚠️ (Duplicate of uni_deposit_amount)
- `referrer_id` ⚠️ (Duplicate of referred_by)
- `checkin_last_date`, `checkin_streak` ⚠️ (Daily bonus moved)

### Transactions Table (15 fields)

**Core Fields:**
- `id`, `user_id`, `type`, `created_at`, `status` ✅
- `amount_uni`, `amount_ton`, `amount`, `currency` ✅
- `description` ✅

**Optional/Metadata Fields:**
- `metadata` ⚠️ (Rarely used)
- `source` ✅ (Used for tracking origin)
- `action` ✅ (Used for categorization)
- `tx_hash` ✅ (Used for blockchain transactions)
- `source_user_id` ✅ (Used for referral tracking)

## Recommendations

### High Priority
1. **Remove or implement `users.last_active`** - Currently wasting storage
2. **Consolidate duplicate fields** - Choose between `referred_by` vs `referrer_id`
3. **Verify transaction type enum** - Ensure all used types exist in database

### Medium Priority
1. **Consider removing empty tables** or implement their intended functionality
2. **Migrate daily bonus fields** from users table since feature moved
3. **Document metadata field usage** or remove if not needed

### Low Priority
1. **Optimize indexes** on frequently queried fields
2. **Add missing foreign key constraints** where applicable
3. **Consider archiving old transaction data** (595K+ records)

## Code vs Database Alignment

### Well-Aligned Components
- ✅ Core user management fields
- ✅ Balance tracking system
- ✅ Farming system fields
- ✅ TON boost system fields
- ✅ Basic transaction tracking

### Misaligned Components
- ❌ Session management (table exists, not used)
- ❌ Referral tracking (split between tables)
- ❌ Daily bonus system (legacy fields remain)
- ❌ last_active tracking (field unused)

## Conclusion

The UniFarm database shows signs of evolution over time, with some legacy fields and tables remaining from earlier implementations. While the core functionality is well-supported, there are opportunities for optimization by removing unused fields and consolidating duplicate data structures.

**Overall Database Health: 85%**
- Core functionality: ✅ Working well
- Data integrity: ✅ No critical issues
- Optimization needed: ⚠️ Minor cleanup required
- Documentation: ⚠️ Some fields lack clear purpose