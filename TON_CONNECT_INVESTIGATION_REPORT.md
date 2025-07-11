# Отчет о расследовании проблемы TON Connect
**Дата:** 11 января 2025  
**Статус:** В процессе решения

## Описание проблемы
Пользователь не может подключить TON кошелек. При попытке подключения получает ошибку 404 при загрузке `tonconnect-manifest.json`.

## Результаты расследования

### 1. Файл tonconnect-manifest.json
✅ **Файл существует**: `client/public/tonconnect-manifest.json`
✅ **Содержимое корректное**:
```json
{
  "url": "https://uni-farm-connect-x-ab245275.replit.app",
  "name": "UniFarm",
  "iconUrl": "https://uni-farm-connect-x-ab245275.replit.app/assets/favicon.ico",
  "termsOfUseUrl": "https://uni-farm-connect-x-ab245275.replit.app/terms",
  "privacyPolicyUrl": "https://uni-farm-connect-x-ab245275.replit.app/privacy"
}
```

### 2. Серверная конфигурация
✅ **Обработчик существует**: `server/index.ts` строка 1186
✅ **Локальный доступ работает**: `curl http://localhost:3000/tonconnect-manifest.json` возвращает файл

### 3. Клиентская конфигурация
✅ **TON Connect инициализирован**: В `App.tsx` используется `TonConnectUIProvider`
✅ **URL манифеста**: Используется относительный путь `/tonconnect-manifest.json`

## Обнаруженная проблема
Запрос пользователя идет через внешний прокси (nginx/cloudflare), который возвращает 404 до того, как запрос доходит до Express сервера.

## Примененные исправления

### 1. Добавлены CORS заголовки
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
res.setHeader('Cache-Control', 'public, max-age=3600');
```

## Рекомендации для решения

### Вариант 1: Использовать абсолютный URL (временное решение)
1. Разместить файл на внешнем хостинге (GitHub Pages, CDN)
2. Обновить `manifestUrl` в `App.tsx` на абсолютный URL

### Вариант 2: Проверить конфигурацию прокси
1. Убедиться что nginx/cloudflare пропускает запросы к `/tonconnect-manifest.json`
2. Возможно нужно добавить правило для статических файлов

### Вариант 3: Обновить домен в манифесте
URL в манифесте (`uni-farm-connect-x-ab245275.replit.app`) может быть устаревшим. Нужно обновить на актуальный домен приложения.

## Реализованное решение
Обработчик `/tonconnect-manifest.json` перемещен ДО глобального CORS middleware в `server/index.ts`. Это гарантирует что TON Connect manifest всегда возвращается с правильными CORS заголовками (`Access-Control-Allow-Origin: *`), независимо от глобальных настроек CORS.

## Следующие шаги
1. Сервер перезапущен автоматически
2. Попросить пользователя протестировать подключение снова
3. Если проблема сохраняется:
   - Проверить что прокси-сервер (nginx/cloudflare) пропускает запросы к `/tonconnect-manifest.json`
   - Обновить URL в самом манифесте на актуальный домен приложения
   - В крайнем случае - использовать внешний CDN для хостинга манифеста