# 🚨 СРОЧНЫЕ ИНСТРУКЦИИ: СИНХРОНИЗАЦИЯ БАЗЫ ДАННЫХ UNIFARM

**Статус:** Критические изменения требуют ручного выполнения через Supabase Dashboard  
**Время выполнения:** ~5 минут  
**SQL скрипт:** `scripts/sync-database-to-code-immediate.sql`

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ

База данных UniFarm имеет критические несоответствия с кодом:
1. ❌ В БД только 1 тип транзакций (FARMING_REWARD) вместо требуемых 10
2. ❌ Отсутствует поле `users.last_active` - код падает при обращении к нему
3. ❌ Множество недостающих полей во всех таблицах
4. ❌ Отсутствуют критические таблицы (user_sessions, referral_commissions, system_settings)

---

## 🔧 КАК ВЫПОЛНИТЬ СИНХРОНИЗАЦИЮ

### Шаг 1: Откройте Supabase Dashboard
1. Перейдите в [Supabase Dashboard](https://app.supabase.com)
2. Выберите проект UniFarm
3. Перейдите в раздел **SQL Editor** (слева в меню)

### Шаг 2: Создайте новый запрос
1. Нажмите **New Query**
2. Назовите запрос: "UniFarm DB Sync - January 11, 2025"

### Шаг 3: Выполните SQL скрипт
1. Скопируйте содержимое файла `scripts/sync-database-to-code-immediate.sql`
2. Вставьте в SQL Editor
3. Нажмите **Run** (или Ctrl+Enter)

### Шаг 4: Проверьте результаты
После выполнения вы должны увидеть:
- ✅ "ALTER TYPE" - успешное добавление типов транзакций
- ✅ "ALTER TABLE" - успешное добавление полей
- ✅ "CREATE TABLE" - успешное создание таблиц
- ✅ "CREATE INDEX" - успешное создание индексов

---

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Ошибка: "value already exists"
**Причина:** Некоторые типы транзакций уже добавлены  
**Решение:** Это нормально, продолжайте выполнение

### Ошибка: "column already exists"
**Причина:** Некоторые поля уже существуют  
**Решение:** Это нормально, продолжайте выполнение

### Ошибка: "permission denied"
**Причина:** Недостаточно прав для изменения типов  
**Решение:** Обратитесь к администратору БД

---

## 🎯 РЕЗУЛЬТАТ ПОСЛЕ СИНХРОНИЗАЦИИ

После успешного выполнения:
1. ✅ Все 10 типов транзакций будут доступны
2. ✅ Поле `users.last_active` будет создано
3. ✅ Все недостающие поля будут добавлены
4. ✅ Все недостающие таблицы будут созданы
5. ✅ Код UniFarm будет работать без ошибок

---

## 📝 АЛЬТЕРНАТИВНЫЙ МЕТОД (если основной не работает)

Если полный скрипт не выполняется, выполните команды по частям:

### Часть 1: Критичные типы транзакций
```sql
-- Выполните эти команды по одной:
ALTER TYPE transaction_type ADD VALUE 'BOOST_REWARD';
ALTER TYPE transaction_type ADD VALUE 'MISSION_REWARD';
ALTER TYPE transaction_type ADD VALUE 'DAILY_BONUS';
ALTER TYPE transaction_type ADD VALUE 'REFERRAL_REWARD';
ALTER TYPE transaction_type ADD VALUE 'WITHDRAWAL';
ALTER TYPE transaction_type ADD VALUE 'DEPOSIT';
ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
ALTER TYPE transaction_type ADD VALUE 'BOOST_PURCHASE';
ALTER TYPE transaction_type ADD VALUE 'AIRDROP_CLAIM';
```

### Часть 2: Критичное поле last_active
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();
```

### Часть 3: Поле amount в transactions
```sql
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS amount NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);
```

---

## ✅ ПРОВЕРКА УСПЕШНОСТИ

После выполнения проверьте:
1. В таблице `users` появилось поле `last_active`
2. В таблице `transactions` появились поля `amount` и `currency`
3. Новые таблицы созданы: `user_sessions`, `referral_commissions`, `system_settings`

---

## 🆘 НУЖНА ПОМОЩЬ?

Если возникли проблемы:
1. Сделайте скриншот ошибки
2. Скопируйте текст ошибки
3. Обратитесь к DevOps команде

**Критичность:** ВЫСОКАЯ - без этих изменений система не работает корректно!