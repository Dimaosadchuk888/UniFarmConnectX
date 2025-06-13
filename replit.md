# UniFarm Connect - Telegram Mini App

## Overview
UniFarm Connect is a comprehensive Telegram Mini App that provides farming, referral, and financial services within the Telegram ecosystem. The application combines UNI and TON token farming capabilities with a sophisticated 20-level referral system and gamification features.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL via Neon serverless (production) with Drizzle ORM
- **Authentication**: Telegram Mini App HMAC validation with JWT tokens
- **API Design**: Modular RESTful API with v2 endpoints
- **Real-time**: WebSocket support for live updates
- **Deployment**: Multi-platform support (Replit, Railway, Docker)

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **UI Library**: Shadcn/UI components with Radix UI primitives
- **State Management**: TanStack React Query for server state
- **Blockchain**: TON Connect integration for wallet connectivity
- **Styling**: Tailwind CSS with custom theme system
- **Navigation**: React Router with lazy loading and code splitting

## Key Components

### Authentication System
- **Telegram Integration**: Real HMAC-SHA256 validation of initData
- **JWT Tokens**: Secure token generation with 7-day expiration
- **User Management**: Automatic user creation with referral code generation
- **Session Handling**: Persistent authentication across app sessions

### Database Schema
- **Users System**: Comprehensive user profiles with Telegram integration
- **Farming Module**: UNI and TON farming deposits and rewards tracking
- **Referral System**: 20-level deep referral chain with commission tracking
- **Missions System**: Task management with completion tracking
- **Wallet System**: Multi-currency balance and transaction history
- **Boost Packages**: Farming acceleration and reward multipliers

### Modular Backend Structure
Each business domain is organized as a self-contained module:
- **auth/**: Authentication and authorization
- **user/**: User profile management
- **farming/**: UNI farming operations
- **wallet/**: Balance and transaction management
- **referral/**: Multi-level referral system
- **missions/**: Task and achievement system
- **boost/**: Farming acceleration packages
- **dailyBonus/**: Daily check-in rewards
- **tonFarming/**: TON blockchain farming
- **airdrop/**: Token distribution campaigns

## Data Flow

### Authentication Flow
1. Telegram Mini App provides initData with user information
2. Backend validates HMAC signature using bot token
3. JWT token generated with user payload (telegram_id, username, ref_code)
4. Token used for all subsequent API requests
5. Automatic user creation on first authentication

### Farming Flow
1. User deposits UNI/TON tokens for farming
2. Scheduled background service calculates rewards every 5 minutes
3. Rewards automatically credited to user balance
4. Referral commissions distributed across 20 levels
5. Transaction history maintained for transparency

### Referral System Flow
1. New user registers with referral code
2. Referral chain validation (up to 20 levels deep)
3. Farming rewards trigger referral commission distribution
4. Commission rates decrease by level (5% level 1, decreasing to 0.1% level 20)
5. Milestone bonuses awarded for referral achievements

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **express**: Web application framework
- **jsonwebtoken**: JWT token management
- **@tonconnect/ui**: TON blockchain wallet integration
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: UI component primitives

### Development Dependencies
- **typescript**: Type safety and development experience
- **vite**: Fast build tool and development server
- **eslint**: Code quality and consistency
- **tailwindcss**: Utility-first CSS framework

### Blockchain Integration
- **TON Connect**: Official TON blockchain wallet connector
- **@ton/core**: TON blockchain core functionality
- Wallet connection and transaction signing capabilities

## Deployment Strategy

### Environment Configuration
- **Development**: Local development with Vite dev server
- **Production**: Neon PostgreSQL database with optimized settings
- **Container**: Docker support with multi-stage builds
- **Platform**: Replit-optimized with multiple deployment targets

### Database Strategy
- **Primary**: Neon PostgreSQL serverless for production scalability
- **Connection**: WebSocket-based connections for serverless compatibility
- **Migrations**: Drizzle Kit for schema version management
- **Monitoring**: Built-in connection pool monitoring and health checks

### Performance Optimizations
- **Frontend**: Code splitting with React.lazy for reduced bundle size
- **Backend**: Connection pooling and query optimization
- **Caching**: Redis support for session and application caching
- **Monitoring**: Real-time performance metrics and error tracking

## Changelog
- June 13, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.