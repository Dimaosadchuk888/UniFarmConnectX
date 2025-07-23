# UniFarm Connect - Advanced Telegram Mini App

## Project Overview
Advanced Telegram Mini App for blockchain UNI farming and TON transaction management, providing a sleek and intuitive platform for blockchain interactions.

### Key Technologies
- React/TypeScript with Vite
- Telegram Mini App framework
- Supabase real-time database
- TON Blockchain integration
- Enhanced user experience design
- Responsive and adaptive UI components

### Core Features
- **UNI Farming**: Automated token farming with customizable rates
- **TON Boost System**: Investment packages for enhanced earning rates
- **Wallet Integration**: TON Connect integration for seamless blockchain transactions
- **Referral System**: Multi-level referral rewards and commission tracking
- **Real-time Notifications**: WebSocket-based balance updates and system notifications
- **Mission System**: Daily bonus rewards and achievement tracking
- **Admin Panel**: Comprehensive admin bot for system management

## Recent Changes

### TON Payment System Comprehensive Audit (July 23, 2025)
**Task**: Complete audit of TON payment system including ConnectWallet, deposits, balance updates, and boost purchases.

**Audit Completed**:
1. **Documented full payment flow**: From wallet connection to balance updates
2. **Mapped all system components**: Frontend (TonDepositCard, BoostPackagesCard) → API → Services → Database
3. **Identified critical mechanisms**:
   - Wallet-Based Deposit Resolution for user identification
   - UnifiedTransactionService for transaction handling
   - WebSocket integration for real-time updates
   - Duplicate protection via tx_hash_unique field
4. **Created comprehensive report**: `AUDIT_TON_PAYMENT_SYSTEM_REPORT.md` with full technical documentation

**Key Findings**:
- System is fully functional with proper fallback mechanisms
- All payment flows are protected against duplication
- Real-time balance updates work through WebSocket
- Boost purchases support both internal balance and external wallet payments

**Status**: ✅ **AUDIT COMPLETED** - Full system documentation created without any code modifications.

### Withdrawal Validation Messages Enhancement (July 23, 2025)
**Issue**: Withdrawal validation messages were confusing users with incorrect minimum amounts (showing 0.001 instead of actual minimums).

**Solution Implemented**:
1. **Backend message updated**: Changed from `'Минимальная сумма вывода — 1 TON'` to `'Минимальная сумма вывода должна быть больше или равна 1 TON'` for clearer communication
2. **Frontend validation made dynamic**: 
   - Created `createWithdrawalSchema()` function that generates validation schema based on selected currency
   - Replaced static minimum (0.001) with dynamic values: 1 TON for TON, 1000 UNI for UNI
   - Validation messages now show correct minimums: "Минимальная сумма для вывода: 1 TON" or "Минимальная сумма для вывода: 1000 UNI"

**Technical Details**:
- **Files Modified**: 
  - `modules/wallet/service.ts` - Updated error message for better clarity
  - `client/src/components/wallet/WithdrawalForm.tsx` - Implemented dynamic validation schema
- **Result**: Users now see accurate minimum withdrawal amounts in validation messages

**Status**: ✅ **COMPLETED** - Validation messages now correctly reflect actual minimum withdrawal requirements.

### Withdrawal Transaction Display Fix (July 23, 2025)
**Issue**: Withdrawal transactions were not displaying in transaction history despite being created successfully. The system was creating transactions with lowercase type 'withdrawal' but UnifiedTransactionService expected uppercase types.

**Solution Implemented**:
1. **Added backward compatibility** to UnifiedTransactionService:
   - Added 'WITHDRAWAL' to TransactionsTransactionType enum
   - Extended TRANSACTION_TYPE_MAPPING with lowercase mappings:
     - 'withdrawal' → 'WITHDRAWAL'
     - 'withdrawal_fee' → 'WITHDRAWAL'
   - Updated UNI_WITHDRAWAL and TON_WITHDRAWAL to map to 'WITHDRAWAL' instead of 'FARMING_REWARD'

2. **Enhanced type handling**:
   - Added lowercase types to ExtendedTransactionType for compatibility
   - Updated generateDescription() to handle lowercase withdrawal types
   - Updated isWithdrawalType() to recognize lowercase types

**Technical Details**:
- **Root Cause**: Type mismatch between WalletService (lowercase) and UnifiedTransactionService (uppercase)
- **Files Modified**: 
  - `modules/transactions/types.ts` - Added WITHDRAWAL type and lowercase compatibility
  - `core/TransactionService.ts` - Updated mapping and type handling
- **Result**: Withdrawal transactions now display correctly in history while maintaining backward compatibility

**Status**: ✅ **COMPLETED** - System now correctly handles both uppercase and lowercase withdrawal types.

### Database Duplicate Protection Implementation (July 23, 2025)
**Issue**: System lacked protection against duplicate TON deposit transactions, potentially allowing users to exploit the system by resubmitting the same transaction hash multiple times.

**Solution Implemented**:
1. **Database Migration**: Added new fields to support duplicate detection:
   - `tx_hash_unique` - stores unique transaction hash with unique index
   - `is_duplicate` - boolean flag to mark duplicate transactions
   - `duplicate_of_id` - reference to original transaction
   - Migration completed successfully without deleting any existing data

2. **Code Enhancement**: Added automatic population of `tx_hash_unique` field:
   - Modified `core/TransactionService.ts` (line 110): Added `tx_hash_unique: metadata?.tx_hash || null`
   - Now all transactions with tx_hash in metadata will be protected from duplication
   - Database unique index will automatically reject duplicate transactions

**Technical Details**:
- **Root Cause**: No duplicate transaction protection existed in the system
- **Files Modified**: 
  - `core/TransactionService.ts` - Added tx_hash_unique field population
  - Database tables updated with new fields and indexes
- **Result**: Full protection against duplicate TON deposits at database level

**Status**: ✅ **COMPLETED** - System now has comprehensive duplicate protection without modifying existing data.

### TonConnect Version Compatibility Fix (July 22, 2025)
**Issue**: Critical React useState error `TypeError: null is not an object (evaluating 'U.current.useState')` was caused by version incompatibility between TonConnect libraries. Initial attempt to downgrade SDK to v2.2.0 failed because UI packages internally required SDK v3.x.

**Solution Implemented**:
1. **Version Alignment**: Updated to consistent versions - SDK v3.2.0 and UI v2.2.0
2. **Clean Installation**: Removed conflicting packages and reinstalled with matching versions
3. **Dependency Conflict Resolution**: Ensured all packages use the same SDK version (3.2.0)
4. **Production-Safe Approach**: Restored to original versions with proper alignment

**Technical Details**:
- **Root Cause**: Mismatched TonConnect SDK versions (2.x vs 3.x) in dependency tree
- **Files Modified**: `package.json` - Restored to SDK v3.2.0 with UI v2.2.0
- **Final Versions**: 
  - `@tonconnect/sdk@3.2.0`
  - `@tonconnect/ui@2.2.0`
  - `@tonconnect/ui-react@2.2.0`
  - `@tonconnect/protocol@2.3.0`

**Status**: ✅ **RESOLVED** - All TonConnect libraries now properly aligned, no version conflicts.

### TonConnect useState Error Fix (July 22, 2025)
**Issue**: Critical React useState error `TypeError: null is not an object (evaluating 'U.current.useState')` was preventing application loading completely. The error was caused by wrapping the `useTonConnectUI()` hook inside a try-catch block, which violates React Hooks rules.

**Root Cause Analysis**:
- **Commit f3cb2571** (18:33): Wrapped `useTonConnectUI()` in try-catch block
- **React Hooks Rule Violation**: Hooks must be called at the top level of components, not inside conditional blocks
- **Result**: React's internal useState mechanism failed with null reference error

**Solution Implemented**:
1. **Removed try-catch block**: Restored `useTonConnectUI()` call to top level of component
2. **Maintained deferred initialization**: Kept 200ms timeout for TonConnect readiness
3. **React Hooks compliance**: Ensured all hooks follow React's rules of hooks
4. **Clean implementation**: Removed complex error handling that violated React patterns

**Technical Details**:
- **Root Cause**: Try-catch block around React Hook violated Rules of Hooks
- **Files Modified**: `client/src/contexts/userContext.tsx` - Removed try-catch, restored proper hook usage
- **Fix Applied**: Reverted to standard hook call: `const [tonConnectUI] = useTonConnectUI();`

**Status**: ✅ **RESOLVED** - React Hooks error fixed, application should now load properly.

### Referral Income Font Size Improvement (July 22, 2025)
**Issue**: UNI and TON income amounts in referral system were displayed with very small font (`text-xs` - 12px), making them hard to read on mobile devices.

**Solution Implemented**:
1. **Increased font size**: Changed from `text-xs` to `text-sm` in Badge components displaying referral income
2. **Improved readability**: Income amounts now display at 14px instead of 12px (+17% size increase)
3. **Maintained design consistency**: Changes preserve existing Badge styling and color scheme
4. **Mobile-friendly**: Better accessibility on smaller screens without disrupting layout

**Files Modified**:
- `client/src/components/referral/ReferralStats.tsx`: Updated Badge className for UNI and TON income display

**Status**: ✅ **COMPLETED** - Referral income amounts are now more readable while maintaining design integrity.

### Port Conflict Resolution Fix (July 22, 2025)
**Issue**: Server startup was failing with `EADDRINUSE: address already in use 0.0.0.0:3000` error.

**Solution Implemented**:
1. **Added automatic port detection**: Created `findAvailablePort()` function to automatically find available ports starting from the default port (3000)
2. **Enhanced error handling**: Added comprehensive server error handlers for port conflicts and other startup issues
3. **Graceful port fallback**: If port 3000 is occupied, the server automatically tries ports 3001, 3002, etc., up to 100 attempts
4. **Improved logging**: Added detailed logging to show which port is being used when fallback occurs

**Files Modified**:
- `server/index.ts`: Added port conflict resolution mechanism and error handlers

**Status**: ✅ **RESOLVED** - Server now starts successfully and automatically handles port conflicts.

### System Architecture
- **Backend**: Express.js with TypeScript, Supabase integration
- **Frontend**: React with Vite, TailwindCSS, shadcn/ui components
- **Database**: PostgreSQL via Supabase with real-time subscriptions
- **Authentication**: Telegram WebApp authentication with JWT tokens
- **WebSocket**: Real-time communication for balance updates and notifications
- **Schedulers**: Automated farming income and boost verification processes

### Development Environment
- Node.js 18.16.0 with TypeScript
- Vite development server with HMR
- Automatic server restart on file changes
- Comprehensive error logging and monitoring

## Project Structure
```
/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── core/          # Core configuration and services
│   │   └── lib/           # Utility libraries
├── server/                # Backend Express server
│   ├── index.ts          # Main server entry point
│   ├── routes.ts         # API route definitions
│   └── setupViteIntegration.ts
├── core/                  # Shared core modules
│   ├── config.ts         # Centralized configuration
│   ├── logger.ts         # Logging system
│   └── middleware/       # Express middleware
├── modules/               # Feature modules
│   ├── auth/            # Authentication system
│   ├── user/            # User management
│   ├── wallet/          # Wallet operations
│   ├── farming/         # UNI farming logic
│   ├── boost/           # TON boost system
│   └── referral/        # Referral system
└── config/               # Configuration files
    ├── app.ts           # Application configuration
    ├── database.ts      # Database configuration
    └── telegram.ts      # Telegram bot configuration
```

## User Preferences
- **Communication Style**: Professional and technical when needed, but accessible to non-technical users
- **Documentation**: Maintain comprehensive documentation for all major changes
- **Error Handling**: Prefer robust error handling with detailed logging
- **Architecture**: Follow modular architecture patterns with clear separation of concerns

## Deployment Information
- **Production URL**: https://uni-farm-connect-aab49267.replit.app
- **Development**: Local development on auto-detected available port (starts from 3000)
- **Database**: Supabase PostgreSQL with real-time features
- **Telegram Bot**: @UniFarming_Bot

## Notes
- Server automatically handles port conflicts by finding available ports
- All critical systems have error recovery mechanisms
- Real-time features work through WebSocket connections
- Admin bot provides comprehensive system monitoring and control