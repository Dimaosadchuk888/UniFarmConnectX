-- Безопасное добавление индексов для UniFarm Connect
-- Используем IF NOT EXISTS для предотвращения ошибок при повторном запуске
-- Дата: 2025-08-02

-- =====================================================
-- ТАБЛИЦА: users
-- =====================================================

-- Индекс для поиска по telegram_id (часто используется при авторизации)
CREATE INDEX IF NOT EXISTS idx_users_telegram_id 
ON users(telegram_id);

-- Индекс для фильтрации активных фармеров
CREATE INDEX IF NOT EXISTS idx_users_farming_status 
ON users(uni_farming_active, uni_deposit_amount) 
WHERE uni_farming_active = true;

-- Индекс для TON фармеров
CREATE INDEX IF NOT EXISTS idx_users_ton_farming 
ON users(ton_farming_balance) 
WHERE ton_farming_balance > 0;

-- Составной индекс для балансов (для отчетов)
CREATE INDEX IF NOT EXISTS idx_users_balances 
ON users(balance_uni, balance_ton);

-- =====================================================
-- ТАБЛИЦА: transactions  
-- =====================================================

-- Основной индекс по user_id и времени (самый важный!)
CREATE INDEX IF NOT EXISTS idx_transactions_user_created 
ON transactions(user_id, created_at DESC);

-- Индекс для поиска по типу и статусу
CREATE INDEX IF NOT EXISTS idx_transactions_type_status 
ON transactions(type, status, currency);

-- Индекс для поиска по хешу (для проверки дубликатов)
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash 
ON transactions(tx_hash) 
WHERE tx_hash IS NOT NULL;

-- Индекс для farming rewards (для расчета реферальных)
CREATE INDEX IF NOT EXISTS idx_transactions_farming_rewards 
ON transactions(user_id, type, created_at DESC) 
WHERE type = 'FARMING_REWARD' AND status = 'completed';

-- =====================================================
-- ТАБЛИЦА: referrals
-- =====================================================

-- Индекс для поиска рефералов пользователя
CREATE INDEX IF NOT EXISTS idx_referrals_referrer 
ON referrals(referrer_id);

-- Индекс для обратного поиска (кто привел пользователя)
CREATE INDEX IF NOT EXISTS idx_referrals_user 
ON referrals(user_id);

-- Составной индекс для уровней
CREATE INDEX IF NOT EXISTS idx_referrals_level 
ON referrals(referrer_id, level);

-- =====================================================
-- ТАБЛИЦА: ton_boost_purchases
-- =====================================================

-- Индекс по user_id для быстрого получения всех покупок пользователя
CREATE INDEX IF NOT EXISTS idx_ton_boost_purchases_user 
ON ton_boost_purchases(user_id, created_at DESC);

-- Индекс для активных пакетов
CREATE INDEX IF NOT EXISTS idx_ton_boost_purchases_active 
ON ton_boost_purchases(status, user_id) 
WHERE status = 'active';

-- Индекс по package_id для статистики
CREATE INDEX IF NOT EXISTS idx_ton_boost_purchases_package 
ON ton_boost_purchases(package_id, status);

-- =====================================================
-- АНАЛИЗ ТАБЛИЦ ПОСЛЕ СОЗДАНИЯ ИНДЕКСОВ
-- =====================================================

-- Обновляем статистику для оптимизатора запросов
ANALYZE users;
ANALYZE transactions;
ANALYZE referrals;
ANALYZE ton_boost_purchases;

-- =====================================================
-- ПРОВЕРКА СОЗДАННЫХ ИНДЕКСОВ
-- =====================================================

-- Запрос для просмотра всех индексов
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'transactions', 'referrals', 'ton_boost_purchases')
ORDER BY tablename, indexname;