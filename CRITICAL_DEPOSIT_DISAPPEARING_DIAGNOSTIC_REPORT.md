# 🚨 КРИТИЧНАЯ ДИАГНОСТИКА: ИСЧЕЗАЮЩИЕ ДЕПОЗИТЫ USER #25

**Дата**: 24 июля 2025, 08:05 UTC  
**Статус**: 🔴 **ПРОБЛЕМА НЕ РЕШЕНА**  
**Критичность**: МАКСИМАЛЬНАЯ  

## 🎯 ОБНОВЛЕННЫЕ ДАННЫЕ ОТ ПОЛЬЗОВАТЕЛЯ

### **ПОДТВЕРЖДЕННЫЕ СИМПТОМЫ:**
- ✅ TON платеж проходит успешно в блокчейне
- ✅ Средства поступают на кошелек системы
- ✅ Депозит появляется в интерфейсе на 1-2 секунды
- ❌ **Депозит исчезает из баланса и истории транзакций**
- ❌ При новом пополнении старый депозит временно появляется, но исчезает вместе с новым

### **КЛЮЧЕВОЕ НАБЛЮДЕНИЕ:**
> "Старый депозит подтягивается при новом пополнении" - значит, он где-то сохранен, но скрыт логикой системы

## 🔍 ТЕХНИЧЕСКАЯ ДИАГНОСТИКА (БЕЗ ИЗМЕНЕНИЙ КОДА)

### **ЭТАП 1: ПРОВЕРКА ЦЕПОЧКИ ОБРАБОТКИ**

#### **Путь TON депозита в системе:**
```
1. Frontend → POST /api/v2/wallet/ton-deposit
2. WalletController.tonDeposit() → WalletService.processTonDeposit()
3. WalletService → UnifiedTransactionService.createTransaction()
4. UnifiedTransactionService → INSERT в таблицу transactions
5. UnifiedTransactionService → BalanceManager.addBalance()
6. BalanceManager → UPDATE users.balance_ton
```

#### **НАЙДЕННЫЕ ДЕТАЛИ:**
- **Строка 114**: `tx_hash_unique: null` - защита от дубликатов ОТКЛЮЧЕНА ✅
- **Строка 383**: `type: 'TON_DEPOSIT'` - правильный тип транзакции ✅
- **Строка 377**: Дубликаты проверяются через `metadata.tx_hash` ⚠️

### **ЭТАП 2: АНАЛИЗ ВОЗМОЖНЫХ ПРИЧИН**

#### **ГИПОТЕЗА #1: Проблема в методе getTransactionHistory()**
```typescript
// modules/wallet/service.ts строки 290-353
// Метод может фильтровать транзакции по неправильным условиям
```

**Потенциальные проблемы:**
- WHERE условия исключают TON_DEPOSIT транзакции
- Неправильная работа с `amount_ton` vs `amount`
- Фильтрация по статусу исключает `completed` транзакции

#### **ГИПОТЕЗА #2: Проблема в UnifiedTransactionService.createTransaction()**
```typescript
// core/TransactionService.ts строки 101-118
// Транзакция создается, но откатывается
```

**Потенциальные проблемы:**
- Ошибка в `this.shouldUpdateBalance(type)` для TON_DEPOSIT
- Сбой в `this.updateUserBalance()` вызывает rollback
- Проблема с mapping: `'TON_DEPOSIT' → TRANSACTION_TYPE_MAPPING`

#### **ГИПОТЕЗА #3: Проблема в BalanceManager**
```typescript
// Централизованный BalanceManager может откатывать изменения
```

**Потенциальные проблемы:**
- Ошибка валидации в `addBalance()`
- Concurrent access конфликты
- WebSocket уведомления вызывают откат

#### **ГИПОТЕЗА #4: Frontend cache/state проблема**
```typescript
// Данные есть в БД, но frontend их не показывает
```

**Потенциальные проблемы:**
- React state не обновляется после депозита
- API возвращает данные, но UI их фильтрует
- WebSocket обновления перезаписывают баланс

## 🧠 ПЛАН ДЕТАЛЬНОЙ ДИАГНОСТИКИ

### **ЭТАП 1: ПРОВЕРКА БАЗЫ ДАННЫХ (3 минуты)**
1. ✅ Получить все транзакции User #25 за 48 часов
2. ✅ Проверить есть ли записи с типом TON_DEPOSIT
3. ✅ Проверить текущий баланс в таблице users

### **ЭТАП 2: ТРАССИРОВКА ВЫЗОВОВ (5 минут)**
1. ⏳ Добавить подробное логирование в processTonDeposit()
2. ⏳ Добавить логирование в UnifiedTransactionService
3. ⏳ Добавить логирование в BalanceManager

### **ЭТАП 3: ПРОВЕРКА MAPPING И ФИЛЬТРОВ (3 минуты)**
1. ⏳ Проверить TRANSACTION_TYPE_MAPPING для TON_DEPOSIT
2. ⏳ Проверить shouldUpdateBalance() для TON_DEPOSIT
3. ⏳ Проверить getTransactionHistory() фильтры

### **ЭТАП 4: ТЕСТ НА ДРУГОМ ПОЛЬЗОВАТЕЛЕ (2 минуты)**
1. ⏳ Создать тестовый TON депозит для User #184
2. ⏳ Проверить сохраняется ли транзакция
3. ⏳ Сравнить поведение с User #25

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ ДИАГНОСТИКИ

### **ЕСЛИ ТРАНЗАКЦИИ ЕСТЬ В БД:**
- Проблема в frontend или API фильтрации
- Нужно проверить getTransactionHistory()
- Возможно проблема в React state management

### **ЕСЛИ ТРАНЗАКЦИЙ НЕТ В БД:**
- Проблема в backend обработке
- UnifiedTransactionService откатывает транзакции
- BalanceManager вызывает rollback

### **ЕСЛИ БАЛАНС НЕ ОБНОВЛЯЕТСЯ:**
- Проблема в updateUserBalance()
- BalanceManager.addBalance() не работает
- Concurrent access конфликты

## ⚠️ КРИТИЧНЫЕ ОГРАНИЧЕНИЯ

### **НЕ ВНОСИТЬ ИЗМЕНЕНИЯ:**
- ❌ Никаких правок в код
- ❌ Никаких коммитов
- ❌ Только диагностика и логирование

### **ФОКУС НА USER #25:**
- ✅ Проверить только этого пользователя
- ✅ Не затрагивать других пользователей
- ✅ Понять где именно теряются данные

---

## 🔥 КРИТИЧНЫЕ ОТКРЫТИЯ

### **НАЙДЕННАЯ ПРОБЛЕМА В SYSTEM MAPPING:**
```typescript
// core/TransactionService.ts строка 21
'TON_DEPOSIT': 'FARMING_REWARD',  // ❌ TON депозиты мапятся в FARMING_REWARD!
```

### **АНАЛИЗ ЦЕПОЧКИ ОБРАБОТКИ:**
1. **WalletService.processTonDeposit()**: ✅ Правильно создает тип `'TON_DEPOSIT'`
2. **UnifiedTransactionService.createTransaction()**: ✅ Получает `'TON_DEPOSIT'`
3. **TRANSACTION_TYPE_MAPPING**: ❌ Преобразует `'TON_DEPOSIT' → 'FARMING_REWARD'`
4. **Database INSERT**: ❌ Сохраняет как `type: 'FARMING_REWARD'`
5. **shouldUpdateBalance()**: ✅ `'TON_DEPOSIT'` есть в списке для обновления баланса
6. **BalanceManager**: ✅ Код выглядит правильно

### **КЛЮЧЕВАЯ ПРОБЛЕМА:**
**В базе данных транзакции сохраняются с типом `FARMING_REWARD`, а не `TON_DEPOSIT`!**

Это объясняет почему:
- Депозиты временно появляются (транзакция создается)
- Потом исчезают (frontend ищет `TON_DEPOSIT`, а находит `FARMING_REWARD`)
- При новом депозите старые подтягиваются (система находит все `FARMING_REWARD`)

### **ГИПОТЕЗА #1 - ГЛАВНАЯ:**
**Frontend фильтрует транзакции и исключает `FARMING_REWARD` при показе депозитов**

### **ГИПОТЕЗА #2:**
**API `getTransactionHistory()` фильтрует по неправильному типу**

## 💥 **ИСТОЧНИК ПРОБЛЕМЫ НАЙДЕН!**

### **КРИТИЧНАЯ ОШИБКА В FRONTEND ФИЛЬТРАЦИИ:**

**Файл**: `client/src/services/transactionService.ts` - функция `fetchTonTransactions()`

**Проблема**: Функция `fetchTonTransactions()` фильтрует транзакции по различным критериям:
- `currency === 'TON'` 
- `type.includes('ton')`
- `source.includes('ton')`
- `category === 'boost'`

**НО!** Она **НЕ УЧИТЫВАЕТ**, что TON депозиты сохраняются в БД как:
- `type: 'FARMING_REWARD'` (не содержит 'ton')
- `currency: 'TON'` ✅ (это работает)
- `source: 'WalletService.processTonDeposit'` (не содержит 'ton')

### **ЦЕПОЧКА ОШИБКИ:**
1. **Backend**: TON депозит мапится `'TON_DEPOSIT' → 'FARMING_REWARD'` ✅
2. **Database**: Сохраняется `type: 'FARMING_REWARD', currency: 'TON'` ✅
3. **API**: Возвращает транзакцию с `type: 'FARMING_REWARD'` ✅
4. **Frontend**: `fetchTonTransactions()` НЕ распознает `FARMING_REWARD` как TON транзакцию ❌
5. **UI**: TON депозиты НЕ отображаются в TonTransactions компоненте ❌

### **РЕШЕНИЕ:**
Добавить в `fetchTonTransactions()` проверку:
```javascript
// Учитываем что TON депозиты мапятся в FARMING_REWARD
const isTonDeposit = (type === 'farming_reward' && currency === 'TON');
```

### **ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА:**
В `fetchTonTransactions()` строка 215 содержит `currency === 'TON'` что ДОЛЖНО ловить TON депозиты.

**ПОДОЗРЕНИЕ**: 
- Возможно `currency` не точно равно `'TON'` (регистр, пробелы, null)
- Или API возвращает не тот формат данных
- Или фильтрация на уровне API исключает `FARMING_REWARD`

### **КРИТИЧНЫЕ ВОПРОСЫ:**
1. **Попадают ли TON депозиты (type: FARMING_REWARD, currency: TON) в ответ API?**
2. **Правильно ли работает `currency === 'TON'` фильтр?**
3. **Есть ли TON депозиты User #25 в TransactionHistory (общий компонент)?**

## 🚨 **ФИНАЛЬНОЕ ЗАКЛЮЧЕНИЕ - ПРОБЛЕМА НАЙДЕНА!**

### **ДИАГНОСТИКА User #25 ЗАВЕРШЕНА:**

**РЕЗУЛЬТАТ ПРОВЕРКИ БАЗЫ ДАННЫХ:**
- ✅ **Всего транзакций User #25**: 10
- ❌ **TON депозитов**: 0 (НОЛЬ!)
- ❌ **FARMING_REWARD с currency TON**: 0
- ❌ **Любых TON-связанных транзакций**: 0
- 💰 **Текущий TON баланс**: 0.31 TON
- 📊 **Все транзакции**: только `REFERRAL_REWARD` с `currency: UNI`

### **КРИТИЧНЫЙ ВЫВОД:**
**🔥 User #25 НЕ ИМЕЕТ НИ ОДНОГО TON ДЕПОЗИТА В БАЗЕ ДАННЫХ!**

**Жалобы на "исчезающие депозиты" не связаны с frontend фильтрацией - депозиты НИКОГДА НЕ СОХРАНЯЛИСЬ в БД!**

### **НАСТОЯЩАЯ ПРОБЛЕМА:**
**Система НЕ СОЗДАЕТ записи TON депозитов в базе данных** при обработке платежей.

**Это означает что проблема в:**
1. **WalletService.processTonDeposit()** - НЕ сохраняет депозиты в БД
2. **UnifiedTransactionService.createTransaction()** - НЕ вызывается для TON депозитов  
3. **BalanceManager.addBalance()** - работает правильно (баланс 0.31 TON есть)

### **ПЕРВООЧЕРЕДНЫЕ ДЕЙСТВИЯ:**
1. **Проверить логи WalletService.processTonDeposit()** за последние дни
2. **Найти где именно теряется создание транзакций** при TON депозитах
3. **Исправить отсутствующий вызов createTransaction()** в процессе депозита

### **СТАТУС**: ❌ **КРИТИЧНАЯ ОШИБКА В СОЗДАНИИ ТРАНЗАКЦИЙ**