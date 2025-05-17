# Инструкции по деплою приложения на Replit

## Настройки для деплоя

При настройке деплоя в Replit используйте следующие параметры:

### Команда запуска

```bash
PORT=3000 NODE_ENV=production DATABASE_PROVIDER=neon node start-unified.cjs
```

### Переменные окружения

- `NODE_ENV`: `production`
- `DATABASE_PROVIDER`: `neon`
- `FORCE_NEON_DB`: `true`
- `DISABLE_REPLIT_DB`: `true`
- `OVERRIDE_DB_PROVIDER`: `neon`

## Проверка перед деплоем

1. Убедитесь, что переменная `DATABASE_URL` корректно настроена для Neon DB
2. Проверьте, что все необходимые экспорты присутствуют в файлах db.ts и db-selector.ts
3. Убедитесь, что скрипт start-unified.cjs использует CommonJS модули

## Решение проблем при деплое

### Если возникают ошибки с отсутствующими экспортами

Убедитесь, что в файле `server/db.ts` экспортируются следующие объекты:
- pool
- db
- wrappedPool
- testDatabaseConnection
- dbType
- DatabaseType
- dbConnectionStatus
- isTablePartitioned

### Если возникают ошибки с модулями

Используйте CommonJS скрипт `start-unified.cjs` вместо ESM скрипта `start-unified.js`