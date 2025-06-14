# Руководство по настройке Telegram Mini App - UniFarm

## 🎯 Решение проблемы с пустым initData

### Диагностика проблемы
Из логов видно, что `initData` пустой (длина = 0), что означает:
1. Приложение открывается не через Telegram Mini App
2. Неправильно настроен Web App URL в BotFather
3. Проблемы с загрузкой Telegram WebApp SDK

## 🔧 Шаги по исправлению

### 1. Проверка настроек BotFather

**Критично важно:**
Убедитесь, что в BotFather для @UniFarming_Bot настроено:

```
/setmenubutton
Выберите бота: @UniFarming_Bot
Web App URL: https://uni-farm-connect-x-osadchukdmitro2.replit.app
Button text: 🚜 UniFarm Connect
```

**Альтернативно через команды:**
```
/newapp
/editapp
```

### 2. Правильный запуск Mini App

**Проблема:** Приложение открывается в браузере напрямую
**Решение:** Обязательно запускать через:

1. Открыть Telegram
2. Найти @UniFarming_Bot
3. Нажать кнопку "🚜 UniFarm Connect" (или Menu)
4. НЕ открывать ссылку в браузере напрямую

### 3. Проверка domain в BotFather

Убедитесь, что домен в BotFather точно соответствует:
```
https://uni-farm-connect-x-osadchukdmitro2.replit.app
```

**Без:**
- Слеша в конце
- Дополнительных путей
- HTTP вместо HTTPS

### 4. Тестирование с другими ботами

Если проблема продолжается, создайте тестового бота:
```
/newbot
Имя: UniFarm Test Bot
Username: @UniFarmTestBot
/newapp
Выберите @UniFarmTestBot
URL: https://uni-farm-connect-x-osadchukdmitro2.replit.app
```

## 📱 Диагностические возможности

### В браузере через Telegram:
После открытия через бота проверьте в консоли:
```javascript
// Должно показать данные пользователя
console.log(window.Telegram.WebApp.initData);
console.log(window.Telegram.WebApp.initDataUnsafe.user);
```

### Ожидаемые логи при правильной работе:
```
✅ Telegram WebApp найден!
✅ initData получен: query_id=...
✅ Пользователь найден:
- User ID: 123456789
- Username: @username
```

## 🚨 Частые ошибки

### 1. Открытие в браузере
**Симптом:** initData пустой, нет данных пользователя
**Решение:** Обязательно открывать через Telegram бот

### 2. Неправильный URL в BotFather
**Симптом:** Ошибка "Not Found" или пустой initData
**Решение:** Проверить точное соответствие домена

### 3. HTTPS проблемы
**Симптом:** Telegram не загружает приложение
**Решение:** Убедиться, что сайт работает по HTTPS

### 4. Кеширование
**Симптом:** Старая версия приложения
**Решение:** Очистить кеш Telegram или переустановить

## 🔍 Пошаговая диагностика

### Шаг 1: Проверьте настройки бота
```bash
# В Telegram с @BotFather
/mybots
Выберите @UniFarming_Bot
Bot Settings → Menu Button → Configure Menu Button
```

### Шаг 2: Проверьте доступность сайта
```bash
curl -I https://uni-farm-connect-x-osadchukdmitro2.replit.app
# Должен вернуть HTTP 200
```

### Шаг 3: Проверьте через Telegram Web
1. Откройте web.telegram.org
2. Найдите @UniFarming_Bot
3. Нажмите Menu/Кнопку приложения
4. Проверьте консоль браузера

### Шаг 4: Проверьте логи приложения
Улучшенные логи теперь покажут:
- Наличие Telegram WebApp API
- Данные initData и пользователя
- Причины отсутствия данных

## ⚡ Быстрое решение

Если проблема критична, используйте этот алгоритм:

1. **Немедленно:** Откройте приложение ТОЛЬКО через @UniFarming_Bot в Telegram
2. **Проверьте:** Консоль браузера на наличие ошибок
3. **Если initData все еще пустой:** Пересоздайте Web App в BotFather
4. **Альтернатива:** Создайте новый тестовый бот для проверки

## 📊 Ожидаемые результаты

После правильной настройки в логах должно быть:
```
✅ Telegram WebApp найден!
✅ initData получен: query_id=AAH...
✅ Пользователь найден:
- User ID: [реальный ID]
- Username: [реальный username]
✅ [UserContext] Авторизация успешна
✅ Authentication successful, returning token and user data
```

## 🛠️ Техническая информация

### Текущие улучшения в коде:
1. **Улучшенная диагностика** в main.tsx с повторными попытками
2. **Расширенное логирование** всех этапов инициализации
3. **Fallback механизмы** для случаев без initData
4. **Детальная диагностика** причин отсутствия данных

### API endpoints работают корректно:
- `/api/v2/auth/telegram` - авторизация
- `/api/v2/register/telegram` - регистрация
- `/api/v2/users/profile` - профиль пользователя

**Проблема не в серверном коде, а в настройках BotFather и способе запуска приложения.**