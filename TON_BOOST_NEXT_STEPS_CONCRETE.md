# 🚨 TON BOOST: КОНКРЕТНЫЕ ШАГИ ДЛЯ РЕШЕНИЯ

**Статус:** Код с накоплением внедрен, но НЕ работает после перезапуска  
**Проблема:** farming_balance = 25 TON вместо 119 TON (потеря 79%)

---

## ПРОБЛЕМА НАЙДЕНА

В `modules/boost/service.ts` строка 330 передается неправильный тип данных:
```typescript
boostPackage.duration_days,  // Это число (30), а ожидается строка даты!
```

Метод `activateBoost` ожидает:
```typescript
async activateBoost(userId: string, packageId: number, rate: number, expiresAt?: string, depositAmount?: number)
```

---

## РЕШЕНИЕ #1: ИСПРАВИТЬ ТИП ДАННЫХ (1 строка)

**Файл:** `modules/boost/service.ts`  
**Строка:** 330  
**Заменить:**
```typescript
boostPackage.duration_days,
```
**На:**
```typescript
undefined, // или null
```

Полный вызов должен быть:
```typescript
const immediateActivation = await tonFarmingRepo.activateBoost(
  userId,
  boostPackage.id,
  boostPackage.daily_rate / 100,
  undefined,        // expiresAt - необязательный параметр
  requiredAmount    // depositAmount - сумма депозита
);
```

---

## РЕШЕНИЕ #2: КОМПЕНСАЦИЯ ПОТЕРЬ (SQL)

Для пользователя 74 потеряно 94 TON. Восстановить правильный баланс:

```sql
-- Установить правильный накопленный баланс
UPDATE ton_farming_data 
SET farming_balance = '119' 
WHERE user_id = 74;

-- Или если используется fallback (таблица users)
UPDATE users 
SET ton_farming_balance = '119' 
WHERE id = 74;
```

---

## ПРОВЕРКА ПОСЛЕ ИСПРАВЛЕНИЯ

1. **Применить исправление** в service.ts
2. **Перезапустить сервер**
3. **Сделать тестовую покупку** (например, 1 TON)
4. **Проверить баланс:**
   - Должен стать 120 TON (119 + 1)
   - А не 1 TON (замена)

---

## АЛЬТЕРНАТИВА: РУЧНОЕ НАКОПЛЕНИЕ

Если исправление не поможет, можно добавить логирование в `TonFarmingRepository.activateBoost()`:

```typescript
logger.info('[TonFarmingRepository] activateBoost вызван', {
  userId,
  packageId,
  rate,
  expiresAt,
  depositAmount,
  existingRecord,
  newFarmingBalance
});
```

Это покажет, почему накопление не работает.

---

**Рекомендация:** Сначала попробовать Решение #1 (исправить передачу параметра).