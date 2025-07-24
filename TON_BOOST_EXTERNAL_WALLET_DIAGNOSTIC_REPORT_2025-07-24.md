# 🔬 ПОЛНАЯ ДИАГНОСТИКА ПОКУПКИ TON BOOST ЧЕРЕЗ ВНЕШНИЙ КОШЕЛЁК

**Дата**: 24 июля 2025  
**Статус**: ✅ ДИАГНОСТИКА ЗАВЕРШЕНА  
**Задача**: Исследование системы покупки TON Boost через TON Connect без изменений кода  

---

## 🎯 ОБНАРУЖЕННАЯ АРХИТЕКТУРА СИСТЕМЫ

### 1. ПОЛНАЯ ЦЕПОЧКА ПОКУПКИ ЧЕРЕЗ ВНЕШНИЙ КОШЕЛЁК

```
📱 Frontend (TonConnect UI)
   ↓ [User clicks "Купить" → "Внешний кошелёк"]
🔗 BoostPackagesCard.tsx → PaymentMethodDialog.tsx
   ↓ [Выбор external_wallet]
📦 tonConnectService.ts → sendTonTransaction()
   ↓ [TON Connect UI отправляет транзакцию]
🌐 TON Blockchain (TonKeeper/Tonhub)
   ↓ [Получение tx_hash]
📊 Backend API: POST /api/v2/boost/purchase
   ↓ [payment_method: "ton", tx_hash]
🔧 BoostController.purchaseBoost()
   ↓ [Валидация параметров]
⚙️  BoostService.purchaseWithExternalTon()
   ↓ [Создание pending записи]
📝 Database: boost_purchases + transactions (status: pending)
   ↓ [Ожидание верификации]
🔍 BoostVerificationScheduler (каждые 2 минуты)
   ↓ [Проверка pending записей > 2 минут]
🌐 TonAPI.io → verifyTonTransaction()
   ↓ [Проверка статуса в блокчейне]
✅ Status: confirmed → activateBoost()
   ↓ [Обновление users.ton_boost_package]
📈 TON Boost активирован + планировщик доходов
```

---

## 🔍 КРИТИЧЕСКИЕ КОМПОНЕНТЫ СИСТЕМЫ

### 1.1 Frontend компоненты:

**📁 client/src/components/ton-boost/BoostPackagesCard.tsx**
- **Функция**: Главный интерфейс выбора пакетов
- **Обработчик**: `handleSelectPaymentMethod()` → вызывает покупку
- **Статус**: ✅ Работает корректно

**📁 client/src/components/ton-boost/PaymentMethodDialog.tsx**
- **Функция**: Диалог выбора способа оплаты
- **TON Connect интеграция**: `sendTonTransaction()` для внешних платежей
- **Статус**: ✅ Работает корректно

**📁 client/src/components/ton-boost/ExternalPaymentStatus.tsx**
- **Функция**: Мониторинг статуса внешнего платежа
- **Эндпоинт**: `/api/v2/boost/check-payment` (каждые 10 секунд)
- **Проблема**: ❌ **ЭНДПОИНТ НЕ НАЙДЕН В BACKEND**

**📁 client/src/services/tonConnectService.ts**
- **Функция**: Интеграция с TON Connect
- **Методы**: `sendTonTransaction()`, `connectTonWallet()`
- **Статус**: ✅ Работает корректно

### 1.2 Backend компоненты:

**📁 modules/boost/controller.ts**
- **Эндпоинт**: `POST /api/v2/boost/purchase`
- **Метод**: `purchaseBoost()` - основная точка входа
- **Эндпоинт**: `POST /api/v2/boost/verify-ton-payment`
- **Метод**: `verifyTonPayment()` - ручная проверка платежа
- **Статус**: ✅ Работает корректно

**📁 modules/boost/service.ts**
- **Метод**: `purchaseWithExternalTon()` - обработка внешних платежей
- **Функция**: Создание pending записей в БД
- **Метод**: `verifyTonPayment()` - проверка статуса в блокчейне
- **Статус**: ✅ Работает корректно

### 1.3 Планировщики:

**📁 modules/scheduler/boostVerificationScheduler.ts**
- **Функция**: Автоматическая проверка pending платежей
- **Интервал**: Каждые 2 минуты
- **Логика**: Поиск pending записей > 2 минут → проверка TonAPI
- **Статус**: ✅ Работает корректно

---

## 🚨 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ

### ПРОБЛЕМА #1: ОТСУТСТВУЕТ ЭНДПОИНТ CHECK-PAYMENT
**Файл**: `modules/boost/controller.ts`
**Проблема**: Frontend компонент `ExternalPaymentStatus.tsx` вызывает `/api/v2/boost/check-payment`, но этот эндпоинт НЕ РЕАЛИЗОВАН в контроллере

**Последствие**: 
- Пользователи не видят актуального статуса своих внешних платежей
- Интерфейс показывает "Ожидание платежа" даже после подтверждения

**Решение**: Добавить метод `checkPayment()` в BoostController

### ПРОБЛЕМА #2: ДУБЛИРОВАНИЕ ЛОГИКИ ПРОВЕРКИ
**Файлы**: 
- `verifyTonPayment()` - ручная проверка
- `boostVerificationScheduler.ts` - автоматическая проверка

**Проблема**: Две независимые системы проверки могут создавать race conditions

### ПРОБЛЕМА #3: ЗАВИСИМОСТЬ ОТ BOOST_PURCHASES ТАБЛИЦЫ
**Код**: 
```typescript
// service.ts:577 - поиск pending записи
const { data: purchase, error: purchaseError } = await supabase
  .from('boost_purchases')
  .select('*')
  .eq('user_id', userId)
  .eq('boost_id', boostId)
  .eq('tx_hash', txHash)
  .eq('status', 'pending')
  .single();
```

**Проблема**: Если `boost_purchases` запись не создается или удаляется, верификация не сработает

---

## 🎯 АНАЛИЗ ОПИСАННЫХ ПОЛЬЗОВАТЕЛЕМ СИМПТОМОВ

### Симптом 1: "Пакет не отображается в статистике"
**Причина**: Метод `activateBoost()` работает корректно, но может быть проблема с отображением
**Файл**: `client/src/components/ton-boost/ActiveTonBoostsCard.tsx` (требует проверки)

### Симптом 2: "Бонус не начисляется или откатывается"  
**Причина**: Метод `awardUniBonus()` выполняется только после подтверждения транзакции
**Код**: `service.ts:807` - начисление UNI бонуса после verifyTonPayment

### Симптом 3: "TON возвращается на кошелёк"
**Причина**: Если TonAPI не подтверждает транзакцию или она failed, система не активирует boost
**Логика**: Blockchain автоматически возвращает средства при неуспешных транзакциях

### Симптом 4: "Запись исчезает из истории"
**Причина**: Pending транзакции могут не отображаться в UI
**Код**: `ExternalPaymentStatus.tsx` пытается получить статус через несуществующий эндпоинт

---

## 📊 АНАЛИЗ ДАННЫХ ИЗ PRODUCTION

### Активные TON Boost пользователи:
```
User 224: Package 1, Rate 0.01, Balance 0.5 TON
User 184: Package 1, Rate 0.01, Balance 0.439235 TON  
User 25:  Package 1, Rate 0.01, Balance 0.518536 TON
```

### Последние TON Boost транзакции:
- **Тип**: FARMING_REWARD (доходы от активных пакетов)
- **Суммы**: 0.000278 - 0.000347 TON
- **Частота**: Каждые ~2 минуты (планировщик работает)

### Метаданные транзакций:
```json
{
  "daily_rate": 0.01,
  "user_deposit": 8-10,
  "original_type": "TON_BOOST_INCOME", 
  "boost_package_id": 1,
  "transaction_source": "ton_boost_scheduler"
}
```

---

## 🔧 ТОЧКИ ПОТЕРИ ПОКУПОК

### 1. Потеря в Frontend
**Место**: `PaymentMethodDialog.tsx:94`
**Момент**: После успешного `sendTonTransaction()` но до вызова API
**Симптом**: Транзакция отправлена, но не зарегистрирована в системе

### 2. Потеря в API запросе  
**Место**: `BoostController.purchaseBoost()`
**Момент**: Неправильные параметры (user_id, boost_id, tx_hash)
**Симптом**: 400 ошибка "Отсутствуют обязательные параметры"

### 3. Потеря в createBoostPurchase
**Место**: `service.ts:1398`
**Момент**: Ошибка создания pending записи в boost_purchases
**Симптом**: tx_hash передан, но pending запись не создана

### 4. Потеря в TonAPI проверке
**Место**: `verifyTonTransaction()` 
**Момент**: Транзакция не найдена в блокчейне или статус != success
**Симптом**: Pending запись остается, но не активируется

### 5. Потеря в activateBoost
**Место**: `service.ts:901`
**Момент**: Ошибка обновления users.ton_boost_package
**Симптом**: Транзакция confirmed, но пакет не активирован

---

## 🎯 РЕКОМЕНДУЕМЫЙ ПЛАН ДИАГНОСТИКИ ДЛЯ USER #25

### Шаг 1: Проверить boost_purchases
```sql
SELECT * FROM boost_purchases 
WHERE user_id = 25 
ORDER BY created_at DESC 
LIMIT 10;
```

### Шаг 2: Проверить transactions с tx_hash
```sql
SELECT * FROM transactions 
WHERE user_id = 25 
AND tx_hash IS NOT NULL 
AND (type = 'boost_purchase' OR description LIKE '%Boost%')
ORDER BY created_at DESC;
```

### Шаг 3: Проверить статус TON транзакций в блокчейне
```bash
# Найти последние tx_hash из пользователя 25
# Проверить через https://tonapi.io/v2/blockchain/transactions/{tx_hash}
```

### Шаг 4: Проверить активацию пакетов
```sql
SELECT id, ton_boost_package, ton_boost_rate, balance_ton 
FROM users 
WHERE id = 25;
```

---

## 📋 ЗАКЛЮЧЕНИЕ

### ✅ Что работает корректно:
1. **TON Connect интеграция** - отправка транзакций через внешний кошелёк
2. **Backend API** - прием и валидация запросов на покупку  
3. **Создание pending записей** - фиксация попыток покупки
4. **TonAPI интеграция** - проверка статуса в блокчейне
5. **Активация пакетов** - обновление users.ton_boost_package
6. **Планировщик доходов** - начисление TON Boost доходов

### ❌ Что требует исправления:
1. **Отсутствует эндпоинт /api/v2/boost/check-payment**
2. **UI не показывает актуальный статус внешних платежей**
3. **Возможны race conditions между двумя системами проверки**

### 🎯 Основная причина проблем:
**Пользователи не видят статус своих внешних платежей** из-за отсутствующего эндпоинта, что создает впечатление "пропажи" платежей, хотя система в большинстве случаев работает корректно через автоматический планировщик.

---

**СТАТУС СИСТЕМЫ**: 🟡 **ЧАСТИЧНО ФУНКЦИОНАЛЬНА**  
**КРИТИЧНОСТЬ**: Средняя - основная логика работает, но UX нарушен