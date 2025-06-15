
# РУЧНОЙ ЧЕК-ЛИСТ UniFarm Connect

## 🔍 БЫСТРАЯ ПРОВЕРКА ПЕРЕД ДЕПЛОЕМ

### 1. ✅ ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
- [ ] `SUPABASE_URL` установлена и валидна
- [ ] `SUPABASE_KEY` установлена и валидна  
- [ ] `TELEGRAM_BOT_TOKEN` установлен и работает
- [ ] `JWT_SECRET` установлен (минимум 32 символа)
- [ ] `SESSION_SECRET` установлен
- [ ] `REPLIT_DEV_DOMAIN` корректно указывает на текущий домен
- [ ] Удалены устаревшие PostgreSQL переменные (DATABASE_URL, PGHOST, etc.)

### 2. 🗄️ БАЗА ДАННЫХ SUPABASE
- [ ] Подключение к Supabase работает
- [ ] Таблица `users` существует и доступна
- [ ] Таблица `transactions` существует и доступна
- [ ] Таблица `referrals` существует и доступна
- [ ] Таблица `farming_sessions` существует и доступна
- [ ] Таблица `user_sessions` существует и доступна

### 3. 📦 КРИТИЧЕСКИЕ МОДУЛИ
- [ ] `auth` - контроллер, сервис, маршруты
- [ ] `user` - контроллер, сервис, маршруты
- [ ] `farming` - контроллер, сервис, маршруты
- [ ] `wallet` - контроллер, сервис, маршруты
- [ ] `referral` - контроллер, сервис, маршруты
- [ ] `telegram` - контроллер, сервис, маршруты

### 4. 📡 API ENDPOINTS
**Публичные (должны работать):**
- [ ] `GET /health` → 200 OK
- [ ] `GET /api/v2/health` → 200 OK

**Защищенные (должны возвращать 401 без авторизации):**
- [ ] `GET /api/v2/users/profile` → 401 Unauthorized
- [ ] `GET /api/v2/farming/status` → 401 Unauthorized
- [ ] `GET /api/v2/wallet/balance` → 401 Unauthorized
- [ ] `GET /api/v2/referral/info` → 401 Unauthorized

### 5. 🔒 БЕЗОПАСНОСТЬ
- [ ] Все protected endpoints требуют авторизацию
- [ ] Middleware авторизации работает корректно
- [ ] Admin endpoints дополнительно защищены
- [ ] CORS настроен правильно
- [ ] Telegram auth middleware активен

### 6. 📱 TELEGRAM ИНТЕГРАЦИЯ
- [ ] Bot API доступен (проверить через `/getMe`)
- [ ] Webhook установлен на правильный URL
- [ ] Telegram auth middleware обрабатывает initData
- [ ] Файлы telegram модуля присутствуют

### 7. 🌐 FRONTEND
- [ ] Главная страница загружается (HTTP 200)
- [ ] React приложение инициализируется
- [ ] Telegram WebApp script подключен
- [ ] Manifest файлы доступны
- [ ] Meta теги для WebApp присутствуют

### 8. ⚙️ СИСТЕМНЫЕ ФАЙЛЫ
- [ ] `server/index.ts` - главный сервер
- [ ] `server/routes.ts` - API маршруты
- [ ] `core/config.ts` - конфигурация
- [ ] `core/supabaseClient.ts` - подключение к БД
- [ ] `core/logger.ts` - система логирования
- [ ] `package.json` - зависимости

### 9. 🚀 ГОТОВНОСТЬ К ДЕПЛОЮ
- [ ] Сервер запускается без ошибок
- [ ] Все критические модули загружаются
- [ ] База данных доступна
- [ ] API отвечает корректно
- [ ] Frontend отображается
- [ ] Логи не содержат критических ошибок

## 🎯 КОМАНДЫ ДЛЯ БЫСТРОЙ ПРОВЕРКИ

```bash
# Запуск автоматического чек-листа
node FINAL_TOTAL_SYSTEM_CHECKLIST.js

# Проверка health endpoints
curl https://your-domain.replit.dev/health
curl https://your-domain.replit.dev/api/v2/health

# Проверка защищенного endpoint
curl https://your-domain.replit.dev/api/v2/users/profile

# Проверка Telegram Bot
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
```

## 📊 КРИТЕРИИ ГОТОВНОСТИ

**🟢 ГОТОВО К ПРОДАКШЕН:**
- Все разделы ✅ или ⚠️
- Нет критических ❌
- База данных работает
- API endpoints защищены

**🟡 ПОЧТИ ГОТОВО:**
- 1-2 критические проблемы
- Основная функциональность работает
- Требуется минимальная доработка

**🔴 НЕ ГОТОВО:**
- 3+ критических проблем
- БД недоступна
- API не работает
- Требуется серьезная доработка

## 🛠️ РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

1. **Начните с критических ❌ проблем**
2. **Убедитесь в работе базы данных**
3. **Проверьте все переменные окружения**
4. **Протестируйте ключевые API endpoints**
5. **Убедитесь в корректности Telegram интеграции**
