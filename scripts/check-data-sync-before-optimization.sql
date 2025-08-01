-- ============================================
-- Скрипт проверки синхронизации данных
-- Запустите перед удалением таблиц!
-- ============================================

-- 1. ПРОВЕРКА СИНХРОНИЗАЦИИ UNI FARMING
-- ============================================
WITH uni_comparison AS (
  SELECT 
    u.id,
    u.telegram_id,
    u.username,
    -- Данные из users
    u.uni_deposit_amount as users_deposit,
    u.uni_farming_balance as users_balance,
    u.uni_farming_rate as users_rate,
    u.uni_farming_active as users_active,
    -- Данные из uni_farming_data
    ufd.deposit_amount as farming_deposit,
    ufd.farming_balance as farming_balance,
    ufd.farming_rate as farming_rate,
    ufd.is_active as farming_active,
    -- Сравнение
    CASE 
      WHEN u.uni_deposit_amount != COALESCE(ufd.deposit_amount, 0) THEN 'DEPOSIT_MISMATCH'
      WHEN u.uni_farming_balance != COALESCE(ufd.farming_balance, 0) THEN 'BALANCE_MISMATCH'
      WHEN u.uni_farming_rate != COALESCE(ufd.farming_rate, 0.01) THEN 'RATE_MISMATCH'
      WHEN u.uni_farming_active != COALESCE(ufd.is_active, false) THEN 'STATUS_MISMATCH'
      ELSE 'SYNCED'
    END as sync_status
  FROM users u
  LEFT JOIN uni_farming_data ufd ON u.id = ufd.user_id
  WHERE u.uni_deposit_amount > 0 OR ufd.user_id IS NOT NULL
)
SELECT 
  sync_status,
  COUNT(*) as count,
  STRING_AGG(CAST(id AS TEXT), ', ') as user_ids
FROM uni_comparison
GROUP BY sync_status;

-- 2. ПРОВЕРКА СИНХРОНИЗАЦИИ TON BOOST
-- ============================================
WITH ton_comparison AS (
  SELECT 
    u.id,
    u.telegram_id,
    -- Данные из users
    u.ton_boost_active as users_active,
    u.ton_boost_package_id as users_package,
    u.ton_boost_rate as users_rate,
    u.ton_farming_balance as users_balance,
    -- Данные из ton_farming_data
    tfd.boost_active as farming_active,
    tfd.boost_package_id as farming_package,
    tfd.farming_rate as farming_rate,
    tfd.farming_balance as farming_balance,
    -- Сравнение
    CASE 
      WHEN u.ton_boost_active != COALESCE(tfd.boost_active, false) THEN 'STATUS_MISMATCH'
      WHEN u.ton_boost_rate != COALESCE(tfd.farming_rate, 0) THEN 'RATE_MISMATCH'
      ELSE 'SYNCED'
    END as sync_status
  FROM users u
  LEFT JOIN ton_farming_data tfd ON u.id = CAST(tfd.user_id AS INTEGER)
  WHERE u.ton_boost_active = true OR tfd.user_id IS NOT NULL
)
SELECT 
  sync_status,
  COUNT(*) as count,
  STRING_AGG(CAST(id AS TEXT), ', ') as user_ids
FROM ton_comparison
GROUP BY sync_status;

-- 3. ПРОВЕРКА ДУБЛИРОВАНИЯ В WITHDRAW_REQUESTS
-- ============================================
SELECT 
  'withdraw_requests_sync' as check_type,
  COUNT(*) as total_records,
  SUM(CASE WHEN wr.telegram_id != u.telegram_id THEN 1 ELSE 0 END) as telegram_id_mismatches,
  SUM(CASE WHEN wr.username != u.username THEN 1 ELSE 0 END) as username_mismatches
FROM withdraw_requests wr
JOIN users u ON wr.user_id = u.id;

-- 4. АНАЛИЗ РЕФЕРАЛЬНОЙ СИСТЕМЫ
-- ============================================
WITH referral_analysis AS (
  SELECT 
    'users_referred_by' as source,
    COUNT(*) as count
  FROM users 
  WHERE referred_by IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'referrals_table' as source,
    COUNT(*) as count
  FROM referrals
)
SELECT * FROM referral_analysis;

-- 5. ПРОВЕРКА ГИБРИДНОЙ СТРУКТУРЫ TRANSACTIONS
-- ============================================
SELECT 
  'transactions_format' as check_type,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN currency IS NOT NULL AND amount IS NOT NULL THEN 1 ELSE 0 END) as new_format_count,
  SUM(CASE WHEN (amount_uni > 0 OR amount_ton > 0) AND currency IS NULL THEN 1 ELSE 0 END) as old_format_count,
  SUM(CASE WHEN currency IS NOT NULL AND (amount_uni > 0 OR amount_ton > 0) THEN 1 ELSE 0 END) as hybrid_format_count
FROM transactions
WHERE created_at > NOW() - INTERVAL '30 days';

-- 6. ПОИСК ПОТЕРЯННЫХ ДАННЫХ
-- ============================================
-- Пользователи в farming таблицах, но не в users
SELECT 
  'orphaned_uni_farming' as issue,
  ufd.user_id,
  ufd.deposit_amount,
  ufd.farming_balance
FROM uni_farming_data ufd
LEFT JOIN users u ON u.id = ufd.user_id
WHERE u.id IS NULL;

-- 7. СТАТИСТИКА ПО ТАБЛИЦАМ
-- ============================================
WITH table_stats AS (
  SELECT 'users' as table_name, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'transactions', COUNT(*) FROM transactions
  UNION ALL
  SELECT 'withdraw_requests', COUNT(*) FROM withdraw_requests
  UNION ALL
  SELECT 'uni_farming_data', COUNT(*) FROM uni_farming_data
  UNION ALL
  SELECT 'ton_farming_data', COUNT(*) FROM ton_farming_data
  UNION ALL
  SELECT 'referrals', COUNT(*) FROM referrals
  UNION ALL
  SELECT 'missions', COUNT(*) FROM missions
)
SELECT * FROM table_stats ORDER BY count DESC;

-- ============================================
-- РЕКОМЕНДАЦИИ НА ОСНОВЕ РЕЗУЛЬТАТОВ:
-- 
-- 1. Если все sync_status = 'SYNCED' - можно удалять farming таблицы
-- 2. Если есть MISMATCH - сначала синхронизировать данные
-- 3. Если telegram_id_mismatches = 0 - можно удалять поля из withdraw_requests
-- 4. Если new_format_count > 0 - система уже использует новый формат transactions
-- ============================================