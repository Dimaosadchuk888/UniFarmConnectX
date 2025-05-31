# Краткое руководство по деплою UniFarm в Replit Production

## Подготовка проекта

1. **Сборка проекта**:
   ```bash
   npm run build
   ```
   Убедитесь, что папка `dist/` создана и содержит файлы.

2. **Остановка текущего workflow**:
   - Перейдите во вкладку Shell & Output
   - Остановите текущий workflow "Start application" (если запущен)

## Настройка и запуск Replit Deploy

1. **Нажмите кнопку Deploy** в правом верхнем углу интерфейса Replit.

2. **Настройте следующие параметры**:
   - Run Command: `NODE_ENV=production node dist/index.js`
   - Always On: ✅ Включено
   - Autoscale: ✅ Включено
   - Domain: uni-farm-connect-2-misterxuniverse.replit.app

3. **Нажмите Deploy** для запуска процесса деплоя.

## Проверка после деплоя

1. **Проверьте доступность URL**:
   - Основной URL: https://uni-farm-connect-2-misterxuniverse.replit.app
   - Mini App URL: https://uni-farm-connect-2-misterxuniverse.replit.app/UniFarm

2. **Обновите настройки Telegram** (после успешного деплоя):
   ```bash
   node setup-telegram-webhook.js
   node setup-telegram-mini-app.js
   ```

3. **Проверьте API**:
   ```bash
   node test-production-api.mjs
   ```

## Важные замечания

- Приложение запускается напрямую из скомпилированного кода (`dist/index.js`)
- Установлен режим NODE_ENV=production
- Специальные маршруты `/UniFarm`, `/app`, `/telegram` настроены автоматически
- Все статические файлы обслуживаются из директории `dist/public`