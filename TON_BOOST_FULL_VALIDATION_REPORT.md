# TON BOOST ПОЛНАЯ ВАЛИДАЦИЯ ЦЕПОЧКИ - ФИНАЛЬНЫЙ ОТЧЕТ

**Дата:** 13 июля 2025  
**Автор:** AI Assistant  
**Статус:** КРИТИЧЕСКАЯ АРХИТЕКТУРНАЯ ПРОБЛЕМА ПОДТВЕРЖДЕНА

## Резюме

Проведена повторная полная валидация всей цепочки TON Boost от фронтенда до планировщика. Все утверждения из предыдущего отчета подтверждены кодом.

## 1. ФРОНТЕНД КОМПОНЕНТЫ

### 1.1 TonFarmingStatusCard.tsx
**Файл:** `client/src/components/ton-boost/TonFarmingStatusCard.tsx`

```typescript
// Строка 41: API запрос
const apiUrl = `/api/v2/boost/farming-status?user_id=${userId}`;

// Строки 283-293: Отображает СУММУ депозитов, НЕ ton_farming_balance
const deposits = farmingInfo?.data?.deposits || [];
if (Array.isArray(deposits) && deposits.length > 0) {
  amount = deposits.reduce((sum, deposit) => {
    const depositAmount = typeof deposit.ton_amount === 'string' ? 
      parseFloat(deposit.ton_amount) : (deposit.ton_amount || 0);
    return sum + (isNaN(depositAmount) ? 0 : depositAmount);
  }, 0);
}
```

**Вывод:** Компонент НЕ использует и НЕ отображает `ton_farming_balance`

### 1.2 ActiveTonBoostsCard.tsx  
**Файл:** `client/src/components/ton-boost/ActiveTonBoostsCard.tsx`

```typescript
// Строка 28: API запрос
queryKey: [`/api/v2/boost/user/${userId}`],

// Интерфейс TonBoostDeposit (строки 8-20)
interface TonBoostDeposit {
  ton_amount: string;        // Сумма депозита
  rate_ton_per_second: string;
  accumulated_ton: string;   // Накоплено
  // НЕТ ton_farming_balance
}
```

**Вывод:** Компонент НЕ использует `ton_farming_balance`

### 1.3 BoostPackagesCard.tsx
**Файл:** `client/src/components/ton-boost/BoostPackagesCard.tsx`

```typescript
// Строка 306: Покупка через внутренний баланс
const data = await correctApiRequest('/api/v2/boost/purchase', 'POST', {
  user_id: (userId || userIdNum).toString(),
  boost_id: boostId.toString(),
  payment_method: 'wallet'
});
```

**Вывод:** Передает только user_id, boost_id, payment_method

## 2. BACKEND API И КОНТРОЛЛЕРЫ

### 2.1 BoostController.purchaseBoost
**Файл:** `modules/boost/controller.ts`

```typescript
// Строка 230: Вызов сервиса
const result = await this.boostService.purchaseBoost(user_id, boost_id, payment_method, tx_hash);
```

### 2.2 BoostService.purchaseWithInternalWallet  
**Файл:** `modules/boost/service.ts`

```typescript
// Строка 304: Списание средств
const withdrawSuccess = await walletService.processWithdrawal(userId, requiredAmount.toString(), 'TON');

// Строки 325-330: КРИТИЧЕСКИЙ ВЫЗОВ - активация boost
const immediateActivation = await tonFarmingRepo.activateBoost(
  parseInt(userId),
  boostPackage.id,
  boostPackage.daily_rate / 100,
  boostPackage.duration_days
);
```

## 3. КРИТИЧЕСКАЯ ПРОБЛЕМА - TonFarmingRepository.activateBoost

**Файл:** `modules/boost/TonFarmingRepository.ts`

```typescript
// Строки 243-256: Метод activateBoost
async activateBoost(userId: string, packageId: number, rate: number, expiresAt?: string): Promise<boolean> {
  try {
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
        // КРИТИЧНО: НЕТ farming_balance!
      });
```

**КОРНЕВАЯ ПРИЧИНА:** Метод `activateBoost` НЕ обновляет поле `farming_balance` или `ton_farming_balance`!

## 4. КРИТИЧЕСКАЯ ПРОБЛЕМА - Планировщик

**Файл:** `modules/scheduler/tonBoostIncomeScheduler.ts`

```typescript
// Строка 117: ИСПОЛЬЗУЕТ ОСНОВНОЙ БАЛАНС ВМЕСТО FARMING BALANCE!
const userDeposit = Math.max(0, parseFloat(userBalance.balance_ton || '0') - 10);

// Строки 139-140: Расчет дохода от неправильной суммы
const dailyIncome = userDeposit * dailyRate;
const fiveMinuteIncome = dailyIncome / 288;
```

## 5. ФИНАНСОВОЕ ВОЗДЕЙСТВИЕ

Для пользователя 74:
- **balance_ton:** 836.99 TON  
- **ton_farming_balance:** 0 TON (не обновляется)
- **Расчет планировщика:** userDeposit = 836.99 - 10 = 826.99 TON
- **Ставка:** 1.5% в день (пакет ID 2)
- **Доход в день:** 826.99 × 0.015 = 12.40 TON
- **Должно быть:** 5 × 0.015 = 0.075 TON
- **ЗАВЫШЕНИЕ:** 12.40 / 0.075 = **165.3 раза!**

## 6. АРХИТЕКТУРНАЯ ЦЕПОЧКА ПРОБЛЕМЫ

1. **Покупка TON Boost:**
   - ✅ Списывается 5 TON с balance_ton
   - ❌ ton_farming_balance НЕ обновляется (остается 0)

2. **Активация boost:**
   - ✅ boost_active = true
   - ✅ boost_package_id = 2  
   - ❌ farming_balance НЕ устанавливается

3. **Планировщик:**
   - ❌ Использует balance_ton вместо farming_balance
   - ❌ Рассчитывает доход от 826.99 TON вместо 5 TON

## 7. РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### Вариант 1: Исправить activateBoost (РЕКОМЕНДУЕТСЯ)
```typescript
// В TonFarmingRepository.activateBoost добавить:
farming_balance: requiredAmount, // Сумма депозита
```

### Вариант 2: Исправить планировщик
```typescript
// Вместо balance_ton использовать farming_balance:
const userDeposit = parseFloat(user.farming_balance || '0');
```

### Вариант 3: Создать отдельную таблицу ton_deposits
Хранить историю депозитов и рассчитывать от их суммы.

## ЗАКЛЮЧЕНИЕ

Архитектурная проблема полностью подтверждена. При покупке TON Boost поле `ton_farming_balance` НЕ обновляется, а планировщик использует основной баланс `balance_ton` для расчета дохода, что приводит к завышению начислений в 165+ раз.