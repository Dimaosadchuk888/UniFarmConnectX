# Руководство по деплою UniFarm на Replit (Production)

## Подготовка к деплою

### 1. Проверка необходимых переменных окружения

Убедитесь, что в проекте настроены все необходимые переменные окружения:

- **База данных Replit PostgreSQL:**
  - `DATABASE_URL=postgresql://runner@localhost:5432/postgres`
  - `PGDATABASE=postgres`
  - `PGUSER=runner`
  - `PGHOST=localhost`
  - `PGPORT=5432`
  
- **Telegram Bot:**
  - `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота

### 2. Подготовка файлов конфигурации

Все файлы конфигурации для деплоя уже подготовлены:

- `.replit.production` - конфигурация Replit для production
- `production-server.mjs` - ESM-версия сервера для production
- `deploy-config.js` - настройки для автоматизации деплоя
- `deploy.js` - скрипт автоматического деплоя

## Автоматический деплой

Для автоматического деплоя просто выполните скрипт `deploy.js`:

```bash
node deploy.js
```

Скрипт выполнит следующие действия:
1. Скопирует `.replit.production` в `.replit`
2. Проверит наличие `production-server.mjs`
3. Запустит сборку проекта (`npm run build`)
4. Выполнит миграции базы данных (`npm run db:push`)
5. Проверит соединение с базой данных
6. Запустит production-сервер

## Ручной деплой

Если вы предпочитаете ручной деплой, выполните следующие шаги:

### 1. Настройка Replit

```bash
cp .replit.production .replit
```

### 2. Сборка проекта

```bash
npm run build
```

### 3. Миграция базы данных

```bash
NODE_ENV=production DATABASE_PROVIDER=replit npm run db:push
```

### 4. Запуск сервера

```bash
NODE_ENV=production PORT=3000 DATABASE_PROVIDER=replit node start-unified.js
```

## Проверка работоспособности

После деплоя проверьте работоспособность приложения:

1. **Проверка базы данных:**
   ```bash
   node check-replit-db.mjs
   ```

2. **Проверка API:**
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Проверка Telegram Бота:**
   ```bash
   node check-bot-settings.js
   ```

## Отладка проблем

### Проблемы с базой данных

1. Проверьте подключение к базе данных:
   ```bash
   node check-replit-db.mjs
   ```

2. Проверьте логи ошибок:
   ```bash
   cat deploy.log
   ```

### Проблемы с сервером

1. Проверьте порт, на котором запущен сервер (должен быть 3000)
2. Убедитесь, что сервер слушает на адресе 0.0.0.0, а не localhost
3. Проверьте логи сервера

### Проблемы с модулями

При возникновении ошибок связанных с ESM/CommonJS модулями:

1. Используйте `production-server.mjs` вместо `production-server.js`
2. Убедитесь, что `start-unified.js` запускает правильную версию сервера
3. Проверьте, что в проекте установлены все необходимые зависимости

## Контакты для поддержки

При возникновении проблем обращайтесь в службу поддержки UniFarm.