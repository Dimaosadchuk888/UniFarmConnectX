# 🚀 UniFarm - Quick Start Guide

## 📋 Быстрый старт для разработчиков

### 1. Требования к системе
- Node.js 18+ 
- PostgreSQL (Supabase)
- Telegram Bot Token

### 2. Переменные окружения

Создайте файл `.env` со следующими обязательными переменными:

```bash
# База данных (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_BOT_TOKEN=your_admin_bot_token

# JWT
JWT_SECRET=your_jwt_secret_key

# Домен приложения
APP_DOMAIN=https://your-domain.replit.app

# TON Payments
TON_BOOST_RECEIVER_ADDRESS=your_ton_wallet_address
```

### 3. Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск в development режиме
npm run dev

# Запуск в production режиме
npm start
```

### 4. Структура проекта

```
unifarm/
├── client/           # React Frontend
├── server/           # Express Backend
├── modules/          # Бизнес-модули
├── core/            # Ядро системы
├── shared/          # Общие типы
├── config/          # Конфигурация
└── tests/           # Тесты
```

### 5. Основные API endpoints

- **Auth**: `POST /api/v2/auth/telegram`
- **User**: `GET /api/v2/users/profile`
- **Wallet**: `GET /api/v2/wallet/balance`
- **Farming**: `GET /api/v2/farming/status`
- **Boost**: `GET /api/v2/boost/packages`
- **Monitor**: `GET /api/v2/monitor/health`

### 6. Telegram Mini App

1. Создайте бота через @BotFather
2. Установите Web App URL: `https://your-domain.replit.app`
3. Запустите Mini App командой `/start` в боте

### 7. Admin Panel

Используйте отдельного бота @unifarm_admin_bot для:
- Просмотра статистики системы
- Управления пользователями
- Обработки заявок на вывод средств
- Мониторинга системы

### 8. Тестирование

```bash
# E2E тесты
node tests/full_e2e_check.js

# Проверка готовности
node tests/pre_test_check.js
```

### 9. Production Checklist

- [ ] Все переменные окружения установлены
- [ ] JWT секрет уникальный и безопасный
- [ ] TON адрес кошелька правильный
- [ ] Telegram боты настроены
- [ ] База данных Supabase подключена
- [ ] SSL сертификат активен
- [ ] Мониторинг настроен

### 10. Поддержка

- **Документация**: См. `/docs/` директорию
- **Архитектура**: См. `replit.md`
- **API Docs**: См. `/docs/API_ENDPOINTS.md`

---

## ⚡ Быстрые команды

```bash
# Проверка здоровья системы
curl http://localhost:3000/api/v2/monitor/health

# Проверка критических endpoints
curl http://localhost:3000/api/v2/monitor/status

# Просмотр логов
tail -f logs/app.log
```

## 🔒 Безопасность

1. **Никогда** не коммитьте `.env` файл
2. Используйте сильные JWT секреты
3. Ограничивайте доступ к админ-боту
4. Регулярно обновляйте зависимости
5. Мониторьте подозрительную активность

## 📊 Мониторинг

Система включает встроенный мониторинг:
- Health checks: `/api/v2/monitor/health`
- API status: `/api/v2/monitor/status`
- System stats: `/api/v2/monitor/stats`

---

**Готовность к production**: 85%  
**Последнее обновление**: 06 июля 2025