# 📋 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ API ТРАНЗАКЦИЙ

## 🔍 АНАЛИЗ ЦЕПОЧКИ ЗАПРОСА GET /api/v2/transactions

### 1. Frontend → Backend запрос
```
Frontend (TransactionHistory.tsx)
↓ 
correctApiRequest('/api/v2/transactions?page=1&limit=20')
↓
JWT Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Backend обработка JWT токена

📁 **core/middleware/telegramAuth.ts**  
🔢 **Строки 44-81**
```javascript
// Строка 44: Декодируется JWT
const decoded = jwt.verify(token, jwtSecret) as any;
// decoded содержит: { userId: 74, telegram_id: 999489, ... }

// Строка 48-49: Извлекаются ID
const userId = decoded.userId || decoded.user_id;      // = 74
const telegramId = decoded.telegram_id || decoded.telegramId; // = 999489

// Строка 59: Загружается пользователь из БД
const fullUser = await userRepository.getUserById(userId);

// Строка 69-81: КРИТИЧЕСКАЯ ОШИБКА - создается объект с неправильной структурой
const user = {
  id: fullUser.id,              // = 74 (database ID)
  telegram_id: fullUser.telegram_id, // = 999489 (Telegram ID)
  // ... другие поля
};

// ❌ ПРОБЛЕМА: в объекте telegram поле user.id содержит database ID, а не telegram_id
(req as any).telegram = { user, validated: true };
```

### 3. Контроллер транзакций

📁 **modules/transactions/controller.ts**  
🔢 **Строки 15-22**
```javascript
// Строка 15: Валидация авторизации
const telegram = this.validateTelegramAuth(req, res);
// telegram.user.id = 74 (это database ID, НЕ telegram_id!)

// Строка 22: ОШИБКА - используется неправильный метод
const user = await userRepository.getUserByTelegramId(telegram.user.id);
// Ищет пользователя с telegram_id = 74
// Находит User 77 (у которого telegram_id = 74)
```

### 4. Результат
- Вместо транзакций User 74 возвращаются транзакции User 77
- Frontend отображает чужие транзакции

## 💡 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### ВАРИАНТ 1: Минимальное изменение (рекомендуется)

📁 **modules/transactions/controller.ts**  
🔢 **Строка 22**  
💡 **Изменить:**
```javascript
// БЫЛО:
const user = await userRepository.getUserByTelegramId(telegram.user.id);

// СТАЛО:
const user = await userRepository.getUserById(telegram.user.id);
```

🔐 **Что будет защищено:**
- Корректное получение транзакций для авторизованного пользователя
- Исключение отображения чужих транзакций

✅ **Как проверить:**
1. Очистить localStorage и заново авторизоваться
2. Открыть вкладку Wallet → History
3. Убедиться, что отображаются транзакции DAILY_BONUS пользователя 74

### ВАРИАНТ 2: Архитектурное исправление

📁 **core/middleware/telegramAuth.ts**  
🔢 **Строка 81**  
💡 **Изменить структуру объекта telegram:**
```javascript
// БЫЛО:
(req as any).telegram = { user, validated: true };

// СТАЛО:
(req as any).telegram = { 
  user: {
    ...user,
    id: user.telegram_id,  // Используем telegram_id как основной идентификатор
    database_id: user.id   // Сохраняем database ID отдельно
  }, 
  validated: true 
};
```

⚠️ **Важно:** Этот вариант требует проверки ВСЕХ контроллеров

## 🔍 ДРУГИЕ МЕСТА С ТАКОЙ ЖЕ ПРОБЛЕМОЙ

### 1. modules/wallet/controller.ts

📁 **modules/wallet/controller.ts**  
🔢 **Строки 124, 242**
```javascript
// Строка 124 (метод withdraw):
const user = await userRepository.getUserByTelegramId(telegram.user.id);

// Строка 242 (метод createDeposit):
const user = await userRepository.getOrCreateUserFromTelegram({
  telegram_id: telegram.user.id,  // ❌ Передается database ID вместо telegram_id
  // ...
});
```

💡 **Исправить аналогично:**
- Заменить getUserByTelegramId на getUserById
- Или использовать telegram.user.telegram_id вместо telegram.user.id

### 2. Другие потенциальные места

Рекомендуется проверить все контроллеры на использование:
- `telegram.user.id` 
- `getUserByTelegramId(telegram.user.id)`

## 📊 ВЛИЯНИЕ НА СВЯЗАННЫЕ МОДУЛИ

### После исправления ВАРИАНТ 1:
✅ **Не пострадают:**
- Авторизация (JWT продолжит работать)
- Миссии (используют правильную логику)
- Daily Bonus (уже работает корректно)
- Farming (использует userId из req.body)

⚠️ **Требуют проверки:**
- Wallet withdraw (та же проблема)
- Wallet deposits (использует getOrCreateUserFromTelegram)
- Boost покупки (нужно проверить логику)

### Тестовый план:
1. **Транзакции:** GET /api/v2/transactions должен вернуть 271 транзакцию User 74
2. **Вывод средств:** POST /api/v2/wallet/withdraw должен создавать заявку для User 74
3. **Депозиты:** POST /api/v2/wallet/deposit должен начислять средства User 74
4. **Баланс:** GET /api/v2/wallet/balance уже работает корректно (использует getUserById)

## 🏗️ АРХИТЕКТУРНЫЕ РЕКОМЕНДАЦИИ

### 1. Стандартизация именования
- `id` в контексте Telegram должен всегда означать telegram_id
- `userId` или `database_id` для внутреннего ID базы данных

### 2. Типизация
Создать интерфейсы:
```typescript
interface TelegramAuthUser {
  telegram_id: number;  // ID из Telegram
  database_id: number;  // ID из нашей БД
  username?: string;
  // ...
}
```

### 3. Валидация в BaseController
Добавить проверку соответствия авторизованного пользователя запрашиваемым данным:
```typescript
protected validateUserAccess(requestUserId: number, authUser: any): boolean {
  return requestUserId === authUser.id;
}
```

## ✅ ИТОГОВЫЕ РЕКОМЕНДАЦИИ

1. **Срочно исправить:** modules/transactions/controller.ts (строка 22)
2. **Проверить и исправить:** modules/wallet/controller.ts (строки 124, 242)
3. **Провести аудит:** Все контроллеры на предмет использования telegram.user.id
4. **Долгосрочно:** Рефакторинг структуры объекта telegram для ясности
5. **Добавить тесты:** E2E тесты для проверки корректности получения данных

### Приоритет: КРИТИЧЕСКИЙ 🔴
Проблема влияет на безопасность и корректность отображения финансовых данных пользователей.