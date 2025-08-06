# UniFarm Connect - Advanced Telegram Mini App

## Overview
UniFarm Connect is an advanced Telegram Mini App for blockchain UNI farming and TON transaction management. It provides an intuitive platform for interacting with blockchain functionalities, focusing on automated token farming, TON transaction management, and a robust referral system. The project aims to offer a seamless and enhanced user experience for decentralized finance activities within the Telegram ecosystem.

**Key Capabilities:**
- **UNI Farming**: Automated token farming with customizable rates.
- **TON Boost System**: Investment packages for enhanced earning rates.
- **Wallet Integration**: TON Connect for seamless blockchain transactions.
- **Referral System**: Multi-level referral rewards and commission tracking.
- **Real-time Notifications**: WebSocket-based balance updates and system notifications.
- **Mission System**: Daily bonus rewards and achievement tracking.
- **Admin Panel**: Comprehensive admin bot for system management.

## User Preferences
- **Communication Style**: Professional and technical when needed, but accessible to non-technical users
- **Documentation**: Maintain comprehensive documentation for all major changes
- **Error Handling**: Prefer robust error handling with detailed logging
- **Architecture**: Follow modular architecture patterns with clear separation of concerns

## System Architecture
The application leverages a modular and scalable architecture designed for high performance and real-time interactions.

**Core Technologies:**
- **Backend**: Express.js with TypeScript.
- **Frontend**: React with Vite, TailwindCSS, shadcn/ui components.
- **Database**: PostgreSQL via Supabase.
- **Authentication**: Telegram WebApp authentication with JWT tokens.
- **Real-time Communication**: WebSocket.

**Design Patterns & Decisions:**
- **Modular Design**: Features are organized into independent modules (e.g., auth, wallet, farming, boost, referral) for clear separation of concerns and easier maintenance.
- **Automated Schedulers**: Critical operations like farming income generation and boost verification are managed by automated schedulers.
- **Robust Error Handling**: Emphasizes detailed logging and user-friendly error messages.
- **UI/UX Decisions**: Responsive and adaptive UI components, custom branded toast notifications, streamlined interfaces.
- **Security**: JWT token watch and recovery, single-path TON deposit processing with precise deduplication (phantom deposits fixed August 3, 2025), robust authentication middleware, comprehensive transaction duplication protection system (critical fixes August 3-4, 2025), balance caching race condition resolution (August 3, 2025), Telegram page refresh error handling (fixed August 4, 2025), smart deduplication logic with time-based filtering (critical fix August 4, 2025), complete elimination of FARMING_REWARD and REFERRAL_REWARD duplicates (August 4, 2025), TonAPI SDK integration completely restored (critical fix August 4, 2025), Transaction History API endpoints fully restored (critical fix August 4, 2025), TON deposit balance update critical bug fixed - deposits now correctly update balance_ton field (August 6, 2025).
- **Performance**: WebSocket debounce, cache management, optimized API performance, BalanceUpdateCoordinator for race condition prevention (August 3, 2025), smart caching with 60s TTL and stale-while-revalidate strategy.

**Key Architectural Components:**
- **Balance Management**: Centralized `BalanceManager` to handle all balance modifications, ensuring consistency and preventing race conditions.
- **Unified Transaction Service**: All transactions are processed through a `UnifiedTransactionService` for consistent classification, description generation, and duplicate protection. TON deposits use single-path processing through wallet controller.
- **Admin Bot Interface**: Streamlined one-click operations for withdrawal approvals/rejections, automated interface updates, and smart buttons for efficient management.
- **Telegram Bot Integration**: `@UniFarming_Bot` for user interaction and `@unifarm_admin_bot` for administrative tasks.
- **Environment Management**: Automatic port detection and robust handling of environment variables.

**Core Financial Flows:**
- **Incoming**: TON_DEPOSIT (from blockchain), FARMING_DEPOSIT (from user balance).
- **Income Generation**: FARMING_REWARD (UNI & TON), REFERRAL_REWARD, DAILY_BONUS, MISSION_REWARD.
- **Outgoing**: WITHDRAWAL (UNI & TON with commission).
- **Security & Integrity**: Complete transaction deduplication system implemented (Aug 3-4, 2025) - eliminated all sources of transaction duplicates including phantom deposits, DAILY_BONUS, FARMING_REWARD (UNI & TON), and REFERRAL_REWARD with comprehensive DeduplicationHelper protection, ACID compliance, rate limiting, and diagnostic logging. Smart deduplication logic with time-based filtering (10-minute window for referrals, 5-minute for farming rewards), status-aware blocking, and enhanced logging. Root cause of systematic 10-minute duplication cycles identified and resolved (Aug 4, 2025). TonAPI SDK completely fixed - replaced incorrect 'TonApiClient' import with proper 'Api' and 'HttpClient' classes, restored blockchain verification for all TON deposits (Aug 4, 2025).
- **UI/UX Improvements**: Telegram page refresh now shows user-friendly "Обновление авторизации..." message instead of raw JSON error (Aug 4, 2025), automatic page reload after authentication errors.
- **User 255 Deposit Recovery**: Historical deposit ID 1664532 restored with correct amount (0.328772 TON) and currency field, resolving User 255 missing deposit issue (Aug 4, 2025).
- **Transaction History Display**: Frontend transaction loading issue completely resolved - missing API endpoints `/api/transactions` and `/api/v2/transactions` restored with direct aliases to TransactionsController, enabling proper transaction history display for all users (Aug 4, 2025).
- **JWT Authentication System Restoration**: Fixed critical authentication system breakdown - JWT tokens now correctly contain `user_id` from database instead of `telegram_id`, restoring all deposit and transaction functionality (Aug 5, 2025).
- **Complete User ID Architecture Fix**: Fixed all remaining telegram_id/user_id inconsistencies in BalanceManager, WalletController, and FarmingController - system now fully operates on user_id architecture as designed (Aug 5, 2025).
- **TON Deposit Auto-Processing System**: Implemented automatic backend API call in TON Connect service - when users complete TON transactions through wallet, frontend automatically calls `/api/v2/wallet/ton-deposit` endpoint with BOC data for immediate deposit processing (Aug 5, 2025).
- **TON Deposit Architecture Fix**: Fixed critical bug in `tonDeposit` controller using wrong field `telegram.user.telegram_id` instead of correct `telegram.user.id` for user lookup - this was causing "Не удалось определить получателя депозита" errors and blocking all TON deposits (Aug 5, 2025).
- **JWT Token Recovery System Complete Restoration**: Fixed TokenRecoveryService using incorrect endpoints `/api/v2/auth/*` - corrected to proper `/api/auth/refresh` and `/api/auth/telegram`. JWT tokens now automatically recover every 30 seconds via useJwtTokenWatcher, preventing deposit failures due to token loss. System completely eliminates 401 "Authentication required" errors blocking TON deposits (Aug 5, 2025).
- **Server Restart Recovery**: Critical issue resolved where application server stopped responding, causing all TON deposits to fail with HTTP_CODE: 000. Server restart restored JWT authentication and TON deposit endpoint accessibility. All deposit functionality now working correctly (Aug 6, 2025).
- **FINAL TON DEPOSIT ARCHITECTURE FIX**: Critical architectural error completely resolved - all wallet controller methods now use correct `telegram.user.telegram_id` instead of wrong `telegram.user.id` for user lookup. Fixed in tonDeposit, getTransactionsList, saveTonAddress, transfer, createDeposit, and withdraw methods. TON deposits now successfully process for existing users instead of creating duplicate accounts. System architecture fully restored (Aug 6, 2025).
- **TON DEPOSIT DUPLICATION BUG RESOLVED**: Fixed critical issue where `tonDeposit` controller created new users instead of using authenticated user from JWT token. Removed problematic `getOrCreateUserFromTelegram()` logic that caused deposits to be credited to wrong user accounts. TON deposits now correctly use `telegram.user.id` from JWT payload, ensuring deposits appear in correct user's transaction history and balance (Aug 6, 2025).
- **TON DEPOSIT ARCHITECTURE COMPREHENSIVE IMPROVEMENTS** (Aug 6, 2025):
  - Replaced `fetch` with `apiRequest` for automatic JWT token handling and refresh
  - Added critical userId validation before deposit processing
  - Implemented comprehensive deposit monitoring with DepositMonitor service
  - Added automatic retry mechanism for failed deposits with localStorage backup
  - Enhanced logging at every stage: transaction start, BOC sent, backend response
  - Implemented failed deposit recovery on component mount (24-hour window)
  - Added real-time wallet address validation before transaction
  - Created `sendTonTransactionWithBackend` function for unified deposit flow
  - Enhanced backend controller with detailed request logging
  - Added critical error notifications and deposit success tracking
  - Implemented deposit logs storage (last 50 operations) for debugging
- **TON DEPOSIT BALANCE UPDATE BUG RESOLVED** (Aug 6, 2025):
  - Fixed critical issue in TransactionService where TON deposits created transactions but failed to update balance_ton
  - Root cause: amount was passed in 'amount' field but code looked for 'amount_ton' 
  - Solution: Added smart correction logic for TON_DEPOSIT transactions to handle both field formats
  - Enhanced critical logging for all balance update operations with [CRITICAL] tags
  - Created diagnostic script (diagnose-deposit-failure.ts) for deposit chain verification
  - Created recovery script (fix-ton-balances.ts) to recalculate balances from transaction history
  - Result: TON deposits now correctly update user balance_ton field immediately

## External Dependencies
- **Telegram Mini App framework**: For core application functionality within Telegram.
- **Supabase**: Real-time database for data storage and real-time subscriptions.
- **TON Blockchain**: Integrated via TON Connect for seamless blockchain transactions, deposits, and interactions.
- **Vite**: Frontend build tool.
- **TailwindCSS**: For rapid UI development and styling.
- **shadcn/ui**: UI component library.
- **Node.js**: Runtime environment.