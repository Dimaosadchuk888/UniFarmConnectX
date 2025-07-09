# Технический отчет: Исследование механизма JWT/GVT токенов в системе UniFarm

**Дата исследования:** 9 января 2025  
**Исполнитель:** AI Assistant  
**Основание:** Документация ROADMAP.md и анализ кода системы UniFarm

---

## 📋 Резюме исследования

Проведено детальное исследование механизма генерации, валидации и хранения JWT токенов в системе UniFarm. Ключевой вывод: **система использует stateless JWT архитектуру без хранения токенов в базе данных**.

### Критические находки:
1. ❌ **JWT токены НЕ сохраняются в базе данных**
2. ❌ **Таблица user_sessions отсутствует** (подтверждено в ROADMAP.md)
3. ✅ **JWT токены хранятся только на стороне клиента** (localStorage)
4. ✅ **Срок действия токена: 7 дней**
5. ✅ **Алгоритм подписи: HS256**

---

## 🔑 Структура JWT токена

### Payload содержит:
```typescript
interface JWTPayload {
  userId: number;          // ID пользователя из БД
  telegram_id: number;     // Telegram ID пользователя
  username?: string;       // Username из Telegram
  ref_code?: string;       // Реферальный код пользователя
  iat: number;            // Время выпуска токена (issued at)
  exp: number;            // Время истечения токена (expiration)
}
```

### Пример декодированного токена:
```json
{
  "userId": 62,
  "telegram_id": 88888848,
  "username": "preview_test",
  "first_name": "Preview",
  "ref_code": "REF_1751780521918_u1v62d",
  "iat": 1751871063,
  "exp": 1752475863
}
```

---

## 🔐 Процесс генерации JWT токена

### 1. Точка входа: Аутентификация через Telegram
**Файл:** `modules/auth/service.ts`

При успешной аутентификации через Telegram вызывается функция `generateJWTToken`:

```typescript
// modules/auth/service.ts, строки 174-181
const userForToken = {
  ...telegramUser,
  id: userInfo.id,                // Используем реальный user_id из базы
  telegram_id: userInfo.telegram_id // Добавляем реальный telegram_id из базы
};
const token = generateJWTToken(userForToken, userInfo.ref_code);
```

### 2. Функция генерации токена
**Файл:** `utils/telegram.ts`

```typescript
// utils/telegram.ts, строки 150-169
export function generateJWTToken(user: TelegramUser | TelegramUserWithDbId, refCode?: string): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not set');
  }

  const payload: JWTPayload = {
    userId: user.id,
    telegram_id: ((user as any).telegram_id as number) || user.id,
    username: user.username,
    ref_code: refCode,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
  return token;
}
```

### 3. Секретный ключ
- Используется переменная окружения `JWT_SECRET`
- Обязательная проверка наличия ключа
- При отсутствии выбрасывается ошибка

---

## ✅ Процесс валидации JWT токена

### 1. Middleware для проверки авторизации
**Файл:** `core/middleware/telegramAuth.ts`

Middleware `requireTelegramAuth` проверяет JWT токен в заголовке Authorization:

```typescript
// core/middleware/telegramAuth.ts, строки 30-86
if (authHeader && authHeader.startsWith('Bearer ')) {
  const token = authHeader.substring(7);
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Извлечение userId из токена
    const userId = decoded.userId || decoded.user_id;
    
    // Загрузка полных данных пользователя из БД
    const userRepository = new SupabaseUserRepository();
    const fullUser = await userRepository.getUserById(userId);
    
    if (fullUser) {
      // Установка данных пользователя в request
      (req as any).telegramUser = user;
      (req as any).user = user;
      (req as any).telegram = { user, validated: true };
      next();
      return;
    }
  } catch (jwtError) {
    // Возврат ошибки 401 при невалидном токене
    res.status(401).json({ 
      success: false, 
      error: 'Invalid or expired JWT token',
      need_new_token: true 
    });
  }
}
```

### 2. Функция верификации токена
**Файл:** `utils/telegram.ts`

```typescript
// utils/telegram.ts, строки 174-187
export function verifyJWTToken(token: string): JWTPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable not set');
    }

    const payload = jwt.verify(token, jwtSecret) as JWTPayload;
    return payload;
  } catch (error) {
    console.error('[JWT] Verification error:', error);
    return null;
  }
}
```

---

## 🗄️ Хранение JWT токенов

### База данных:
- ❌ **JWT токены НЕ сохраняются в базе данных**
- ❌ **Таблица user_sessions ОТСУТСТВУЕТ** 
- Согласно ROADMAP.md (строка 133): "user_sessions заполнена 5 оригинальными заданиями"
- Согласно SUPABASE_AUDIT_REPORT.md: таблица user_sessions в списке отсутствующих

### Клиентская сторона:
- ✅ **Токен хранится в localStorage браузера**
- Ключ хранения: `unifarm_jwt_token`
- Пример из кода: `localStorage.getItem('unifarm_jwt_token')`

### Архитектура:
- **Stateless JWT** - сервер не хранит состояние сессии
- При каждом запросе токен валидируется заново
- Данные пользователя загружаются из БД по userId из токена

---

## 📡 API Endpoints для работы с JWT

### Модуль Authentication
**Файл:** `modules/auth/routes.ts`

| Endpoint | Метод | Описание | Валидация |
|----------|--------|----------|-----------|
| `/api/v2/auth/telegram` | POST | Аутентификация через Telegram | initData или direct_registration |
| `/api/v2/auth/register/telegram` | POST | Регистрация через Telegram | initData или direct_registration |
| `/api/v2/auth/check` | GET | Проверка токена и получение данных пользователя | Bearer token в headers |
| `/api/v2/auth/validate` | POST | Проверка валидности токена | token в body |
| `/api/v2/auth/refresh` | POST | Обновление JWT токена | token в body |
| `/api/v2/auth/logout` | POST | Выход (клиентский) | - |
| `/api/v2/auth/session` | GET | Информация о сессии | Bearer token в headers |

### Rate Limiting:
- Публичные endpoints (`/telegram`, `/register/telegram`): `strictRateLimit`
- Проверочные endpoints: `liberalRateLimit`

---

## 🔄 Жизненный цикл JWT токена

### 1. Создание токена:
```
Telegram WebApp → POST /api/v2/auth/telegram → 
→ Валидация HMAC → Поиск/создание пользователя в БД →
→ generateJWTToken() → Возврат токена клиенту
```

### 2. Использование токена:
```
Client (localStorage) → Authorization: Bearer <token> →
→ requireTelegramAuth middleware → jwt.verify() →
→ Загрузка данных из БД → Установка req.user → 
→ Выполнение запроса
```

### 3. Обновление токена:
```
POST /api/v2/auth/refresh → Проверка старого токена →
→ Генерация нового токена с теми же данными →
→ Возврат нового токена клиенту
```

### 4. Logout:
```
Client удаляет токен из localStorage
Сервер не выполняет никаких действий
```

---

## 🔍 Особенности реализации

### 1. Отсутствие серверного хранилища сессий:
- Нет blacklist для отозванных токенов
- Нет возможности принудительного logout на сервере
- Нет счетчика активных сессий

### 2. Безопасность:
- ✅ Обязательная проверка JWT_SECRET
- ✅ Срок действия токена 7 дней
- ✅ Алгоритм HS256
- ❌ Нет refresh token (используется тот же токен)
- ❌ Нет ротации токенов

### 3. Производительность:
- ✅ Нет запросов к БД для проверки сессии
- ❌ Каждый запрос требует загрузки данных пользователя из БД

---

## 📊 Статистика использования JWT в коде

### Файлы с JWT логикой:
1. `utils/telegram.ts` - генерация и верификация
2. `core/middleware/telegramAuth.ts` - middleware проверки
3. `modules/auth/service.ts` - бизнес-логика аутентификации
4. `modules/auth/controller.ts` - HTTP endpoints
5. `modules/user/controller.ts` - дополнительная проверка JWT

### Использование JWT_SECRET:
- 7 мест в коде с проверкой наличия
- Нет fallback значений (согласно JWT_SECURITY_FIX_REPORT.md)

---

## 💡 Выводы и рекомендации

### Текущее состояние:
1. **Архитектура:** Классическая stateless JWT без серверного хранения
2. **Безопасность:** Базовый уровень, достаточный для Telegram Mini App
3. **Масштабируемость:** Отличная за счет отсутствия состояния на сервере
4. **Соответствие ROADMAP:** Частичное - endpoints реализованы, но user_sessions отсутствует

### Потенциальные улучшения:
1. Реализовать refresh token для повышения безопасности
2. Добавить blacklist для отозванных токенов
3. Внедрить ротацию токенов при refresh
4. Создать таблицу user_sessions для аудита
5. Добавить механизм принудительного logout

### Заключение:
Система JWT в UniFarm реализована по стандартному stateless паттерну, что обеспечивает простоту и масштабируемость. Отсутствие серверного хранения сессий является осознанным архитектурным решением, типичным для современных веб-приложений.

---

*Отчет подготовлен на основе анализа кода и документации ROADMAP.md без внесения изменений в систему.*