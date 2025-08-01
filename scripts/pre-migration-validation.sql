-- ============================================
-- Скрипт валидации перед миграцией
-- Проверяет 100% синхронизацию данных
-- Запустите ОБЯЗАТЕЛЬНО перед началом!
-- ============================================

-- ============================================
-- 1. ОБЩАЯ СТАТИСТИКА И КОНТРОЛЬНЫЕ СУММЫ
-- ============================================
\echo '=== ОБЩАЯ СТАТИСТИКА ==='

WITH stats AS (
  SELECT 
    -- Количество записей
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM transactions) as tx_count,
    (SELECT COUNT(*) FROM withdraw_requests) as wr_count,
    (SELECT COUNT(*) FROM uni_farming_data) as ufd_count,
    (SELECT COUNT(*) FROM ton_farming_data) as tfd_count,
    (SELECT COUNT(*) FROM referrals) as ref_count,
    -- Контрольные суммы
    (SELECT SUM(balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) FROM users) as total_balance,
    (SELECT SUM(balance_uni) FROM users) as sum_balance_uni,
    (SELECT SUM(balance_ton) FROM users) as sum_balance_ton,
    (SELECT SUM(uni_farming_balance) FROM users) as sum_farming_uni,
    (SELECT SUM(ton_farming_balance) FROM users) as sum_farming_ton
)
SELECT * FROM stats;

-- ============================================
-- 2. ДЕТАЛЬНАЯ ПРОВЕРКА UNI FARMING
-- ============================================
\echo ''
\echo '=== ПРОВЕРКА UNI FARMING ==='

-- Пользователи с farming в обеих таблицах
WITH uni_check AS (
  SELECT 
    u.id,
    u.telegram_id,
    u.username,
    -- Users таблица
    u.uni_deposit_amount,
    u.uni_farming_balance,
    u.uni_farming_rate,
    u.uni_farming_active,
    -- Farming таблица
    ufd.deposit_amount,
    ufd.farming_balance,
    ufd.farming_rate,
    ufd.is_active,
    -- Статус синхронизации
    CASE
      WHEN ufd.user_id IS NULL THEN 'ONLY_IN_USERS'
      WHEN u.uni_deposit_amount = 0 AND ufd.deposit_amount > 0 THEN 'MISSING_IN_USERS'
      WHEN u.uni_deposit_amount != ufd.deposit_amount THEN 'DEPOSIT_MISMATCH'
      WHEN u.uni_farming_balance != ufd.farming_balance THEN 'BALANCE_MISMATCH'
      WHEN u.uni_farming_rate != ufd.farming_rate THEN 'RATE_MISMATCH'
      WHEN u.uni_farming_active != ufd.is_active THEN 'STATUS_MISMATCH'
      ELSE 'SYNCED'
    END as sync_status
  FROM users u
  FULL OUTER JOIN uni_farming_data ufd ON u.id = ufd.user_id
  WHERE u.uni_deposit_amount > 0 OR ufd.user_id IS NOT NULL
)
SELECT 
  sync_status,
  COUNT(*) as count,
  STRING_AGG(CAST(id AS TEXT), ', ' ORDER BY id) as user_ids
FROM uni_check
GROUP BY sync_status
ORDER BY 
  CASE sync_status
    WHEN 'MISSING_IN_USERS' THEN 1
    WHEN 'DEPOSIT_MISMATCH' THEN 2
    WHEN 'BALANCE_MISMATCH' THEN 3
    WHEN 'SYNCED' THEN 10
    ELSE 5
  END;

-- Детали расхождений
\echo ''
\echo 'Детали расхождений UNI farming:'
SELECT 
  u.id,
  u.telegram_id,
  u.username,
  u.uni_deposit_amount as user_deposit,
  ufd.deposit_amount as farming_deposit,
  u.uni_farming_balance as user_balance,
  ufd.farming_balance as farming_balance
FROM users u
JOIN uni_farming_data ufd ON u.id = ufd.user_id
WHERE u.uni_deposit_amount != ufd.deposit_amount 
   OR u.uni_farming_balance != ufd.farming_balance
ORDER BY u.id
LIMIT 10;

-- ============================================
-- 3. ДЕТАЛЬНАЯ ПРОВЕРКА TON BOOST
-- ============================================
\echo ''
\echo '=== ПРОВЕРКА TON BOOST ==='

WITH ton_check AS (
  SELECT 
    u.id,
    u.telegram_id,
    -- Users таблица
    u.ton_boost_active,
    u.ton_boost_package_id,
    u.ton_boost_rate,
    u.ton_farming_balance,
    -- Farming таблица
    tfd.boost_active,
    tfd.boost_package_id,
    tfd.farming_rate,
    tfd.farming_balance,
    -- Статус
    CASE
      WHEN tfd.user_id IS NULL THEN 'ONLY_IN_USERS'
      WHEN NOT u.ton_boost_active AND tfd.boost_active THEN 'MISSING_IN_USERS'
      WHEN u.ton_boost_active != tfd.boost_active THEN 'STATUS_MISMATCH'
      WHEN u.ton_boost_rate != tfd.farming_rate THEN 'RATE_MISMATCH'
      WHEN u.ton_farming_balance != tfd.farming_balance THEN 'BALANCE_MISMATCH'
      ELSE 'SYNCED'
    END as sync_status
  FROM users u
  FULL OUTER JOIN ton_farming_data tfd ON u.id = CAST(tfd.user_id AS INTEGER)
  WHERE u.ton_boost_active = true OR tfd.user_id IS NOT NULL
)
SELECT 
  sync_status,
  COUNT(*) as count,
  STRING_AGG(CAST(id AS TEXT), ', ' ORDER BY id) as user_ids
FROM ton_check
GROUP BY sync_status;

-- ============================================
-- 4. ПРОВЕРКА WITHDRAW_REQUESTS
-- ============================================
\echo ''
\echo '=== ПРОВЕРКА WITHDRAW_REQUESTS ==='

SELECT 
  COUNT(*) as total_withdrawals,
  SUM(CASE WHEN wr.telegram_id != u.telegram_id THEN 1 ELSE 0 END) as telegram_mismatches,
  SUM(CASE WHEN wr.username != u.username THEN 1 ELSE 0 END) as username_mismatches,
  SUM(CASE WHEN wr.user_id IS NULL THEN 1 ELSE 0 END) as orphaned_withdrawals
FROM withdraw_requests wr
LEFT JOIN users u ON wr.user_id = u.id;

-- Детали расхождений
SELECT 
  wr.id,
  wr.user_id,
  wr.telegram_id as wr_telegram,
  u.telegram_id as user_telegram,
  wr.username as wr_username,
  u.username as user_username,
  wr.status
FROM withdraw_requests wr
JOIN users u ON wr.user_id = u.id
WHERE wr.telegram_id != u.telegram_id 
   OR wr.username != u.username
LIMIT 5;

-- ============================================
-- 5. ПРОВЕРКА ТРАНЗАКЦИЙ
-- ============================================
\echo ''
\echo '=== АНАЛИЗ ФОРМАТОВ ТРАНЗАКЦИЙ ==='

WITH tx_analysis AS (
  SELECT 
    CASE
      WHEN currency IS NOT NULL AND amount IS NOT NULL THEN 'NEW_FORMAT'
      WHEN currency IS NULL AND (amount_uni > 0 OR amount_ton > 0) THEN 'OLD_FORMAT'
      WHEN currency IS NOT NULL AND (amount_uni > 0 OR amount_ton > 0) THEN 'HYBRID_FORMAT'
      ELSE 'UNKNOWN'
    END as format_type,
    COUNT(*) as count,
    SUM(COALESCE(amount, amount_uni + amount_ton)) as total_amount
  FROM transactions
  GROUP BY format_type
)
SELECT * FROM tx_analysis ORDER BY count DESC;

-- Примеры гибридных транзакций
\echo ''
\echo 'Примеры гибридных транзакций:'
SELECT 
  id, user_id, type,
  amount_uni, amount_ton,
  amount, currency,
  created_at
FROM transactions
WHERE currency IS NOT NULL 
  AND (amount_uni > 0 OR amount_ton > 0)
LIMIT 5;

-- ============================================
-- 6. ПРОВЕРКА РЕФЕРАЛЬНОЙ СИСТЕМЫ
-- ============================================
\echo ''
\echo '=== ПРОВЕРКА РЕФЕРАЛЬНОЙ СИСТЕМЫ ==='

WITH referral_check AS (
  SELECT 
    'users.referred_by' as source,
    COUNT(*) as count,
    COUNT(DISTINCT referred_by) as unique_referrers
  FROM users 
  WHERE referred_by IS NOT NULL
  
  UNION ALL
  
  SELECT 
    'referrals table' as source,
    COUNT(*) as count,
    COUNT(DISTINCT inviter_id) as unique_referrers
  FROM referrals
)
SELECT * FROM referral_check;

-- Проверка целостности реферальных цепочек
\echo ''
\echo 'Проверка реферальных цепочек:'
WITH RECURSIVE referral_chain AS (
  -- Начинаем с пользователей без рефереров (корень)
  SELECT 
    id, 
    telegram_id, 
    username,
    referred_by,
    0 as level,
    ARRAY[id] as path
  FROM users
  WHERE referred_by IS NULL
  
  UNION ALL
  
  -- Рекурсивно находим рефералов
  SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.referred_by,
    rc.level + 1,
    rc.path || u.id
  FROM users u
  JOIN referral_chain rc ON u.referred_by = rc.id
  WHERE NOT u.id = ANY(rc.path) -- Защита от циклов
)
SELECT 
  level,
  COUNT(*) as users_at_level
FROM referral_chain
GROUP BY level
ORDER BY level;

-- ============================================
-- 7. ПРОВЕРКА ПОТЕРЯННЫХ ДАННЫХ
-- ============================================
\echo ''
\echo '=== ПРОВЕРКА ПОТЕРЯННЫХ ДАННЫХ ==='

-- Farming данные без пользователей
SELECT 
  'uni_farming без users' as check_type,
  COUNT(*) as count
FROM uni_farming_data ufd
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ufd.user_id)

UNION ALL

SELECT 
  'ton_farming без users' as check_type,
  COUNT(*) as count
FROM ton_farming_data tfd
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = CAST(tfd.user_id AS INTEGER))

UNION ALL

SELECT 
  'transactions без users' as check_type,
  COUNT(*) as count
FROM transactions t
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id)

UNION ALL

SELECT 
  'referrals без users' as check_type,
  COUNT(*) as count
FROM referrals r
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.user_id);

-- ============================================
-- 8. ТОП ПОЛЬЗОВАТЕЛЕЙ ДЛЯ КОНТРОЛЯ
-- ============================================
\echo ''
\echo '=== ТОП-10 ПОЛЬЗОВАТЕЛЕЙ ПО БАЛАНСАМ ==='

SELECT 
  id,
  telegram_id,
  username,
  balance_uni,
  balance_ton,
  uni_farming_balance,
  ton_farming_balance,
  (balance_uni + balance_ton + uni_farming_balance + ton_farming_balance) as total_balance
FROM users
ORDER BY total_balance DESC
LIMIT 10;

-- ============================================
-- 9. ФИНАЛЬНЫЙ ЧЕКЛИСТ
-- ============================================
\echo ''
\echo '=== ФИНАЛЬНЫЙ ЧЕКЛИСТ ==='
\echo 'Проверьте следующее перед миграцией:'
\echo '1. Контрольная сумма балансов: должна быть 112,935,565.07'
\echo '2. Все расхождения в UNI farming должны быть устранены'
\echo '3. Все расхождения в TON boost должны быть устранены'
\echo '4. Не должно быть потерянных данных (orphaned records)'
\echo '5. Сделан полный backup БД'
\echo ''
\echo 'Если все проверки пройдены - можно начинать миграцию!'