# UniFarm Telegram Mini App - Інструкція з налаштування

## Огляд

UniFarm тепер інтегрований з Telegram як Mini App, що дозволяє користувачам відкривати додаток безпосередньо з Telegram через кнопку меню.

## Налаштування

### Встановлення Webhook

Webhook для Telegram бота налаштований на URL:
```
https://uni-farm-connect-x-lukyanenkolawfa.replit.app/api/telegram/webhook
```

Для ручного оновлення webhook використовуйте:
```bash
node setup-webhook.js
```

### Кнопка меню

Кнопка меню в Telegram налаштована на:
- **Текст**: "Открыть UniFarm"
- **URL**: https://uni-farm-connect-x-lukyanenkolawfa.replit.app/

### Запуск сервера

Для запуску UniFarm як Telegram Mini App використовуйте:
```bash
node start-mini-app.js
```

Цей скрипт:
- Автоматично перезапускається при помилках
- Використовує memory storage при недоступності бази даних
- Зберігає процес активним через keep-alive

## Технічні деталі

### Режим memory storage

Якщо Neon DB недоступна, додаток автоматично переходить у режим memory storage:
- Дані зберігаються в пам'яті під час сесії
- Всі базові функції залишаються доступними
- Дані втрачаються при перезапуску сервера

### Стійкість до помилок

Додаток сконфігуровано для стабільної роботи навіть при проблемах:
- Помилки підключення до БД ігноруються
- Необроблені помилки не зупиняють сервер
- Працює автоматичний перезапуск при збоях

## Команди бота

Встановлені команди:
- /start - Начать использовать UniFarm
- /help - Помощь по использованию
- /deposit - Внести депозит
- /withdraw - Вывести средства
- /referral - Реферальная программа

## Змінні середовища

Для роботи в режимі memory storage використовуються:
```
FORCE_MEMORY_STORAGE=true
ALLOW_MEMORY_FALLBACK=true
USE_MEMORY_SESSION=true
DATABASE_PROVIDER=memory
IGNORE_DB_CONNECTION_ERRORS=true
```

## Усунення несправностей

Якщо додаток не відкривається в Telegram:
1. Переконайтеся, що вебхук встановлений (`node setup-webhook.js`)
2. Перевірте налаштування кнопки меню (`curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getChatMenuButton" | jq`)
3. Запустіть додаток в режимі memory storage (`node start-mini-app.js`)