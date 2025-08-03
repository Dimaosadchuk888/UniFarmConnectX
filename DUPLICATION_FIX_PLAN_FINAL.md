# 🔧 ПЛАН ИСПРАВЛЕНИЯ ДУБЛИКАТОВ - ОКОНЧАТЕЛЬНЫЙ

**Дата:** 3 августа 2025  
**Критичность:** ВЫСОКАЯ  
**Статус:** ГОТОВ К РЕАЛИЗАЦИИ  

## 🎯 КОРНЕВАЯ ПРИЧИНА НАЙДЕНА

**Источник дубликатов:** `modules/referral/service.ts`, строки 331-345  
**Проблема:** Отсутствие дедупликации для REFERRAL_REWARD транзакций  
**Триггер:** Race conditions в планировщике фарминга (`core/scheduler/farmingScheduler.ts`)  

### Механизм создания дубликатов:
1. Планировщик фарминга запускается каждые 5 минут
2. Обрабатывает UNI фарминг доходы
3. Вызывает `referralService.distributeReferralRewards()`
4. Создает REFERRAL_REWARD транзакции БЕЗ проверки дубликатов
5. При повторном запуске - создаются дубли

## 🔍 ТЕХНИЧЕСКАЯ ДИАГНОСТИКА

### Проблемные участки кода:

**1. Реферальный сервис (modules/referral/service.ts:331-345):**
```typescript
await transactionService.createTransaction({
  user_id: parseInt(commission.userId),
  type: 'REFERRAL_REWARD',
  amount_uni: currency === 'UNI' ? parseFloat(commission.amount) : 0,
  amount_ton: currency === 'TON' ? parseFloat(commission.amount) : 0,
  // ❌ НЕТ уникального идентификатора для дедупликации
});
```

**2. Планировщик фарминга (core/scheduler/farmingScheduler.ts:321-337):**
```typescript
// Распределяем реферальные награды от UNI фарминга
const referralResult = await referralService.distributeReferralRewards(
  farmer.user_id.toString(),
  income,
  'UNI',
  'farming'
);
// ❌ НЕТ защиты от повторных вызовов
```

## 🛠️ ПЛАН ИСПРАВЛЕНИЯ

### Вариант 1: Дедупликация по временной метке (РЕКОМЕНДУЕМЫЙ)
```typescript
// Добавить уникальный идентификатор в metadata
const uniqueKey = `${sourceUserId}_${commission.userId}_${commission.level}_${Math.floor(Date.now() / 60000)}`; // минута

await transactionService.createTransaction({
  // ... остальные поля
  metadata: {
    source_user_id: parseInt(sourceUserId),
    level: commission.level,
    percentage: commission.percentage,
    source_type: sourceType,
    dedup_key: uniqueKey // ✅ Уникальный ключ
  }
});
```

### Вариант 2: Проверка существующих транзакций
Перед созданием REFERRAL_REWARD проверять существование аналогичной транзакции за последние 10 минут.

### Вариант 3: Блокировка на уровне планировщика  
Добавить distributed lock в `farmingScheduler.ts` для предотвращения параллельных выполнений.

## 📋 ШАГИ РЕАЛИЗАЦИИ

### Этап 1: Анализ существующей дедупликации
- ✅ Проверить `core/TransactionService.ts` на наличие дедупликации
- ❌ Найти почему REFERRAL_REWARD не блокируются
- ❌ Определить оптимальный метод исправления

### Этап 2: Реализация исправления
- ❌ Добавить дедупликацию для REFERRAL_REWARD
- ❌ Протестировать на тестовых данных
- ❌ Проверить отсутствие новых дубликатов

### Этап 3: Валидация
- ❌ Запустить планировщик в тестовом режиме
- ❌ Убедиться в отсутствии дубликатов
- ❌ Развернуть в продакшн

## ⚠️ КРИТИЧЕСКИЕ ТРЕБОВАНИЯ

1. **НЕ ИЗМЕНЯТЬ КОД** до полного понимания дедупликации в `TransactionService`
2. **СОХРАНИТЬ** все существующие функции
3. **ДОБАВИТЬ** только дедупликацию, не нарушая логику
4. **ПРОТЕСТИРОВАТЬ** на небольшой выборке пользователей

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

- ✅ Полное устранение дубликатов REFERRAL_REWARD
- ✅ Сохранение всей функциональности
- ✅ Стабильная работа планировщика
- ✅ Корректные реферальные начисления

**Время реализации:** 30-60 минут  
**Тестирование:** 15-30 минут  
**Готовность к продакшн:** 1-2 часа