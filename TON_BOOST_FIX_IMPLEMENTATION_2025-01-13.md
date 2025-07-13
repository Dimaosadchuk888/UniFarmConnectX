# 🔧 TON Boost - Исправление критической архитектурной проблемы

**Дата:** 13 июля 2025  
**Статус:** ✅ Исправления внесены  
**Метод:** Минимальные изменения для исправления расчета доходов

---

## 📋 Проблема

Доход TON Boost рассчитывался от всего баланса пользователя (balance_ton - 10) вместо суммы депозита в boost пакет. Это приводило к завышению доходов в 165+ раз.

## ✅ Внесенные изменения

### 1. TonFarmingRepository.activateBoost()
**Файл:** `modules/boost/TonFarmingRepository.ts`  
**Строки:** 246, 252, 268, 272

**Изменения:**
- Добавлен параметр `depositAmount?: number` в сигнатуру метода
- Добавлено обновление поля `farming_balance` при активации boost
- Обновлен также fallback для таблицы users

```typescript
// Было:
async activateBoost(userId: string, packageId: number, rate: number, expiresAt?: string): Promise<boolean>

// Стало:
async activateBoost(userId: string, packageId: number, rate: number, expiresAt?: string, depositAmount?: number): Promise<boolean>

// Добавлено в upsert:
farming_balance: depositAmount ? depositAmount.toString() : '0',
```

### 2. BoostService.purchaseWithInternalWallet()
**Файл:** `modules/boost/service.ts`  
**Строка:** 333

**Изменения:**
- Передаем `requiredAmount` в вызов `activateBoost`

```typescript
// Было:
const immediateActivation = await tonFarmingRepo.activateBoost(
  parseInt(userId),
  boostPackage.id,
  boostPackage.daily_rate / 100,
  boostPackage.duration_days
);

// Стало:
const immediateActivation = await tonFarmingRepo.activateBoost(
  parseInt(userId),
  boostPackage.id,
  boostPackage.daily_rate / 100,
  boostPackage.duration_days,
  requiredAmount // Передаем сумму депозита
);
```

### 3. tonBoostIncomeScheduler
**Файл:** `modules/scheduler/tonBoostIncomeScheduler.ts`  
**Строки:** 120, 149

**Изменения:**
- Изменен расчет `userDeposit` - теперь использует `farming_balance`
- Улучшено логирование для отображения суммы депозита

```typescript
// Было:
const userDeposit = Math.max(0, parseFloat(userBalance.balance_ton || '0') - 10);

// Стало:
const userDeposit = Math.max(0, parseFloat(user.farming_balance || '0'));

// Логирование:
logger.info(`[TON_BOOST_SCHEDULER] User ${user.user_id} (${user.boost_package_id}): +${fiveMinuteIncome.toFixed(6)} TON (депозит: ${userDeposit} TON)`);
```

## 📊 Ожидаемый эффект

### До исправления:
- Пользователь с депозитом 5 TON и балансом 837 TON
- Расчет дохода: (837 - 10) * 0.015 = 12.4 TON/день

### После исправления:
- Пользователь с депозитом 5 TON
- Расчет дохода: 5 * 0.015 = 0.075 TON/день

**Снижение завышенных доходов в 165 раз до корректных значений!**

## ⚠️ Важные замечания

1. **Обратная совместимость:** Существующие активные boost пакеты будут давать доход 0 TON до следующей покупки, так как их `farming_balance` = 0

2. **Требуется перезапуск:** Изменения вступят в силу после перезапуска сервера

3. **Новые покупки:** Только новые покупки boost пакетов будут корректно устанавливать `farming_balance`

## 🚀 Следующие шаги

1. Перезапустить сервер для применения изменений
2. Мониторить логи планировщика для проверки корректности расчетов
3. Рассмотреть миграцию для установки `farming_balance` существующим активным пакетам

## 📈 Метрики успеха

- Доход от TON Boost соответствует сумме депозита * процентную ставку
- В логах отображается корректная сумма депозита для каждого пользователя
- Новые покупки правильно устанавливают `farming_balance`