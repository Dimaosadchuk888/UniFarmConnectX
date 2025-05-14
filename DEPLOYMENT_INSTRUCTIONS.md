# Инструкции по деплою на Replit

## Настройка базы данных

1. **Создать базу данных Replit PostgreSQL**
   - В Replit перейдите в раздел "Tools" -> "Database"
   - Нажмите "Create Database" чтобы создать новую базу данных PostgreSQL
   - После создания будут доступны переменные окружения `DATABASE_URL`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT`

2. **Проверьте переменные окружения**
   - Убедитесь что все переменные окружения базы данных Replit присутствуют в среде
   - Удалите переменную окружения `DATABASE_URL` со значением Neon DB (если есть)

## Настройка деплоя

1. **Build команда**:
   ```
   npm run build
   ```

2. **Run команда**:
   ```
   NODE_ENV=production PORT=8080 DATABASE_PROVIDER=replit node start-unified.js
   ```

3. **Переменные окружения для деплоя**:
   - `DATABASE_PROVIDER`: `replit`
   - `NODE_ENV`: `production` 
   - `PORT`: `8080`

## Проверка подключения к базе данных

Убедитесь, что в файле `server/index.ts` присутствует следующий код:

```typescript
// Устанавливаем использование Replit PostgreSQL по умолчанию
setDatabaseProvider('replit');
console.log('[DB] Инициализировано подключение к Replit PostgreSQL');
```

## Миграция схемы базы данных

После деплоя выполните миграцию схемы базы данных:

```
npm run db:push
```

## Важные файлы для проверки

- `.replit.production` - настройки Replit для production
- `server/db-replit.ts` - настройки подключения к базе данных Replit
- `server/db-selector.ts` - выбор провайдера базы данных
- `start-unified.js` - универсальный скрипт запуска для dev и production