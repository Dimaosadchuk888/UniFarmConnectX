# 🔍 TON BOOST ПОЛНОЕ ИССЛЕДОВАНИЕ ЦЕПОЧКИ: ОТ ФРОНТА ДО БД

**Дата:** 13 января 2025  
**Статус:** ✅ КРИТИЧЕСКАЯ АРХИТЕКТУРНАЯ ПРОБЛЕМА НАЙДЕНА

## 📊 Краткое описание проблемы

**Проблема:** Доход от TON Boost начисляется от `balance_ton` (весь основной баланс), а не от `ton_farming_balance`.  
**Результат:** Пользователь 74 получает доход от 836.99 TON вместо 5 TON (последней покупки).  
**Влияние:** Завышение дохода в 167 раз для всех пользователей с большим балансом TON.

---

## 🎯 1. ФРОНТЕНД - Отображение TON Boost

### 📱 Компоненты UI

#### 1.1 TonFarmingStatusCard.tsx
- **Путь:** `client/src/components/ton-boost/TonFarmingStatusCard.tsx`
- **API запрос:** `/api/v2/boost/farming-status?user_id=${userId}`
- **Интервал обновления:** Каждые 5 секунд
- **Отображаемые данные:**
  - Дневной доход (dailyYield)
  - Доход в секунду (perSecond)
  - Статус активности

#### 1.2 ActiveTonBoostsCard.tsx (отключен)
- **Путь:** `client/src/components/ton-boost/ActiveTonBoostsCard.tsx`
- **Статус:** Временно отключен из-за несоответствия данных API
- **API запрос:** `/api/v2/boost/user/${userId}`
- **Проблема:** Ожидает поля, которых нет в API ответе

#### 1.3 TonBoostPackagesCard.tsx
- **Используется для:** Отображения доступных пакетов для покупки
- **Передает данные в:** PaymentMethodDialog для оплаты

### ❌ Проблема на фронтенде
- Нигде не отображается `ton_farming_balance`
- UI не показывает разницу между балансом фарминга и основным балансом

---

## 🔧 2. API И BACKEND - Обработка TON Boost

### 📡 2.1 Покупка TON Boost пакета

#### Цепочка вызовов:
1. **POST /api/v2/boost/purchase**
2. **BoostController.purchaseBoost()** (`modules/boost/controller.ts`)
3. **BoostService.purchaseBoost()** (`modules/boost/service.ts`)

#### Метод purchaseWithInternalWallet (строки 252-461):
```typescript
// Списание средств с основного баланса
const withdrawSuccess = await walletService.processWithdrawal(userId, requiredAmount.toString(), 'TON');

// Активация boost пакета
const immediateActivation = await tonFarmingRepo.activateBoost(
  parseInt(userId),
  boostPackage.id,
  boostPackage.daily_rate / 100,
  boostPackage.duration_days
);
```

### ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА #1
**В методе activateBoost() НЕ обновляется `ton_farming_balance`!**

#### TonFarmingRepository.activateBoost() (строки 243-289):
```typescript
// Обновляет только эти поля:
boost_active: true,
boost_package_id: packageId,
farming_rate: rate.toString(),
farming_start_timestamp: new Date().toISOString(),
farming_last_update: new Date().toISOString()
// НЕТ обновления farming_balance!
```

---

### 📊 2.2 Планировщик начислений TON Boost

#### tonBoostIncomeScheduler.ts
- **Путь:** `modules/scheduler/tonBoostIncomeScheduler.ts`
- **Запуск:** Каждые 5 минут
- **Процесс:**

1. Получает активных пользователей:
```typescript
const activeBoostUsers = await tonFarmingRepo.getActiveBoostUsers();
// Возвращает 10 пользователей
```

2. Пытается рассчитать доход:
```typescript
// Строка 77 - КРИТИЧЕСКАЯ ОШИБКА
const userDeposit = Math.max(0, parseFloat(user.balance_ton || '0') - 10);
//                                         ^^^^ UNDEFINED!
```

### ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА #2
**Несоответствие интерфейсов данных!**

#### TonFarmingRepository возвращает:
```typescript
interface TonFarmingData {
  user_id: number;
  farming_balance: string;    // НЕ balance_ton!
  farming_rate: string;       // НЕ ton_boost_rate!
  boost_package_id: number;   // НЕ ton_boost_package!
}
```

#### Планировщик ожидает:
```typescript
user.balance_ton // undefined
user.balance_uni // undefined
```

**Результат:** userDeposit всегда = 0, доход не начисляется

### ✅ Временное решение в планировщике
Планировщик загружает балансы отдельным запросом:
```typescript
const { data: userBalances } = await supabase
  .from('users')
  .select('id, balance_ton, balance_uni')
  .in('id', userIds);
```

Но использует **весь balance_ton** вместо специального баланса фарминга!

---

## 💾 3. БАЗА ДАННЫХ - Структура и проблемы

### 📋 3.1 Таблица users - поля TON Boost
- `ton_boost_active` - флаг активности ✅
- `ton_boost_package` - ID пакета ✅ 
- `ton_farming_balance` - баланс фарминга ❌ (всегда 0)
- `ton_farming_rate` - процентная ставка ✅
- `ton_farming_deposit` - сумма депозита ❌ (null)
- `ton_farming_last_update` - последнее обновление ❌ (null)

### 📋 3.2 Таблица ton_farming_data
- Создана как отдельная таблица для оптимизации
- Но TonFarmingRepository работает в fallback режиме с таблицей users
- Поля аналогичны, проблемы те же

### ❌ КРИТИЧЕСКАЯ ПРОБЛЕМА #3
**При покупке TON Boost:**
1. Списывается весь баланс из `balance_ton`
2. НЕ устанавливается `ton_farming_balance`
3. Планировщик использует `balance_ton` для расчета дохода
4. Доход начисляется от ВСЕГО баланса, а не от суммы покупки

---

## 🔄 4. СРАВНЕНИЕ С UNI FARMING

### ✅ UNI Farming (работает правильно)

#### При депозите:
1. **UniFarmingRepository.addDeposit()** обновляет:
   - `deposit_amount` - сумма депозита
   - `farming_deposit` - дублирует для совместимости
   - `is_active` - флаг активности

2. **FarmingService.depositUniForFarming()** обновляет:
   - `uni_deposit_amount` - в таблице users
   - `uni_farming_active` - флаг активности
   - Создает транзакцию с отрицательной суммой

3. **farmingScheduler** использует:
   - `uni_deposit_amount` для расчета дохода
   - НЕ использует основной баланс

### ❌ TON Boost (работает неправильно)

#### При покупке:
1. **TonFarmingRepository.activateBoost()** НЕ обновляет:
   - `ton_farming_balance` остается 0
   - `ton_farming_deposit` остается null

2. **BoostService.purchaseWithInternalWallet()** только:
   - Списывает с основного баланса
   - Активирует флаги
   - НЕ устанавливает баланс фарминга

3. **tonBoostIncomeScheduler** использует:
   - `balance_ton` (весь баланс) для расчета
   - Вместо специального баланса фарминга

---

## 📈 5. ФИНАНСОВОЕ ВЛИЯНИЕ

### Пользователь 74:
- **Потрачено на покупки:** 112 TON
- **Последняя покупка:** 5 TON (Standard Boost)
- **Основной баланс:** 836.99 TON
- **Ожидаемый доход:** от 5 TON = 0.075 TON/день
- **Фактический доход:** от 836.99 TON = 12.55 TON/день
- **Завышение:** в 167 раз!

### Другие пользователи:
- У всех `ton_farming_balance = 0`
- Все получают доход от основного баланса
- Средняя разница ~10 TON между расчетным и реальным балансом

---

## 🎯 6. ВЫВОДЫ И РЕКОМЕНДАЦИИ

### Корневые причины:
1. **Архитектурная недоработка:** TON Boost не имеет концепции "депозита в фарминг"
2. **Несоответствие интерфейсов:** Планировщик и репозиторий используют разные поля
3. **Отсутствие обновления баланса:** При покупке не устанавливается `ton_farming_balance`

### Рекомендации для исправления:
1. **Добавить обновление `ton_farming_balance`** при покупке пакета
2. **Изменить логику планировщика** - использовать `ton_farming_balance` вместо `balance_ton`
3. **Синхронизировать интерфейсы данных** между компонентами
4. **Добавить отображение баланса фарминга** на фронтенде

### Критичность: 🔴 ВЫСОКАЯ
Все пользователи с активным TON Boost получают завышенный доход пропорционально их основному балансу.