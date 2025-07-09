# TODO: Синхронизация системы UniFarm с Supabase

## 🚨 КРИТИЧЕСКИЕ ЗАДАЧИ (Блокируют функциональность)

### 1. Создать отсутствующие таблицы
```sql
-- 1.1 Таблица сессий пользователей
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_sessions_token (session_token),
  INDEX idx_user_sessions_user_id (user_id)
);

-- 1.2 Таблица прогресса миссий
CREATE TABLE IF NOT EXISTS user_missions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY unique_user_mission (user_id, mission_id)
);

-- 1.3 Логи ежедневных бонусов
CREATE TABLE IF NOT EXISTS daily_bonus_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_amount DECIMAL(20,6) NOT NULL,
  day_number INTEGER NOT NULL,
  streak_bonus DECIMAL(20,6) DEFAULT 0,
  claimed_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_daily_bonus_user_date (user_id, claimed_at)
);

-- 1.4 Таблица airdrop кампаний
CREATE TABLE IF NOT EXISTS airdrops (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  total_amount DECIMAL(20,6) NOT NULL,
  participants_count INTEGER DEFAULT 0,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Заполнить пустые таблицы базовыми данными
```sql
-- 2.1 Добавить миссии
INSERT INTO missions (id, title, description, reward_uni, reward_ton, type, status) VALUES
(1, 'Первый депозит', 'Сделайте первый депозит UNI в фарминг', 10, 0, 'one_time', 'active'),
(2, 'Пригласи друга', 'Пригласите минимум 1 друга в UniFarm', 5, 0, 'one_time', 'active'),
(3, 'Активный фармер', 'Фармите 7 дней подряд без перерыва', 20, 0, 'streak', 'active'),
(4, 'TON Boost активация', 'Активируйте любой TON Boost пакет', 0, 0.1, 'one_time', 'active'),
(5, 'Социальная активность', 'Подпишитесь на наш Telegram канал', 2, 0, 'social', 'active');

-- 2.2 Перенести реферальные связи из users в referrals
INSERT INTO referrals (referrer_id, referred_id, level, created_at)
SELECT 
  referred_by as referrer_id,
  id as referred_id,
  1 as level,
  created_at
FROM users 
WHERE referred_by IS NOT NULL;
```

### 3. Исправить критические проблемы типов данных
```sql
-- 3.1 Изменить тип поля referred_by
ALTER TABLE users 
DROP COLUMN referred_by,
ADD COLUMN referrer_id INTEGER REFERENCES users(id);

-- 3.2 Обновить типы timestamp полей
ALTER TABLE users
ALTER COLUMN uni_farming_start_timestamp TYPE TIMESTAMP USING uni_farming_start_timestamp::timestamp,
ALTER COLUMN uni_farming_last_update TYPE TIMESTAMP USING uni_farming_last_update::timestamp,
ALTER COLUMN ton_farming_start_timestamp TYPE TIMESTAMP USING ton_farming_start_timestamp::timestamp;
```

## ⚠️ ВАЖНЫЕ ЗАДАЧИ (Улучшают функциональность)

### 4. Оптимизация структуры данных
- [ ] Удалить неиспользуемые поля из `users`: wallet, ton_farming_* (дублируют ton_boost_*)
- [ ] Удалить пустые поля из `transactions`: metadata, tx_hash, currency
- [ ] Добавить индексы для часто используемых запросов

### 5. Миграция данных
- [ ] Перенести историю фарминга из полей users в таблицу farming_sessions
- [ ] Создать записи в boost_purchases для активных ton_boost_package
- [ ] Заполнить user_missions на основе выполненных действий

### 6. Добавить недостающие поля
```sql
-- В таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  last_name VARCHAR(255),
  language_code VARCHAR(10) DEFAULT 'ru',
  total_earned_uni DECIMAL(20,6) DEFAULT 0,
  total_earned_ton DECIMAL(20,9) DEFAULT 0;

-- В таблицу transactions  
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS
  balance_before_uni DECIMAL(20,6),
  balance_after_uni DECIMAL(20,6),
  balance_before_ton DECIMAL(20,9),
  balance_after_ton DECIMAL(20,9);
```

## 📝 ЗАДАЧИ ДЛЯ КОДА

### 7. Обновить модули для работы с новыми таблицами
- [ ] `modules/auth/service.ts` - сохранять сессии в user_sessions
- [ ] `modules/missions/service.ts` - использовать user_missions для прогресса
- [ ] `modules/dailyBonus/service.ts` - записывать в daily_bonus_logs
- [ ] `modules/referral/service.ts` - читать из таблицы referrals

### 8. Исправить обращения к полям
- [ ] Заменить `referred_by` на `referrer_id` во всех модулях
- [ ] Использовать правильные типы для timestamp полей
- [ ] Убрать обращения к несуществующим полям

### 9. Добавить валидацию данных
- [ ] Проверка целостности реферальных цепочек
- [ ] Валидация балансов через транзакции
- [ ] Проверка дубликатов в критических операциях

## 🎯 КОНТРОЛЬНЫЕ ТОЧКИ

1. **После создания таблиц**: Все модули должны запускаться без ошибок
2. **После заполнения данных**: Миссии и рефералы должны отображаться в UI
3. **После миграции типов**: Не должно быть ошибок преобразования данных
4. **После синхронизации кода**: 100% тестов должны проходить

## 📊 МЕТРИКИ УСПЕХА

- ✅ 0 ошибок "relation does not exist"
- ✅ Все 11 таблиц содержат данные
- ✅ Типы данных соответствуют использованию в коде
- ✅ Производительность запросов < 100ms
- ✅ Целостность данных 100%