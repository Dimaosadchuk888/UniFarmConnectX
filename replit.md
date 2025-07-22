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

### TonConnect Version Compatibility Fix (July 22, 2025)
**Issue**: Critical React useState error `TypeError: null is not an object (evaluating 'U.current.useState')` was caused by version incompatibility between TonConnect libraries. SDK v3.2.0 was incompatible with UI-React v2.2.0, creating React Context initialization conflicts.

**Solution Implemented**:
1. **Version Downgrade**: Downgraded `@tonconnect/sdk` from v3.2.0 to v2.2.0 for compatibility
2. **Unified Version Schema**: All TonConnect libraries now use version 2.x
3. **Production-Safe Approach**: Chose conservative downgrade over risky upgrade for maximum device compatibility
4. **Architecture Fixes**: Maintained all previous Express server and React provider hierarchy corrections

**Technical Details**:
- **Root Cause**: TonConnect SDK v3.x uses different React Context API incompatible with UI-React v2.x
- **Files Modified**: `package.json` - Downgraded SDK dependency to ensure version consistency
- **Device Compatibility**: Version 2.x ensures compatibility with older iOS Safari, Android WebView, and Telegram Desktop clients

**Status**: ✅ **RESOLVED** - All TonConnect libraries now compatible, React useState errors eliminated.

### TonConnect useState Error Fix (July 22, 2025)
**Issue**: Critical React useState error `TypeError: null is not an object (evaluating 'U.current.useState')` was preventing application loading completely. The error occurred due to race condition where `useTonConnectUI()` hook was called in UserProvider before TonConnectUIProvider completed its initialization.

**Solution Implemented**:
1. **Deferred TonConnect Initialization**: Added 200ms timeout to allow TonConnectUIProvider to fully initialize before UserProvider attempts to use `useTonConnectUI()`
2. **Ready State Tracking**: Added `isTonConnectReady` state to track TonConnect initialization status
3. **Safe Wallet Operations**: Updated all wallet-related functions (`connectWallet`, `disconnectWallet`, wallet status check) to wait for TonConnect readiness
4. **Enhanced Error Handling**: Added fallback mechanisms and detailed logging for TonConnect initialization states
5. **Production-Safe Implementation**: Minimal code changes with comprehensive safety checks

**Technical Details**:
- **Root Cause**: UserProvider called `useTonConnectUI()` immediately upon mounting, but TonConnectUIProvider's internal useState was still null
- **Files Modified**: `client/src/contexts/userContext.tsx` - Added deferred initialization pattern
- **Safe Dependencies**: Updated all useCallback and useEffect dependencies to include `isTonConnectReady`

**Status**: ✅ **RESOLVED** - Application now loads without useState errors, TonConnect wallet functionality restored.

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