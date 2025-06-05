# UniFarm Production Deployment Architecture
## Complete System Architecture Documentation

## 🏗️ System Overview

UniFarm is a sophisticated Telegram Mini App built with a modular microservices architecture designed for scalability, maintainability, and production reliability.

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite + Shadcn/UI
- **Backend**: Node.js + Express + TypeScript  
- **Database**: PostgreSQL + Drizzle ORM
- **Deployment**: Docker + Nginx + Redis + Monitoring Stack
- **Integration**: Telegram WebApp API + TON Blockchain

## 📁 Complete Project Structure

```
UniFarm/
├── 📱 Client Application (client/)
│   ├── src/
│   │   ├── components/           # Reusable UI Components
│   │   │   ├── farming/         # Farming interface components
│   │   │   ├── wallet/          # Wallet management UI
│   │   │   ├── missions/        # Mission system UI
│   │   │   ├── referral/        # Referral system UI
│   │   │   └── ui/              # Shadcn/UI components
│   │   ├── contexts/            # React Context Providers
│   │   │   ├── UserContext.tsx  # User state management
│   │   │   ├── NotificationContext.tsx # Toast notifications
│   │   │   └── WebSocketContext.tsx # Real-time updates
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useAuth.ts       # Authentication logic
│   │   │   ├── useFarming.ts    # Farming state management
│   │   │   └── useWebSocket.ts  # WebSocket connection
│   │   ├── modules/             # Feature modules (client-side)
│   │   │   ├── auth/           # Authentication services
│   │   │   ├── farming/        # Farming calculations
│   │   │   ├── wallet/         # Wallet operations
│   │   │   ├── referral/       # Referral tracking
│   │   │   └── missions/       # Mission management
│   │   ├── pages/              # Route components
│   │   ├── services/           # API service layer
│   │   └── utils/              # Utility functions
│   └── public/                 # Static assets
│
├── 🔧 Backend Modules (modules/)
│   ├── auth/                   # Authentication Module
│   │   ├── controller.ts       # HTTP request handlers
│   │   ├── service.ts          # Business logic layer
│   │   ├── routes.ts           # API route definitions
│   │   ├── middleware.ts       # Auth middleware
│   │   └── types.ts            # TypeScript interfaces
│   ├── user/                   # User Management Module
│   │   ├── controller.ts       # User CRUD operations
│   │   ├── service.ts          # User business logic
│   │   ├── routes.ts           # User API endpoints
│   │   └── validation.ts       # Input validation
│   ├── farming/                # Farming System Module
│   │   ├── controller.ts       # Farming API handlers
│   │   ├── service.ts          # Farming business logic
│   │   ├── scheduler.ts        # Automated reward distribution
│   │   ├── logic/              # Mathematical calculations
│   │   │   ├── rewards.ts      # Reward calculations
│   │   │   ├── rates.ts        # Interest rate logic
│   │   │   └── compounds.ts    # Compound interest
│   │   └── routes.ts           # Farming endpoints
│   ├── wallet/                 # Wallet Management Module
│   │   ├── controller.ts       # Wallet operations
│   │   ├── service.ts          # Balance management
│   │   ├── logic/              # Blockchain integration
│   │   │   ├── tonConnect.ts   # TON wallet connection
│   │   │   ├── transactions.ts # Transaction processing
│   │   │   └── validation.ts   # Address validation
│   │   └── routes.ts           # Wallet API
│   ├── referral/               # Referral System Module
│   │   ├── controller.ts       # Referral management
│   │   ├── service.ts          # Tree construction logic
│   │   ├── logic/              # Referral algorithms
│   │   │   ├── tree.ts         # Multi-level tree building
│   │   │   ├── rewards.ts      # Commission calculations
│   │   │   └── analytics.ts    # Performance metrics
│   │   └── routes.ts           # Referral endpoints
│   ├── boost/                  # Boost Package Module
│   │   ├── controller.ts       # Boost management
│   │   ├── service.ts          # Package logic
│   │   ├── logic/              # Boost calculations
│   │   └── routes.ts           # Boost API
│   ├── missions/               # Mission System Module
│   │   ├── controller.ts       # Mission tracking
│   │   ├── service.ts          # Mission logic
│   │   ├── logic/              # Mission algorithms
│   │   └── routes.ts           # Mission API
│   ├── telegram/               # Telegram Integration
│   │   ├── bot.ts              # Bot message handling
│   │   ├── webhook.ts          # Webhook processing
│   │   ├── commands/           # Bot commands
│   │   └── notifications.ts    # Push notifications
│   ├── admin/                  # Admin Panel Module
│   │   ├── controller.ts       # Admin operations
│   │   ├── service.ts          # Admin business logic
│   │   ├── dashboard.ts        # Analytics dashboard
│   │   └── routes.ts           # Admin API
│   └── dailyBonus/             # Daily Bonus System
│       ├── controller.ts       # Bonus management
│       ├── service.ts          # Streak logic
│       ├── scheduler.ts        # Daily reset automation
│       └── routes.ts           # Bonus API
│
├── 🗄️ Database Layer (shared/)
│   ├── schema.ts               # Complete Drizzle ORM schema
│   ├── migrations/             # Database migrations
│   ├── seeds/                  # Initial data seeding
│   └── types.ts                # Database type definitions
│
├── ⚙️ Core Infrastructure (core/)
│   ├── db.ts                   # Database connection management
│   ├── logger.ts               # Structured logging system
│   ├── cache.ts                # Redis caching layer
│   ├── middleware/             # Express middleware stack
│   │   ├── auth.ts             # Authentication middleware
│   │   ├── rateLimit.ts        # API rate limiting
│   │   ├── validation.ts       # Request validation
│   │   └── errorHandler.ts     # Global error handling
│   └── websocket.ts            # WebSocket server management
│
├── 🔧 Configuration (config/)
│   ├── app.ts                  # Application settings
│   ├── database.ts             # Database configuration
│   ├── telegram.ts             # Telegram Bot settings
│   ├── tonConnect.ts           # TON wallet configuration
│   └── security.ts             # Security settings
│
├── 🚀 Production Infrastructure
│   ├── Dockerfile              # Multi-stage Docker build
│   ├── docker-compose.prod.yml # Production services stack
│   ├── nginx.conf              # Nginx load balancer config
│   ├── production-config.js    # Production settings
│   ├── health-check.js         # System health monitoring
│   ├── production-readiness-check.js # Pre-deployment validation
│   └── .github/workflows/      # CI/CD automation
│
├── 📊 Monitoring & Logs
│   ├── prometheus.yml          # Metrics collection config
│   ├── grafana-dashboard.json  # Visualization dashboards
│   └── logs/                   # Application logs directory
│
└── 📚 Documentation
    ├── PRODUCTION_DEPLOYMENT_GUIDE.md # Deployment instructions
    ├── API_DOCUMENTATION.md          # API reference
    ├── ARCHITECTURE_OVERVIEW.md      # System design docs
    └── TROUBLESHOOTING.md            # Common issues guide
```

## 🗄️ Database Architecture (17 Tables)

### User Management Tables
```sql
-- Authentication data
auth_users (id, telegram_id, username, password_hash, created_at)

-- User profiles and balances
users (id, telegram_id, username, guest_id, ref_code, parent_ref_code, 
       balance_uni, balance_ton, wallet, ton_wallet_address, created_at)
```

### Farming System Tables
```sql
-- Main farming deposits
farming_deposits (id, user_id, amount, rate, start_timestamp, 
                 last_update, is_active, created_at)

-- UNI token specific farming
uni_farming_deposits (id, user_id, amount, start_timestamp, 
                     last_update, rate, is_active)
```

### Boost System Tables
```sql
-- Boost packages configuration
boost_packages (id, name, price, multiplier, duration_hours, 
               description, is_active)

-- TON boost packages
ton_boost_packages (id, name, ton_price, multiplier, duration_hours, 
                   description, is_active)

-- User boost purchases
boost_deposits (id, user_id, package_id, amount, start_timestamp, 
               end_timestamp, is_active)

-- TON boost purchases
ton_boost_deposits (id, user_id, package_id, ton_amount, start_timestamp, 
                   end_timestamp, is_active)

-- Active user boosts
user_boosts (id, user_id, boost_type, multiplier, start_timestamp, 
            end_timestamp, is_active)
```

### Financial Tables
```sql
-- All financial transactions
transactions (id, user_id, type, amount, currency, description, 
             reference_id, status, created_at)

-- Referral relationships
referrals (id, referrer_id, referred_id, level, commission_rate, 
          total_earned, is_active, created_at)
```

### Gamification Tables
```sql
-- Available missions
missions (id, title, description, reward_amount, reward_type, 
         requirements, is_active, created_at)

-- User mission progress
user_missions (id, user_id, mission_id, status, progress, 
              completed_at, reward_claimed)
```

### System Monitoring Tables
```sql
-- Application launch logs
launch_logs (id, timestamp, version, environment, status, details)

-- Database partition logs
partition_logs (id, table_name, partition_date, status, 
               records_count, created_at)

-- Reward distribution tracking
reward_distribution_logs (id, user_id, amount, type, source, 
                         distribution_date, status)

-- Performance metrics
performance_metrics (id, metric_name, metric_value, timestamp, 
                    tags, created_at)
```

## 🔄 Data Flow Architecture

### User Authentication Flow
```
Telegram WebApp → Auth Module → Database → JWT Token → Frontend Context
```

### Farming System Flow
```
User Deposit → Farming Service → Scheduler → Reward Calculation → Balance Update
```

### Referral System Flow
```
User Registration → Referral Tree Builder → Commission Calculator → Payout Queue
```

### Real-time Updates Flow
```
Backend Event → WebSocket Server → Client Context → UI Update
```

## 🚀 Production Services Stack

### Core Application Services
```yaml
unifarm-app:     # Main Node.js application
  - Port: 3000
  - Resources: 1GB RAM, 0.5 CPU
  - Health: /health endpoint
  - Scaling: Horizontal (multiple replicas)

nginx:           # Load balancer & reverse proxy
  - Ports: 80, 443 (SSL)
  - Features: Gzip, Caching, Rate limiting
  - SSL: Let's Encrypt certificates

redis:           # Caching layer
  - Port: 6379
  - Usage: Session storage, API caching
  - Persistence: RDB snapshots
```

### Monitoring Services
```yaml
prometheus:      # Metrics collection
  - Port: 9090
  - Metrics: Application, System, Custom
  - Retention: 30 days

grafana:         # Visualization dashboard
  - Port: 3001
  - Dashboards: System health, Business metrics
  - Alerts: Email, Telegram notifications
```

## 🔒 Security Architecture

### Authentication & Authorization
- JWT token-based authentication
- Telegram WebApp data validation
- Role-based access control (User, Admin)
- Session management with Redis

### API Security
- Rate limiting (10 req/sec per IP)
- Input validation with Zod schemas
- CORS protection
- Helmet.js security headers

### Infrastructure Security
- SSL/TLS encryption (Let's Encrypt)
- Nginx security headers
- Docker container isolation
- Environment variable protection

### Data Protection
- Database connection encryption
- Sensitive data hashing
- Audit logging
- GDPR compliance measures

## 📈 Scalability Design

### Horizontal Scaling
- Stateless application design
- Redis session storage
- Database connection pooling
- Load balancing with Nginx

### Performance Optimization
- Database indexing strategy
- API response caching
- Static asset compression
- CDN integration ready

### Monitoring & Alerting
- Real-time health checks
- Performance metrics tracking
- Error rate monitoring
- Business metrics dashboards

## 🔧 Development & Deployment

### Development Workflow
```bash
# Local development
npm run dev          # Start development servers
npm run db:push      # Apply database changes
npm run type-check   # TypeScript validation
```

### Production Deployment
```bash
# Automated CI/CD pipeline
git push origin main                    # Trigger deployment
docker-compose -f docker-compose.prod.yml up -d # Manual deployment
node production-readiness-check.js     # Pre-deployment validation
```

### Monitoring & Maintenance
```bash
# Health monitoring
curl https://unifarm.app/health        # System health check
docker logs unifarm-app -f             # Application logs
docker stats                           # Resource usage
```

## 📊 Business Logic Architecture

### Farming System
- Compound interest calculations
- Multi-tier rate structures
- Automated reward distribution
- Performance tracking

### Referral System
- 20-level deep referral tree
- Dynamic commission rates
- Real-time earnings tracking
- Analytics dashboard

### Boost System
- Time-based multipliers
- Package management
- TON payment integration
- Usage analytics

This architecture provides a robust foundation for UniFarm's production deployment with comprehensive monitoring, security, and scalability features.