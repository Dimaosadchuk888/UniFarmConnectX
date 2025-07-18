# КРИТИЧЕСКИЕ ПРОБЛЕМЫ DEV vs PROD РЕЖИМОВ
Дата: 18 января 2025
Статус: ТРЕБУЕТСЯ ВНИМАНИЕ ПЕРЕД ДЕПЛОЕМ

## 🚨 НАЙДЕННЫЕ КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. ❌ TON Connect Manifest URL захардкожен
**Файл:** `client/src/App.tsx` (строка 285)
```jsx
<TonConnectUIProvider manifestUrl="https://uni-farm-connect-x-ab245275.replit.app/tonconnect-manifest.json">
```
**Проблема:** URL привязан к конкретному Replit домену
**Последствия в PROD:** TON Connect не будет работать на другом домене
**Решение:** Использовать динамический URL из переменных окружения

### 2. ❌ TON Connect Manifest содержит захардкоженные URL
**Файл:** `client/public/tonconnect-manifest.json`
```json
{
  "url": "https://uni-farm-connect-x-ab245275.replit.app",
  "iconUrl": "https://uni-farm-connect-x-ab245275.replit.app/assets/unifarm-icon.svg"
}
```
**Проблема:** Все URL в манифесте привязаны к Replit домену
**Последствия в PROD:** TON Connect не сможет корректно идентифицировать приложение
**Решение:** Генерировать манифест динамически при деплое

### 3. ⚠️ CORS настройки различаются
**Файл:** `core/config.ts` (строка 16)
```javascript
corsOrigins: process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? 'https://t.me' : 'http://localhost:3000')
```
**Проблема:** В production разрешен только домен `https://t.me`
**Последствия:** Запросы с других доменов будут заблокированы
**Важно:** Убедиться что CORS_ORIGINS установлен корректно в production

### 4. ⚠️ WebSocket URL формируется динамически
**Файл:** `client/src/contexts/webSocketContext.tsx`
```javascript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${host}/ws`;
```
**Потенциальная проблема:** При использовании proxy или CDN могут быть проблемы
**Решение:** Тестировать WebSocket соединения в production окружении

### 5. ⚠️ Множественные WebSocket провайдеры
**Найдено 3 разных WebSocket провайдера:**
- `client/src/contexts/webSocketContext.tsx` (используется в App.tsx)
- `client/src/core/providers/WebSocketProvider.tsx`
- `client/src/core/providers/ConfigurableWebSocketProvider.tsx`

**Проблема:** Непонятно какой используется и могут быть конфликты
**Решение:** Использовать только один провайдер

### 6. ✅ Rate Limiting отключен
**Файл:** `server/index.ts` (строка 411)
```javascript
logger.info('[Server] Express Rate Limiting ПОЛНОСТЬЮ ОТКЛЮЧЕН');
```
**Статус:** Намеренно отключен для production
**Риск:** Приложение уязвимо для DDoS атак

### 7. ⚠️ Переменные окружения
**Критические переменные для проверки:**
- `NODE_ENV` - должен быть `production`
- `CORS_ORIGINS` - должен содержать правильные домены
- `TELEGRAM_BOT_TOKEN` - токен бота
- `JWT_SECRET` - секретный ключ
- `TELEGRAM_WEBAPP_URL` - URL приложения
- `SUPABASE_URL` и `SUPABASE_ANON_KEY` - база данных

### 8. ⚠️ Фантомные записи в БД
**Проблема:** 67 фантомных записей в `ton_farming_data` блокируют TON Boost планировщик
**Последствия:** Реферальные комиссии не начисляются
**Решение:** Очистить БД перед production деплоем

## 📋 ЧЕКЛИСТ ПЕРЕД ДЕПЛОЕМ

1. [ ] Заменить захардкоженные URL на динамические
2. [ ] Проверить все переменные окружения
3. [ ] Очистить фантомные записи в БД
4. [ ] Протестировать TON Connect на production домене
5. [ ] Проверить WebSocket соединения
6. [ ] Убедиться что используется правильный WebSocket провайдер
7. [ ] Проверить CORS настройки
8. [ ] Сгенерировать новые манифесты TON Connect

## 🔧 РЕКОМЕНДАЦИИ

1. **Использовать переменную окружения для URL приложения**
   ```javascript
   const APP_URL = process.env.VITE_APP_URL || window.location.origin;
   ```

2. **Создать скрипт для генерации манифестов**
   - Автоматически подставлять правильные URL
   - Запускать перед каждым деплоем

3. **Унифицировать WebSocket провайдеры**
   - Оставить только один рабочий провайдер
   - Удалить дублирующий код

4. **Добавить проверку окружения при старте**
   - Валидировать все критические переменные
   - Выводить предупреждения если что-то не настроено