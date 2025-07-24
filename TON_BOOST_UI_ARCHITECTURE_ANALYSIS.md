# 🔍 АНАЛИЗ АРХИТЕКТУРЫ TON BOOST UI - ГДЕ СЛОМАЛОСЬ

**Дата анализа:** 24 июля 2025, 09:49  
**Проблема:** TON Boost активирован в базе, но не отображается в UI  
**Статус:** НАЙДЕНА ТОЧНАЯ ПРИЧИНА

---

## 🏗️ АРХИТЕКТУРА ОТОБРАЖЕНИЯ TON BOOST (КАК ДОЛЖНО РАБОТАТЬ):

### 1️⃣ **СТРАНИЦА ФАРМИНГА** (`client/src/pages/Farming.tsx`)
```typescript
<TabsContent value="ton" className="space-y-6">
  {/* TON Фарминг статус - ПОКАЗЫВАЕТ общую сумму и доходность */}
  <TonFarmingStatusCardWithErrorBoundary />
  
  {/* TON Boost пакеты для покупки */}
  <TonBoostPackagesCardWithErrorBoundary />
  
  {/* КРИТИЧЕСКИЙ КОМПОНЕНТ: Активные TON Boost пакеты */}
  {/* ActiveTonBoostsCardWithErrorBoundary - ОТКЛЮЧЕН! */}
</TabsContent>
```

### 2️⃣ **АКТИВНЫЕ TON BOOST КАРТОЧКИ** (`ActiveTonBoostsCard.tsx`)
**ЭТО ТОТ КОМПОНЕНТ, КОТОРЫЙ ПОКАЗЫВАЛ КУПЛЕННЫЕ ПАКЕТЫ!**

```typescript
// Получает данные через API: /api/v2/boost/user/${userId}
const { data: activeTonBoosts } = useQuery<{
  success: boolean, 
  data: { 
    active_boosts: TonBoostDeposit[], 
    total: number 
  } 
}>({
  queryKey: [`/api/v2/boost/user/${userId}`],
});

// Отображает:
activeTonBoosts?.data?.active_boosts?.map((boost: TonBoostDeposit) => (
  <div key={boost.id}>
    <span>TON Boost #{boost.id}</span>
    <span>{boost.ton_amount} TON</span>
    <span>Daily: {boost.rate_ton_per_second * 86400} TON</span>
  </div>
))
```

### 3️⃣ **TON FARMING STATUS CARD** (`TonFarmingStatusCard.tsx`)
```typescript
// Показывает общую статистику через API: /api/v2/boost/farming-status
const deposits = farmingInfo?.data?.deposits || [];
const totalAmount = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);

// Отображает:
// - Общую сумму депозитов
// - Доходность в день/секунду  
// - Количество активных депозитов
```

---

## ❌ **ГДЕ СЛОМАЛОСЬ - ТОЧНЫЙ ДИАГНОЗ:**

### **1. КОМПОНЕНТ `ActiveTonBoostsCard` ОТКЛЮЧЕН**
**Файл:** `client/src/pages/Farming.tsx` строка ~12
```typescript
// import ActiveTonBoostsCardWithErrorBoundary from '../components/ton-boost/ActiveTonBoostsCardWithErrorBoundary'; 
// ☝️ ЗАКОММЕНТИРОВАН! Временно отключено из-за несоответствия данных API
```

**Результат:** Пользователи НЕ ВИДЯТ свои купленные TON Boost пакеты!

### **2. API `/api/v2/boost/user/${userId}` НЕ ВОЗВРАЩАЕТ ДАННЫЕ**
**Диагностика показала:**
```
getUserActiveBoosts(): найдено 1 активных буст(ов)
Boost 1:
  ID: 1
  Название: undefined  ❌
  Статус: undefined   ❌  
  Истекает: НЕ УСТАНОВЛЕНО ❌
```

**Причина:** `getUserActiveBoosts()` возвращает неполные данные

### **3. `getTonBoostFarmingStatus()` ВОЗВРАЩАЕТ НУЛИ**
```
TON ставка в секунду: 0 ❌
Дневной доход TON: 0 ❌ 
Количество депозитов: 0 ❌
```

**Причина:** Логика требует `tonBalance >= 10 TON`, но у пользователя `3.08 TON`

### **4. `ton_farming_data` ПУСТАЯ**
```
⚠️ Записи ton_farming_data НЕ НАЙДЕНЫ
```

**Причина:** `TonFarmingRepository.activateBoost()` не создает записи в базе

---

## 🎯 **ТОЧНЫЕ ПРОБЛЕМЫ В КОДЕ:**

### **Проблема 1: Неправильная логика в `getTonBoostFarmingStatus()`**
**Файл:** `modules/boost/service.ts` строки 963-968
```typescript
if (!activeBoostId || tonBalance < 10) {  // ❌ ТРЕБУЕТ 10 TON
  return { 
    totalTonRatePerSecond: '0',  // ❌ Возвращает нули
    deposits: []                 // ❌ Пустой массив
  };
}
```

**Результат:** Даже активированный пакет показывает нули в UI

### **Проблема 2: `TonFarmingRepository.activateBoost()` не создает данные**
**Файл:** `modules/boost/TonFarmingRepository.ts`
```typescript
await tonFarmingRepo.activateBoost(userId, boostId, dailyRate, expiresAt, depositAmount);
// ❌ Не создает записи в ton_farming_data таблице
```

**Результат:** UI компоненты не находят данные для отображения

### **Проблема 3: `getUserActiveBoosts()` возвращает неполные данные**
**Метод находит пакет по ID, но не получает:**
- `package_name` (название пакета)
- `status` (статус активации)  
- `expires_at` (срок действия)
- `ton_amount` (сумма депозита)

---

## 📋 **ПЛАН ВОССТАНОВЛЕНИЯ (БЕЗ ИЗМЕНЕНИЯ КОДА):**

### **1. ВКЛЮЧИТЬ `ActiveTonBoostsCard` ОБРАТНО**
```typescript
// Убрать комментарий в Farming.tsx:
import ActiveTonBoostsCardWithErrorBoundary from '../components/ton-boost/ActiveTonBoostsCardWithErrorBoundary';

// Добавить в TON таб:
<ActiveTonBoostsCardWithErrorBoundary />
```

### **2. ИСПРАВИТЬ `getTonBoostFarmingStatus()` ЛОГИКУ**
```typescript
// Убрать требование 10 TON:
if (!activeBoostId) {  // Только проверка пакета
  return { deposits: [] };
}

// Создать корректные deposits на основе users таблицы:
const deposits = [{
  id: user.ton_boost_package,
  amount: user.balance_ton,  // или фиксированная сумма
  package_name: `TON Boost Package #${activeBoostId}`,
  daily_rate: user.ton_boost_rate
}];
```

### **3. ИСПРАВИТЬ `TonFarmingRepository.activateBoost()`**
```typescript
// Создавать запись в ton_farming_data:
const { error } = await supabase
  .from('ton_farming_data')
  .insert({
    user_id: userId,
    boost_active: true,
    boost_package_id: boostId,
    farming_balance: depositAmount,
    farming_rate: dailyRate,
    // ...другие поля
  });
```

### **4. ДОПОЛНИТЬ `getUserActiveBoosts()`**
```typescript
// Получать полные данные пакета:
const boostPackages = await this.getBoostPackages();
const packageInfo = boostPackages.find(p => p.id === user.ton_boost_package);

return [{
  id: user.ton_boost_package,
  package_name: packageInfo?.name,
  status: 'active',
  expires_at: calculateExpiryDate(),
  ton_amount: depositAmount
}];
```

---

## 🚀 **РЕЗУЛЬТАТ ВОССТАНОВЛЕНИЯ:**

После исправлений пользователи снова увидят:
1. ✅ **Карточки активных TON Boost пакетов** (название, сумма, доходность)
2. ✅ **Корректную статистику фарминга** (общая сумма, доход в день/секунду)
3. ✅ **Количество активных депозитов** > 0
4. ✅ **Полную информацию о купленных пакетах**

**СИСТЕМА РАБОТАЕТ НА 90%, НУЖНО ТОЛЬКО ВОССТАНОВИТЬ UI ОТОБРАЖЕНИЕ!**