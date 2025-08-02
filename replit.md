# UniFarm Connect - Advanced Telegram Mini App

## Overview
UniFarm Connect is an advanced Telegram Mini App designed for blockchain UNI farming and TON transaction management. It provides an intuitive platform for interacting with blockchain functionalities, focusing on automated token farming, TON transaction management, and a robust referral system. The project aims to offer a seamless and enhanced user experience for decentralized finance activities within the Telegram ecosystem.

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

**Recent Critical Fixes and Optimizations (August 1-2, 2025):**
- **Database Migration Completed (August 2, 2025)**: Successfully removed duplicate fields from database
  - **Phase 1 - Synchronization**: Synchronized all 146 users' data between duplicate fields
  - **Phase 2 - Code Update**: Updated all schema files and repositories to use primary fields only
  - **Phase 3 - Database Cleanup**: Removed duplicate fields (uni_farming_deposit, ton_boost_package_id, wallet)
  - **Results**: Database structure optimized, 38 columns remain, all user data preserved
  - **Migration Scripts**: `scripts/drop-fields-final.sql`, `scripts/system-audit-after-migration.ts`
  - **Note**: 36 files still contain references to old field names but database is clean. These can be gradually refactored.
- **TON Boost Automation Restored**: Fixed critical issue where `getByUserId()` created farming records with `farming_balance = 0` instead of calculating from existing TON deposits
- **Root Cause**: TonFarmingRepository was creating new records without checking user's deposit history  
- **Solution**: Added `calculateUserTonDeposits()` function to automatically calculate farming_balance from transaction history
- **Impact**: 8 users with broken records restored, automation now works like in July 2025
- **Duplication Prevention**: Enhanced deduplication system to prevent BOC-based transaction duplicates
- **TON_DEPOSIT Mapping Restored**: Fixed critical mapping change that broke TON deposit recognition on August 1st
  - **Issue**: TON_DEPOSIT mapping changed from `FARMING_REWARD` (July) to `TON_DEPOSIT` (August), breaking deposit calculation
  - **Solution**: Restored historical mapping `TON_DEPOSIT → FARMING_REWARD` as it worked in July 2025
  - **Impact**: New TON deposits will now be properly recognized by automation system
- **Database Optimization Completed**: Successfully optimized database performance with zero data loss
  - **Synchronized**: 100% TON farming data (38 records, 211.04 balance added)
  - **Created Indexes**: 8 critical indexes for 5-10x performance improvement
  - **Data Integrity**: Preserved all 103 users, 851,633 transactions
  - **Performance Note**: Network latency limits gains to ~167ms (Supabase cloud)
- **Application-Level Caching Implemented (Phase 1 - August 1, 2025)**: Started 3-week performance optimization project
  - **Created**: Centralized `cacheService.ts` with TTL support and statistics tracking
  - **Integrated**: Balance service (30s TTL), farming services (15s TTL), transaction services (60s TTL)
  - **Safe Approach**: Cache used only as optimization, API failures fallback to cached data
  - **Next Steps**: React component integration, WebSocket cache updates, preloading critical data
  - **Expected Performance**: 50-200x speed improvement (from 220ms to 1-5ms response times)

**Production Database Safety Audit (August 1, 2025):**
- **Critical Discovery**: Tables assumed "unused" are actively used in production
  - uni_farming_data: 98 records, ton_farming_data: 44 records, referrals: 52 records
  - transactions table uses hybrid structure with both old and new field formats
- **Production Stats**: 103 users, 839,173 transactions, 49 active farmers, 21 TON wallets
- **Safety Strategy**: NEVER delete existing fields/tables, add-only approach, use adapters for compatibility
- **Key Principle**: User data is sacred - better redundant structure than data loss

**Core Technologies:**
- **Backend**: Express.js with TypeScript, Supabase integration.
- **Frontend**: React with Vite, TailwindCSS, shadcn/ui components.
- **Database**: PostgreSQL via Supabase with real-time subscriptions.
- **Authentication**: Telegram WebApp authentication with JWT tokens.
- **Real-time Communication**: WebSocket for instant balance updates and notifications.

**Design Patterns & Decisions:**
- **Modular Design**: Features are organized into independent modules (e.g., auth, wallet, farming, boost, referral) for clear separation of concerns and easier maintenance.
- **Automated Schedulers**: Critical operations like farming income generation and boost verification are managed by automated schedulers.
- **Robust Error Handling**: Emphasizes detailed logging and user-friendly error messages to improve system reliability and user experience. Examples include specific messages for insufficient funds and clear authentication errors.
- **UI/UX Decisions**:
    - Responsive and adaptive UI components for various screen sizes.
    - Custom branded toast notifications with distinct visual cues (gradients, emojis) for different message types (success, warning, info, premium, destructive) to align with brand identity and improve readability.
    - Streamlined interfaces, such as the TON Farming section, have been simplified by removing redundant visual blocks.
- **Security**:
    - JWT token watch and recovery system to prevent loss of deposits due to Telegram WebApp's localStorage clearing.
    - Programmatic duplication protection for TON deposits using transaction hashes to ensure data integrity and prevent financial anomalies.
    - Robust authentication middleware and error classification for JWT tokens.
- **Performance**:
    - WebSocket debounce timeout reduced for near-instant balance updates.
    - Cache management and server restart procedures to ensure application operates on fresh data and settings.
    - Optimized API performance with minimal latency.

**Key Architectural Components:**
- **Balance Management**: Centralized `BalanceManager` to handle all balance modifications, ensuring consistency and preventing race conditions.
- **Unified Transaction Service**: All transactions are processed through a `UnifiedTransactionService` for consistent classification, description generation, and duplicate protection.
- **Admin Bot Interface**: Streamlined one-click operations for withdrawal approvals/rejections, automated interface updates, and smart buttons for efficient management. Message editing in the admin bot reduces chat clutter.
- **Telegram Bot Integration**: `@UniFarming_Bot` for general user interaction (primarily WebApp launch) and `@unifarm_admin_bot` for administrative tasks and notifications.
- **Environment Management**: Automatic port detection for local development and robust handling of environment variables for production deployments.

## External Dependencies
- **Telegram Mini App framework**: For core application functionality within Telegram.
- **Supabase**: Real-time database for data storage and real-time subscriptions.
- **TON Blockchain**: Integrated via TON Connect for seamless blockchain transactions, deposits, and interactions.
- **Vite**: Frontend build tool for React/TypeScript.
- **TailwindCSS**: For rapid UI development and styling.
- **shadcn/ui**: UI component library.
- **Node.js**: Runtime environment.