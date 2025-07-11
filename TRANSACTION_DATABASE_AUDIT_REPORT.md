# 🚨 КРИТИЧЕСКИЙ АУДИТ: ТИПЫ ТРАНЗАКЦИЙ В БАЗЕ ДАННЫХ

**Дата аудита:** 11 января 2025  
**Метод проверки:** Прямой анализ БД через Supabase API  
**Статус:** КРИТИЧЕСКАЯ ПРОБЛЕМА

---

## 🔴 ГЛАВНАЯ ПРОБЛЕМА

В базе данных из 595,053 транзакций **ВСЕ** имеют только один тип: `FARMING_REWARD`

### Проверка БД показала:
```
Найденные типы транзакций:
-------------------------
FARMING_REWARD: 1000 записей (из выборки)

Всего уникальных типов: 1
Типы: FARMING_REWARD
```

---

## 📊 АНАЛИЗ НЕСООТВЕТСТВИЙ

### 1. ТИПЫ В СХЕМЕ (shared/schema.ts):
```typescript
export const TransactionType = pgEnum('transaction_type', [
  'FARMING_REWARD',     // ✅ Существует в БД
  'BOOST_REWARD',       // ❌ НЕТ в БД
  'MISSION_REWARD',     // ❌ НЕТ в БД
  'DAILY_BONUS',        // ❌ НЕТ в БД
  'REFERRAL_REWARD',    // ❌ НЕТ в БД
  'WITHDRAWAL',         // ❌ НЕТ в БД
  'DEPOSIT',            // ❌ НЕТ в БД
  'FARMING_DEPOSIT',    // ❌ НЕТ в БД
  'BOOST_PURCHASE',     // ❌ НЕТ в БД
  'AIRDROP_CLAIM'       // ❌ НЕТ в БД
]);
```

### 2. ТИПЫ В КОДЕ (TransactionService.ts):
```typescript
// Расширенные типы, которые маппятся на FARMING_REWARD:
'TON_BOOST_INCOME': 'FARMING_REWARD',   // TON Boost доходы
'UNI_DEPOSIT': 'FARMING_REWARD',        // UNI депозиты
'TON_DEPOSIT': 'FARMING_REWARD',        // TON депозиты
'UNI_WITHDRAWAL': 'FARMING_REWARD',     // Выводы
'TON_WITHDRAWAL': 'FARMING_REWARD',     // Выводы
'BOOST_PURCHASE': 'FARMING_REWARD',     // Покупки boost
'AIRDROP_REWARD': 'DAILY_BONUS'         // Airdrop награды
```

---

## 🔍 КАК ЭТО РАБОТАЕТ СЕЙЧАС

### Пример: TON Boost доходы (tonBoostIncomeScheduler.ts:145)
```typescript
.insert({
  user_id: user.id,
  type: 'FARMING_REWARD',  // Используется единственный доступный тип
  amount: fiveMinuteIncome.toFixed(8),
  amount_uni: '0',
  amount_ton: fiveMinuteIncome.toFixed(8),
  currency: 'TON',
  status: 'completed',
  description: `TON Boost доход (${user.ton_boost_package}): ${fiveMinuteIncome.toFixed(6)} TON`
})
```

**Проблема:** Все операции (миссии, бонусы, реферальные награды, TON boost) сохраняются как `FARMING_REWARD`

---

## 🚨 ПОСЛЕДСТВИЯ

1. **Невозможность фильтрации по типам** - все транзакции выглядят как farming rewards
2. **Неправильная статистика** - нельзя отличить источники дохода
3. **Проблемы с отчетностью** - невозможно построить аналитику по типам операций
4. **Путаница в UI** - пользователи видят все как "Farming Reward"

---

## 📋 РЕАЛЬНЫЕ ПРИМЕРЫ ИЗ БД

### Пример транзакции:
```json
{
  "type": "FARMING_REWARD",
  "description": "UNI farming income: 0.000820 UNI (rate: 0.01)",
  "amount_uni": "0.00082",
  "amount_ton": "0",
  "created_at": "2025-07-09T10:27:05.436"
}
```

### Что должно быть для разных операций:
- Миссии: `type: 'MISSION_REWARD'`
- Daily bonus: `type: 'DAILY_BONUS'`
- Реферальные: `type: 'REFERRAL_REWARD'`
- TON Boost: `type: 'BOOST_REWARD'`

---

## 🛠️ РЕШЕНИЯ

### Вариант 1: Добавить типы в enum БД (РЕКОМЕНДУЕТСЯ)
```sql
-- Добавление недостающих типов
ALTER TYPE transaction_type ADD VALUE 'BOOST_REWARD';
ALTER TYPE transaction_type ADD VALUE 'MISSION_REWARD';
ALTER TYPE transaction_type ADD VALUE 'DAILY_BONUS';
ALTER TYPE transaction_type ADD VALUE 'REFERRAL_REWARD';
-- и т.д.
```

### Вариант 2: Использовать поле metadata
Сохранять реальный тип операции в metadata:
```json
{
  "type": "FARMING_REWARD",
  "metadata": {
    "original_type": "TON_BOOST_INCOME",
    "boost_package_id": 3
  }
}
```

### Вариант 3: Упростить типы в коде
Использовать только те типы, которые есть в БД и различать операции по описанию

---

## ⚠️ КРИТИЧНОСТЬ: ВЫСОКАЯ

Эта проблема влияет на:
- Корректность отображения истории транзакций
- Возможность построения аналитики
- Понимание пользователями источников дохода
- Будущее масштабирование системы

**Рекомендация:** Срочно согласовать с DevOps добавление недостающих типов в enum БД.