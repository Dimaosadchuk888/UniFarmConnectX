# 🧪 Тестовый пользователь UniFarm

## Информация о созданном пользователе

### Основные данные
- **User ID**: 74
- **Telegram ID**: 999489
- **Username**: @test_user_1752129840905
- **Ref Code**: TEST_1752129840905_dokxv0

### Начальный баланс
- **UNI**: 1000.000000000
- **TON**: 1000.000000000

### JWT токен для авторизации
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJURVNUXzE3NTIxMjk4NDA5MDVfZG9reHYwIiwiaWF0IjoxNzUyMTI5ODQxLCJleHAiOjE3NTI3MzQ2NDF9.zImxV8ATpEV_ZumGaRKflQ7niNA--PSgKvhXhlPtpsU
```

## Как использовать

### Способ 1: Через HTML файл (рекомендуется)
1. Откройте файл `test-login-user-74.html` в браузере
2. Нажмите кнопку "🚀 Войти и перейти в UniFarm"
3. Вы будете автоматически авторизованы и перенаправлены в приложение

### Способ 2: Ручная авторизация
1. Откройте консоль разработчика в браузере (F12)
2. Выполните команду:
```javascript
localStorage.setItem('unifarm_jwt_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjc0LCJ0ZWxlZ3JhbV9pZCI6OTk5NDg5LCJ1c2VybmFtZSI6InRlc3RfdXNlcl8xNzUyMTI5ODQwOTA1IiwicmVmX2NvZGUiOiJURVNUXzE3NTIxMjk4NDA5MDVfZG9reHYwIiwiaWF0IjoxNzUyMTI5ODQxLCJleHAiOjE3NTI3MzQ2NDF9.zImxV8ATpEV_ZumGaRKflQ7niNA--PSgKvhXhlPtpsU');
```
3. Обновите страницу

## Что можно тестировать

С балансом 1000 UNI / 1000 TON вы можете:

### UNI Farming
- Купить любой пакет фарминга (5, 10, 25, 50, 48 UNI)
- Проверить начисление доходов
- Протестировать реферальную систему

### TON Boost
- Активировать любой буст-пакет (требуется подключение TON кошелька)
- Проверить множители доходности
- Тестировать интеграцию с блокчейном

### Миссии
- Выполнять доступные задания
- Получать награды
- Проверять обновление баланса

### Другие функции
- Daily Bonus (ежедневные бонусы)
- Реферальная программа
- История транзакций
- Вывод средств

## Важные замечания

1. **Срок действия токена**: 7 дней с момента создания (до ~17 января 2025)
2. **Тип пользователя**: Обычный пользователь (не админ)
3. **Статус фарминга**: Не активен (нужно купить пакет)
4. **TON кошелек**: Не подключен

## Создание дополнительных тестовых пользователей

Для создания нового тестового пользователя выполните:
```bash
cd scripts && node create-test-user-with-balance.js
```

Каждый новый пользователь получит:
- Уникальный ID и реферальный код
- Баланс 1000 UNI / 1000 TON
- Свой JWT токен
- HTML файл для быстрого входа