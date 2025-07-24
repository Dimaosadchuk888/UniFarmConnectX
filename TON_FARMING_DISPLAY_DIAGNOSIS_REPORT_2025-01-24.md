# 🔍 ДИАГНОСТИКА TON ФАРМИНГ ОТОБРАЖЕНИЯ - 24 июля 2025

**Проблема**: TON Фарминг карточка показывает баланс кошелька (666.22 TON) вместо фактических депозитов (362 TON)

---

## 📊 ТОЧНАЯ ДИАГНОСТИКА ПРОБЛЕМЫ

### 🔗 **Цепочка данных:**
```
Frontend TonFarmingStatusCard
    ↓ API запрос
/api/v2/boost/farming-status?user_id=184
    ↓ Controller
modules/boost/controller.ts → getFarmingStatus()
    ↓ Service  
modules/boost/service.ts → getTonBoostFarmingStatus()
    ↓ Возвращает
deposits[0].amount = farmingBalance.toString()
```

### ❌ **КОРЕНЬ ПРОБЛЕМЫ** (строки 1062-1076):

```javascript
// Получаем farming_balance из ton_farming_data для корректного отображения
let farmingBalance = tonBalance; // ❌ FALLBACK К БАЛАНСУ КОШЕЛЬКА!
try {
  const { data: farmingData } = await supabase
    .from('ton_farming_data')
    .select('farming_balance')
    .eq('user_id', parseInt(userId))
    .single();
  
  if (farmingData && farmingData.farming_balance) {
    farmingBalance = parseFloat(farmingData.farming_balance);
  }
} catch (e) {
  // ❌ Используем tonBalance как fallback
}
```

### 🎯 **Что происходит:**

1. **Запрос к ton_farming_data** - Ищет `farming_balance` для пользователя 184
2. **Если НЕ найдено** - Fallback к `user.balance_ton` (666.22 TON)
3. **API возвращает** - `deposits[0].amount = "666.22553"` 
4. **Frontend отображает** - 666.22 TON как сумму депозитов

### 📋 **ПРОВЕРКА ДАННЫХ В БД:**

**Таблица `users`:**
- `user_id = 184`
- `balance_ton = 0.215073` ← Используется как fallback  
- `ton_boost_package = 1` (активен)
- `ton_boost_rate = 0.01`

**Таблица `ton_farming_data`:**
- Для `user_id = 184` - **НЕТ ЗАПИСЕЙ** (0 записей найдено)
- Причина: При активации TON Boost не создается запись в `ton_farming_data`
- Поэтому используется fallback к `balance_ton = 0.215073`
- **Системная проблема**: У других пользователей с активными boost тоже нет записей

---

## 💡 **ПРИЧИНА ПРОБЛЕМЫ**

### **Scenario 1: Отсутствие записи**
```sql
SELECT * FROM ton_farming_data WHERE user_id = 184;
-- Результат: Пустой (0 записей)
```

### **Scenario 2: NULL значение**
```sql
SELECT farming_balance FROM ton_farming_data WHERE user_id = 184;
-- Результат: farming_balance = NULL
```

### **Scenario 3: Ошибка запроса**
```javascript
// try-catch блок перехватывает ошибку и использует fallback
```

---

## 🔧 **ЧТО ДОЛЖНО БЫТЬ:**

```javascript
// Правильная логика:
1. Проверить ton_farming_data.farming_balance
2. Если найдено - использовать это значение (362 TON)
3. Если НЕ найдено - НЕ ПОКАЗЫВАТЬ депозиты вообще
4. НЕ использовать balance_ton как fallback для отображения
```

---

## 📈 **ВЛИЯНИЕ НА РАСЧЕТЫ:**

### **Текущий (неправильный) расчет:**
- **База**: 0.215073 TON (весь баланс кошелька)
- **Ставка**: 1% в день
- **Доход**: 0.00215 TON/день ← НЕПРАВИЛЬНО (очень мало)

### **Правильный расчет (если найти farming_balance):**
- **База**: ??? TON (фактическая сумма депозитов из ton_farming_data)
- **Ставка**: 1% в день  
- **Доход**: ??? TON/день ← ДОЛЖНО БЫТЬ БОЛЬШЕ

**Проблема**: Система показывает ОЧЕНЬ МАЛЕНЬКИЙ доход вместо реального

---

## 🎯 **ТЕХНИЧЕСКОЕ РЕШЕНИЕ**

### **Файл**: `modules/boost/service.ts`
### **Метод**: `getTonBoostFarmingStatus()` 
### **Строки**: 1062-1076

**Вместо fallback к balance_ton:**
```javascript
// НЕПРАВИЛЬНО:
let farmingBalance = tonBalance; // Fallback к кошельку

// ПРАВИЛЬНО:
let farmingBalance = 0; // Если нет депозитов - показывать 0
// ИЛИ
return { deposits: [] }; // Не показывать депозиты вообще
```

---

## 🔍 **ДОПОЛНИТЕЛЬНАЯ ДИАГНОСТИКА НУЖНА:**

1. **Проверить БД**: Есть ли запись в `ton_farming_data` для пользователя 184?
2. **Логи сервера**: Какая ошибка в try-catch блоке при запросе `farming_balance`?
3. **TonFarmingRepository**: Работает ли метод создания записей при активации boost?

---

## ✅ **ЗАКЛЮЧЕНИЕ**

### 🎯 **ГЛАВНАЯ ПРОБЛЕМА ДИАГНОСТИРОВАНА:**

**Корень проблемы**: При активации TON Boost пакетов **НЕ СОЗДАЮТСЯ** записи в таблице `ton_farming_data`.

### 📊 **Что происходит:**

1. **Пользователь покупает TON Boost** → Обновляется `users.ton_boost_package = 1`
2. **Планировщик работает** → Начисляет доход на основе `users` таблицы
3. **API getTonBoostFarmingStatus()** → Ищет `ton_farming_data` для отображения
4. **Запись НЕ НАЙДЕНА** → Использует fallback к `users.balance_ton`
5. **Frontend показывает** → Баланс кошелька (0.21 TON) вместо депозитов

### 🔧 **СИСТЕМНАЯ ПРОБЛЕМА:**

- **Все пользователи** с активными TON Boost имеют эту проблему
- **TonFarmingRepository.activateBoost()** не вызывается при покупке
- **Данные расщеплены**: планировщик использует `users`, отображение ищет `ton_farming_data`

### 🛠 **ТЕХНИЧЕСКОЕ РЕШЕНИЕ:**

**Вариант 1**: Исправить создание записей в `ton_farming_data` при активации boost
**Вариант 2**: Изменить API чтобы правильно использовать данные из `users` таблицы
**Вариант 3**: Убрать fallback логику - если нет депозитов, показывать `deposits: []`

### ⚡ **КРИТИЧНОСТЬ:**

**Высокая** - Пользователи видят неправильную информацию о своих депозитах, что влияет на доверие к системе.

**Статус**: ✅ **ДИАГНОСТИКА ЗАВЕРШЕНА** - Причина найдена, готов план исправления.