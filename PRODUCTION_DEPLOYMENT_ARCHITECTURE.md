# UniFarm - Полная Модульная Архитектура и Подготовка к Продакшену

## 🏗️ Общая Архитектура Проекта

```
UniFarm/
├── 📁 client/                    # Frontend React приложение
│   ├── src/
│   │   ├── components/          # UI компоненты
│   │   ├── contexts/           # React контексты
│   │   ├── hooks/              # Кастомные хуки
│   │   ├── core/               # Основная логика клиента
│   │   ├── modules/            # Модульные сервисы
│   │   └── utils/              # Утилиты
│   └── public/                 # Статические файлы
│
├── 📁 server/                   # Backend Express сервер
│   ├── index.ts               # Главная точка входа
│   ├── db.ts                  # Подключение к БД
│   └── vite.ts                # Vite сервер
│
├── 📁 modules/                  # Бизнес-логика модулей
│   ├── auth/                  # Аутентификация
│   ├── user/                  # Управление пользователями
│   ├── wallet/                # Кошелек и баланс
│   ├── farming/               # Фарминг UNI
│   ├── referral/              # Реферальная система
│   ├── boost/                 # Boost пакеты
│   ├── missions/              # Система заданий
│   ├── telegram/              # Telegram бот
│   ├── admin/                 # Админ панель
│   └── dailyBonus/            # Ежедневные бонусы
│
├── 📁 core/                     # Ядро системы
│   ├── db.ts                  # База данных
│   ├── logger.ts              # Логирование
│   └── middleware/            # Промежуточное ПО
│
├── 📁 shared/                   # Общие типы и схемы
│   └── schema.ts              # Drizzle схемы БД
│
├── 📁 config/                   # Конфигурации
│   ├── app.ts                 # Основные настройки
│   ├── database.ts            # БД конфиг
│   ├── telegram.ts            # Telegram настройки
│   └── tonConnect.ts          # TON кошелек
│
├── 📁 types/                    # TypeScript типы
└── 📁 utils/                    # Общие утилиты
```

## 🔧 Детальная Модульная Структура

### 1. Frontend Модули (client/src/modules/)

**Farming Module**
```typescript
modules/farming/
├── farmingService.ts          # API запросы фарминга
├── farmingUtils.ts            # Утилиты расчетов
└── types.ts                   # Типы фарминга
```

**Wallet Module**
```typescript
modules/wallet/
├── walletService.ts           # Управление кошельком
├── balanceService.ts          # Работа с балансом
└── tonConnectService.ts       # TON интеграция
```

**Referral Module**
```typescript
modules/referral/
├── referralService.ts         # Реферальная система
├── referralCalculator.ts      # Расчет комиссий
└── referralTree.ts            # Построение дерева
```

### 2. Backend Модули (modules/)

**Auth Module**
```typescript
modules/auth/
├── controller.ts              # Auth контроллер
├── service.ts                 # Бизнес-логика
├── middleware.ts              # Auth middleware
└── routes.ts                  # API роуты
```

**User Module**
```typescript
modules/user/
├── controller.ts              # User контроллер
├── service.ts                 # Управление профилями
├── queries.ts                 # DB запросы
└── routes.ts                  # API endpoints
```

**Farming Module**
```typescript
modules/farming/
├── controller.ts              # Farming контроллер
├── service.ts                 # Логика фарминга
├── calculator.ts              # Расчет доходности
├── scheduler.ts               # Автоматические выплаты
└── routes.ts                  # Farming API
```

**Wallet Module**
```typescript
modules/wallet/
├── controller.ts              # Wallet контроллер
├── service.ts                 # Операции с балансом
├── tonService.ts              # TON интеграция
├── transactionService.ts      # История транзакций
└── routes.ts                  # Wallet API
```

**Referral Module**
```typescript
modules/referral/
├── controller.ts              # Referral контроллер
├── service.ts                 # Реферальная логика
├── treeBuilder.ts             # Построение дерева
├── commissionCalculator.ts    # Расчет комиссий
└── routes.ts                  # Referral API
```

**Boost Module**
```typescript
modules/boost/
├── controller.ts              # Boost контроллер
├── service.ts                 # Boost пакеты
├── tonBoostService.ts         # TON boost логика
└── routes.ts                  # Boost API
```

**Missions Module**
```typescript
modules/missions/
├── controller.ts              # Missions контроллер
├── service.ts                 # Система заданий
├── validator.ts               # Проверка выполнения
└── routes.ts                  # Missions API
```

**Telegram Module**
```typescript
modules/telegram/
├── bot.ts                     # Telegram бот
├── handlers/                  # Обработчики команд
├── webhooks.ts                # Webhook handlers
└── notifications.ts           # Уведомления
```

**Admin Module**
```typescript
modules/admin/
├── controller.ts              # Admin контроллер
├── dashboard.ts               # Админ панель
├── analytics.ts               # Аналитика
└── routes.ts                  # Admin API
```

### 3. Core System (core/)

**Database Layer**
```typescript
core/db.ts                     # Drizzle ORM подключение
core/migrations/               # Миграции БД
core/seeds/                    # Начальные данные
```

**Logging System**
```typescript
core/logger.ts                 # Winston логирование
core/monitoring/               # Мониторинг системы
```

**Middleware**
```typescript
core/middleware/
├── auth.ts                    # Аутентификация
├── cors.ts                    # CORS настройки
├── rateLimit.ts               # Rate limiting
├── validation.ts              # Валидация запросов
└── errorHandler.ts            # Обработка ошибок
```

## 📊 База Данных - Схема Таблиц

### Основные Таблицы
```sql
-- Пользователи
auth_users                     # Аутентификация
users                         # Профили пользователей

-- Фарминг
farming_deposits              # Депозиты фарминга
uni_farming_deposits          # UNI фарминг депозиты

-- Boost системы
boost_deposits                # Boost депозиты
ton_boost_deposits            # TON boost депозиты
boost_packages                # Пакеты boost
ton_boost_packages            # TON boost пакеты
user_boosts                   # Активные boost пользователей

-- Финансы
transactions                  # История транзакций
referrals                     # Реферальные связи

-- Геймификация
missions                      # Доступные задания
user_missions                 # Выполненные задания

-- Системные
launch_logs                   # Логи запуска
partition_logs                # Логи партиций
reward_distribution_logs      # Логи выплат
performance_metrics           # Метрики производительности
```

## 🔒 Безопасность и Конфигурация

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
NEON_API_KEY=...
NEON_PROJECT_ID=...

# Telegram
TELEGRAM_BOT_TOKEN=...

# TON Blockchain
TON_CENTER_API_KEY=...
TON_NETWORK=mainnet

# Security
JWT_SECRET=...
SESSION_SECRET=...
CORS_ORIGIN=...

# Production
NODE_ENV=production
PORT=3000
```

### Security Middleware
- CORS protection
- Rate limiting
- Input validation
- XSS protection
- CSRF protection
- Helmet security headers

## 🚀 Production Deployment Configuration

### Docker Configuration
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
# Build process...

FROM node:18-alpine AS production
# Production runtime...
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name unifarm.app;
    
    # Static files
    location /static/ {
        alias /var/www/static/;
        expires 1y;
    }
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

### PM2 Configuration
```json
{
  "name": "unifarm",
  "script": "dist/server/index.js",
  "instances": "max",
  "exec_mode": "cluster",
  "env_production": {
    "NODE_ENV": "production",
    "PORT": 3000
  }
}
```

## 📈 Мониторинг и Аналитика

### Логирование
- Winston для структурированных логов
- Разные уровни (error, warn, info, debug)
- Ротация логов по размеру и времени

### Метрики
- Performance metrics в БД
- API response times
- Database query performance
- User activity analytics

### Health Checks
- Database connectivity
- External API availability
- Memory and CPU usage
- Disk space monitoring

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    # Build, test, deploy steps
```

### Deployment Steps
1. Code quality checks (ESLint, TypeScript)
2. Unit tests execution
3. Build optimization
4. Database migrations
5. Zero-downtime deployment
6. Health checks verification

## 📱 Telegram Mini App Integration

### WebApp Features
- Telegram user authentication
- TON Connect wallet integration
- Native Telegram UI components
- Cloud storage for user data
- Push notifications via bot

### Bot Commands
```
/start - Запуск приложения
/balance - Проверка баланса
/farming - Статус фарминга
/referral - Реферальная ссылка
/help - Помощь
```

---

*Архитектура готова к масштабированию и production deployment*