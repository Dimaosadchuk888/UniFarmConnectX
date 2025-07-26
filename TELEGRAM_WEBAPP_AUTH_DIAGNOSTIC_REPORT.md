# 🔧 TELEGRAM WEBAPP AUTHENTICATION FLOW DIAGNOSTIC REPORT

**Дата**: 26 июля 2025  
**Задача**: Диагностика JWT-авторизации без изменений кода  
**Проблема**: При refresh мини-приложения пользователи видят JSON: `{"success":false,"error":"Authentication required","need_jwt_token":true}`

---

## 🔍 1. АНАЛИЗ АРХИТЕКТУРЫ АУТЕНТИФИКАЦИИ

### Backend JWT Processing (✅ РАБОТАЕТ КОРРЕКТНО)

**Middleware: `core/middleware/telegramAuth.ts`**
- **Строки 96-124**: Корректно возвращает JSON-ответ при отсутствии токена
- **Формат ответа**: `{"success":false,"error":"Authentication required","need_jwt_token":true}`
- **Статус**: 401 Unauthorized
- **Логика**: Правильная - сервер должен возвращать структурированные ошибки

**Обнаруженные источники JSON-ошибки**:
1. **Строка 122**: `error: 'Authentication required', need_jwt_token: true` (production mode)
2. **Строка 99**: `error: 'Invalid JWT token - user not found', need_new_token: true` (JWT invalid)
3. **Строка 108**: `error: 'Invalid or expired JWT token', need_new_token: true` (JWT expired)

### Frontend API Client (⚠️ ПРОБЛЕМА ОБНАРУЖЕНА)

**Файл: `client/src/lib/correctApiRequest.ts`**

**Правильная обработка (строки 119-148)**:
```typescript
if (response.status === 401 && retryCount < MAX_AUTH_RETRIES) {
  const refreshResult = await handleTokenRefresh();
  if (refreshResult.success) {
    return correctApiRequest(url, method, body, headers, retryCount + 1);
  } else {
    // НЕ перезагружаем страницу - предотвращение бесконечного цикла
    const error = new Error('Authentication required');
    (error as any).status = 401;
    (error as any).needAuth = true;
    throw error;
  }
}
```

**✅ АРХИТЕКТУРА КОРРЕКТНА**: Система не должна делать `window.location.reload()` при 401 ошибках.

---

## 🔍 2. АНАЛИЗ FRONTEND ОБРАБОТКИ ОШИБОК

### Компоненты с обработкой auth-ошибок

**1. Home.tsx (строки 20-39)**:
```typescript
useEffect(() => {
  if (error && error instanceof Error) {
    const errorMessage = error.message || '';
    const errorString = JSON.stringify(error);
    
    if (errorMessage.includes('Authentication required') || 
        errorMessage.includes('need_jwt_token') ||
        errorString.includes('Authentication required')) {
      console.log('[Home] Обнаружена ошибка аутентификации, перезагрузка через 2 секунды...');
      
      const timer = setTimeout(() => {
        window.location.href = window.location.href;
      }, 2000);
    }
  }
}, [error]);
```

**2. CompleteDashboard.tsx (строки 55-75)**:
```typescript
const isAuthError = error instanceof Error && (
  error.message.includes('Authentication required') || 
  error.message.includes('need_jwt_token') ||
  JSON.stringify(error).includes('Authentication required')
);
```

**✅ ОБРАБОТКА КОРРЕКТНА**: Компоненты пытаются скрыть JSON и показать дружелюбные сообщения.

---

## 🔍 3. КРИТИЧЕСКАЯ ПРОБЛЕМА ОБНАРУЖЕНА

### Источник сырого JSON на экране

**Тестирование API**:
```bash
$ curl -s "http://localhost:3000/api/v2/wallet/balance?user_id=184"
{"success":false,"error":"Authentication required","need_jwt_token":true}

$ curl -s "http://localhost:3000/api/v2/wallet/balance?user_id=184" -H "Authorization: Bearer invalid_token"
{"success":false,"error":"Invalid or expired JWT token","jwt_error":"...","need_new_token":true}
```

**ПРОБЛЕМА**: Где-то в приложении есть компонент, который показывает **RAW JSON ошибки** вместо обработанных сообщений.

### Возможные источники проблемы:

**1. React Query Error Display**
- Компоненты могут прямо рендерить `error.message` содержащий JSON
- `QueryErrorBoundary.tsx` показывает `error.message` и `error.stack` в development

**2. Telegram WebApp Integration**
- Ошибки могут отображаться в Telegram WebApp без обработки
- Возможно, системные alert() или toast() с сырыми данными

**3. Неперехваченные Fetch Errors**
- Возможны прямые fetch() вызовы в обход `correctApiRequest`
- Компоненты могут показывать Response.text() напрямую

---

## 🔍 4. АНАЛИЗ TOKEN REFRESH HANDLER

**Файл: `client/src/lib/tokenRefreshHandler.ts`**

**Обработка ошибок refresh (строки 97-105)**:
```typescript
if (!result.success) {
  toast({
    title: "Ошибка авторизации",
    description: "Не удалось обновить токен. Попробуйте перезагрузить страницу.",
    variant: "destructive",
    duration: 5000
  });
}
```

**✅ КОРРЕКТНО**: Toast показывает дружелюбное сообщение, а не JSON.

---

## 🔍 5. ПОИСК ИСТОЧНИКА СЫРОГО JSON

### Потенциальные места утечки JSON:

**1. React Query Error States**:
- Компоненты, использующие `useQuery` без обработки ошибок
- Прямое отображение `error.message` в UI
- Необработанные ошибки в `onError` callbacks

**2. Manual Error Display**:
- Console.error может отображаться пользователю
- Возможны компоненты с `<pre>{JSON.stringify(error)}</pre>`
- Error boundaries могут показывать сырые ошибки

**3. Telegram WebApp Specific**:
- `window.Telegram.WebApp.showAlert()` с JSON
- Unhandled promise rejections в WebApp context
- Browser console отображается пользователю

---

## 🔧 6. БЕЗОПАСНЫЕ РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### Немедленные действия (production-safe):

**1. Глобальный Error Handler**:
```typescript
// Добавить в App.tsx
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Authentication required')) {
    console.log('Unhandled auth error caught, attempting graceful recovery');
    // Telegram.WebApp.close() или soft redirect
    event.preventDefault();
  }
});
```

**2. Enhanced Error Boundaries**:
```typescript
// В QueryErrorBoundary.tsx добавить фильтр JSON
const isRawJsonError = error.message.includes('{"success":false');
if (isRawJsonError) {
  // Показать дружелюбное сообщение вместо JSON
  errorDescription = "Требуется повторная авторизация. Перезапустите приложение.";
}
```

**3. Telegram WebApp Integration**:
```typescript
// При auth ошибках использовать Telegram SDK
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.close();
  // Или
  window.Telegram.WebApp.openLink(window.location.href);
}
```

### Долгосрочные решения:

**1. Centralized Error Handler**:
- Создать `AuthErrorHandler.ts` для всех auth-ошибок
- Единый компонент для отображения auth-проблем
- Автоматический recovery механизм

**2. Telegram WebApp Lifecycle**:
- Proper handling of Telegram WebApp events
- Graceful app restart через Telegram SDK
- Session recovery механизм

**3. Enhanced Monitoring**:
- Логирование всех мест где показываются ошибки
- Sentry integration для tracking JSON leaks
- User feedback mechanism при auth проблемах

---

## 🎯 7. ЗАКЛЮЧЕНИЕ И ПЛАН ДЕЙСТВИЙ

### Диагноз:
✅ **Backend архитектура корректна** - возвращает правильные JSON ответы  
✅ **Frontend API client корректен** - обрабатывает 401 ошибки правильно  
❌ **Где-то есть компонент, показывающий сырой JSON** - требует поиска и исправления

### Рекомендуемые действия:

**Phase 1: Поиск источника (безопасно)**
1. Добавить глобальные логи всех error displays
2. Проверить все `useQuery` error states
3. Найти компоненты с прямым `error.message` рендерингом

**Phase 2: Graceful Recovery (безопасно)**
1. Добавить global unhandledrejection handler
2. Enhanced error boundaries с JSON фильтрацией  
3. Telegram WebApp.close() при auth errors

**Phase 3: Architecture Enhancement**
1. Centralized AuthErrorHandler service
2. Improved Telegram WebApp lifecycle management
3. Comprehensive error monitoring

### Статус:
🔍 **ДИАГНОСТИКА ЗАВЕРШЕНА** - Архитектура здорова, нужно найти конкретный компонент, показывающий JSON пользователям