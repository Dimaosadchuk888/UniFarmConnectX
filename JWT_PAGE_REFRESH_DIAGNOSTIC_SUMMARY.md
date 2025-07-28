# JWT Token Page Refresh - Диагностический отчет и план исправления
## 28 июля 2025

## 🚨 Проблема
При обновлении страницы в Telegram WebApp или Replit Preview возникает ошибка:
```json
{"success":false,"error":"Authentication required","need_jwt_token":true}
```

## ✅ Диагностика завершена - ROOT CAUSE найден

### Backend система JWT - РАБОТАЕТ КОРРЕКТНО ✅
- **Endpoint `/api/v2/auth/refresh`** - полностью реализован 
- **AuthController.refreshToken()** - работает с логированием
- **AuthService.refreshToken()** - имеет двойную валидацию
- **Middleware telegramAuth** - правильно проверяет JWT токены

### 🎯 Реальная проблема: Frontend timing и state management

#### КОРНЕВАЯ ПРИЧИНА #1: Race condition в UserContext
**Файл**: `client/src/contexts/userContext.tsx` строки 258-289
**Проблема**: При page refresh userContext инициализируется и сразу пытается авторизоваться через Telegram initData, НЕ проверив существующий валидный JWT токен в localStorage.

#### КОРНЕВАЯ ПРИЧИНА #2: correctApiRequest может не отправлять токен
**Файл**: `client/src/lib/correctApiRequest.ts` строки 42-60  
**Проблема**: При некоторых сценариях API запросы выполняются без Authorization header.

#### КОРНЕВАЯ ПРИЧИНА #3: Повторная авторизация вместо восстановления сессии
**Файл**: `client/src/contexts/userContext.tsx` строки 261-289
**Проблема**: При page refresh система пытается авторизоваться заново вместо использования сохраненного JWT токена.

## 🔧 Конкретный план исправления

### Исправление #1: Приоритет существующего токена
```typescript
// В userContext.tsx - в начале refreshUserData()
const existingToken = localStorage.getItem('unifarm_jwt_token');
if (existingToken) {
  console.log('[UserContext] Найден существующий токен, проверяем...');
  try {
    const response = await correctApiRequest('/api/v2/users/profile');
    if (response.success) {
      console.log('[UserContext] Токен валиден, используем сохраненную сессию');
      // Обновляем состояние без повторной авторизации
      dispatch({ type: 'SET_USER_DATA', payload: response.data });
      return;
    }
  } catch (error) {
    console.log('[UserContext] Токен не работает, нужна повторная авторизация');
  }
}
```

### Исправление #2: Гарантированная отправка токена
```typescript  
// В correctApiRequest.ts - усилить проверку
let token = localStorage.getItem('unifarm_jwt_token');
if (!token && url.includes('/api/v2/') && !url.includes('/auth/')) {
  console.error('[correctApiRequest] API запрос без токена:', url);
  throw new Error('JWT токен требуется для авторизованных API запросов');
}
```

### Исправление #3: Избегать дублирования авторизации
```typescript
// В userContext.tsx - улучшить условие авторизации
if (initData && !existingToken && !authorizationAttemptedRef.current) {
  // Проверяем наличие предыдущей сессии
  const lastSession = localStorage.getItem('unifarm_last_session');
  if (lastSession) {
    console.log('[UserContext] Найдена предыдущая сессия, пропускаем авторизацию');
    return;
  }
  // Авторизация только для новых пользователей
  authorizationAttemptedRef.current = true;
  // ... логика авторизации
}
```

## 📋 Что НЕ нужно исправлять
- ❌ Backend auth endpoints - работают корректно
- ❌ JWT система - полностью реализована  
- ❌ Middleware авторизации - функционирует правильно
- ❌ tokenRefreshHandler - логика корректна

## 🎯 Приоритет исправлений
1. **КРИТИЧЕСКИЙ**: Исправление #1 - проверка существующего токена при загрузке
2. **ВЫСОКИЙ**: Исправление #2 - гарантированная отправка токена в API
3. **СРЕДНИЙ**: Исправление #3 - избегание дублирования авторизации

## 📊 Ожидаемые результаты после исправлений
- ✅ Page refresh сохраняет авторизацию
- ✅ Нет ошибок "Authentication required" 
- ✅ JWT токены передаются во все API запросы
- ✅ Быстрая загрузка без повторной авторизации
- ✅ Стабильная работа в Telegram WebApp и Replit Preview

## 🧪 План тестирования
1. Авторизоваться в приложении
2. Обновить страницу через кнопку браузера  
3. Проверить отсутствие ошибок авторизации
4. Убедиться что данные пользователя загружаются  
5. Проверить отправку Authorization header в DevTools

---
**Статус**: Диагностика завершена. Определены точные места и методы исправления. Код не изменялся согласно требованию пользователя.