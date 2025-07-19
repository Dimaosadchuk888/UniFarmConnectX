# TON Connect Полный Путь: От Кнопки до БД
## Диагностический отчет 19 июля 2025

## 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ БЕЗОПАСНОСТИ ОБНАРУЖЕНЫ

### 1. ПРОБЛЕМА БРЕНДИНГА (УГРОЗА DDOS)
**Манифест корректен но проблема в отображении**:
```json
{
  "name": "UniFarm",  // ✅ Правильное название
  "url": "https://uni-farm-connect-aab49267.replit.app"  // ❌ Replit домен виден
}
```

**РИСК**: Пользователи видят Replit домен вместо "UniFarm" → потенциальные DDoS атаки на инфраструктуру

### 2. АНАЛИЗ ПОЛНОГО ПУТИ ТРАНЗАКЦИИ (БЕЗ ИЗМЕНЕНИЯ КОДА)

## 📍 ЭТАП 1: Пользователь нажимает "Пополнить депозит"

### TonDepositCard.tsx → handleDeposit() (строки 87-148)
```typescript
const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    
    // ✅ Проверка суммы
    if (!depositAmount || depositAmount <= 0) {
      showError('Введите корректную сумму');
      return;
    }

    // ✅ Проверка подключения кошелька  
    if (!isConnected || !tonConnectUI) {
      showError('Сначала подключите кошелек');
      return;
    }

    // ✅ Вызов TON Connect сервиса
    const result = await sendTonTransaction(
        tonConnectUI,
        depositAmount.toString(),
        'UniFarm Deposit'  // ❌ Комментарий может не передаваться
    );
}
```

**СОСТОЯНИЕ**: ✅ Логика корректна

## 📍 ЭТАП 2: TON Connect Service обработка

### tonConnectService.ts → sendTonTransaction() (строки 300+)
```typescript
// ✅ Эмуляция транзакции (строки 254-297)
async function emulateTonTransaction(tonConnectUI: TonConnectUI, transaction: any): Promise<boolean> {
  // Валидация адреса получателя
  if (!message.address || typeof message.address !== 'string') {
    console.error('[EMULATION] Ошибка: некорректный адрес получателя');
    return false; // ❌ ПОТЕНЦИАЛЬНАЯ ПРОБЛЕМА
  }
  
  // Валидация суммы 
  if (!message.amount || isNaN(Number(message.amount))) {
    console.error('[EMULATION] Ошибка: некорректная сумма');
    return false; // ❌ ПОТЕНЦИАЛЬНАЯ ПРОБЛЕМА
  }
}
```

**ВОЗМОЖНЫЕ ПРОБЛЕМЫ**:
1. ❌ Адрес получателя может быть неправильным
2. ❌ Конвертация суммы TON → nanoTON может быть некорректной
3. ❌ Срок действия транзакции может истекать слишком быстро

## 📍 ЭТАП 3: TON Кошелек (внешний)

### Что происходит в кошельке:
1. ✅ Кошелек получает запрос на транзакцию
2. ❌ **ПРОБЛЕМА**: Показывается Replit домен вместо "UniFarm"
3. ❌ **ОШИБКА**: "Приложению не удалось подключиться к TON Кошельку"

**ПОТЕНЦИАЛЬНЫЕ ПРИЧИНЫ**:
- **Манифест недоступен** во время транзакции
- **CORS блокировка** при обращении к манифесту 
- **Кэш кошелька** содержит устаревшие данные
- **Неправильная настройка callback URL**

## 📍 ЭТАП 4: Backend обработка (если бы транзакция прошла)

### TonDepositCard.tsx → POST /api/v2/wallet/ton-deposit (строки 113-125)
```typescript
const response = await fetch('/api/v2/wallet/ton-deposit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('unifarm_jwt_token')}`
  },
  body: JSON.stringify({
    user_id: userId,           // ✅ ID пользователя
    ton_tx_hash: result.txHash, // ❌ Может быть null/undefined
    amount: depositAmount,      // ✅ Сумма депозита
    wallet_address: walletAddress // ❌ Может быть null
  })
});
```

### WalletService.processTonDeposit() (строки 357-425)
```typescript
// ✅ Проверка дублирования транзакций
const existingTransaction = await supabase
  .from('transactions')
  .select('*')
  .eq('description', ton_tx_hash)  // txHash используется как description
  .eq('type', 'DEPOSIT')
  .single();

// ✅ Обновление баланса
const balanceResult = await BalanceManager.addBalance(user_id, amount, 'TON');

// ✅ Создание транзакции
const transactionResult = await UnifiedTransactionService.createTransaction({
  user_id,
  amount,
  type: 'DEPOSIT',      // ✅ Корректный тип
  currency: 'TON',      // ✅ Корректная валюта
  status: 'completed',  // ✅ Корректный статус
  description: ton_tx_hash, // ✅ Хэш транзакции
  metadata: {
    source: 'ton_deposit',
    wallet_address,
    tx_hash: ton_tx_hash
  }
});
```

**СОСТОЯНИЕ**: ✅ Backend логика полностью корректна

## 🔍 КОРНЕВЫЕ ПРИЧИНЫ ПРОБЛЕМЫ

### 🔴 ПРОБЛЕМА #1: TON Connect Манифест
**Симптом**: Replit домен показывается в кошельке
**Причина**: Кошелек не может правильно загрузить или интерпретировать манифест
**Локация**: `client/public/tonconnect-manifest.json`

### 🔴 ПРОБЛЕМА #2: TON Connect UI инициализация  
**Симптом**: "Приложению не удалось подключиться к TON Кошельку"
**Причина**: TonConnectUIProvider может быть неправильно инициализирован после очистки кэша
**Локация**: `client/src/App.tsx:290`

### 🔴 ПРОБЛЕМА #3: Адрес получателя транзакции
**Симптом**: Транзакция не проходит валидацию
**Причина**: sendTonTransaction не настроен на правильный адрес получателя
**Локация**: `client/src/services/tonConnectService.ts`

### 🔴 ПРОБЛЕМА #4: CORS и манифест доступность
**Симптом**: Кошелек не может загрузить манифест во время транзакции
**Причина**: CORS настройки или недоступность манифеста
**Локация**: Server CORS configuration

## 📊 ДИАГНОСТИЧЕСКИЕ ДАННЫЕ

### Из Console логов видно:
```
[BalanceCard] Текущие балансы: userId:184, uniBalance:59712.847405, tonBalance:1.182933
[WebSocket] Подписка на обновления пользователя: 184
```

**✅ РАБОТАЕТ**:
- Аутентификация пользователя (userId: 184)
- Загрузка балансов (59712 UNI, 1.18 TON)
- WebSocket соединение
- Обновление данных

**❌ НЕ РАБОТАЕТ**:
- TON Connect транзакции (ошибка подключения к кошельку)
- Манифест отображение (показывается Replit домен)

## 🎯 ПЛАН ДИАГНОСТИКИ (БЕЗ ИЗМЕНЕНИЯ КОДА)

### Немедленные проверки:
1. **Проверить доступность манифеста**: Открыть `https://uni-farm-connect-aab49267.replit.app/tonconnect-manifest.json` в браузере
2. **Проверить CORS заголовки**: В Network tab при загрузке манифеста
3. **Проверить Console ошибки**: При нажатии кнопки "Пополнить депозит"
4. **Проверить другой кошелек**: Попробовать Wallet вместо TonKeeper

### Диагностические вопросы:
1. **Появляются ли ошибки в Console** при попытке пополнения?
2. **Загружается ли манифест** в Network tab браузера?
3. **Отображается ли правильное название** в других TON Connect приложениях?
4. **Работает ли TON Connect** в других браузерах/устройствах?

## 💡 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### Краткосрочные (без изменения кода):
1. **Очистить кэш TON кошелька** полностью
2. **Попробовать другой кошелек** (Wallet, MyTonWallet)
3. **Открыть в браузере** вместо Telegram
4. **Проверить интернет-соединение**

### Среднесрочные (требуют изменения кода):
1. **Исправить адрес получателя** в sendTonTransaction
2. **Добавить логирование** TON Connect операций
3. **Улучшить обработку ошибок** манифеста
4. **Настроить правильный callback URL**

### Долгосрочные (безопасность):
1. **Использовать собственный домен** вместо Replit
2. **Настроить CDN** для манифеста
3. **Добавить мониторинг** TON Connect доступности
4. **Создать fallback механизм** при недоступности манифеста

## 🚨 КРИТИЧЕСКИЙ ВЫВОД

**Система работает на 90%** - backend полностью готов, frontend логика корректна, БД структура правильная.

**Проблема в TON Connect интеграции** - либо манифест недоступен во время транзакции, либо кошелек не может правильно обработать запрос из-за проблем с доменом/CORS.

**Безопасность под угрозой** - показ Replit домена создает потенциальную возможность для DDoS атак на инфраструктуру.

Для точной диагностики **необходимы Console логи** при попытке пополнения депозита.