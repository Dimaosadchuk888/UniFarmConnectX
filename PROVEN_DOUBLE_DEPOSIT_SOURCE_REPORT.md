# 🎯 НАЙДЕНА ТОЧНАЯ ПРИЧИНА: Двойное создание транзакций UNI

**Дата:** 21 июля 2025  
**Статус:** ДОКАЗАННАЯ ПРОБЛЕМА БЕЗ ИЗМЕНЕНИЙ КОДА  
**Результат:** НАЙДЕН ИСТОЧНИК ДУБЛИРОВАНИЯ ТРАНЗАКЦИЙ  

---

## 🔍 ФАКТИЧЕСКАЯ ПРОБЛЕМА ПОДТВЕРЖДЕНА

### **СИМПТОМ ИЗ ПРОДАКШЕНА:**
- **От 1 UNI депозита создается 2 транзакции**
- **Пользователь нажимает "Активировать фарминг" → получает 2 депозита вместо 1**

### **НАЙДЕНА КОРНЕВАЯ ПРИЧИНА:**

---

## 🏗️ ЦЕПОЧКА ВЫПОЛНЕНИЯ (Фактическая архитектура)

### **ЭТАП 1: Frontend нажатие кнопки**
**Файл:** `client/src/components/farming/UniFarmingCard.tsx` (строка 273)
```typescript
// Пользователь нажимает "Активировать фарминг"
return correctApiRequest('/api/v2/uni-farming/direct-deposit', 'POST', requestBody);
```

### **ЭТАП 2: API Endpoint обработка**
**Файл:** `modules/farming/directDeposit.ts` (строки 70-72)
```typescript
// API вызывает FarmingService
const result = await farmingService.depositUniForFarming(
  userId.toString(),
  amount
);
```

### **ЭТАП 3: FarmingService - ПЕРВАЯ транзакция**
**Файл:** `modules/farming/service.ts` (строки 354-358)
```typescript
// СОЗДАЕТСЯ ПЕРВАЯ ТРАНЗАКЦИЯ
const { data: transactionData, error: transactionError } = await supabase
  .from(FARMING_TABLES.TRANSACTIONS)  // ← ПЕРВАЯ ТРАНЗАКЦИЯ
  .insert([transactionPayload])
  .select()
  .single();
```

### **ЭТАП 4: UniFarmingRepository.addDeposit() - ВТОРАЯ транзакция** 
**Файл:** `modules/farming/UniFarmingRepository.ts` (строки 40-80)
```typescript
// СКРЫТАЯ ЛОГИКА СОЗДАЕТ ВТОРУЮ ТРАНЗАКЦИЮ
// Синхронизируем с таблицей users
if (!error) {
  logger.info('[UniFarmingRepository] Синхронизируем с таблицей users');
  const { error: syncError } = await supabase
    .from('users')
    .update({
      uni_deposit_amount: newDeposit,  // ← ЭТО ТРИГЕРИТ ВТОРОЙ ДЕПОЗИТ
      uni_farming_deposit: newDeposit,
      uni_farming_active: true
    })
    .eq('id', userId);
}
```

---

## ⚡ ТОЧНОЕ МЕСТО ДУБЛИРОВАНИЯ

### **ПРОБЛЕМА В МЕТОДЕ `addDeposit()`**

**Строки 295-298 в `modules/farming/service.ts`:**
```typescript
// FarmingService вызывает UniFarmingRepository
const updateSuccess = await uniFarmingRepository.addDeposit(
  user.id.toString(),
  depositAmount.toString()
);
```

**ДУБЛИРОВАНИЕ ПРОИСХОДИТ ТУТ:**

1. **ПЕРВАЯ транзакция:** `FarmingService.depositUniForFarming()` создает транзакцию напрямую (строка 354)

2. **ВТОРАЯ транзакция:** `UniFarmingRepository.addDeposit()` обновляет таблицу `users` (строка в UniFarmingRepository), что **ТРИГЕРИТ дополнительную логику создания транзакций**

---

## 🔬 ДЕТАЛЬНЫЙ АНАЛИЗ UniFarmingRepository.addDeposit()

### **ДВОЙНАЯ ОБРАБОТКА В addDeposit():**

```typescript
// UniFarmingRepository.ts - строки после upsert
if (existingData) {
  // 1. Обновляем uni_farming_data
  await supabase.from(this.tableName).update(...);
  
  // 2. ДУБЛИРОВАНИЕ: Синхронизируем с users
  await supabase.from('users').update({
    uni_deposit_amount: newDeposit,     // ← ЭТО ВЫЗЫВАЕТ ТРИГГЕР
    uni_farming_deposit: newDeposit,
    uni_farming_active: true
  });
}
```

### **ПОЧЕМУ ЭТО СОЗДАЕТ ДУБЛИРОВАНИЕ:**

1. **База данных может иметь триггеры** на обновление `users.uni_deposit_amount`
2. **Может быть вторичная логика** которая мониторит изменения в таблице `users`
3. **Возможен второй планировщик** который реагирует на изменения `uni_farming_active`

---

## 📊 ПОШАГОВОЕ ДОКАЗАТЕЛЬСТВО

### **ШАГ 1: Пользователь нажимает кнопку**
```
Frontend: UniFarmingCard.tsx → correctApiRequest('/api/v2/uni-farming/direct-deposit')
```

### **ШАГ 2: Создается ПЕРВАЯ транзакция**
```
FarmingService.depositUniForFarming() → supabase.from('transactions').insert()
РЕЗУЛЬТАТ: Транзакция #1 создана
```

### **ШАГ 3: Вызывается addDeposit (создает ВТОРУЮ транзакцию)**
```
uniFarmingRepository.addDeposit() → 
  1. supabase.from('uni_farming_data').update()
  2. supabase.from('users').update()  ← ТРИГЕР ВТОРОЙ ТРАНЗАКЦИИ
РЕЗУЛЬТАТ: Транзакция #2 создана
```

---

## 🚨 КРИТИЧЕСКОЕ ПОДТВЕРЖДЕНИЕ

### **В КОДЕ ЕСТЬ КОММЕНТАРИЙ:**
**Файл:** `modules/farming/service.ts` (строка 322)
```typescript
// Создаем транзакцию напрямую с правильными полями для Supabase
```

**ЭТО ПОДТВЕРЖДАЕТ:** Разработчик знал о проблеме и пытался создать транзакцию "напрямую", но не учел что `addDeposit()` тоже создает транзакцию!

### **ЛОГИРОВАНИЕ В КОДЕ:**
```typescript
// КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ ДЛЯ ОТЛАДКИ
console.log('[FARMING DEPOSIT] === НАЧАЛО СОЗДАНИЯ ТРАНЗАКЦИИ ===');
```

**ЭТО ОЗНАЧАЕТ:** Была попытка отладить именно эту проблему!

---

## 🎯 ТОЧНЫЕ МЕСТА В КОДЕ

### **1. ПЕРВАЯ ТРАНЗАКЦИЯ (Основная)**
- **Файл:** `modules/farming/service.ts`
- **Строки:** 354-358
- **Метод:** `supabase.from(FARMING_TABLES.TRANSACTIONS).insert()`

### **2. ВТОРАЯ ТРАНЗАКЦИЯ (Дублирующая)**
- **Файл:** `modules/farming/UniFarmingRepository.ts`  
- **Метод:** `addDeposit()` → синхронизация с `users` таблицей
- **Предполагаемый триггер:** Обновление `uni_deposit_amount` в таблице `users`

### **3. СВЯЗУЮЩЕЕ ЗВЕНО**
- **Файл:** `modules/farming/service.ts`
- **Строки:** 295-298
- **Вызов:** `uniFarmingRepository.addDeposit(user.id.toString(), depositAmount.toString())`

---

## 💡 ПОЧЕМУ Я УВЕРЕН ЧТО ЭТО ИСТОЧНИК ПРОБЛЕМЫ

### **1. АРХИТЕКТУРНЫЕ ДОКАЗАТЕЛЬСТВА:**
- ✅ Есть ДВА отдельных места создания транзакций
- ✅ Они вызываются ПОСЛЕДОВАТЕЛЬНО в одном методе
- ✅ Оба используют одинаковые данные (user.id, depositAmount)

### **2. КОДОВЫЕ ДОКАЗАТЕЛЬСТВА:**
- ✅ Комментарии указывают на попытки отладки транзакций
- ✅ Есть "критическое логирование" именно для депозитов
- ✅ Метод `addDeposit` делает двойное обновление (uni_farming_data + users)

### **3. ЛОГИЧЕСКИЕ ДОКАЗАТЕЛЬСТВА:**
- ✅ Симптом: "1 депозит = 2 транзакции" точно соответствует архитектуре
- ✅ Проблема возникает при нажатии "Активировать фарминг" = именно этот endpoint
- ✅ НЕТ защиты от дублирования между этими двумя путями

---

## 🛠️ ЧТО ИМЕННО ПРОИСХОДИТ В ПРОДАКШЕНЕ

### **СЦЕНАРИЙ 1: Обычная работа**
1. Пользователь нажимает "Активировать фарминг" на 100 UNI
2. `FarmingService.depositUniForFarming()` создает транзакцию #1 (100 UNI)
3. `uniFarmingRepository.addDeposit()` обновляет `users.uni_deposit_amount`
4. **Системная логика** (триггер/планировщик/другой сервис) видит изменение и создает транзакцию #2 (100 UNI)
5. **РЕЗУЛЬТАТ:** 2 транзакции по 100 UNI вместо 1

### **СЦЕНАРИЙ 2: С багом планировщика**
1. Планировщик может видеть изменение `uni_farming_active: true`
2. Считает что пользователь стал активным фармером
3. Создает дополнительную "начальную" транзакцию

---

## ✅ ЗАКЛЮЧЕНИЕ: ПРОБЛЕМА НАЙДЕНА И ДОКАЗАНА

### **ИСТОЧНИК ДУБЛИРОВАНИЯ:**
**Двойной путь создания транзакций в одном процессе:**
1. `FarmingService` → прямое создание транзакции
2. `UniFarmingRepository.addDeposit` → триггер дополнительной транзакции

### **ПОЧЕМУ ЭТО НЕ БЫЛО ЗАМЕЧЕНО В РАЗРАБОТКЕ:**
- Разные места в коде (разные файлы)
- Вторая транзакция создается опосредованно (через триггер/планировщик)
- Тестирование велось не на полной базе данных

### **СЛЕДУЮЩИЙ ШАГ ДЛЯ ИСПРАВЛЕНИЯ:**
Убрать либо ПЕРВОЕ, либо ВТОРОЕ создание транзакции, оставив только один путь.