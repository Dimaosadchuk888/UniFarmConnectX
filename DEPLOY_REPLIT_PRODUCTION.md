# Инструкция по деплою UniFarm в Replit Production

## Порядок деплоя в production

Выполните следующие шаги для правильного деплоя приложения в Replit production:

1. Остановите текущий dev-сервер (если запущен)
2. Выполните в shell: `npm run build` для создания production-билда
3. Нажмите кнопку "Deploy" в интерфейсе Replit
4. В настройках деплоя укажите:
   - Run command: `npm run start` (используйте команду запуска production-сервера)
   - Port: `5000` (порт, который будет использоваться внутри контейнера)
5. Дождитесь успешного деплоя
6. Проверьте, что приложение доступно по URL: https://uni-farm-connect-2-misterxuniverse.replit.app/

## Проверка работоспособности

После деплоя необходимо проверить:

1. Доступность основного приложения по URL https://uni-farm-connect-2-misterxuniverse.replit.app/
2. Доступность Mini App по URL https://uni-farm-connect-2-misterxuniverse.replit.app/UniFarm
3. Работу API-запросов через основной домен без порта
4. Работу Telegram-интеграции в Mini App

## Аудит URL для Telegram

После деплоя убедитесь, что в настройках Telegram бота (@UniFarming_Bot) используется именно URL:
https://uni-farm-connect-2-misterxuniverse.replit.app/UniFarm

## Проверка переменных окружения

Перед деплоем убедитесь, что в настройках проекта в разделе "Secrets" определены все необходимые переменные окружения:

- DATABASE_URL
- TELEGRAM_BOT_TOKEN
- PGDATABASE
- PGHOST
- PGPASSWORD
- PGPORT
- PGUSER