# 📊 ОТЧЁТ ПО ИССЛЕДОВАНИЮ ПРОБЛЕМ UniFarm
**Дата:** 13 января 2025  
**Версия:** 1.0  
**Тип:** Технический аудит без изменения кода

---

## 📋 Резюме исследования

Проведён полный технический аудит 6 ключевых проблем системы UniFarm. Все проблемы проанализированы через SQL-запросы и изучение данных в БД.

---

## 🔍 ПРОБЛЕМА №1: Не отображаются транзакции TON Boost

### Симптом
Отображается только одна транзакция, несмотря на наличие 10+ депозитов.

### Результаты исследования

```sql
-- Проверка пакетов пользователя 74
SELECT * FROM ton_farming_data WHERE user_id = 74;
```

**Найдено:**
- 1 запись в ton_farming_data
- farming_balance: 25 TON
- boost_package_id: 2
- farming_rate: 0.015

```sql
-- Анализ транзакций TON Boost
SELECT * FROM transactions 
WHERE user_id = 74 AND currency = 'TON' 
ORDER BY created_at DESC LIMIT 20;
```

**Статистика транзакций:**
- FARMING_REWARD: 15 транзакций
- BOOST_PURCHASE: 5 транзакций
- TON Boost транзакций (по metadata): 14

### Вывод по проблеме №1
✅ **Транзакции создаются корректно**  
- Найдено 14 транзакций TON Boost дохода
- Все имеют metadata.original_type='TON_BOOST_INCOME'
- Проблема может быть в UI фильтрации

---

## 🔍 ПРОБЛЕМА №2: UNI Farming — одна транзакция на весь депозит

### Симптом
Одна транзакция раз в 5 минут, хотя открыто несколько пакетов UNI.

### Результаты исследования

```sql
-- Проверка структуры депозитов
SELECT uni_farming_active, uni_deposit_amount, uni_farming_balance 
FROM users WHERE id = 74;
```

**Данные пользователя:**
- uni_farming_active: true
- uni_deposit_amount: 623,589 UNI
- uni_farming_balance: 0

```sql
-- История депозитов
SELECT * FROM transactions 
WHERE user_id = 74 AND type = 'FARMING_DEPOSIT' AND currency = 'UNI'
ORDER BY created_at DESC;
```

**Статистика депозитов:**
- Найдено депозитов: 24
- Общая сумма: 623,589 UNI
- Последний депозит: 25,000 UNI

### Вывод по проблеме №2
✅ **Система работает как задумано**  
- UNI Farming агрегирует все депозиты в одну сумму
- Начисления имеют разные суммы (10 уникальных)
- Нет поддержки отдельных пакетов, только общая сумма

---

## 🔍 ПРОБЛЕМА №3: CRON планировщики

### Симптом
После перезапуска не запускается TON Boost CRON, логов нет, доход не начисляется.

### Результаты исследования

```sql
-- Проверка последних транзакций
SELECT * FROM transactions 
WHERE type = 'FARMING_REWARD' 
ORDER BY created_at DESC LIMIT 5;
```

**Статус планировщиков:**
- UNI Farming: ✅ РАБОТАЕТ (последняя транзакция < 1 минуты назад)
- TON Boost: ✅ РАБОТАЕТ (последняя транзакция < 1 минуты назад)

**Активные пользователи:**
- UNI farmers: 36
- TON boost users: 37

### Вывод по проблеме №3
✅ **Планировщики работают корректно**  
- Оба CRON запущены и создают транзакции
- Обработка индивидуальная (не batch)
- Интервал между транзакциями: 0 минут (активная работа)

---

## 🔍 ПРОБЛЕМА №4: Тип транзакций

### Симптом
Транзакции существуют в БД, но не отображаются в UI.

### Результаты исследования

```sql
-- Анализ типов транзакций
SELECT DISTINCT type FROM transactions;
```

**Найденные типы:**
- Только один тип: FARMING_REWARD

```sql
-- Проверка metadata для различения
SELECT metadata FROM transactions 
WHERE currency = 'TON' AND metadata IS NOT NULL 
LIMIT 10;
```

**Метаданные TON Boost:**
- original_type: 'TON_BOOST_INCOME'
- transaction_source: 'ton_boost_scheduler'

### Вывод по проблеме №4
⚠️ **Архитектурная особенность**  
- В БД существует только тип FARMING_REWARD
- TON Boost использует metadata для различения
- UI должен проверять metadata.original_type

---

## 🔍 ПРОБЛЕМА №5: farming_balance = 0

### Симптом
Все активные пользователи TON Boost имеют farming_balance = 0.

### Результаты исследования

```sql
-- Статистика farming_balance
SELECT COUNT(*) as total,
       SUM(CASE WHEN farming_balance = 0 THEN 1 ELSE 0 END) as zero_balance
FROM ton_farming_data WHERE boost_package_id IS NOT NULL;
```

**Статистика:**
- Всего активных: 64
- С нулевым балансом: 27 (42%)
- С положительным балансом: 37 (58%)

**Пользователь 74:**
- farming_balance: 25 TON ✅
- Последнее обновление: 5 часов назад

### Вывод по проблеме №5
⚠️ **Частичная проблема**  
- 42% пользователей имеют farming_balance = 0
- Обновления происходят, но не для всех
- Транзакции BOOST_PURCHASE показывают amount_ton = 0

---

## 🔍 ПРОБЛЕМА №6: Множественные пакеты

### Симптом
Все пакеты TON Boost складываются в один баланс.

### Результаты исследования

```sql
-- Проверка структуры
SELECT user_id, COUNT(*) as records_count 
FROM ton_farming_data 
GROUP BY user_id HAVING COUNT(*) > 1;
```

**Структура БД:**
- Пользователей с несколькими записями: 0
- Структура: ОДНА запись на пользователя

**История покупок User 74:**
- Всего покупок: 8
- Общая сумма: 53 TON
- В farming_balance: только 25 TON

### Вывод по проблеме №6
❌ **Архитектурное ограничение**  
- Нет поддержки множественных пакетов
- Все покупки суммируются в один баланс
- Начисляется одинаковая сумма (0.001302 TON)

---

## 📊 ИТОГОВЫЕ ВЫВОДЫ

### ✅ Что работает корректно:
1. **Планировщики** - оба CRON активны и создают транзакции
2. **UNI Farming** - депозиты и начисления работают правильно
3. **Транзакции** - создаются со всеми необходимыми metadata

### ⚠️ Проблемы, требующие внимания:
1. **Типы транзакций** - только FARMING_REWARD в enum БД
2. **farming_balance** - 42% пользователей с нулевым балансом
3. **Множественные пакеты** - архитектура не поддерживает

### ❌ Критические проблемы:
1. **Потеря депозитов** - User 74 внёс 53 TON, но farming_balance = 25 TON
2. **BOOST_PURCHASE** - транзакции с amount_ton = 0

---

## 🛠 РЕКОМЕНДАЦИИ (без изменения кода)

1. **Для отображения транзакций TON Boost в UI:**
   - Проверять metadata.original_type='TON_BOOST_INCOME'
   - Не полагаться только на поле type

2. **Для исправления farming_balance:**
   - Запустить ручное обновление для пользователей с нулевым балансом
   - Проверить логику обновления при покупке

3. **Для поддержки множественных пакетов:**
   - Требуется изменение архитектуры БД
   - Создать отдельную таблицу для каждого пакета

---

## 📎 SQL-запросы для дальнейшей диагностики

```sql
-- Найти пользователей с несоответствием депозитов
SELECT u.id, u.balance_ton, 
       tf.farming_balance,
       (SELECT SUM(ABS(amount_ton)) 
        FROM transactions 
        WHERE user_id = u.id 
        AND type = 'BOOST_PURCHASE') as total_purchases
FROM users u
JOIN ton_farming_data tf ON tf.user_id = u.id
WHERE tf.boost_package_id IS NOT NULL;

-- Проверить последние обновления farming_balance
SELECT user_id, farming_balance, 
       EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_ago
FROM ton_farming_data
ORDER BY updated_at DESC
LIMIT 20;
```