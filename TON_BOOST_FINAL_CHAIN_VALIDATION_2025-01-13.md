# 🧪 TON Boost - Финальная валидация всей цепочки

**Дата:** 13 июля 2025  
**Статус:** ✅ Все проблемы подтверждены кодом
**Метод:** Полная проверка от фронтенда до БД без предположений

---

## 📱 Раздел 1: Фронтенд (TON Boost UI)

### ✅ TonFarmingStatusCard.tsx
**Файл:** `client/src/components/ton-boost/TonFarmingStatusCard.tsx`  
**Строки:** 284-292  
**Факт:** Использует массив `deposits` для расчета общей суммы  
```typescript
// Строка 286: получает массив депозитов
const deposits = farmingInfo?.data?.deposits || [];
// Строка 288-292: суммирует ton_amount из депозитов
amount = deposits.reduce((sum, deposit) => {
  const depositAmount = typeof deposit.ton_amount === 'string' ? 
    parseFloat(deposit.ton_amount) : (deposit.ton_amount || 0);
  return sum + (isNaN(depositAmount) ? 0 : depositAmount);
}, 0);
```
**Комментарий:** НЕ использует `ton_farming_balance` - подтверждено

### ✅ ActiveTonBoostsCard.tsx
**Файл:** `client/src/components/ton-boost/ActiveTonBoostsCard.tsx`  
**Строки:** 8-20  
**Факт:** Интерфейс `TonBoostDeposit` НЕ содержит поля `ton_farming_balance`  
```typescript
interface TonBoostDeposit {
  id: number;
  user_id: number;
  ton_amount: string;  // Используется вместо farming_balance
  boost_package_id: number;
  rate_ton_per_second: string;
  accumulated_ton: string;
  // НЕТ поля ton_farming_balance
}
```
**Комментарий:** Отображает `ton_amount` из депозитов, НЕ `ton_farming_balance`

### ✅ BoostPackagesCard.tsx
**Файл:** `client/src/components/ton-boost/BoostPackagesCard.tsx`  
**Строки:** 306-310  
**Факт:** Отправляет покупку без передачи суммы депозита  
```typescript
const data = await correctApiRequest('/api/v2/boost/purchase', 'POST', {
  user_id: (userId || userIdNum).toString(),
  boost_id: boostId.toString(),
  payment_method: 'wallet'
  // НЕ передает сумму депозита
});
```

---

## 🧩 Раздел 2: Контроллеры и сервисы

### ✅ modules/boost/controller.ts
**Файл:** `modules/boost/controller.ts`  
**Строки:** 208-230  
**Факт:** Принимает только `user_id`, `boost_id`, `payment_method`  
```typescript
const { user_id, boost_id, payment_method, tx_hash } = req.body;
// Передает в сервис без суммы
const result = await this.boostService.purchaseBoost(user_id, boost_id, payment_method, tx_hash);
```

### ✅ modules/boost/service.ts - purchaseWithInternalWallet
**Файл:** `modules/boost/service.ts`  
**Строки:** 304, 325-330  
**Факт:** 
1. **Строка 304:** Списывает средства через `processWithdrawal`
2. **Строки 325-330:** Вызывает `activateBoost` БЕЗ передачи суммы депозита
```typescript
// Строка 325-330
const immediateActivation = await tonFarmingRepo.activateBoost(
  parseInt(userId),
  boostPackage.id,
  boostPackage.daily_rate / 100,
  boostPackage.duration_days
);
// НЕ передает requiredAmount для farming_balance
```

### ✅ modules/boost/TonFarmingRepository.ts - activateBoost
**Файл:** `modules/boost/TonFarmingRepository.ts`  
**Строки:** 243-256  
**Факт:** НЕ обновляет `farming_balance`  
```typescript
async activateBoost(userId: string, packageId: number, rate: number, expiresAt?: string): Promise<boolean> {
  const { error } = await supabase
    .from(this.tableName)
    .upsert({
      user_id: parseInt(userId),
      boost_active: true,
      boost_package_id: packageId,
      farming_rate: rate.toString(),
      boost_expires_at: expiresAt || null,
      farming_start_timestamp: new Date().toISOString(),
      farming_last_update: new Date().toISOString(),
      updated_at: new Date().toISOString()
      // НЕТ поля farming_balance
    });
```
**Комментарий:** Обновляет только флаги и ставки, НЕ сумму депозита

---

## 🔁 Раздел 3: Планировщик начислений дохода

### ✅ tonBoostIncomeScheduler.ts
**Файл:** `modules/scheduler/tonBoostIncomeScheduler.ts`  
**Строка:** 117  
**Факт:** Использует `balance_ton` минус 10, НЕ `farming_balance`  
```typescript
// Строка 117
const userDeposit = Math.max(0, parseFloat(userBalance.balance_ton || '0') - 10);
```
**Комментарий:** Берет ВЕСЬ баланс пользователя минус 10 TON

### ✅ Логирование в планировщике
**Строки:** 101-112  
**Факт:** Логирует что `farming_balance` из boost_data, но НЕ использует  
```typescript
logger.info(`[TON_BOOST_SCHEDULER] Обработка пользователя ${user.user_id}:`, {
  boost_data: {
    farming_balance: user.farming_balance, // Логирует но НЕ использует
    // ...
  },
  user_balances: {
    balance_ton: userBalance.balance_ton, // Использует это
    // ...
  }
});
```

---

## 🗄️ Раздел 4: База данных

### ✅ Структура таблицы users
**Файл:** `shared/schema.ts`  
**Строка:** 64  
**Факт:** Поле `ton_farming_balance` СУЩЕСТВУЕТ  
```typescript
ton_farming_balance: numeric("ton_farming_balance", { precision: 18, scale: 6 }).default("0"),
```

### ✅ Обновление поля при покупке
**Факт:** НЕ обновляется  
**Доказательство:** В методе `activateBoost` (TonFarmingRepository.ts:243-256) НЕТ обновления этого поля

### ✅ Другие поля TON farming
**Строки:** 63-72  
**Факт:** Существуют все необходимые поля:
- `ton_farming_balance` - НЕ используется
- `ton_farming_rate` - обновляется
- `ton_farming_start_timestamp` - обновляется
- `ton_farming_accumulated` - существует но НЕ используется

---

## 💸 Раздел 5: Финансовое поведение

### ✅ Расчет дохода для пользователя 74
**Данные из БД:**
- `balance_ton`: 837.116954 TON
- `ton_farming_balance`: 0 TON (НЕ обновляется)
- Активный пакет: ID 2 (Standard Boost, 1.5% в день)

**Расчет планировщика:**
```
userDeposit = 837.116954 - 10 = 827.116954 TON
dailyIncome = 827.116954 * 0.015 = 12.407 TON/день
```

**Ожидаемый расчет (если бы использовался farming_balance):**
```
userDeposit = 5 TON (сумма покупки пакета)
dailyIncome = 5 * 0.015 = 0.075 TON/день
```

**Завышение:** 165.4 раза

---

## 📊 Итоговые выводы

1. **Фронтенд:** ✅ Подтверждено - использует массив deposits, НЕ ton_farming_balance
2. **Контроллеры/Сервисы:** ✅ Подтверждено - НЕ передают сумму депозита в activateBoost
3. **TonFarmingRepository:** ✅ Подтверждено - НЕ обновляет farming_balance (строки 243-256)
4. **Планировщик:** ✅ Подтверждено - использует balance_ton - 10 (строка 117)
5. **База данных:** ✅ Подтверждено - поле ton_farming_balance существует но НЕ используется

## 🔧 Рекомендация исправления

Добавить в `activateBoost` (строка 251 после farming_rate):
```typescript
farming_balance: requiredAmount, // Добавить эту строку
```

И изменить в планировщике (строка 117):
```typescript
const userDeposit = parseFloat(user.farming_balance || '0');
```

**Все утверждения подтверждены конкретными строками кода без предположений.**