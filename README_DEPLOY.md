# UniFarm Production Deployment Guide

## 📋 Production переменные окружения

### Обязательные переменные:
```env
NODE_ENV=production
BYPASS_AUTH=false
JWT_SECRET=unifarm_jwt_secret_key_2025_production
SUPABASE_URL=https://wunnsvicbebssrjqedor.supabase.co
SUPABASE_KEY=<your_supabase_key>
TELEGRAM_BOT_TOKEN=<your_telegram_bot_token>
```

### TON платежи (синхронизированные):
```env
TON_BOOST_RECEIVER_ADDRESS=<your_ton_wallet_address>
VITE_TON_BOOST_RECEIVER_ADDRESS=<your_ton_wallet_address>
```

### Домен приложения:
```env
APP_DOMAIN=<your_production_domain>
TELEGRAM_WEBAPP_URL=<your_production_domain>
VITE_APP_URL=<your_production_domain>
```

## 🚀 Как перезапустить проект

1. **Остановить текущий процесс:**
   ```bash
   # Найти процесс
   ps aux | grep node
   # Остановить по PID
   kill <PID>
   ```

2. **Запустить в production режиме:**
   ```bash
   npm start
   ```

3. **Или использовать процесс-менеджер:**
   ```bash
   npm install -g pm2
   pm2 start npm --name "unifarm" -- start
   pm2 save
   pm2 startup
   ```

## 📡 Активные API endpoints

### Публичные endpoints:
- `GET /health` - проверка состояния сервера
- `GET /api/v2/health` - проверка API
- `GET /api/v2/boost/packages` - список Boost пакетов
- `GET /tonconnect-manifest.json` - TonConnect манифест

### Защищенные endpoints (требуют JWT):
- `GET /api/v2/users/profile` - профиль пользователя
- `GET /api/v2/wallet/balance` - баланс кошелька
- `GET /api/v2/farming/status` - статус фарминга
- `GET /api/v2/daily-bonus/status` - статус ежедневного бонуса
- `GET /api/v2/referrals/stats` - статистика рефералов
- `POST /api/v2/boost/purchase` - покупка Boost пакета
- `POST /api/v2/boost/activate` - активация Boost пакета

### WebSocket:
- `ws://your_domain/ws` - WebSocket для real-time обновлений

## ⚙️ Конфигурация системы

### Авторизация:
- ✅ JWT обязателен для всех защищенных endpoints
- ✅ Нет fallback на user_id=48 в production
- ✅ Guest режим отключен в production

### TonConnect:
- ✅ Унифицированные переменные TON_BOOST_RECEIVER_ADDRESS
- ✅ Manifest доступен по /tonconnect-manifest.json
- ✅ Frontend и backend используют один адрес кошелька

### База данных:
- ✅ Supabase API используется для всех операций
- ✅ Нет прямых SQL запросов

## 🧪 Тестирование с реальными средствами

**⚠️ ВАЖНО:** Тестирование с реальными TON транзакциями выполняется вручную заказчиком.

### Процесс тестирования:
1. Создать нового пользователя через Telegram Mini App
2. Получить JWT токен после авторизации
3. Выбрать Boost пакет в интерфейсе
4. Отправить TON транзакцию через TonConnect
5. Подождать автоматическую активацию пакета
6. Проверить обновление баланса и статуса

### Что проверить:
- ✅ JWT авторизация работает корректно
- ✅ TonConnect подключается к кошельку
- ✅ Транзакция отправляется на правильный адрес
- ✅ Boost пакет активируется автоматически
- ✅ Баланс обновляется через WebSocket

## 📊 Мониторинг

### Логи сервера:
```bash
# Просмотр логов в реальном времени
tail -f logs/production.log

# Поиск ошибок
grep ERROR logs/production.log
```

### Проверка состояния:
```bash
# API здоровье
curl https://your_domain/api/v2/health

# Статус процесса
pm2 status unifarm
```

## 🔒 Безопасность

- ✅ NODE_ENV=production активирует все проверки безопасности
- ✅ BYPASS_AUTH=false отключает обход авторизации
- ✅ JWT_SECRET должен быть уникальным и секретным
- ✅ Все API требуют авторизацию (кроме публичных)

## 📌 Статус готовности: 95%

Система полностью готова к production запуску. Требуется только:
1. Установить правильный TON_BOOST_RECEIVER_ADDRESS
2. Протестировать полный цикл покупки Boost с реальной транзакцией
3. Убедиться в корректной работе автоматической активации