# Инструкция по деплою UniFarm через Replit Deployments

## Шаг 1: Подготовка проекта
1. Соберите production-версию приложения:
   ```bash
   npm run build
   ```
2. Остановите текущий workflow "Start application" (если он запущен)

## Шаг 2: Настройка деплоя
1. Нажмите кнопку **Deploy** в правом верхнем углу интерфейса Replit
2. Выберите **"Configure"** и настройте следующие параметры:
   - **Run Command**: `NODE_ENV=production node dist/index.js` 
   - **Always On**: ✅ Включено
   - **Autoscale**: ✅ Включено
   - **Domain**: uni-farm-connect-2-misterxuniverse.replit.app

## Шаг 3: Запустите деплой
Нажмите кнопку **Deploy** для запуска процесса деплоя.

## Шаг 4: Проверка успешности деплоя
После деплоя проверьте следующие URL:
- Основной сайт: https://uni-farm-connect-2-misterxuniverse.replit.app
- Mini App URL: https://uni-farm-connect-2-misterxuniverse.replit.app/UniFarm

## Настройка Telegram бота (после успешного деплоя)

```bash
# Обновите webhook
node setup-telegram-webhook.js

# Обновите настройки Mini App
node setup-telegram-mini-app.js

# Проверьте API через production-домен
node test-production-api.mjs
```

## Если нужно перезапустить деплой
1. Зайдите в раздел **Deployments** в Replit
2. Найдите текущий активный деплой
3. Нажмите на три точки справа и выберите **Restart**