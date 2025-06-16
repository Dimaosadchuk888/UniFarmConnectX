# Аудит T55: Партнёрская логика UniFarm

## 🔍 СТАТУС АУДИТА: ❌ КРИТИЧЕСКИЕ НАРУШЕНИЯ ОБНАРУЖЕНЫ

**Дата проведения**: 16 июня 2025  
**Режим**: Read-only анализ существующей логики  
**Результат**: Партнёрская программа работает НЕПРАВИЛЬНО по бизнес-правилам  

---

## 📋 1. Где и как вызывается distributeReferralRewards()

### Найдено 3 места вызова:

#### 1.1 ❌ НАРУШЕНИЕ: Покупка Boost через внутренний баланс
**Файл**: `modules/boost/service.ts:195-218`  
**Метод**: `purchaseWithInternalWallet()`  
**Триггер**: Покупка Boost-пакета за TON из внутреннего баланса

```typescript
// Создаем запись о покупке
const purchase = await this.createBoostPurchase(userId, boostPackage.id, 'wallet', null, 'confirmed');

// Распределяем реферальные награды от покупки TON Boost
const referralResult = await referralService.distributeReferralRewards(
  userId,
  requiredAmount.toString(),
  'ton_boost',
  'TON'
);
```

**ПРОБЛЕМА**: Реферальные награды начисляются при **покупке** Boost-пакета, а не от **дохода** с него.

#### 1.2 ❌ НАРУШЕНИЕ: Активация внешнего TON Boost
**Файл**: `modules/boost/service.ts:559-584`  
**Метод**: `activateBoost()`  
**Триггер**: Активация Boost после подтверждения внешней TON транзакции

```typescript
// Распределяем реферальные награды при активации Boost от внешнего TON
const amount = boostPackage.min_amount || '0';
const referralResult = await referralService.distributeReferralRewards(
  userId,
  amount.toString(),
  'ton_boost',
  'TON'
);
```

**ПРОБЛЕМА**: Реферальные награды начисляются при **активации** Boost-пакета, а не от **дохода** с него.

#### 1.3 ✅ КОРРЕКТНО: UNI Farming доходы
**Файл**: `core/scheduler/farmingScheduler.ts:76-101`  
**Метод**: `processUniFarmingIncome()`  
**Триггер**: Автоматическое начисление дохода от UNI фарминга (каждые 5 минут)

```typescript
// После обновления баланса пользователя реальным доходом
const { error: updateError } = await supabase
  .from('users')
  .update({
    balance_uni: parseFloat(farmer.balance_uni || '0') + parseFloat(income),
    uni_farming_last_update: new Date().toISOString()
  })
  .eq('id', farmer.id);

// Распределяем реферальные награды от UNI фарминга
const referralResult = await referralService.distributeReferralRewards(
  farmer.id.toString(),
  income,
  'uni_farming',
  'UNI'
);
```

**СТАТУС**: Корректно - начисления происходят после фактического получения дохода от UNI фарминга.

---

## 🎯 2. Источники вызова

### ✅ Правильные источники (соответствуют бизнес-правилам):

#### 2.1 UNI Farming Income
- **Периодичность**: Каждые 5 минут через планировщик
- **Условие**: `income > 0` - только при фактическом доходе
- **Расчет**: Доход рассчитывается по формуле `calculateUniFarmingIncome(farmer)`
- **Тип транзакции**: `REFERRAL_REWARD` с `sourceType: 'uni_farming'`
- **Валюта**: UNI

### ❌ Неправильные источники (нарушают бизнес-правила):

#### 2.2 TON Boost Purchase (внутренний баланс)
- **Триггер**: Списание TON из внутреннего баланса для покупки Boost
- **Проблема**: Начисление происходит при **покупке**, а не от **дохода**
- **Тип транзакции**: `REFERRAL_REWARD` с `sourceType: 'ton_boost'`
- **Валюта**: TON

#### 2.3 TON Boost Activation (внешний кошелек)
- **Триггер**: Подтверждение внешней TON транзакции и активация Boost
- **Проблема**: Начисление происходит при **активации**, а не от **дохода**
- **Тип транзакции**: `REFERRAL_REWARD` с `sourceType: 'ton_boost'`
- **Валюта**: TON

---

## 🚨 3. Обнаруженные нарушения

### 3.1 КРИТИЧЕСКОЕ НАРУШЕНИЕ #1: Подмена источника дохода
**Описание**: Партнёрские награды начисляются с суммы покупки/активации Boost-пакета вместо дохода от него

**Неправильная логика**:
```typescript
// modules/boost/service.ts:199-204
const referralResult = await referralService.distributeReferralRewards(
  userId,
  requiredAmount.toString(), // ❌ Сумма покупки, НЕ доход!
  'ton_boost',
  'TON'
);
```

**Правильная логика должна быть**:
```typescript
// При получении дохода от TON Boost farming
const referralResult = await referralService.distributeReferralRewards(
  userId,
  actualBoostIncome.toString(), // ✅ Фактический доход от Boost
  'ton_boost',
  'TON'
);
```

### 3.2 КРИТИЧЕСКОЕ НАРУШЕНИЕ #2: Неправильные триггеры
**Проблема**: Реферальные начисления происходят в неправильных местах

**Найденные неправильные триггеры**:
- ❌ `purchaseWithInternalWallet()` - покупка Boost за внутренний баланс
- ❌ `activateBoost()` - активация Boost после внешней оплаты

**Правильные триггеры должны быть**:
- ✅ При получении дохода от активного TON Boost в планировщике
- ✅ При автоматическом начислении TON Boost доходов
- ✅ При клейме TON Boost наград пользователем

### 3.3 НАРУШЕНИЕ #3: Отсутствие TON Boost farming планировщика
**Проблема**: В системе нет планировщика для TON Boost доходов

**Существует**:
- ✅ `processUniFarmingIncome()` - планировщик UNI доходов

**Отсутствует**:
- ❌ `processTonBoostIncome()` - планировщик TON Boost доходов
- ❌ Автоматическое начисление доходов от активных Boost-пакетов
- ❌ Реферальные начисления от фактических TON Boost доходов

---

## 🔍 4. Проверка типов транзакций

### 4.1 Используемые типы в distributeReferralRewards:
```typescript
// modules/referral/service.ts:329-341
const { error: txError } = await supabase
  .from('transactions')
  .insert({
    user_id: parseInt(commission.userId),
    type: 'REFERRAL_REWARD', // ✅ Корректный тип
    amount_uni: currency === 'UNI' ? parseFloat(commission.amount) : 0,
    amount_ton: currency === 'TON' ? parseFloat(commission.amount) : 0,
    currency: currency,
    status: 'completed',
    description: `Реферальная награда ${commission.level} уровня от ${sourceType}`,
    source_user_id: parseInt(sourceUserId),
    created_at: new Date().toISOString()
  });
```

### 4.2 Отсутствующие типы для корректной работы:
- ❌ `TON_BOOST_INCOME` - доход от TON Boost
- ❌ `UNI_FARMING_INCOME` - доход от UNI фарминга
- ❌ Разделение между `boost_purchase` и `boost_income`

---

## 📊 5. Анализ логирования

### 5.1 ReferralService логирование:
✅ **Корректное**: Подробное логирование всех этапов распределения
```typescript
logger.info('[ReferralService] Начало распределения реферальных наград', {
  sourceUserId, amount, sourceType, currency
});
```

### 5.2 BoostService логирование:
❌ **Проблемное**: Логи скрывают нарушение бизнес-правил
```typescript
logger.info('[BoostService] Реферальные награды распределены', {
  userId, boostPackageId, distributed, totalAmount
});
```
**Проблема**: Логи не указывают, что начисления происходят при покупке, а не от дохода.

### 5.3 FarmingScheduler логирование:
✅ **Корректное**: Ясно указывает источник - фактический доход
```typescript
logger.info(`[FARMING_SCHEDULER] Реферальные награды распределены для UNI фарминга`, {
  farmerId, income, distributed, totalAmount
});
```

---

## 🔗 6. Связь с farming scheduler

### 6.1 UNI Farming Scheduler:
✅ **Статус**: КОРРЕКТНО ИНТЕГРИРОВАН
- **Местоположение**: `core/scheduler/farmingScheduler.ts:76-101`
- **Процесс**: Доход рассчитывается → баланс обновляется → реферальные награды начисляются
- **Периодичность**: Каждые 5 минут

### 6.2 TON Boost Scheduler:
❌ **Статус**: ПОЛНОСТЬЮ ОТСУТСТВУЕТ
- **Проблема**: Нет планировщика для TON Boost доходов
- **Результат**: Реферальные начисления происходят при покупке вместо дохода
- **Необходимо**: Создать `processTonBoostIncome()` метод

---

## 🎯 7. Соответствие бизнес-правилам

### RedMap требования:
- ✅ Реферальные начисления от **дохода** UNI Farming
- ❌ Реферальные начисления от **дохода** TON Boost (начисляются при покупке)
- ✅ НЕ начисляются при Daily Bonus
- ✅ НЕ начисляются при выполнении миссий
- ✅ НЕ начисляются при регистрации

### Текущее состояние:
- **UNI Farming**: 100% соответствие бизнес-правилам ✅
- **TON Boost**: 0% соответствие бизнес-правилам ❌

---

## 🛠️ 8. Необходимые исправления

### 8.1 Убрать неправильные вызовы:
```typescript
// ❌ УДАЛИТЬ из modules/boost/service.ts:195-218
await referralService.distributeReferralRewards(
  userId, requiredAmount.toString(), 'ton_boost', 'TON'
);

// ❌ УДАЛИТЬ из modules/boost/service.ts:559-584  
await referralService.distributeReferralRewards(
  userId, amount.toString(), 'ton_boost', 'TON'
);
```

### 8.2 Создать правильную логику:
```typescript
// ✅ ДОБАВИТЬ в core/scheduler/farmingScheduler.ts
async processTonBoostIncome(): Promise<void> {
  // Получить активные TON Boost
  // Рассчитать доход от Boost
  // Обновить баланс пользователя
  // Вызвать distributeReferralRewards с реальным доходом
}
```

---

## 🚨 ВЫВОД

### Критическая оценка:
**Партнёрская программа работает НЕПРАВИЛЬНО для TON Boost части**

### Детальный анализ:
- **UNI Farming**: ✅ 100% соответствие бизнес-правилам
- **TON Boost**: ❌ 0% соответствие бизнес-правилам  
- **Общая готовность**: 50% (работает только для UNI)

### Главные проблемы:
1. **Подмена источника**: Начисления с суммы покупки вместо дохода
2. **Неправильные триггеры**: Покупка/активация вместо получения дохода  
3. **Отсутствие TON планировщика**: Нет автоматических доходов от Boost

### Рекомендации:
1. **НЕМЕДЛЕННО удалить** реферальные вызовы из методов покупки/активации Boost
2. **Создать планировщик** TON Boost доходов аналогично UNI
3. **Интегрировать реферальную логику** в планировщик TON доходов
4. **Протестировать** корректность начислений только от фактических доходов

### Статус соответствия RedMap:
❌ **НЕ СООТВЕТСТВУЕТ** - требуется срочное исправление TON Boost логики

---

*Аудит T55 завершен: 16 июня 2025*  
*Критичность: ВЫСОКАЯ - партнёрская программа работает неправильно*