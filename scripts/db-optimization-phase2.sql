-- Скрипт оптимизации базы данных UniFarm - Фаза 2
-- Дата: 2025-07-11
-- ВНИМАНИЕ: Выполняйте каждый блок по отдельности и проверяйте результаты!

-- ========================================
-- 1. ОБРАБОТКА ПОЛЕЙ DAILY BONUS
-- ========================================

-- ВАЖНО: Поля checkin_last_date и checkin_streak АКТИВНО используются в модуле dailyBonus!
-- НЕ УДАЛЯТЬ эти поля - они необходимы для работы системы ежедневных бонусов

-- Проверка использования полей
SELECT 
    COUNT(CASE WHEN checkin_last_date IS NOT NULL THEN 1 END) as has_checkin_date,
    COUNT(CASE WHEN checkin_streak > 0 THEN 1 END) as has_streak,
    MAX(checkin_streak) as max_streak
FROM users;

-- Добавление комментариев к полям для документации
COMMENT ON COLUMN users.checkin_last_date IS 'Дата последнего получения ежедневного бонуса';
COMMENT ON COLUMN users.checkin_streak IS 'Текущая серия дней получения бонусов подряд';

-- ========================================
-- 2. АНАЛИЗ ПУСТЫХ ТАБЛИЦ
-- ========================================

-- Проверка количества записей в потенциально пустых таблицах
WITH table_stats AS (
    SELECT 'user_sessions' as table_name, COUNT(*) as row_count FROM user_sessions
    UNION ALL
    SELECT 'referrals', COUNT(*) FROM referrals
    UNION ALL
    SELECT 'farming_sessions', COUNT(*) FROM farming_sessions
    UNION ALL
    SELECT 'boost_purchases', COUNT(*) FROM boost_purchases
    UNION ALL
    SELECT 'user_missions', COUNT(*) FROM user_missions
    UNION ALL
    SELECT 'airdrops', COUNT(*) FROM airdrops
    UNION ALL
    SELECT 'daily_bonus_logs', COUNT(*) FROM daily_bonus_logs
)
SELECT * FROM table_stats ORDER BY row_count DESC;

-- ========================================
-- 3. РЕШЕНИЕ ПО ПУСТЫМ ТАБЛИЦАМ
-- ========================================

-- ВАРИАНТ А: Удаление неиспользуемых таблиц
-- ВНИМАНИЕ: Выполнять только после подтверждения, что таблицы действительно не нужны!

-- DROP TABLE IF EXISTS user_sessions CASCADE;
-- DROP TABLE IF EXISTS referrals CASCADE;
-- DROP TABLE IF EXISTS farming_sessions CASCADE;
-- DROP TABLE IF EXISTS boost_purchases CASCADE;
-- DROP TABLE IF EXISTS user_missions CASCADE;
-- DROP TABLE IF EXISTS airdrops CASCADE;
-- DROP TABLE IF EXISTS daily_bonus_logs CASCADE;

-- ВАРИАНТ Б: Оставить таблицы для будущего использования
-- В этом случае добавим комментарии к таблицам

COMMENT ON TABLE user_sessions IS 'DEPRECATED: Сессии управляются через JWT токены';
COMMENT ON TABLE referrals IS 'DEPRECATED: Реферальные связи хранятся в users.referred_by';
COMMENT ON TABLE farming_sessions IS 'DEPRECATED: История фарминга хранится в транзакциях';
COMMENT ON TABLE boost_purchases IS 'DEPRECATED: Покупки буст-пакетов хранятся в users.ton_boost_package';
COMMENT ON TABLE user_missions IS 'DEPRECATED: Выполнение миссий отслеживается через транзакции';
COMMENT ON TABLE airdrops IS 'NOT IMPLEMENTED: Функция аирдропов не активна';
COMMENT ON TABLE daily_bonus_logs IS 'DEPRECATED: История ежедневных бонусов в транзакциях';

-- ========================================
-- 4. ДОКУМЕНТАЦИЯ ПОЛЯ METADATA
-- ========================================

-- Анализ использования поля metadata
SELECT 
    COUNT(*) as total_transactions,
    COUNT(metadata) as with_metadata,
    COUNT(*) - COUNT(metadata) as without_metadata,
    ROUND(COUNT(metadata)::numeric / COUNT(*) * 100, 2) as metadata_usage_percent
FROM transactions;

-- Примеры использования metadata
SELECT DISTINCT ON (metadata)
    type,
    metadata,
    created_at
FROM transactions
WHERE metadata IS NOT NULL
LIMIT 10;

-- Добавление комментария к полю
COMMENT ON COLUMN transactions.metadata IS 'Дополнительные данные транзакции в формате JSON. Используется редко (<5% транзакций)';

-- ========================================
-- 5. ОПТИМИЗАЦИЯ ИНДЕКСОВ
-- ========================================

-- Проверка существующих индексов
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Добавление индексов для часто используемых запросов

-- Индекс для поиска по telegram_id (часто используется при авторизации)
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Составной индекс для активных фармеров
CREATE INDEX IF NOT EXISTS idx_users_farming_active ON users(uni_farming_active) 
WHERE uni_farming_active = true;

-- Индекс для поиска транзакций по пользователю и типу
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);

-- Индекс для поиска последних транзакций
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Индекс для поиска по реферальному коду
CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);

-- ========================================
-- 6. ПРОВЕРКА РЕЗУЛЬТАТОВ ОПТИМИЗАЦИИ
-- ========================================

-- Финальная структура таблицы users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Статистика по индексам
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexname::regclass) DESC;