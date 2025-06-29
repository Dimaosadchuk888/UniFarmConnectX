# UniFarm Production Deployment Guide
## Полное руководство по развертыванию в продакшене

## 🏗️ Полная Модульная Архитектура UniFarm

### Структура проекта:
```
UniFarm/
├── 📱 Frontend (client/)
│   ├── src/
│   │   ├── components/           # UI компоненты
│   │   │   ├── farming/         # Компоненты фарминга
│   │   │   ├── wallet/          # Компоненты кошелька  
│   │   │   ├── missions/        # Компоненты заданий
│   │   │   └── ui/              # UI библиотека
│   │   ├── contexts/            # React контексты
│   │   │   ├── userContext.tsx  # Контекст пользователя
│   │   │   ├── NotificationContext.tsx # Уведомления
│   │   │   └── webSocketContext.tsx # WebSocket
│   │   ├── hooks/               # Кастомные хуки
│   │   ├── modules/             # Клиентские модули
│   │   │   ├── auth/           # Аутентификация
│   │   │   ├── farming/        # Фарминг сервисы
│   │   │   ├── wallet/         # Кошелек сервисы
│   │   │   ├── referral/       # Реферальные сервисы
│   │   │   └── missions/       # Задания сервисы
│   │   └── utils/              # Утилиты
│   └── public/                 # Статические файлы

├── 🔧 Backend (modules/)
│   ├── auth/                   # Модуль аутентификации
│   │   ├── controller.ts       # Auth контроллер
│   │   ├── service.ts          # Бизнес-логика
│   │   ├── routes.ts           # API роуты
│   │   └── types.ts            # TypeScript типы
│   ├── user/                   # Модуль пользователей
│   ├── farming/                # Модуль фарминга
│   │   ├── controller.ts       # Farming контроллер
│   │   ├── service.ts          # Логика фарминга
│   │   ├── logic/              # Расчеты доходности
│   │   └── routes.ts           # Farming API
│   ├── wallet/                 # Модуль кошелька
│   │   ├── controller.ts       # Wallet контроллер
│   │   ├── service.ts          # Операции с балансом
│   │   ├── logic/              # TON интеграция
│   │   └── routes.ts           # Wallet API
│   ├── referral/               # Модуль рефералов
│   │   ├── controller.ts       # Referral контроллер
│   │   ├── service.ts          # Реферальная логика
│   │   ├── logic/              # Построение дерева
│   │   └── routes.ts           # Referral API
│   ├── boost/                  # Модуль буст-пакетов
│   ├── missions/               # Модуль заданий
│   ├── telegram/               # Telegram бот
│   ├── admin/                  # Админ панель
│   └── dailyBonus/             # Ежедневные бонусы

├── 🗄️ Database (shared/)
│   └── schema.ts               # Drizzle ORM схемы

├── ⚙️ Core (core/)
│   ├── db.ts                   # Подключение к БД
│   ├── logger.ts               # Система логирования
│   └── middleware/             # Express middleware

├── 🔧 Config (config/)
│   ├── app.ts                  # Основные настройки
│   ├── database.ts             # Настройки БД
│   ├── telegram.ts             # Telegram конфиг
│   └── tonConnect.ts           # TON кошелек

└── 🚀 Production Files
    ├── Dockerfile              # Docker контейнер
    ├── docker-compose.prod.yml # Production compose
    ├── nginx.conf              # Nginx конфигурация
    ├── health-check.js         # Мониторинг здоровья
    └── production-config.js    # Production настройки
```

## 🗄️ Database Schema (17 таблиц)

### Пользователи и аутентификация:
- `auth_users` - Данные аутентификации
- `users` - Профили пользователей

### Фарминг система:
- `farming_deposits` - Основные депозиты
- `uni_farming_deposits` - UNI фарминг депозиты

### Boost система:
- `boost_deposits` - Boost депозиты
- `ton_boost_deposits` - TON boost депозиты  
- `boost_packages` - Пакеты boost
- `ton_boost_packages` - TON boost пакеты
- `user_boosts` - Активные boost пользователей

### Финансы:
- `transactions` - История всех транзакций
- `referrals` - Реферальные связи

### Геймификация:
- `missions` - Доступные задания
- `user_missions` - Выполненные задания

### Системные таблицы:
- `launch_logs` - Логи запуска системы
- `partition_logs` - Логи партиций БД
- `reward_distribution_logs` - Логи выплат
- `performance_metrics` - Метрики производительности

## 🚀 Production Deployment

### Шаг 1: Подготовка сервера
```bash
# Установка Docker и Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose-plugin

# Создание директории проекта
mkdir /opt/unifarm
cd /opt/unifarm
```

### Шаг 2: Клонирование и настройка
```bash
# Клонирование репозитория
git clone <repository-url> .

# Создание production environment файла
cat > .env.production << EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@host:5432/unifarm
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
SESSION_SECRET=your_session_secret
GRAFANA_PASSWORD=your_grafana_password
EOF
```

### Шаг 3: SSL сертификаты
```bash
# Создание директории для SSL
mkdir ssl

# Получение Let's Encrypt сертификата
sudo apt install certbot
sudo certbot certonly --standalone -d unifarm.app -d www.unifarm.app

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/unifarm.app/fullchain.pem ssl/unifarm.crt
sudo cp /etc/letsencrypt/live/unifarm.app/privkey.pem ssl/unifarm.key
sudo chown $USER:$USER ssl/*
```

### Шаг 4: Запуск production окружения
```bash
# Сборка и запуск контейнеров
docker-compose -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f unifarm
```

### Шаг 5: Миграции базы данных
```bash
# Выполнение миграций
docker exec unifarm-app npm run db:push

# Проверка таблиц
docker exec unifarm-app npm run db:check
```

## 🔒 Security Configuration

### Environment Variables (обязательные):
```bash
DATABASE_URL=postgresql://...        # PostgreSQL подключение
TELEGRAM_BOT_TOKEN=...              # Telegram бот токен  
SESSION_SECRET=...                  # Секрет для сессий
NEON_API_KEY=...                   # Neon Database API
NEON_PROJECT_ID=...                # Neon Project ID
```

### Nginx Security Headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000
- Content-Security-Policy: настроена для Telegram WebApp

### Rate Limiting:
- API endpoints: 10 requests/second per IP
- Static files: 30 requests/second per IP
- Общий лимит: 100 requests/15 minutes per IP

## 📊 Monitoring и Health Checks

### Health Check Endpoints:
- `GET /health` - Полная проверка системы
- Проверяет: Database, Memory, Telegram Bot, API endpoints

### Monitoring Stack:
- **Prometheus** - Сбор метрик (port 9090)
- **Grafana** - Визуализация (port 3001)
- **Nginx** - Access/Error логи
- **Application** - Structured logging

### Логирование:
```bash
# Просмотр логов приложения
docker logs unifarm-app -f

# Просмотр логов Nginx
docker logs unifarm-nginx -f

# Системные логи
tail -f /opt/unifarm/logs/app.log
tail -f /opt/unifarm/logs/error.log
```

## 🔄 CI/CD Pipeline

### GitHub Actions автоматически:
1. Запускает тесты на каждый commit
2. Проверяет безопасность (npm audit)
3. Собирает Docker образ
4. Деплоит в production при merge в main
5. Выполняет health check после деплоя

### Manual Deployment:
```bash
# Обновление приложения
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Проверка health check
curl -f https://unifarm.app/health
```

## 📱 Telegram Mini App Configuration

### Telegram Bot Setup:
1. Создать бота через @BotFather
2. Получить токен и установить в .env
3. Настроить Menu Button на WebApp URL
4. Настроить webhook для production

### WebApp Features:
- Аутентификация через Telegram
- TON Connect интеграция
- Push уведомления через бота
- Cloud Storage для пользовательских данных

## 🔧 Performance Optimization

### Database:
- Connection pooling (2-20 connections)
- Индексы на всех foreign keys
- Партиционирование логов по времени

### Application:
- Gzip compression
- Static files caching (1 year)
- API response caching (Redis)
- CDN для статических ресурсов

### Infrastructure:
- Nginx load balancer
- Docker container limits
- Automatic health checks
- Zero-downtime deployments

## 📈 Scaling Guidelines

### Horizontal Scaling:
```yaml
# docker-compose.prod.yml
services:
  unifarm:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
```

### Database Scaling:
- Read replicas для аналитики
- Connection pooling
- Кеширование часто запрашиваемых данных

## 🚨 Troubleshooting

### Общие проблемы:
```bash
# Проверка статуса контейнеров
docker-compose ps

# Перезапуск сервиса
docker-compose restart unifarm

# Очистка логов
docker system prune -f

# Проверка используемых портов  
netstat -tulpn | grep :3000
```

### Database Issues:
```bash
# Проверка подключения к БД
docker exec unifarm-app npm run db:check

# Восстановление подключения
docker-compose restart unifarm
```

## ✅ Production Checklist

### Pre-deployment:
- [ ] SSL сертификаты настроены
- [ ] Environment variables установлены
- [ ] Database миграции выполнены
- [ ] Backup стратегия настроена
- [ ] Мониторинг работает

### Post-deployment:
- [ ] Health check проходит
- [ ] Telegram бот отвечает
- [ ] API endpoints доступны
- [ ] Static files загружаются
- [ ] WebSocket подключение работает

---

**UniFarm готов к production деплою! 🚀**

Все компоненты архитектуры настроены, безопасность обеспечена, мониторинг работает.