# 🔍 ГЛУБОКОЕ ТЕХНИЧЕСКОЕ ИССЛЕДОВАНИЕ СИСТЕМЫ UniFarm
**Дата:** 13 января 2025  
**Статус:** Анализ завершен БЕЗ изменения кода  
**Автор:** AI Assistant

## 📋 Резюме исследования

Проведен полный технический анализ трех ключевых подсистем UniFarm:
1. Отображение транзакций TON Boost в истории
2. Обработка множественных UNI Farming пакетов  
3. Работа CRON-планировщиков и их связь с БД

## 🎯 Ключевые находки

### 1. TON Boost транзакции НЕ отображаются в истории

**Корневая причина:** Неправильный тип транзакции

#### Цепочка вызовов:
```
tonBoostIncomeScheduler.ts → UnifiedTransactionService → БД → API → Frontend
```

#### Детали проблемы:
- **Планировщик** (`modules/scheduler/tonBoostIncomeScheduler.ts:158`):
  ```typescript
  type: 'FARMING_REWARD',  // НЕ 'TON_BOOST_REWARD'
  metadata: {
    original_type: 'TON_BOOST_INCOME'  // Сохраняется в metadata
  }
  ```

- **БД подтверждает:** 131 транзакция типа `FARMING_REWARD` с `amount_ton > 0`
- **Фронтенд ожидает:** транзакции типа `TON_BOOST_REWARD`
- **Результат:** TON транзакции создаются, но смешиваются с UNI farming транзакциями

### 2. UNI Farming создает ОДНУ транзакцию вместо нескольких

**Корневая причина:** Архитектура не поддерживает множественные пакеты

#### Анализ кода:
- **farmingScheduler.ts:98** - вызывает `calculateUniFarmingIncome`
- **farmingScheduler.ts:335-359** - метод рассчитывает доход от ОДНОГО депозита:
  ```typescript
  const depositAmount = parseFloat(farmer.deposit_amount || '0');
  const income = depositAmount * rate * daysElapsed;
  ```

#### Проблема:
- Система хранит только `uni_deposit_amount` (общий депозит)
- Нет таблицы для отдельных фарминг пакетов
- Создается одна транзакция на всю сумму

### 3. CRON-планировщики и их связь с БД

#### Архитектура планировщиков:

**TON Boost планировщик:**
- **Запуск:** Каждые 5 минут (`*/5 * * * *`)
- **Таблицы:** `ton_farming_data` → `users` (для балансов)
- **Процесс:**
  1. Получает активных пользователей из `ton_farming_data`
  2. Запрашивает балансы из `users`
  3. Создает транзакции в `transactions`
  4. Обновляет балансы через `BalanceManager`

**UNI Farming планировщик:**
- **Запуск:** Каждые 5 минут (`*/5 * * * *`)
- **Таблицы:** `users` (через `UniFarmingRepository`)
- **Процесс:**
  1. Получает пользователей с `uni_farming_active = true`
  2. Рассчитывает доход от единого депозита
  3. Создает транзакции через `BatchBalanceProcessor`
  4. Распределяет реферальные награды

## 📊 Подтвержденные данные из БД

### Транзакции (таблица `transactions`):
```
- FARMING_REWARD с currency=TON: 131 записей
- FARMING_REWARD с currency=UNI: 3000+ записей  
- TON_BOOST_REWARD: 0 записей (тип не существует)
```

### Активные пользователи:
- TON Boost: 10 пользователей с `farming_balance = 0`
- UNI Farming: 36 пользователей с единым депозитом

## 🔗 Полные цепочки вызовов

### TON Boost Income:
```
1. server/index.ts → запускает schedulerManager
2. schedulerManager → запускает tonBoostIncomeScheduler  
3. tonBoostIncomeScheduler.processTonBoostIncome()
   → TonFarmingRepository.getActiveBoostUsers()
   → supabase.from('users').select() // получение балансов
   → UnifiedTransactionService.createTransaction()
   → BalanceNotificationService.notifyBalanceUpdate()
   → ReferralService.distributeReferralRewards()
```

### UNI Farming Income:
```
1. farmingScheduler.processUniFarmingIncome()
   → UniFarmingRepository.getActiveFarmers()
   → calculateUniFarmingIncome() // для каждого фармера
   → BatchBalanceProcessor.processFarmingIncome()
   → supabase.from('transactions').insert()
   → ReferralService.distributeReferralRewards()
```

## ❌ Потенциальные точки сбоя

### 1. Несоответствие типов транзакций
- **Где:** `tonBoostIncomeScheduler.ts:158`
- **Проблема:** Использует `FARMING_REWARD` вместо специфичного типа
- **Эффект:** Невозможно отличить TON Boost от UNI Farming в UI

### 2. Отсутствие архитектуры для множественных пакетов
- **Где:** Нет таблицы `farming_packages` или аналога
- **Проблема:** Система учитывает только общий депозит
- **Эффект:** Невозможно начислять доход от каждого пакета отдельно

### 3. farming_balance = 0 после внесенных исправлений
- **Где:** `ton_farming_data.farming_balance`
- **Проблема:** Поле не обновляется при покупке (требует новых покупок)
- **Эффект:** Планировщик рассчитывает доход от 0

## 📈 Рекомендации (без изменения кода)

### Для TON Boost транзакций:
1. Изменить тип с `FARMING_REWARD` на уникальный идентификатор
2. Или обновить фронтенд для фильтрации по metadata.original_type

### Для UNI Farming множественных пакетов:
1. Создать таблицу для хранения отдельных пакетов
2. Модифицировать планировщик для обработки каждого пакета
3. Создавать отдельные транзакции или объединенную с детализацией

### Для существующих пользователей TON Boost:
1. Создать скрипт миграции для установки farming_balance
2. Или ждать новых покупок после исправлений

## 🔍 Заключение

Система работает, но имеет архитектурные ограничения:
- TON транзакции создаются, но не отображаются из-за типа
- UNI Farming не поддерживает множественные пакеты
- Внесенные исправления требуют новых покупок для активации

**Все проблемы подтверждены анализом кода и данными из БД.**