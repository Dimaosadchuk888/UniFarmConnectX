-- T73 ЭТАП 3: ПОДТВЕРЖДЕННОЕ УДАЛЕНИЕ ПУСТЫХ ТАБЛИЦ
-- Выполнить в Supabase SQL Editor
-- Все таблицы проверены и подтверждены как пустые (0 записей)

-- ===================================================
-- БЕЗОПАСНОЕ УДАЛЕНИЕ 6 ПУСТЫХ ТАБЛИЦ
-- ===================================================

-- 1. user_balances (дублирует users.balance_uni/balance_ton)
DROP TABLE IF EXISTS public.user_balances CASCADE;

-- 2. referrals (заменена users.referred_by)
DROP TABLE IF EXISTS public.referrals CASCADE;

-- 3. referral_earnings (заменена transactions REFERRAL_REWARD)
DROP TABLE IF EXISTS public.referral_earnings CASCADE;

-- 4. farming_sessions (интегрирована в users.uni_farming_*)
DROP TABLE IF EXISTS public.farming_sessions CASCADE;

-- 5. farming_deposits (заменена users.uni_deposit_amount)
DROP TABLE IF EXISTS public.farming_deposits CASCADE;

-- 6. user_sessions (заменена JWT токенами)
DROP TABLE IF EXISTS public.user_sessions CASCADE;

-- ===================================================
-- ЭТАП 4: УДАЛЕНИЕ ДУБЛИРУЮЩИХ ПОЛЕЙ WALLET
-- ===================================================

-- Удаление дублирующих балансов из wallet (100% синхронизированы с users)
ALTER TABLE public.wallet DROP COLUMN IF EXISTS uni_balance;
ALTER TABLE public.wallet DROP COLUMN IF EXISTS ton_balance;

-- ===================================================
-- ЭТАП 5: УДАЛЕНИЕ ПУСТЫХ ПОЛЕЙ USERS (100% пустые)
-- ===================================================

-- Удаление полностью пустых полей users таблицы
ALTER TABLE public.users DROP COLUMN IF EXISTS ton_wallet_address;
ALTER TABLE public.users DROP COLUMN IF EXISTS parent_ref_code;  
ALTER TABLE public.users DROP COLUMN IF EXISTS uni_farming_activated_at;

-- ПРИМЕЧАНИЕ: uni_farming_deposit НЕ удаляется (содержит 33 записи с данными)

-- ===================================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ===================================================

-- Список оставшихся таблиц
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Подсчет записей в основных таблицах
SELECT 
  'users' as table_name,
  count(*) as record_count
FROM users
UNION ALL
SELECT 
  'transactions' as table_name,
  count(*) as record_count  
FROM transactions
UNION ALL
SELECT 
  'wallet' as table_name,
  count(*) as record_count
FROM wallet;