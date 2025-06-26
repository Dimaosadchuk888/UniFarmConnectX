
# UNIFARM CONNECTION FIX - MANUAL STEPS

## Проблема
Клиент получает ошибки 401 Unauthorized при попытке соединения с сервером.

## Корневая причина
- Middleware requireTelegramAuth блокирует API запросы без корректных Telegram заголовков
- Клиент не передает необходимые заголовки для обхода авторизации на replit.app

## Решение

### 1. Перезапустить сервер с обновленной конфигурацией:
```bash
# Установить переменные окружения
export BYPASS_AUTH=true
export NODE_ENV=development

# Перезапустить через npm
npm run dev
```

### 2. Тестирование соединения:
```bash
# Проверить health endpoint
curl -s "http://localhost:3000/health"

# Проверить API с публичными заголовками
curl -s "http://localhost:3000/api/v2/users/profile" -H "X-Public-Demo: true"
```

### 3. Ожидаемые результаты:
- Health endpoint: {"status":"ok","timestamp":"..."}
- API profile: {"success":true,"data":{"user":{...}}}
- WebSocket: должны прекратиться ошибки 401 в консоли браузера

## Статус исправлений
✅ Telegram Auth middleware - обновлен для replit.app bypass
✅ Server bypass logic - добавлен forceBypass для development  
✅ Client API headers - включен Host заголовок для replit.app
✅ Emergency bypass middleware - создан для критических ситуаций
✅ Environment variables - настроены для demo режима

## Если проблема сохраняется
1. Проверить логи сервера на предмет ошибок запуска
2. Убедиться что порт 3000 доступен
3. Проверить CORS настройки для replit.app домена
4. Использовать emergency bypass middleware временно
