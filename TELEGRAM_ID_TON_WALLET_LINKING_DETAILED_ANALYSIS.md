# 🔍 ДЕТАЛЬНЫЙ АНАЛИЗ МЕХАНИЗМА СВЯЗКИ TELEGRAM ID И TON-КОШЕЛЬКА

**Дата:** 21 января 2025  
**Контекст:** Расследование проблем идентификации пользователя при TON депозитах

---

## 📊 АРХИТЕКТУРА ИДЕНТИФИКАЦИИ ПОЛЬЗОВАТЕЛЯ

### Текущая схема имеет 3 уровня идентификации:

```
1. JWT Token (telegram_id) → Primary
2. TON Wallet Address → Fallback
3. Auto-creation → Last Resort
```

---

## 🎯 1. КОГДА ПОЛЬЗОВАТЕЛЬ ПОДКЛЮЧАЕТ КОШЕЛЁК

### 1.1 Источник telegram_id при подключении кошелька

**Frontend компонент:** `TonDepositCard.tsx`

```typescript
// При подключении кошелька вызывается saveTonWalletAddress
const userFriendlyAddress = await getTonWalletAddress(tonConnectUI);
await saveTonWalletAddress(userFriendlyAddress);
```

**API вызов:** `client/src/services/tonConnectService.ts`

```typescript
async function saveTonWalletAddress(walletAddress: string): Promise<boolean> {
  const response = await fetch('/api/v2/wallet/connect-ton', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token')}`
    },
    body: JSON.stringify({ walletAddress })
  });
}
```

### 1.2 Откуда берется telegram_id?

**Источник:** JWT токен в заголовке Authorization

```typescript
// modules/wallet/controller.ts - connectTonWallet
const telegram = this.validateTelegramAuth(req, res);
// telegram.user содержит декодированные данные из JWT

const user = await userRepository.getOrCreateUserFromTelegram({
  telegram_id: telegram.user.id,  // ⚠️ КРИТИЧНО: здесь используется database ID!
  username: telegram.user.username,
  first_name: telegram.user.first_name
});
```

### ⚠️ ПРОБЛЕМА #1: Архитектурная путаница с ID

В системе существует критическая проблема с идентификаторами:

```typescript
// В JWT токене:
{
  "userId": 74,          // database user ID
  "telegram_id": 999489, // настоящий telegram ID
}

// После декодирования в telegramAuth.ts:
telegram.user = {
  id: 74,               // database ID (НЕ telegram_id!)
  telegram_id: 999489,  // настоящий telegram_id
}
```

**Последствия:** При вызове `getOrCreateUserFromTelegram` с `telegram.user.id` передается database ID вместо telegram_id!

---

## 🔐 2. ПРИ ПОЛУЧЕНИИ ЗАПРОСА /ton-deposit

### 2.1 Почему getUserByTelegramId() может не находить пользователя?

**Сценарий 1: Неверный telegram_id в запросе**

```typescript
// modules/wallet/controller.ts - tonDeposit
let user = await userRepository.getUserByTelegramId(telegram.user.id);
// ⚠️ telegram.user.id = 74 (database ID), а не 999489 (telegram_id)!
```

Система ищет пользователя с telegram_id = 74, но в базе у него telegram_id = 999489.

**Сценарий 2: Пользователь создан без telegram_id**

Возможны случаи, когда пользователь был создан через другие механизмы и поле telegram_id осталось NULL или некорректным.

### 2.2 Реальная логика поиска пользователя

```typescript
// Правильный вариант (должен быть):
let user = await userRepository.getUserByTelegramId(telegram.user.telegram_id);

// Текущий вариант (неправильный):
let user = await userRepository.getUserByTelegramId(telegram.user.id);
```

---

## 💼 3. FALLBACK ПО WALLET_ADDRESS

### 3.1 Может ли адрес быть связан с другим Telegram ID?

**ДА, это возможно в следующих сценариях:**

1. **Пользователь сменил Telegram аккаунт**
   - Старый аккаунт: telegram_id = 111111, wallet = "UQxx...123"
   - Новый аккаунт: telegram_id = 222222, пытается использовать тот же wallet

2. **Множественные аккаунты**
   - Один кошелек используется для нескольких Telegram аккаунтов

3. **Ошибка привязки**
   - При первом подключении произошел сбой и кошелек привязался к неверному пользователю

### 3.2 Текущая логика fallback

```typescript
// Если пользователь не найден по JWT
if (!user) {
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('ton_wallet_address', wallet_address)
    .single();
    
  if (existingUser) {
    user = existingUser;
    // ⚠️ Используем найденного пользователя БЕЗ проверки соответствия telegram_id!
  }
}
```

**Проблема:** Система продолжает работу с найденным по кошельку пользователем, даже если его telegram_id не совпадает с текущим JWT.

---

## 🚨 4. ВОЗМОЖНЫЕ СЦЕНАРИИ КОНФЛИКТОВ

### Сценарий A: Кошелек уже привязан к другому аккаунту

```
1. Пользователь А (telegram_id: 111111) привязал кошелек "UQxx...123"
2. Пользователь Б (telegram_id: 222222) пытается сделать депозит с того же кошелька
3. JWT содержит telegram_id: 222222
4. Система находит пользователя А по кошельку
5. Депозит зачисляется пользователю А, а не Б!
```

### Сценарий B: Неверная идентификация через JWT

```
1. JWT содержит database ID вместо telegram_id
2. getUserByTelegramId(74) не находит пользователя
3. Система переходит к поиску по кошельку
4. Если кошелек не найден - создается новый пользователь
5. Возникают дубликаты пользователей
```

### Сценарий C: Рассинхронизация данных

```
1. Frontend отправляет user_id из UserContext
2. Backend использует telegram_id из JWT
3. Эти ID могут не совпадать из-за архитектурной проблемы
4. Транзакция не может быть корректно привязана
```

---

## 💡 5. КОРНЕВЫЕ ПРИЧИНЫ ПРОБЛЕМ

### 5.1 Архитектурная проблема с ID

```typescript
// ПРОБЛЕМА в telegramAuth.ts:
const user = {
  id: fullUser.id,  // database ID, а не telegram_id!
  telegram_id: fullUser.telegram_id,
  // ...
};
```

Это приводит к тому, что во всех контроллерах `telegram.user.id` содержит database ID, а не telegram_id.

### 5.2 Отсутствие строгой проверки владельца кошелька

При fallback по wallet_address нет проверки:
- Совпадает ли telegram_id найденного пользователя с текущим JWT
- Имеет ли текущий пользователь право на этот кошелек

### 5.3 Несогласованность Frontend и Backend

Frontend может отправлять:
- `user_id` из UserContext (database ID)
- `wallet_address` из TonConnect

Backend ожидает:
- Валидный JWT с правильным telegram_id
- Соответствие между JWT и wallet_address

---

## 🛠️ 6. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### 6.1 Немедленные исправления (без изменения архитектуры)

1. **Использовать правильное поле для поиска:**
```typescript
// Везде заменить:
getUserByTelegramId(telegram.user.id)
// На:
getUserByTelegramId(telegram.user.telegram_id)
```

2. **Добавить проверку владельца при fallback:**
```typescript
if (existingUser && existingUser.telegram_id !== telegram.user.telegram_id) {
  logger.warn('Попытка депозита с чужого кошелька', {
    current_telegram_id: telegram.user.telegram_id,
    wallet_owner_telegram_id: existingUser.telegram_id
  });
  return this.sendError(res, 'Кошелек привязан к другому аккаунту', 403);
}
```

### 6.2 Долгосрочные улучшения

1. **Создать таблицу wallet_links:**
```sql
CREATE TABLE wallet_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  wallet_address TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)
);
```

2. **Реализовать механизм подтверждения владения:**
- При первой привязке кошелька требовать подпись сообщения
- Сохранять историю всех привязок
- Позволять одному пользователю иметь несколько кошельков

3. **Исправить архитектурную проблему с ID:**
- Переименовать поле в telegram context
- Или создать отдельные методы для получения правильных ID

---

## 📋 7. ПРОВЕРОЧНЫЙ ЧЕКЛИСТ

Для диагностики проблемы с конкретным депозитом:

1. **Проверить JWT токен:**
   - Какой telegram_id в токене?
   - Какой userId в токене?

2. **Проверить поиск пользователя:**
   - Что возвращает getUserByTelegramId с обоими ID?
   - Есть ли пользователь с таким wallet_address?

3. **Проверить соответствие:**
   - Совпадает ли telegram_id из JWT с telegram_id владельца кошелька?
   - Правильный ли user_id используется для создания транзакции?

4. **Проверить логи:**
   - Какой resolution method был использован (jwt_auth, wallet_linking, auto_creation)?
   - Были ли предупреждения о несоответствии ID?

---

## ✅ ВЫВОДЫ

1. **Главная причина сбоев** - архитектурная проблема с использованием database ID вместо telegram_id в JWT контексте

2. **Усугубляющий фактор** - отсутствие проверки владельца кошелька при fallback поиске

3. **Результат** - депозиты могут зачисляться не тому пользователю или вообще не обрабатываться

4. **Решение** - использовать правильные поля для идентификации и добавить строгие проверки соответствия

---

**Документ подготовлен:** 21 января 2025  
**Цель:** Выявление причин сбоев в идентификации пользователя при TON депозитах