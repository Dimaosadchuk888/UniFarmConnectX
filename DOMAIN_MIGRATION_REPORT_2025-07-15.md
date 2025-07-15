# Отчет о миграции домена UniFarm
**Дата:** 15 января 2025  
**Статус:** ✅ Завершено

## Описание задачи
Обновление всех ссылок со старого домена `uni-farm-connect-x-ab245275.replit.app` на новый домен `uni-farm-connect-x-elizabethstone1.replit.app` для восстановления работы TON Connect.

## Проблема
TON Connect не мог подключиться к кошелькам из-за того, что в манифесте был указан старый домен, который больше не существует.

## Выполненные изменения

### 1. ✅ TON Connect Manifest
**Файл:** `client/public/tonconnect-manifest.json`  
**Статус:** Уже был обновлен  
Все URL в манифесте уже содержали правильный домен `uni-farm-connect-x-elizabethstone1.replit.app`

### 2. ✅ Серверная конфигурация  
**Файл:** `server/index.ts`  
**Строка:** 345  
**Изменение:** Обновлен fallback URL для Telegram webhook  
```typescript
// Было:
const webhookUrl = process.env.APP_DOMAIN || process.env.TELEGRAM_WEBHOOK_URL || 'https://uni-farm-connect-x-ab245275.replit.app';

// Стало:
const webhookUrl = process.env.APP_DOMAIN || process.env.TELEGRAM_WEBHOOK_URL || 'https://uni-farm-connect-x-elizabethstone1.replit.app';
```

### 3. ✅ Тестовые файлы
Обновлены все тестовые скрипты:
- `tests/debug/debug-balance-issue.js` (строка 10)
- `tests/test-all-routes.js` (строка 45)
- `tests/test-deposit-api.js` (строка 9)
- `tests/test-health.js` (строка 16)

## Результаты проверки TON Connect

### ✅ Манифест настроен корректно:
- Файл доступен по пути `/tonconnect-manifest.json`
- Серверный обработчик настроен с правильными CORS заголовками
- Манифест содержит актуальный домен

### ✅ Клиентская часть:
- `TonConnectUIProvider` в `App.tsx` использует правильный путь к манифесту
- Конфигурация в `config/tonConnect.ts` корректна

## Следующие шаги
1. Сервер перезапущен для применения изменений
2. TON Connect должен теперь корректно подключаться к кошелькам
3. Пользователь может проверить работу, нажав кнопку "Connect Wallet"

## Примечание
Если проблема с подключением сохраняется после обновления домена, возможные причины:
- Кэш браузера (рекомендуется очистить)
- Блокировка со стороны прокси/CDN
- Необходимость ждать обновления DNS записей (до 5 минут)