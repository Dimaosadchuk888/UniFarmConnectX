# UniFarm Environment Variables Documentation

## Унификация переменных окружения - Итоговый отчет

### ✅ Что добавлено в .env.example:

**Недостающие критические переменные:**
- `HOST=0.0.0.0` - для привязки сервера к интерфейсу
- `API_BASE_URL=/api/v2` - базовый URL для серверных API запросов
- `REPL_ID=${REPL_ID}` - автоматически от Replit платформы
- `REPLIT_DEV_DOMAIN=${REPLIT_DEV_DOMAIN}` - автоматически от Replit платформы

**Унифицированные переменные:**
- `TELEGRAM_WEBAPP_NAME=UniFarm` - стандартное имя приложения
- Четкое разделение серверных и клиентских переменных

### 🔄 Что унифицировано:

**CORS Configuration:**
- ✅ Стандарт: `CORS_ORIGINS` (поддерживает множественные origins)
- ❌ Убрано: `CORS_ORIGIN` (единичный origin)
- Обновлен код в `core/config/index.ts` для использования `CORS_ORIGINS`

**API Base URL:**
- ✅ Серверная сторона: `API_BASE_URL=/api/v2`
- ✅ Клиентская сторона: `VITE_API_BASE_URL=/api/v2`
- Четкое разделение назначений

**Telegram Configuration:**
- ✅ Серверная: `TELEGRAM_WEBAPP_NAME=UniFarm`
- ✅ Клиентская: `VITE_TELEGRAM_WEBAPP_NAME=UniFarm`
- Синхронизированы значения между сервером и клиентом

### 📋 Что помечено как устаревшее:

**Deprecated переменные в .env.example (закомментированы):**
- `USE_OPTIMIZED_REFERRALS` - объявлена, но не используется
- `USE_LOCAL_DB` - объявлена, но не используется
- `ALLOW_MEMORY_FALLBACK` - объявлена, но не используется
- `USE_MEMORY_SESSION` - объявлена, но не используется
- `NEON_API_KEY` - объявлена, но не используется
- `NEON_PROJECT_ID` - объявлена, но не используется
- `VITE_DEBUG` - объявлена, но не используется
- `VITE_LOG_LEVEL` - объявлена, но не используется
- `VITE_NODE_ENV` - объявлена, но не используется

### 🏗️ Финальная структура .env.example:

```
# ==============================================
# Core Application Settings
# ==============================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# ==============================================
# Database Configuration  
# ==============================================
DATABASE_URL=your_database_url_here
DATABASE_PROVIDER=neon

# ==============================================
# Telegram Bot Configuration
# ==============================================
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_BOT_USERNAME=UniFarming_Bot
TELEGRAM_WEBAPP_NAME=UniFarm
TELEGRAM_WEBHOOK_URL=${BASE_URL}/api/telegram/webhook
TELEGRAM_WEBAPP_URL=${BASE_URL}

# ==============================================
# Application URLs & API Configuration
# ==============================================
BASE_URL=${REPLIT_DEV_DOMAIN}
API_BASE_URL=/api/v2
VITE_API_BASE_URL=/api/v2
VITE_WEB_APP_URL=${BASE_URL}

# ==============================================
# CORS Configuration (Unified)
# ==============================================
CORS_ORIGINS=${BASE_URL}

# ==============================================
# Replit Platform Variables
# ==============================================
REPL_ID=${REPL_ID}
REPLIT_DEV_DOMAIN=${REPLIT_DEV_DOMAIN}

# ==============================================
# Frontend Environment Variables
# ==============================================
VITE_TELEGRAM_BOT_USERNAME=UniFarming_Bot
VITE_TELEGRAM_WEBAPP_NAME=UniFarm

# ==============================================
# Security Configuration
# ==============================================
SESSION_SECRET=your_session_secret_here
JWT_SECRET=your_jwt_secret_here

# ==============================================
# Feature Flags
# ==============================================
SKIP_TELEGRAM_CHECK=false
ALLOW_BROWSER_ACCESS=true

# ==============================================
# Database Strategy (Optional)
# ==============================================
USE_NEON_DB=true

# ==============================================
# Admin Panel (Optional)
# ==============================================
ADMIN_USERNAMES=admin1,admin2
ADMIN_SECRET=your_admin_secret_here
```

### 🎯 Принципы унификации:

1. **Четкое разделение ролей:**
   - Серверные переменные: без префикса
   - Клиентские переменные: префикс `VITE_`

2. **Стандартизация CORS:**
   - Единый стандарт `CORS_ORIGINS` с поддержкой множественных доменов

3. **Автоматизация Replit:**
   - Переменные платформы помечены как автоматические

4. **Безопасность:**
   - Секретные ключи выделены в отдельную секцию
   - Рекомендация использовать Replit Secrets

5. **Deprecated секция:**
   - Неиспользуемые переменные закомментированы для будущего удаления

### ⚠️ Важные изменения в коде:

**Файл: `core/config/index.ts`**
```typescript
// Было:
origin: process.env.CORS_ORIGIN || true,

// Стало:
origin: process.env.CORS_ORIGINS?.split(',') || true,
```

### 📊 Статистика унификации:

- ✅ Добавлено: 4 критические переменные
- 🔄 Унифицировано: 3 дублирующие группы
- 📝 Документировано: 9 deprecated переменных
- 🛠️ Обновлено: 1 файл кода для унификации CORS

### 🚀 Результат:

Переменные окружения приведены в полный порядок с четкой структурой, документацией и устранением дублирования. Проект готов к развертыванию без конфликтов конфигурации.