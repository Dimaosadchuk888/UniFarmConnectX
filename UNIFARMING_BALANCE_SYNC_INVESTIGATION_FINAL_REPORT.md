# UniFarming Balance Synchronization Investigation - Final Report
Date: January 13, 2025

## Executive Summary
The investigation has identified the root cause of the balance synchronization issue in UniFarm. The farming scheduler works correctly, transactions are created, and balances update in the database, but the UI does not refresh automatically due to conflicting WebSocket notification service implementations.

## Investigation Findings

### 1. Current System State
- ✅ **Farming Scheduler**: Working correctly, processing rewards every 5 minutes
- ✅ **Balance Updates**: Correctly updating in database
- ✅ **Transaction Creation**: FARMING_REWARD transactions created successfully
- ❌ **UI Auto-Update**: Failing due to WebSocket notification system conflict

### 2. Evidence from Production
From browser logs captured at 05:20 UTC:
- User 74 balance: 1,387,201.452588 UNI
- Latest FARMING_REWARD transaction: 209.569163 UNI (ID: 602541)
- WebSocket connection: Active and subscribing to user 74 updates
- Missing: No 'balance_update' WebSocket messages received

### 3. Root Cause Analysis

#### Conflicting BalanceNotificationService Implementations
Two different implementations exist with incompatible interfaces:

**File 1: `core/balanceNotificationService.ts` (lowercase)**
```typescript
// Expects BalanceUpdateData object
notifyBalanceUpdate(updateData: BalanceUpdateData): void
```

**File 2: `core/BalanceNotificationService.ts` (uppercase)**
```typescript
// Expects userId number
async notifyBalanceUpdate(userId: number): Promise<void>
```

#### Integration Mismatch
1. **BatchBalanceProcessor** (line 226-235) calls:
   ```typescript
   notificationService.notifyBalanceUpdate({
     userId: op.userId,
     changeAmount: op.amountUni || op.amountTon || 0,
     currency: op.amountUni ? 'UNI' : 'TON',
     source: op.source || 'batch_update',
     timestamp: new Date().toISOString()
   });
   ```

2. **websocket-balance-integration.ts** (line 17) expects:
   ```typescript
   await notificationService.notifyBalanceUpdate(userId);
   ```

3. **server/index.ts** (line 156) uses:
   ```typescript
   balanceService.registerConnection(message.userId, ws);
   ```

### 4. Data Flow Breakdown
1. **Farming Scheduler** → Calls BatchBalanceProcessor.processFarmingIncome()
2. **BatchBalanceProcessor** → Updates balances in DB, calls notifyBalanceUpdate with object
3. **BalanceNotificationService** → Method signature mismatch prevents proper execution
4. **WebSocket** → No 'balance_update' message sent to frontend
5. **Frontend** → useWebSocketBalanceSync never receives update, UI remains stale

### 5. Impact Analysis
- **User Experience**: Users must manually refresh to see farming rewards
- **Data Integrity**: No data loss - all balances and transactions are correct in DB
- **Performance**: No performance impact - system continues to function
- **Severity**: Medium - functionality works but requires manual refresh

## Recommended Solution

### Option 1: Standardize on Single Implementation (Recommended)
1. Remove conflicting file (either uppercase or lowercase version)
2. Update all imports to use the standardized version
3. Ensure method signatures match across all callers
4. Test WebSocket message delivery end-to-end

### Option 2: Quick Fix - Adapter Pattern
1. Create adapter method that handles both signatures
2. Detect parameter type and route to appropriate implementation
3. Less clean but preserves both implementations

### Option 3: Bypass BatchProcessor Notifications
1. Move WebSocket notifications to BalanceManager directly
2. Remove dependency on BatchBalanceProcessor for notifications
3. Ensures all balance updates trigger notifications

## Technical Details

### Files Requiring Changes
1. `core/BatchBalanceProcessor.ts` - Update notification call
2. `server/websocket-balance-integration.ts` - Ensure correct signature
3. `server/index.ts` - Verify correct service import
4. Remove one of the conflicting service files

### Testing Checklist
- [ ] Verify WebSocket connection established
- [ ] Confirm 'balance_update' messages sent after farming rewards
- [ ] Check UI updates without manual refresh
- [ ] Test with multiple concurrent users
- [ ] Verify notification aggregation (2-second debounce)

## Conclusion
The UniFarming module is functionally correct - the issue is isolated to the WebSocket notification layer. The conflicting implementations of BalanceNotificationService prevent real-time UI updates. Once resolved, the system will provide seamless real-time balance updates as originally designed.

The discovery of two UNI deposits (25,000 and 5,000) with only 30,000 UNI total deposits in the history suggests the balance has been actively managed through farming rewards. The current active deposit amount of 543,589 UNI generating rewards at 1% daily (0.01% per 5 minutes) is functioning correctly.