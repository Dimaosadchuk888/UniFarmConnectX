# TON Connect Deposit Error Investigation Report
## Дата: 19 июля 2025

## 🚨 КРИТИЧЕСКОЕ ИССЛЕДОВАНИЕ: Ошибка пополнения после очистки кэша

### Контекст проблемы
- ✅ Полная очистка кэша выполнена пользователем
- ✅ Redeploy приложения выполнен
- ✅ Вход через Telegram в приложение
- ❌ **ОШИБКА**: При нажатии "Пополнить депозит" возникает ошибка (скриншот приложен)

### Анализ архитектуры TON Connect (БЕЗ изменения кода)

#### 1. Иерархия провайдеров (App.tsx:289-313)
```typescript
<TonConnectErrorBoundary>
  <TonConnectUIProvider manifestUrl="https://uni-farm-connect-aab49267.replit.app/tonconnect-manifest.json">
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <NotificationProvider>
          <UserProvider>
            <WebSocketProvider>
```

**НАЙДЕНА ПОТЕНЦИАЛЬНАЯ ПРОБЛЕМА**:
- TonConnectUIProvider находится на ВЕРХНЕМ уровне иерархии (строка 290)
- Это ПРАВИЛЬНАЯ архитектура согласно исправлению от 19 июля 2025
- НО: после полной очистки кэша инициализация может завершиться с ошибкой

#### 2. Анализ TonDepositCard.tsx (строки 24-53)

**Критические точки инициализации**:
```typescript
const [tonConnectUI] = useTonConnectUI(); // строка 27
```

**useEffect проверка подключения (строки 36-53)**:
```typescript
useEffect(() => {
  if (tonConnectUI) {
    const connected = isTonWalletConnected(tonConnectUI);
    setIsConnected(connected);
    // ... дальнейшая логика
  }
}, [tonConnectUI]);
```

**ВОЗМОЖНАЯ ПРОБЛЕМА**: tonConnectUI может быть `null` или `undefined` после очистки кэша

#### 3. Анализ функции handleDeposit (строки 87-148)

**Критическая проверка (строки 95-98)**:
```typescript
if (!isConnected || !tonConnectUI) {
  showError('Сначала подключите кошелек');
  return;
}
```

**ЛОГИЧЕСКАЯ ЦЕПОЧКА ОШИБКИ**:
1. Пользователь нажимает "Пополнить депозит"
2. Функция `handleDeposit()` проверяет `!tonConnectUI`
3. Если `tonConnectUI` равно `null` → выводится ошибка "Сначала подключите кошелек"
4. НО: кошелек может быть НЕ подключен из-за ошибки инициализации, а не по вине пользователя

### Анализ функции sendTonTransaction (tonConnectService.ts)

#### Критические проверки в sendTonTransaction:
```typescript
if (!tonConnectUI) {
  console.error('[ERROR] tonConnectUI is null or undefined');
  throw new Error('TonConnectUI is not initialized');
}

if (!tonConnectUI.connected) {
  console.log('[INFO] Кошелек не подключен, пытаемся подключить...');
  await connectTonWallet(tonConnectUI);
}
```

**ДИАГНОСТИЧЕСКИЕ ВОПРОСЫ**:
1. Инициализируется ли `tonConnectUI` после очистки кэша?
2. Вызывается ли `useTonConnectUI()` корректно?
3. Загружается ли манифест `tonconnect-manifest.json`?

### Анализ манифеста TON Connect

#### Содержимое манифеста (должно быть):
```json
{
  "url": "https://uni-farm-connect-aab49267.replit.app",
  "name": "UniFarm",
  "iconUrl": "https://uni-farm-connect-aab49267.replit.app/assets/unifarm-icon.svg"
}
```

#### URL манифеста в App.tsx (строка 290):
```typescript
manifestUrl="https://uni-farm-connect-aab49267.replit.app/tonconnect-manifest.json"
```

**ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ**:
1. **Манифест недоступен** после redeploy
2. **CORS ошибки** при загрузке манифеста
3. **Кэш браузера** все еще содержит старые данные TON Connect
4. **JavaScript ошибки** при инициализации TonConnectUIProvider

### Анализ логов консоли

#### Из автоматических обновлений видно:
```
[BalanceCard] Текущие балансы: userId:184, uniBalance:57209.747405, tonBalance:1.160725
[useWebSocketBalanceSync] Подписка на обновления баланса для пользователя: 184
[WebSocket] Подписка на обновления пользователя: 184
```

**ВАЖНО**: Логи НЕ показывают ошибок TON Connect инициализации, что указывает на проблему НА УРОВНЕ UI, а не backend

### Гипотезы причин ошибки

#### 🔴 Гипотеза 1: TonConnectUI не инициализирован
**Причина**: После очистки кэша `useTonConnectUI()` возвращает `null`
**Симптомы**: Кнопка "Подключить кошелек" не работает
**Проверка**: Console.log показывает `tonConnectUI = null`

#### 🔴 Гипотеза 2: Манифест недоступен
**Причина**: TON Connect не может загрузить манифест после redeploy
**Симптомы**: TonConnectUIProvider зависает при инициализации
**Проверка**: Network tab показывает 404 или CORS ошибку

#### 🔴 Гипотеза 3: JavaScript ошибка в TonConnectUIProvider
**Причина**: Конфликт зависимостей после очистки кэша
**Симптомы**: React компонент падает с ошибкой
**Проверка**: Console показывает JavaScript исключения

#### 🔴 Гипотеза 4: Проблема с доменом в манифесте
**Причина**: Домен в манифесте не соответствует текущему
**Симптомы**: TON Connect отвергает подключение
**Проверка**: Console показывает domain mismatch ошибки

### Диагностические шаги (БЕЗ изменения кода)

#### Шаг 1: Проверка инициализации TON Connect
1. Открыть DevTools → Console
2. Найти логи инициализации TonConnectUIProvider
3. Проверить наличие ошибок типа "TonConnectUI is not initialized"

#### Шаг 2: Проверка манифеста
1. Открыть Network tab в DevTools
2. Перезагрузить страницу
3. Найти запрос к `tonconnect-manifest.json`
4. Проверить статус ответа (200 OK vs 404/CORS)

#### Шаг 3: Проверка состояния useTonConnectUI
1. В Console выполнить проверку состояния компонента
2. Проверить `window.location.href` на соответствие домену в манифесте

#### Шаг 4: Повторная очистка кэша TON Connect
1. Использовать специальную функцию очистки только TON Connect данных
2. Перезагрузить страницу
3. Попробовать подключение заново

### Рекомендации для пользователя

#### 🎯 Немедленные действия:
1. **Откройте Console браузера** (F12 → Console)
2. **Перезагрузите страницу** и найдите ошибки TON Connect
3. **Проверьте Network tab** на наличие ошибок загрузки манифеста
4. **Используйте очистку только TON Connect** вместо полной очистки

#### 🔧 Альтернативные решения:
1. **Попробуйте другой браузер** (Chrome/Firefox/Safari)
2. **Отключите расширения браузера** временно
3. **Проверьте в режиме инкогнито**
4. **Очистите только TON Connect данные** повторно

### Выводы диагностики

1. **Код архитектурно корректен** - все компоненты на месте
2. **Проблема в инициализации** после очистки кэша
3. **Требуется проверка Console** для точной диагностики
4. **Манифест может быть недоступен** после redeploy

## 📋 Следующие шаги

**КРИТИЧЕСКИ ВАЖНО**: Нужны логи из Console браузера при попытке пополнения депозита для точной диагностики корневой причины ошибки.

**Без Console логов невозможно определить**:
- Инициализируется ли TonConnectUIProvider
- Загружается ли манифест
- Вызываются ли JavaScript ошибки
- Работает ли useTonConnectUI hook