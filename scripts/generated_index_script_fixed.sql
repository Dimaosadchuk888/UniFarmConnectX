-- Скрипт создания индексов (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- Сгенерирован: 2025-08-01
-- ВАЖНО: Выполняйте каждую команду отдельно, НЕ в транзакции!

-- 1. Поиск по telegram_id очень частый
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_telegram_id
ON users (telegram_id);

-- 2. История транзакций пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_id__created_at_desc
ON transactions (user_id, created_at DESC);

-- 3. Фильтрация по балансам
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_balance_uni__balance_ton
ON users (balance_uni, balance_ton)
WHERE balance_uni > 0 OR balance_ton > 0;

-- 4. Поиск активных фермеров
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_uni_farming_active
ON users (uni_farming_active)
WHERE uni_farming_active = true;

-- 5. Реферальные запросы
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_referred_by
ON users (referred_by)
WHERE referred_by IS NOT NULL;

-- 6. Фильтрация по типу транзакции
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type
ON transactions (type);

-- 7. Поиск pending выводов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdraw_requests_status
ON withdraw_requests (status)
WHERE status = 'pending';

-- 8. Выводы пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdraw_requests_user_id
ON withdraw_requests (user_id);

-- После создания всех индексов обновите статистику
ANALYZE users;
ANALYZE transactions;
ANALYZE withdraw_requests;