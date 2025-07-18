# 🛠 ДИАГНОСТИКА ССЫЛОК И ЭНДПОИНТОВ ПОСЛЕ РЕМИКСА

**Новый домен:** `https://uni-farm-connect-aab49267.replit.app`

**Дата диагностики:** 18 июля 2025

---

## 📋 ОБНАРУЖЕННЫЕ МЕСТА ДЛЯ ОБНОВЛЕНИЯ

### 1. **Файлы конфигурации и переменных окружения**

| Путь к файлу | Строка/переменная | Текущее значение | Предлагаемое новое значение | Тип |
|-------------|------------------|------------------|---------------------------|-----|
| `config/app.ts` | строка 27: `baseUrl` | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Backend конфигурация** |
| `config/app.ts` | строка 39: `appDomain` | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Backend конфигурация** |
| `production.config.ts` | строка 86: fallback URL | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Production конфигурация** |

### 2. **Манифесты TON Connect**

| Путь к файлу | Строка/переменная | Текущее значение | Предлагаемое новое значение | Тип |
|-------------|------------------|------------------|---------------------------|-----|
| `client/public/tonconnect-manifest.json` | `url` | `https://uni-farm-connect-x-w81846064.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **TON Connect** |
| `client/public/tonconnect-manifest.json` | `iconUrl` | `https://uni-farm-connect-x-w81846064.replit.app/assets/unifarm-icon.svg` | `https://uni-farm-connect-aab49267.replit.app/assets/unifarm-icon.svg` | **TON Connect** |
| `client/public/tonconnect-manifest.json` | `termsOfUseUrl` | `https://uni-farm-connect-x-w81846064.replit.app/terms` | `https://uni-farm-connect-aab49267.replit.app/terms` | **TON Connect** |
| `client/public/tonconnect-manifest.json` | `privacyPolicyUrl` | `https://uni-farm-connect-x-w81846064.replit.app/privacy` | `https://uni-farm-connect-aab49267.replit.app/privacy` | **TON Connect** |
| `client/public/.well-known/tonconnect-manifest.json` | `url` | `https://uni-farm-connect-x-w81846064.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **TON Connect** |
| `client/public/.well-known/tonconnect-manifest.json` | `iconUrl` | `https://uni-farm-connect-x-w81846064.replit.app/assets/unifarm-icon.svg` | `https://uni-farm-connect-aab49267.replit.app/assets/unifarm-icon.svg` | **TON Connect** |
| `client/public/.well-known/tonconnect-manifest.json` | `termsOfUseUrl` | `https://uni-farm-connect-x-w81846064.replit.app/terms` | `https://uni-farm-connect-aab49267.replit.app/terms` | **TON Connect** |
| `client/public/.well-known/tonconnect-manifest.json` | `privacyPolicyUrl` | `https://uni-farm-connect-x-w81846064.replit.app/privacy` | `https://uni-farm-connect-aab49267.replit.app/privacy` | **TON Connect** |

### 3. **Frontend TON Connect интеграция**

| Путь к файлу | Строка/переменная | Текущее значение | Предлагаемое новое значение | Тип |
|-------------|------------------|------------------|---------------------------|-----|
| `client/src/App.tsx` | строка 285: `manifestUrl` | `https://uni-farm-connect-x-w81846064.replit.app/tonconnect-manifest.json` | `https://uni-farm-connect-aab49267.replit.app/tonconnect-manifest.json` | **Frontend TON Connect** |

### 4. **Backend роуты и интеграции**

| Путь к файлу | Строка/переменная | Текущее значение | Предлагаемое новое значение | Тип |
|-------------|------------------|------------------|---------------------------|-----|
| `server/index.ts` | строка (webhook fallback) | `https://uni-farm-connect-x-w81846064.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Webhook Backend** |

### 5. **CORS настройки безопасности**

| Путь к файлу | Строка/переменная | Текущее значение | Предлагаемое новое значение | Тип |
|-------------|------------------|------------------|---------------------------|-----|
| `core/config/security.ts` | строка 89: CORS origins | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **CORS Backend** |
| `core/middleware/cors.ts` | строка 12: allowedOrigins | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **CORS Middleware** |

### 6. **Vite конфигурация развертывания**

| Путь к файлу | Строка/переменная | Текущее значение | Предлагаемое новое значение | Тип |
|-------------|------------------|------------------|---------------------------|-----|
| `client/vite.config.ts` | строка 37: `allowedHosts` | `['uni-farm-connect-x-ab245275.replit.app', 'uni-farm-connect-x-elizabethstone1.replit.app']` | `['uni-farm-connect-aab49267.replit.app']` | **Frontend разработка** |

### 7. **Скрипты генерации манифестов**

| Путь к файлу | Строка/переменная | Текущее значение | Предлагаемое новое значение | Тип |
|-------------|------------------|------------------|---------------------------|-----|
| `scripts/generate-manifests.js` | строка 15: fallback URL | `https://uni-farm-connect-x-ab245275.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Deployment скрипты** |

### 8. **Тестовые файлы и диагностика**

| Путь к файлу | Строка/переменная | Текущее значение | Предлагаемое новое значение | Тип |
|-------------|------------------|------------------|---------------------------|-----|
| `tests/debug/debug-balance-issue.js` | `API_BASE` | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Тестирование** |
| `tests/test-all-routes.js` | fetch URL | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Тестирование** |
| `tests/test-deposit-api.js` | `API_BASE` | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Тестирование** |
| `tests/test-health.js` | fetch URL | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Тестирование** |
| `tests/quick-wallet-test.js` | `API_BASE` | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Тестирование** |
| `tests/test-wallet-direct.js` | fetch URL | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Тестирование** |
| `scripts/test-admin-bot-webhook.ts` | `webhookUrl` | `https://uni-farm-connect-x-elizabethstone1.replit.app/api/v2/admin-bot/webhook` | `https://uni-farm-connect-aab49267.replit.app/api/v2/admin-bot/webhook` | **Webhook тестирование** |
| `scripts/test-all-routes.ts` | `baseUrl` | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Тестирование** |
| `scripts/test-ton-connect.js` | `BASE_URL` | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **TON Connect тестирование** |
| `scripts/test-tonconnect-manifest.js` | `BASE_URL` | `https://uni-farm-connect-x-elizabethstone1.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **TON Connect тестирование** |
| `scripts/full-system-diagnostics.ts` | `productionDomain` | `https://uni-farm-connect-x-w81846064.replit.app` | `https://uni-farm-connect-aab49267.replit.app` | **Системная диагностика** |
| `scripts/check-ton-connect-integration.ts` | hardcoded references | `uni-farm-connect-x-ab245275.replit.app` | `uni-farm-connect-aab49267.replit.app` | **TON Connect диагностика** |

---

## 🔍 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### **Критически важные обновления (в порядке приоритета):**

1. **TON Connect манифесты** - без обновления TON Connect не будет работать
2. **Frontend App.tsx** - обязательно для TON Connect интеграции
3. **Backend конфигурация** - для корректной работы API и webhook'ов
4. **CORS настройки** - для безопасности и доступа от Telegram

### **Переменные окружения для обновления:**

В Replit Secrets нужно установить/обновить:
- `TELEGRAM_WEBAPP_URL=https://uni-farm-connect-aab49267.replit.app`
- `APP_DOMAIN=https://uni-farm-connect-aab49267.replit.app`
- `CORS_ORIGINS=https://t.me,https://uni-farm-connect-aab49267.replit.app`

### **Автоматическое обновление манифестов:**

После обновления переменных окружения выполнить:
```bash
TELEGRAM_WEBAPP_URL="https://uni-farm-connect-aab49267.replit.app" node scripts/generate-manifests.js
```

### **Обнаруженные старые домены:**

- `https://uni-farm-connect-x-elizabethstone1.replit.app` (наиболее распространенный)
- `https://uni-farm-connect-x-w81846064.replit.app` (TON Connect манифесты)
- `https://uni-farm-connect-x-ab245275.replit.app` (Vite конфигурация и некоторые скрипты)

### **Не требуют изменений:**

- Файлы в `node_modules/` (игнорируются)
- Относительные URL пути (начинающиеся с `/api/`)
- Динамические URL (использующие `window.location` или переменные окружения)
- Файл `config/apiConfig.ts` (использует динамическое определение URL)

---

## ✅ ПЛАН ОБНОВЛЕНИЯ

1. **Установить переменные окружения** в Replit Secrets
2. **Обновить TON Connect манифесты** (критично)
3. **Обновить frontend App.tsx** (критично)
4. **Обновить backend конфигурацию** (важно)
5. **Обновить CORS настройки** (важно)
6. **Обновить Vite конфигурацию** (среднее)
7. **Обновить тестовые файлы** (низкое, но желательно)

**Общее количество файлов для обновления:** 25 файлов

**Критически важных:** 6 файлов