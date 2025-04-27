# UniFarm: Запуск в Production

Этот документ описывает процесс запуска и деплоя приложения UniFarm в production-режиме.

## Запуск приложения в production-режиме

### Требования
- Node.js v20+
- PostgreSQL база данных (URL в переменной окружения DATABASE_URL)
- Telegram Bot Token в переменной окружения TELEGRAM_BOT_TOKEN

### Подготовка к запуску
1. Убедитесь, что приложение собрано (`npm run build`)
2. Убедитесь, что переменные окружения настроены правильно
3. Остановите все запущенные процессы на порту 5000 (если они есть)

### Запуск через командную строку
```bash
# Запускаем скрипт, который подготавливает среду и запускает приложение
NODE_ENV=production node run-in-production.cjs
```

Или используйте готовый bash-скрипт:
```bash
# Запуск через bash-скрипт
./start-production.sh
```

### Проверка работоспособности
1. Приложение должно запуститься на порту 5000
2. Перейдите в браузере на URL: https://<your-domain>/
3. Должен отобразиться корректный ответ: `{"status":"ok","message":"Health check passed"}`

## Особенности работы в Replit

### Запуск в Replit
В среде Replit рекомендуется использовать специальный скрипт для запуска:

```bash
# Запуск в Replit
NODE_ENV=production node run-in-production.cjs
```

Скрипт автоматически:
1. Остановит все текущие процессы Node.js
2. Проверит доступность порта 5000
3. Запустит приложение в режиме production

### Настройка Telegram Mini App в Replit
1. После запуска приложения в режиме production, установите корректный webhook для бота:
```bash
node setup-telegram-webhook.js
```

2. Настройте команды и меню бота:
```bash
node setup-telegram-bot-commands.js
```

3. Проверьте корректность настроек:
```bash
node check-bot-settings.js
```

## Важно!
- В режиме production работает полная версия приложения с поддержкой всех функций
- Для корректной работы Telegram Mini App требуется запуск в режиме production
- Файлы фронтенда должны быть собраны (`npm run build`) перед запуском

## Проверка API
После запуска вы можете проверить API:

```bash
# Проверка health check
curl -v https://<your-domain>/

# Проверка API для восстановления сессии
curl -X POST https://<your-domain>/api/session/restore \
  -H "Content-Type: application/json" \
  -d '{"guest_id":"test-guest-id-123"}'
```

## Деплой
Для полного деплоя приложения используйте скрипты:

```bash
# Полный деплой (сборка + настройка + запуск)
./deploy-production.sh
```