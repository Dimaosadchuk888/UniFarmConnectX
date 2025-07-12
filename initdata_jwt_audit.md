# Аудит передачи и проверки initData JWT в UniFarm Mini App

## 📅 Дата аудита: 12 января 2025

## 🎯 Цель аудита
Подтвердить, что initData JWT из Telegram Mini-App:
1. Корректно считывается на фронте
2. Передается на backend без потерь или изменений
3. На сервере проходит полную проверку подписи (HMAC-SHA256 с Bot Token)
4. Используется для реферальной логики (start_param) и создания сессии

## 📊 Результаты аудита

| Этап | OK? | Файл / Строка | Комментарий |
|------|-----|---------------|-------------|
| initData читается | ✅ | client/src/hooks/useTelegram.ts:51 | `setInitData(tg.initData)` - читается из Telegram WebApp |
| initData отправляется без изменений | ✅ | client/src/App.tsx:131-137 | Отправляется в заголовке и теле запроса |
| Подпись проверяется | ✅ | utils/telegram.ts:48-145 | HMAC-SHA256 валидация по алгоритму Telegram |
| start_param записан | ❌ | - | start_param НЕ извлекается из initData |

## 🔍 Детальный анализ

### 1. Фронтенд - чтение initData

**Файл:** `client/src/hooks/useTelegram.ts`
```typescript
useEffect(() => {
  const tg = window.Telegram?.WebApp;
  
  if (tg) {
    tg.ready();
    setIsReady(true);
    setUser(tg.initDataUnsafe.user || null);
    setInitData(tg.initData); // Строка 51
    tg.expand();
  }
}, []);
```
✅ **Вывод:** initData корректно читается из Telegram WebApp API

### 2. Network Layer - передача на backend

**Файл:** `client/src/App.tsx`
```typescript
const response = await fetch('/api/v2/auth/telegram', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': window.Telegram.WebApp.initData // Заголовок
  },
  body: JSON.stringify({
    initData: window.Telegram.WebApp.initData, // Тело запроса
    ref_by: refCode || undefined
  })
});
```
✅ **Вывод:** initData передается без изменений дважды - в заголовке и теле запроса

### 3. Backend - проверка подписи

**Файл:** `utils/telegram.ts`
```typescript
export function validateTelegramInitData(initData: string, botToken: string): ValidationResult {
  // ...
  // Создаем секретный ключ
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // Генерируем ожидаемый хеш
  const expectedHash = crypto
    .createHmac('sha256', secretKey)
    .update(sortedParams)
    .digest('hex');

  if (expectedHash !== hash) {
    return { valid: false, error: 'Invalid signature' };
  }
  // ...
}
```
✅ **Вывод:** Подпись проверяется по официальному алгоритму Telegram

**Дополнительные проверки:**
- ✅ Проверка auth_date (не старше 1 часа)
- ✅ Парсинг user данных из JSON
- ✅ Валидация обязательных полей (id, first_name)

### 4. Реферальная логика и start_param

**Проблема:** start_param НЕ извлекается из initData!

**Текущая реализация:**
- Реферальный код передается через параметр `ref_by` в теле запроса
- start_param определен в интерфейсе TelegramInitData, но НЕ используется
- validateTelegramInitData НЕ извлекает start_param из URL параметров

**Файл:** `modules/auth/service.ts:160`
```typescript
userInfo = await this.findOrCreateFromTelegram({
  telegram_id: telegramUser.id,
  username: telegramUser.username,
  first_name: telegramUser.first_name,
  ref_by: options.ref_by // Используется ref_by из тела запроса, НЕ start_param
});
```

## 🚨 Обнаруженные проблемы

### 1. start_param не извлекается из initData
- В функции `validateTelegramInitData` все параметры парсятся в объект `data`, но start_param не возвращается
- Реферальная система использует параметр из тела запроса вместо официального start_param

### 2. Двойная передача initData
- initData передается и в заголовке, и в теле запроса - это избыточно
- Рекомендуется использовать только заголовок для безопасности

### 3. Отсутствие логирования start_param
- В логах не отображается наличие/отсутствие start_param в initData

## 📋 Рекомендации

1. **Извлечь start_param из initData:**
   ```typescript
   // В validateTelegramInitData добавить:
   const startParam = urlParams.get('start_param');
   if (startParam) {
     data.start_param = startParam;
   }
   ```

2. **Использовать start_param для реферальной логики:**
   - Приоритет: start_param > ref_by из body > URL параметры

3. **Убрать дублирование передачи initData:**
   - Оставить только заголовок X-Telegram-Init-Data

4. **Добавить логирование start_param:**
   - Логировать наличие и значение start_param при валидации

## 🔒 Безопасность

✅ **Сильные стороны:**
- Корректная HMAC-SHA256 валидация
- Проверка времени жизни токена (1 час)
- Логирование всех этапов валидации

⚠️ **Рекомендации:**
- Маскировать чувствительные данные в логах (hash, user id)
- Добавить rate limiting на endpoint авторизации

## 📊 Итоговый вывод

**Передача и проверка initData JWT выполнены на 75%:**
- ✅ Чтение, передача и валидация работают корректно
- ❌ start_param не извлекается и не используется для реферальной системы
- ⚠️ Есть архитектурные недостатки (двойная передача, отсутствие использования start_param)

Система функциональна, но не использует полный потенциал Telegram Mini App API для реферальной системы.