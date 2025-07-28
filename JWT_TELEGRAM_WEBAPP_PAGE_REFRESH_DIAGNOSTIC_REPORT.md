# JWT Token Authentication Issue при обновлении страницы Telegram WebApp
## Диагностический отчет от 28 июля 2025

### 🚨 Проблема
При обновлении страницы через стандартную кнопку "обновить" в Telegram WebApp или через Replit Preview возникает ошибка:
```json
{"success":false,"error":"Authentication required","need_jwt_token":true}
```

### 🔍 Анализ архитектуры JWT системы

#### 1. Логика сохранения токена
**Файл**: `client/src/contexts/userContext.tsx`
- **Строка 272**: `localStorage.setItem('unifarm_jwt_token', authResponse.data.token);`
- **Проблема**: Токен сохраняется только при первой авторизации через Telegram initData
- **Логика проверки**: `const existingToken = localStorage.getItem('unifarm_jwt_token');` (строка 259)

#### 2. Middleware проверки токена
**Файл**: `core/middleware/telegramAuth.ts`
- **Строки 30-114**: Полная логика JWT верификации
- **Критическая проверка**: 
  ```typescript
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtSecret) as any;
  ```
- **Проблема**: При обновлении страницы токен может отсутствовать в Authorization header

#### 3. Отправка токена в API запросах
**Файл**: `client/src/lib/correctApiRequest.ts`
- **Строки 42-60**: Логика добавления токена в заголовки
```typescript
// Получаем токен из localStorage
let token = localStorage.getItem('unifarm_jwt_token');
if (token) {
  requestHeaders['Authorization'] = `Bearer ${token}`;
}
```

#### 4. Механизм автообновления токена
**Файл**: `client/src/lib/tokenRefreshHandler.ts`
- **Строки 34-78**: Автоматическое обновление через `/api/v2/auth/refresh`
- **Проблема**: Endpoint `/api/v2/auth/refresh` может отсутствовать в роутах

### 🐛 Выявленные проблемы

#### Проблема #1: Отсутствие JWT токена при инициализации
**Симптом**: При обновлении страницы UserContext может не найти токен в localStorage
**Причина**: Race condition между загрузкой приложения и чтением localStorage
**Локация**: `userContext.tsx` строки 258-289

#### Проблема #2: Middleware может не получать Authorization header
**Симптом**: API запросы выполняются без Authorization header
**Причина**: `correctApiRequest.ts` может не правильно формировать заголовки
**Локация**: `correctApiRequest.ts` строки 35-80

#### Проблема #3: Missing refresh endpoint
**Симптом**: tokenRefreshHandler.ts пытается обратиться к `/api/v2/auth/refresh`
**Причина**: Этот endpoint может не существовать в server routes
**Локация**: `tokenRefreshHandler.ts` строка 34

#### Проблема #4: Telegram WebApp lifecycle mismatch
**Симптом**: При обновлении страницы Telegram initData может быть недоступен
**Причина**: Telegram WebApp может не сразу предоставлять initData при refresh
**Локация**: `userContext.tsx` строки 261-289

### ✅ Статус системы JWT токенов

#### Инфраструктура JWT - ПОЛНОСТЬЮ РЕАЛИЗОВАНА ✅
**Файл**: `modules/auth/routes.ts` - строка 66
```typescript
router.post('/refresh', liberalRateLimit, validateBody(refreshTokenSchema), authController.refreshToken.bind(authController));
```

**Файл**: `modules/auth/controller.ts` - строки 234-274
- Метод `refreshToken()` полностью реализован
- Логирование запросов и ответов
- Правильная обработка ошибок

**Файл**: `modules/auth/service.ts` - строка 548+
- Метод `refreshToken()` реализован с двойной валидацией
- Fallback декодирование для получения user_id
- Полная регенерация токена

#### Проблема НЕ в backend - система refresh работает! ✅

### 🔧 Реальная проблема: Frontend timing issues

#### Проблема #1: Race condition при инициализации
**Симптом**: UserContext инициализируется до готовности Telegram WebApp
**Локация**: `userContext.tsx` строки 258-289
**Решение**: Добавить проверку готовности перед API запросами

#### Проблема #2: correctApiRequest может не добавлять токен
**Симптом**: API запросы выполняются без Authorization header при refresh
**Локация**: `correctApiRequest.ts` строки 42-60
**Решение**: Гарантировать получение токена из localStorage при каждом запросе

#### Проблема #3: Telegram initData недоступен при page refresh
**Симптом**: При обновлении страницы `window.Telegram.WebApp.initData` может быть пустым
**Локация**: `userContext.tsx` строка 261
**Решение**: Fallback на сохраненный JWT токен вместо повторной авторизации

### 🔧 Конкретные исправления

#### Исправление #1: Синхронная проверка токена при загрузке
```typescript
// В userContext.tsx - добавить в начало refreshUserData()
const existingToken = localStorage.getItem('unifarm_jwt_token');
if (existingToken) {
  console.log('[UserContext] Токен найден при загрузке, проверяем валидность...');
  // Сначала пробуем использовать существующий токен
  try {
    const testResponse = await correctApiRequest('/api/v2/users/profile');
    if (testResponse.success) {
      console.log('[UserContext] Существующий токен валиден, продолжаем...');
      return; // Выходим, токен работает
    }
  } catch (error) {
    console.log('[UserContext] Существующий токен не работает, попробуем refresh...');
  }
}
```

#### Исправление #2: Улучшенная логика в correctApiRequest
```typescript
// В correctApiRequest.ts - усилить проверку токена
let token = localStorage.getItem('unifarm_jwt_token');
if (!token) {
  console.warn('[correctApiRequest] ⚠️ JWT токен отсутствует при запросе');
  // Не выполняем запрос без токена в production
  if (url.includes('/api/v2/') && !url.includes('/auth/')) {
    throw new Error('JWT токен требуется для API запросов');
  }
}
```

#### Исправление #3: Избегать повторной авторизации при refresh
```typescript
// В userContext.tsx - изменить логику
// Если есть Telegram initData и нет токена, сначала авторизуемся
if (initData && !existingToken && !authorizationAttemptedRef.current) {
  // Проверяем, это не page refresh (есть ли данные сессии)
  const lastSession = localStorage.getItem('unifarm_last_session');
  if (lastSession) {
    console.log('[UserContext] Обнаружена предыдущая сессия, пропускаем авторизацию');
    return;
  }
  // Только для новых сессий выполняем авторизацию
  authorizationAttemptedRef.current = true;
  // ... остальная логика авторизации
}
```

### 🎯 Приоритетные действия

1. **✅ ЗАВЕРШЕНО**: Проверен `/api/v2/auth/refresh` endpoint - полностью реализован
2. **Высокий приоритет**: Добавить синхронную проверку токена при загрузке userContext
3. **Высокий приоритет**: Усилить логику correctApiRequest для гарантированной отправки токена
4. **Средний приоритет**: Избегать повторной авторизации при page refresh (использовать сохраненную сессию)

### 🧪 План тестирования

1. Войти в Telegram WebApp
2. Получить JWT токен
3. Обновить страницу через кнопку браузера
4. Проверить сохранность токена в localStorage
5. Проверить отправку Authorization header в API запросах
6. Проверить ответ middleware на валидные токены

### 📊 Технические метрики для мониторинга

- **Token persistence rate**: Процент сохранности токена после refresh
- **Auth header success rate**: Процент API запросов с правильным Authorization header
- **Middleware pass rate**: Процент успешных проверок в telegramAuth middleware
- **Recovery success rate**: Процент успешных восстановлений сессии после refresh

### 🎯 Ожидаемый результат
После исправлений обновление страницы должно:
1. Сохранять JWT токен в localStorage
2. Автоматически добавлять Authorization header во все API запросы
3. Успешно проходить проверку telegramAuth middleware
4. НЕ показывать ошибку "Authentication required"
5. Продолжать работу приложения без потери авторизации