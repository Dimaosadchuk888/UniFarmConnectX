# 🚨 СРОЧНАЯ ИНФОРМАЦИЯ: Пополнение TON баланса через Connect Wallet

## 📱 Полный процесс пополнения TON баланса

### 1️⃣ UI Компонент: TonDepositCard
**Файл:** `client/src/components/wallet/TonDepositCard.tsx`

**Что делает:**
- Показывает форму для ввода суммы пополнения
- Кнопка "Подключить кошелек" если не подключен
- Кнопка "Пополнить" для отправки транзакции

### 2️⃣ Подключение кошелька
```javascript
// Функция подключения
await connectTonWallet(tonConnectUI);

// Проверка статуса
isTonWalletConnected(tonConnectUI);

// Сохранение адреса кошелька в БД
await saveTonWalletAddress(address);
```

### 3️⃣ Отправка транзакции в блокчейн
**Файл:** `client/src/services/tonConnectService.ts`

**Критические параметры:**
- **Адрес получателя:** `UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8`
- **Время жизни транзакции:** 10 минут (600 секунд)
- **Конвертация:** 1 TON = 1,000,000,000 наноTON

**Процесс отправки:**
```javascript
// Формирование транзакции
const transaction = {
  validUntil: Math.floor(Date.now() / 1000) + 600,
  messages: [{
    address: "UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8",
    amount: nanoTonAmount, // Сумма в наноTON
    payload: base64Payload // Комментарий в base64
  }]
};

// Отправка через TON Connect
const result = await tonConnectUI.sendTransaction(transaction);
```

### 4️⃣ Регистрация депозита в системе
**После успешной транзакции в блокчейн:**

**Frontend отправляет POST запрос:**
```
POST /api/v2/wallet/ton-deposit
{
  "user_id": 184,
  "ton_tx_hash": "hash_транзакции",
  "amount": 5.0,
  "wallet_address": "адрес_отправителя"
}
```

### 5️⃣ Backend обработка
**Файл:** `modules/wallet/controller.ts` → `tonDeposit()`

**Что происходит:**
1. Проверка JWT авторизации
2. Проверка на дубликаты транзакций по tx_hash
3. Начисление TON на баланс через BalanceManager
4. Создание записи транзакции типа 'DEPOSIT'
5. Возврат успешного ответа

## ⚠️ ВАЖНЫЕ МОМЕНТЫ

### 🔴 Проблема с BOC (Bag of Cells)
В файле `tonConnectService.ts` есть упрощенная реализация:
```javascript
// Строка 53-64: Вместо правильного BOC используется простое base64 кодирование
// Это НЕ соответствует стандарту TON!
const bocBytes = new TextEncoder().encode(comment);
return uint8ArrayToBase64(bocBytes);
```
**Последствия:** Транзакции могут не обрабатываться корректно TON блокчейном

### 🟡 Адрес получателя
- Захардкожен в коде: `UQBlrUfJMIlAcyYzttyxV2xrrvaHHIKEKeetGZbDoitTRWT8`
- Можно переопределить через `VITE_TON_BOOST_RECEIVER_ADDRESS`
- **ВАЖНО:** Убедитесь что это правильный адрес вашего кошелька!

### 🟢 Защита от дубликатов
- Система проверяет tx_hash в БД перед начислением
- Одна транзакция не может быть обработана дважды

## 📊 Текущий статус

**Компоненты готовы:**
- ✅ UI форма пополнения
- ✅ Интеграция с TON Connect
- ✅ Backend API endpoint
- ✅ Защита от дубликатов
- ✅ Начисление на баланс

**Потенциальные проблемы:**
- ❌ Неправильная генерация BOC payload
- ⚠️ Захардкоженный адрес получателя
- ⚠️ Нет проверки статуса транзакции в блокчейне

## 🔧 Как проверить работу

1. Откройте раздел "Кошелек"
2. Найдите блок "Пополнить TON"
3. Нажмите "Подключить кошелек"
4. Введите сумму и нажмите "Пополнить"
5. Подтвердите транзакцию в кошельке
6. Проверьте обновление баланса

**Логи для отладки:**
- Frontend: проверьте консоль браузера
- Backend: логи с префиксом `[Wallet] TON deposit`