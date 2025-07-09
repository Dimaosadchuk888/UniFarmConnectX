# 📋 ИНСТРУКЦИИ ПО СИНХРОНИЗАЦИИ SUPABASE

## 🎯 Цель
Достижение 100% готовности базы данных UniFarm в Supabase

## 📊 Текущий статус
- **Готовность БД**: 64%
- **Существующие таблицы**: 7 из 11
- **Таблицы с данными**: 3 (users, transactions, withdraw_requests)
- **Пустые таблицы**: 4 (referrals, farming_sessions, boost_purchases, missions)
- **Отсутствующие таблицы**: 4 (user_sessions, user_missions, airdrops, daily_bonus_logs)

## 🚀 Пошаговая инструкция

### Шаг 1: Создание недостающих таблиц
1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в раздел SQL Editor
4. Откройте файл `scripts/supabase-create-tables.sql`
5. Скопируйте и выполните SQL код для создания 4 недостающих таблиц:
   - user_sessions
   - user_missions
   - airdrops
   - daily_bonus_logs

### Шаг 2: Исправление структуры существующих таблиц
Выполните следующие SQL команды в Supabase Dashboard:

```sql
-- Добавить поле referrer_id в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer_id integer;

-- Добавить поле reward_ton в таблицу missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS reward_ton numeric(20,8) DEFAULT 0;

-- Создать уникальное ограничение для referrals
ALTER TABLE referrals ADD CONSTRAINT referrals_user_id_referred_user_id_key 
UNIQUE (user_id, referred_user_id);
```

### Шаг 3: Заполнение данных
После создания таблиц запустите скрипт заполнения:

```bash
node scripts/supabase-fill-data.js
```

### Шаг 4: Проверка результатов
Запустите аудит для проверки готовности БД:

```bash
node scripts/supabase-schema-audit.js
```

## ✅ Ожидаемый результат
После выполнения всех шагов:
- **Готовность БД**: 100%
- **Все 11 таблиц** созданы и доступны
- **Данные мигрированы** из существующих таблиц
- **Система готова** к полноценной работе

## ⚠️ Важные замечания
1. **Backup**: Создайте резервную копию БД перед выполнением SQL
2. **Права доступа**: Убедитесь, что у вас есть права администратора в Supabase
3. **Переменные окружения**: Проверьте наличие SUPABASE_URL и SUPABASE_KEY
4. **Время выполнения**: Весь процесс займет около 10-15 минут

## 🆘 Поддержка
При возникновении проблем:
1. Проверьте логи в Supabase Dashboard
2. Убедитесь в правильности SQL синтаксиса
3. Проверьте подключение к БД через `node scripts/supabase-schema-audit.js`