# План рефакторинга кода UniFarm для синхронизации с БД

## 📋 Общий план действий

### Фаза 1: Критические исправления (Срочно!)
Эти изменения необходимы для предотвращения ошибок SQL

### Фаза 2: Очистка кода от несуществующих полей
Удаление обращений к полям, которых нет в БД

### Фаза 3: Оптимизация и миграция
Перенос логики на новую структуру БД

---

## 🚨 Фаза 1: Критические исправления

### 1. Модуль Admin/AdminBot - поля users
**Проблема:** Используются поля `status`, `processed_at`, `processed_by` которых нет в БД

**Файлы для исправления:**
- `modules/admin/model.ts` (строки 15-17)
- `modules/adminBot/model.ts` (строки 22-24)
- `modules/adminBot/service.ts`

**Решение:**
```typescript
// Временное решение - использовать существующие поля
// Вместо status можно использовать is_active
// processed_at и processed_by переместить в withdraw_requests
```

### 2. Модуль Transactions - поля tx_hash, description
**Проблема:** Критически важные поля отсутствуют в БД

**Файлы для исправления:**
- `modules/transactions/model.ts` (строки 121, 125, 130)
- `modules/transactions/service.ts`
- `modules/boost/service.ts` (строка 145)

**Решение:**
```typescript
// После выполнения SQL скрипта эти поля появятся
// Пока можно добавить проверки на null
if (transaction.tx_hash) { ... }
```

### 3. Модуль Referral - агрегатные поля
**Проблема:** Поля `total_referrals`, `active_referrals`, `total_earnings` должны вычисляться

**Файлы для исправления:**
- `modules/referral/model.ts` (строки 45-47)
- `modules/referral/service.ts`

**Решение:**
```typescript
// Создать методы для вычисления вместо хранения
async calculateTotalReferrals(userId: number) {
  const { count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact' })
    .eq('inviter_id', userId);
  return count || 0;
}
```

---

## 🧹 Фаза 2: Очистка кода

### 1. Удалить обращения к полям farming в таблице users
**Затронутые модули:**
- farming
- scheduler
- monitor
- tonFarming

**План действий:**
1. Создать сервисы для работы с новыми таблицами `uni_farming_data` и `ton_farming_data`
2. Заменить прямые обращения к users на вызовы новых сервисов
3. Обновить типы TypeScript

### 2. Удалить обращения к неиспользуемым полям transactions
**Поля для удаления:**
- metadata
- source
- source_user_id
- action

**Файлы:**
- Проверить все импорты типов Transaction
- Удалить из интерфейсов

---

## 🔧 Фаза 3: Миграция на новую структуру

### 1. Создать новые репозитории
```typescript
// core/repositories/UniFarmingRepository.ts
export class UniFarmingRepository {
  async getUserFarmingData(userId: number) {
    // Работа с таблицей uni_farming_data
  }
}

// core/repositories/TonFarmingRepository.ts
export class TonFarmingRepository {
  async getUserBoostData(userId: number) {
    // Работа с таблицей ton_farming_data
  }
}
```

### 2. Обновить BalanceManager
- Использовать новые репозитории вместо прямых запросов к users
- Добавить кеширование для farming данных

### 3. Обновить планировщики
- farmingScheduler.ts - использовать UniFarmingRepository
- tonBoostIncomeScheduler.ts - использовать TonFarmingRepository

---

## 📊 Ожидаемые результаты

После выполнения всех фаз:
- ✅ 0 SQL ошибок из-за несуществующих полей
- ✅ Чистая структура БД без неиспользуемых полей
- ✅ Оптимизированные запросы благодаря разделению таблиц
- ✅ 100% соответствие между кодом и БД

## ⏱️ Оценка времени

- Фаза 1: 2-3 часа (критично!)
- Фаза 2: 4-6 часов
- Фаза 3: 6-8 часов

**Итого:** 12-17 часов работы

## 🎯 Приоритеты

1. **Сначала** - выполнить SQL скрипт `fix-database-critical-fields.sql`
2. **Затем** - исправить критические модули (Admin, Transactions)
3. **После** - провести полный рефакторинг