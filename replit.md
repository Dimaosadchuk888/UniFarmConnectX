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
- **Security**: JWT token watch and recovery, single-path TON deposit processing with precise deduplication (phantom deposits fixed August 3, 2025), robust authentication middleware.
- **Performance**: WebSocket debounce, cache management, optimized API performance.

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
- **Security & Integrity**: Precise transaction deduplication (fixed phantom deposits for User 25 on Aug 3, 2025), ACID compliance, rate limiting, comprehensive diagnostic logging.

## External Dependencies
- **Telegram Mini App framework**: For core application functionality within Telegram.
- **Supabase**: Real-time database for data storage and real-time subscriptions.
- **TON Blockchain**: Integrated via TON Connect for seamless blockchain transactions, deposits, and interactions.
- **Vite**: Frontend build tool.
- **TailwindCSS**: For rapid UI development and styling.
- **shadcn/ui**: UI component library.
- **Node.js**: Runtime environment.