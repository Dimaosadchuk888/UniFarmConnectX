# ОТЧЕТ: РАЗЛИЧИЯ МЕЖДУ PREVIEW И TELEGRAM ОКРУЖЕНИЕМ
**Дата:** 16 января 2025
**Проблема:** Приложение работает в Preview, но не работает в Telegram

## 🔍 КЛЮЧЕВЫЕ РАЗЛИЧИЯ

### 1. Авторизация

| Аспект | Preview Mode | Telegram Mini App |
|--------|--------------|-------------------|
| Метод | Автоматическая с тестовым user | Реальная через initData |
| User ID | Всегда 74 (test_user) | Реальный telegram_id |
| JWT токен | Создается автоматически | Требует валидации initData |
| Проверка | direct_registration: true | HMAC-SHA256 проверка |

**Код в Preview:**
```javascript
// App.tsx строки 188-220
if (isReplitPreview) {
  // Автоматически создает пользователя с ID 999489
  const response = await fetch('/api/v2/auth/telegram', {
    body: JSON.stringify({
      direct_registration: true,
      telegram_id: 999489,
      username: 'test_user_1752129840905'
    })
  });
}
```

### 2. Хранилище данных

| Тип | Preview | Telegram | Проблема |
|-----|---------|----------|----------|
| LocalStorage | ✅ Полный доступ | ⚠️ Может быть ограничен | JWT токен может не сохраняться |
| SessionStorage | ✅ Работает | ⚠️ Сбрасывается | Потеря данных при навигации |
| Cookies | ✅ Работают | ❌ Заблокированы | Нельзя использовать для сессий |

### 3. Сетевые запросы

| Аспект | Preview | Telegram |
|--------|---------|----------|
| CORS | Разрешено для localhost | Строгая политика |
| HTTPS | Опционально | Обязательно |
| CSP | Нет ограничений | Строгие правила |
| Домен | replit.app | Должен быть в белом списке |

### 4. Telegram WebApp API

| Компонент | Preview | Telegram |
|-----------|---------|----------|
| window.Telegram.WebApp | ❌ Отсутствует | ✅ Доступен |
| initData | ❌ Нет | ✅ Содержит user, hash, auth_date |
| startParam | ❌ Нет | ✅ Для реферальных ссылок |
| Theme/Colors | ❌ Нет | ✅ Настройки темы |

## 🚨 ТИПИЧНЫЕ ПРОБЛЕМЫ В TELEGRAM

### 1. "Authentication required" (401)
**Причина:** initData не передается или не валидируется
**Решение:** 
- Проверить наличие `window.Telegram.WebApp.initData`
- Убедиться что TELEGRAM_BOT_TOKEN правильный
- Проверить HMAC валидацию в utils/telegram.ts

### 2. "JWT token not found"
**Причина:** LocalStorage заблокирован или очищен
**Решение:**
- Использовать sessionStorage как fallback
- Передавать токен в URL параметрах
- Сохранять в Telegram.WebApp.CloudStorage

### 3. "CORS blocked"
**Причина:** Запросы к API блокируются политикой CORS
**Решение:**
- Настроить правильные CORS заголовки на сервере
- Использовать тот же домен для API и фронтенда
- Добавить домен в белый список Telegram

### 4. "Manifest not found" (TON Connect)
**Причина:** Неправильный путь или CORS для манифеста
**Решение:**
- Убедиться что URL в манифесте = production URL
- Проверить CORS заголовки для манифеста
- Использовать абсолютный URL в TonConnectUIProvider

## 📋 ДИАГНОСТИКА

### Шаги для выявления проблемы:

1. **Откройте telegram-diagnostic.html в Telegram:**
   ```
   https://ваш-домен/telegram-diagnostic.html
   ```

2. **Проверьте раздел "Telegram WebApp Environment":**
   - Должно быть: InitData: Present
   - Должны быть данные пользователя

3. **Нажмите "Test Authorization":**
   - Должен создаться JWT токен
   - Проверьте ошибки в логах

4. **Нажмите "Test API":**
   - Все endpoints должны вернуть OK
   - Если 401 - проблема с токеном

## 🛠️ РЕКОМЕНДАЦИИ

### 1. Изменить логику авторизации
```javascript
// Добавить fallback для Telegram
if (!localStorage.getItem('unifarm_jwt_token')) {
  // Попробовать sessionStorage
  const sessionToken = sessionStorage.getItem('unifarm_jwt_token');
  if (sessionToken) {
    localStorage.setItem('unifarm_jwt_token', sessionToken);
  }
}
```

### 2. Добавить логирование
```javascript
// В App.tsx добавить детальные логи
console.log('[Auth Debug]', {
  hasTelegram: !!window.Telegram,
  hasWebApp: !!window.Telegram?.WebApp,
  hasInitData: !!window.Telegram?.WebApp?.initData,
  initDataLength: window.Telegram?.WebApp?.initData?.length,
  localStorage: !!localStorage.getItem('unifarm_jwt_token')
});
```

### 3. Проверить серверную валидацию
- Убедиться что TELEGRAM_BOT_TOKEN в Replit Secrets правильный
- Проверить что сервер принимает initData в заголовке X-Telegram-Init-Data
- Логировать результаты HMAC проверки

## ✅ QUICK FIX

Для быстрого решения можно временно отключить валидацию в development:
```javascript
// В utils/telegram.ts
if (process.env.NODE_ENV === 'development') {
  console.warn('⚠️ Telegram validation bypassed in development');
  return { valid: true, user: extractedUser };
}
```

**НО это только для тестирования! В production валидация обязательна!**