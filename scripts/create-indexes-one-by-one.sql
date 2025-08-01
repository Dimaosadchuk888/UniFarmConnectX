-- ВЫПОЛНИТЕ КАЖДУЮ КОМАНДУ ОТДЕЛЬНО!
-- В Supabase SQL Editor выделяйте и запускайте по одной команде

-- 1. Выделите эту команду и нажмите Run:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);

-- 2. После завершения, выделите эту и нажмите Run:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_id__created_at_desc ON transactions (user_id, created_at DESC);

-- 3. Продолжайте по одной:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_balance_uni__balance_ton ON users (balance_uni, balance_ton) WHERE balance_uni > 0 OR balance_ton > 0;

-- 4.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_uni_farming_active ON users (uni_farming_active) WHERE uni_farming_active = true;

-- 5.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_referred_by ON users (referred_by) WHERE referred_by IS NOT NULL;

-- 6.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type ON transactions (type);

-- 7.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdraw_requests_status ON withdraw_requests (status) WHERE status = 'pending';

-- 8.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_withdraw_requests_user_id ON withdraw_requests (user_id);

-- После всех индексов:
ANALYZE users;
ANALYZE transactions;
ANALYZE withdraw_requests;