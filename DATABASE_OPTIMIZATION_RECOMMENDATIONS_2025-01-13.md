# Рекомендации по оптимизации базы данных UniFarm
**Дата**: 13 июля 2025
**Статус**: Анализ схемы БД vs использование в коде

## 🗑️ ТАБЛИЦЫ ДЛЯ УДАЛЕНИЯ (не используются в коде)

### 1. Полностью неиспользуемые таблицы:
- **referrals** - дублирует функционал полей в users (referred_by, referrer_id)
- **farming_sessions** - заменена на uni_farming_data
- **user_sessions** - не используется (JWT токены в localStorage)
- **wallet** - функционал в таблице users
- **farming_deposits** - заменена на uni_farming_data
- **boosts** - заменена на boost_purchases

### 2. Новые таблицы без реализации:
- **airdrop_claims** - функционал в airdrops
- **airdrop_missions** - функционал в missions
- **auth_logs** - не реализовано логирование
- **mission_progress** - дублирует user_missions
- **mission_templates** - дублирует missions
- **referral_analytics** - статистика в users
- **referral_earnings** - расчет через транзакции
- **system_metrics** - мониторинг не реализован
- **ton_boost_schedules** - расчет в планировщике
- **user_mission_claims** - дублирует user_missions
- **user_mission_completions** - дублирует user_missions
- **wallet_logs** - функционал в transactions
- **webhook_logs** - вебхуки не используются
- **daily_bonus_history** - заменена на daily_bonus_logs

## ✅ ТАБЛИЦЫ В ИСПОЛЬЗОВАНИИ (оставить)

1. **users** - основная таблица пользователей
2. **transactions** - история всех транзакций
3. **missions** - задания и миссии
4. **user_missions** - прогресс пользователей по миссиям
5. **boost_purchases** - покупки boost пакетов
6. **daily_bonus_logs** - история ежедневных бонусов
7. **withdraw_requests** - заявки на вывод средств
8. **airdrops** - кампании airdrop
9. **uni_farming_data** - данные UNI фарминга
10. **ton_farming_data** - данные TON фарминга

## ⚠️ ПРОБЛЕМЫ С ПОЛЯМИ

### 1. Таблица users - избыточные поля:
- **Дублирование фарминг полей** - есть поля uni_* и ton_* которые дублируют uni_farming_data и ton_farming_data
- **last_active** - используется в коде, но отсутствует в БД (создает ошибки)
- **guest_id** - используется в коде, отсутствует в БД
- **is_active** - используется в коде, отсутствует в БД

### 2. Таблица transactions:
- **amount** - используется в коде, отсутствует в БД (есть amount_uni/amount_ton)
- **metadata** - поле jsonb не используется эффективно

## 🔧 РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ

### 1. Срочно добавить в БД:
```sql
-- Добавить отсутствующие поля в users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active timestamp without time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS guest_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Добавить поле amount в transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0;
```

### 2. Удалить неиспользуемые таблицы:
```sql
-- Удалить дублирующие и неиспользуемые таблицы
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS farming_sessions CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS wallet CASCADE;
DROP TABLE IF EXISTS farming_deposits CASCADE;
DROP TABLE IF EXISTS boosts CASCADE;
DROP TABLE IF EXISTS airdrop_claims CASCADE;
DROP TABLE IF EXISTS airdrop_missions CASCADE;
DROP TABLE IF EXISTS auth_logs CASCADE;
DROP TABLE IF EXISTS mission_progress CASCADE;
DROP TABLE IF EXISTS mission_templates CASCADE;
DROP TABLE IF EXISTS referral_analytics CASCADE;
DROP TABLE IF EXISTS referral_earnings CASCADE;
DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS ton_boost_schedules CASCADE;
DROP TABLE IF EXISTS user_mission_claims CASCADE;
DROP TABLE IF EXISTS user_mission_completions CASCADE;
DROP TABLE IF EXISTS wallet_logs CASCADE;
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS daily_bonus_history CASCADE;
```

### 3. Оптимизировать структуру users:
- Переместить все фарминг поля в отдельные таблицы
- Оставить в users только базовые поля и балансы

## 📊 АРХИТЕКТУРНЫЕ УЛУЧШЕНИЯ

### 1. Реферальная система:
- Сейчас использует поля в users (referred_by, referrer_id)
- Рекомендую создать view для аналитики вместо отдельных таблиц

### 2. Фарминг данные:
- Полностью перейти на uni_farming_data и ton_farming_data
- Удалить дублирующие поля из users

### 3. Транзакции:
- Унифицировать использование поля amount
- Добавить индексы для быстрого поиска

## 📈 ИТОГОВАЯ СТАТИСТИКА

- **Всего таблиц в БД**: 31
- **Используется в коде**: 10 (32%)
- **Не используется**: 21 (68%)
- **Рекомендовано удалить**: 21 таблица
- **Критических проблем**: 3 (отсутствующие поля)

## ⚡ ПРИОРИТЕТНЫЕ ДЕЙСТВИЯ

1. **Критично**: Добавить поля last_active, guest_id, is_active в users
2. **Важно**: Добавить поле amount в transactions
3. **Желательно**: Удалить неиспользуемые таблицы для упрощения БД
4. **Оптимизация**: Переместить фарминг поля из users в специализированные таблицы