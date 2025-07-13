# WebSocket Balance Integration Fix Report
Date: July 13, 2025

## Problem Statement
WebSocket notifications from BalanceManager were sending `changeAmount: 0` for all user-initiated balance updates (deposits, withdrawals, missions), preventing real-time UI updates from reflecting actual balance changes.

## Root Cause Analysis
The callback in `websocket-balance-integration.ts` only received `userId` parameter and had no access to the actual change amounts. It was hardcoded to send `changeAmount: 0`.

## Solution Implemented

### 1. Updated BalanceManager Callback Signature
```typescript
// Before
public onBalanceUpdate?: (userId: number) => Promise<void>;

// After  
export interface BalanceChangeData {
  userId: number;
  changeAmountUni: number;
  changeAmountTon: number;
  currency: 'UNI' | 'TON' | 'BOTH';
  source: string;
  oldBalanceUni: number;
  oldBalanceTon: number;
  newBalanceUni: number;
  newBalanceTon: number;
}

public onBalanceUpdate?: (changeData: BalanceChangeData) => Promise<void>;
```

### 2. Updated Callback Invocation in BalanceManager
The callback now passes complete change information:
```typescript
const changeData: BalanceChangeData = {
  userId: user_id,
  changeAmountUni: amount_uni || 0,
  changeAmountTon: amount_ton || 0,
  currency: amount_uni && amount_ton ? 'BOTH' : (amount_uni ? 'UNI' : 'TON'),
  source: source || 'unknown',
  oldBalanceUni: current.balance_uni,
  oldBalanceTon: current.balance_ton,
  newBalanceUni: newBalance.balance_uni,
  newBalanceTon: newBalance.balance_ton
};

this.onBalanceUpdate(changeData).catch(error => {...});
```

### 3. Updated WebSocket Integration  
`websocket-balance-integration.ts` now uses actual change amounts:
```typescript
balanceManager.onBalanceUpdate = async (changeData: BalanceChangeData) => {
  const changeAmount = changeData.currency === 'UNI' ? changeData.changeAmountUni : 
                      changeData.currency === 'TON' ? changeData.changeAmountTon :
                      Math.max(changeData.changeAmountUni, changeData.changeAmountTon);
  
  const primaryCurrency = changeData.currency === 'BOTH' ? 
                         (changeData.changeAmountUni >= changeData.changeAmountTon ? 'UNI' : 'TON') :
                         changeData.currency;
  
  notificationService.notifyBalanceUpdate({
    userId: changeData.userId,
    balanceUni: changeData.newBalanceUni,
    balanceTon: changeData.newBalanceTon,
    changeAmount: changeAmount,  // Now sends actual change amount instead of 0
    currency: primaryCurrency,
    source: changeData.source,
    timestamp: new Date().toISOString()
  });
};
```

## Testing Results
1. **Database Updates**: Confirmed working - test script successfully updated balance from 1380609.768263 to 1380709.768263 UNI
2. **WebSocket Notifications**: Implementation complete, awaiting next farming scheduler run for live verification
3. **UI Updates**: Currently showing stale balance (1377201.452588), expected to update with next WebSocket notification

## Next Steps
1. **Immediate**: Monitor next farming scheduler run (expected ~07:02:25) to verify WebSocket notifications send correct change amounts
2. **Short-term**: Complete unification - add `batchUpdateBalances()` method to BalanceManager
3. **Long-term**: Deprecate BatchBalanceProcessor entirely, use BalanceManager for all balance operations

## Files Modified
- `core/BalanceManager.ts` - Updated callback signature and invocation
- `server/websocket-balance-integration.ts` - Updated to use new callback data
- `server/index.ts` - Minor logging update to trigger reload
- `replit.md` - Documented the fix

## Verification
To verify the fix is working:
1. Check browser console for `balance_update` WebSocket messages with non-zero `changeAmount`
2. Confirm UI balance updates match the change amounts in transactions
3. Monitor logs for `[WebSocketBalanceIntegration]` messages showing actual change values