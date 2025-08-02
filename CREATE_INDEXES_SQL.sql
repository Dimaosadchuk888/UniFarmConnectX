-- Индексы для оптимизации производительности
-- Выполнить в Supabase SQL Editor

-- 1. Индекс для поиска по telegram_id (самый частый запрос)
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- 2. Индекс для активных фармеров UNI
CREATE INDEX IF NOT EXISTS idx_users_uni_farming_active ON users(uni_farming_active) 
WHERE uni_farming_active = true;

-- 3. Индекс для пользователей с TON Boost
CREATE INDEX IF NOT EXISTS idx_users_ton_boost_package ON users(ton_boost_package) 
WHERE ton_boost_package > 0;

-- 4. Составной индекс для referral системы
CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referred_by, created_at);

-- 5. Индекс для TON wallet проверок
CREATE INDEX IF NOT EXISTS idx_users_ton_wallet ON users(ton_wallet_address) 
WHERE ton_wallet_address IS NOT NULL;

-- 6. Индекс для админских запросов
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin) 
WHERE is_admin = true;

-- Проверка созданных индексов
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename = 'users' 
AND schemaname = 'public'
ORDER BY indexname;