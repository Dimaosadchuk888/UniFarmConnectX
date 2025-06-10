# Унификация переменных окружения - Migration Guide

## Выполненные изменения

### 1. CORS Configuration
**Было:**
- `CORS_ORIGIN` (единичное значение)
- `CORS_ORIGINS` (множественные значения)

**Стало:**
- `CORS_ORIGINS` - единый стандарт с поддержкой множественных значений
- Обратная совместимость с `CORS_ORIGIN` через fallback

**Реализация:**
```typescript
// config/app.ts
corsOrigins: (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || process.env.BASE_URL || '*').split(',')

// server/index.ts  
app.use(cors({
  origin: config.env.corsOrigins.split(',').map(o => o.trim()),
  credentials: true
}));
```

### 2. API Configuration
**Было:**
- `API_BASE_URL` (серверный)
- `VITE_API_BASE_URL` (клиентский)

**Стало:**
- Централизованная конфигурация с единым управлением
- Автоматическая синхронизация между серверными и клиентскими настройками

**Реализация:**
```typescript
// config/app.ts
api: {
  baseUrl: process.env.API_BASE_URL || '/api/v2',
  clientBaseUrl: process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || '/api/v2'
}

// core/config.ts
api: {
  baseUrl: process.env.API_BASE_URL || '/api/v2',
  clientBaseUrl: process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || '/api/v2'
}
```

### 3. Telegram Configuration
**Было:**
- `TELEGRAM_WEBAPP_NAME` / `VITE_TELEGRAM_WEBAPP_NAME`
- `TELEGRAM_BOT_USERNAME` / `VITE_TELEGRAM_BOT_USERNAME`

**Стало:**
- Унифицированная система с автоматическим fallback
- Серверные и клиентские переменные синхронизированы

**Реализация:**
```typescript
// config/telegram.ts
botUsername: process.env.TELEGRAM_BOT_USERNAME || 'UniFarming_Bot',
clientBotUsername: process.env.VITE_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || 'UniFarming_Bot',

webAppName: process.env.TELEGRAM_WEBAPP_NAME || 'UniFarm',
clientWebAppName: process.env.VITE_TELEGRAM_WEBAPP_NAME || process.env.TELEGRAM_WEBAPP_NAME || 'UniFarm'
```

## Централизованная конфигурация

### core/config.ts
```typescript
export const envConfig = {
  // Унифицированные CORS настройки
  corsOrigins: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || process.env.BASE_URL || 'http://localhost:3000',
  
  // Унифицированные API URLs
  api: {
    baseUrl: process.env.API_BASE_URL || '/api/v2',
    clientBaseUrl: process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || '/api/v2'
  },
  
  // Унифицированные Telegram настройки
  telegram: {
    webappName: process.env.TELEGRAM_WEBAPP_NAME || 'UniFarm',
    clientWebappName: process.env.VITE_TELEGRAM_WEBAPP_NAME || process.env.TELEGRAM_WEBAPP_NAME || 'UniFarm',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'UniFarming_Bot',
    clientBotUsername: process.env.VITE_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || 'UniFarming_Bot'
  }
};
```

## .env.example Updates

### Добавлена документация
- Четкие комментарии по унификации
- Migration guide для устаревших переменных
- Пометки deprecated переменных

### Стандартизация
- `CORS_ORIGINS` как единый стандарт
- Обратная совместимость сохранена
- Централизованное управление через config файлы

## Результат

✅ **Устранены дублирующиеся переменные**
✅ **Сохранена обратная совместимость**  
✅ **Централизованное управление конфигурацией**
✅ **Четкая документация для разработчиков**
✅ **Автоматические fallback значения**

## Migration для проектов

1. Обновить `.env` файлы - использовать `CORS_ORIGINS` вместо `CORS_ORIGIN`
2. Импортировать конфигурацию из `core/config` вместо прямого обращения к `process.env`
3. Использовать `config.env.*` для доступа к унифицированным переменным