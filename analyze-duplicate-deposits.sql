-- Анализ проблемы двойного начисления за депозиты
-- Поиск дублирующихся транзакций и потенциальных источников дублирования

-- 1. ПОИСК ДУБЛИРУЮЩИХСЯ ДЕПОЗИТОВ ПО ВРЕМЕНИ И СУММЕ
WITH duplicate_deposits AS (
  SELECT 
    user_id,
    type,
    COALESCE(amount_uni::numeric, amount_ton::numeric, amount::numeric) as amount,
    DATE_TRUNC('minute', created_at) as minute_group,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as transaction_ids,
    array_agg(created_at ORDER BY created_at) as timestamps
  FROM transactions 
  WHERE 
    type IN ('FARMING_DEPOSIT', 'BOOST_PURCHASE', 'DEPOSIT')
    AND status = 'completed'
    AND created_at >= NOW() - INTERVAL '7 days'
  GROUP BY user_id, type, COALESCE(amount_uni::numeric, amount_ton::numeric, amount::numeric), DATE_TRUNC('minute', created_at)
  HAVING COUNT(*) > 1
)
SELECT 
  'DUPLICATE_DEPOSITS' as issue_type,
  user_id,
  type,
  amount,
  duplicate_count,
  transaction_ids,
  timestamps
FROM duplicate_deposits
ORDER BY duplicate_count DESC, user_id;

-- 2. ПОИСК СЛИШКОМ ЧАСТЫХ АВТОМАТИЧЕСКИХ НАЧИСЛЕНИЙ (FARMING_REWARD)
WITH frequent_rewards AS (
  SELECT 
    user_id,
    id,
    created_at,
    COALESCE(amount_uni::numeric, amount_ton::numeric, amount::numeric) as amount,
    LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) as prev_created_at,
    EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at))) as seconds_gap
  FROM transactions 
  WHERE 
    type = 'FARMING_REWARD'
    AND status = 'completed'
    AND created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY user_id, created_at DESC
)
SELECT 
  'FREQUENT_REWARDS' as issue_type,
  user_id,
  id as transaction_id,
  amount,
  created_at,
  seconds_gap
FROM frequent_rewards 
WHERE seconds_gap < 240 -- Менее 4 минут между начислениями
ORDER BY user_id, created_at DESC;

-- 3. ПОИСК ДУБЛИРУЮЩИХСЯ TX_HASH (для TON депозитов)
WITH duplicate_hashes AS (
  SELECT 
    COALESCE(
      (metadata->>'tx_hash')::text,
      (metadata->>'original_tx_hash')::text,
      description
    ) as hash_value,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as transaction_ids,
    array_agg(user_id) as user_ids,
    array_agg(created_at ORDER BY created_at) as timestamps
  FROM transactions 
  WHERE 
    type IN ('DEPOSIT', 'TON_DEPOSIT')
    AND status = 'completed'
    AND created_at >= NOW() - INTERVAL '7 days'
    AND (
      (metadata->>'tx_hash') IS NOT NULL 
      OR (metadata->>'original_tx_hash') IS NOT NULL
      OR description LIKE '%blockchain:%'
    )
  GROUP BY COALESCE(
    (metadata->>'tx_hash')::text,
    (metadata->>'original_tx_hash')::text,
    description
  )
  HAVING COUNT(*) > 1
)
SELECT 
  'DUPLICATE_HASHES' as issue_type,
  hash_value,
  duplicate_count,
  transaction_ids,
  user_ids,
  timestamps
FROM duplicate_hashes
ORDER BY duplicate_count DESC;

-- 4. АНАЛИЗ КОНКРЕТНОГО ПОЛЬЗОВАТЕЛЯ 184 (из WebSocket логов)
SELECT 
  'USER_184_ANALYSIS' as analysis_type,
  id,
  type,
  COALESCE(amount_uni::numeric, amount_ton::numeric, amount::numeric) as amount,
  currency,
  status,
  description,
  created_at,
  LAG(created_at) OVER (ORDER BY created_at) as prev_transaction_time,
  EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) as seconds_since_prev
FROM transactions 
WHERE 
  user_id = 184
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 5. СТАТИСТИКА ПО ТИПАМ ТРАНЗАКЦИЙ ЗА ПОСЛЕДНИЕ 24 ЧАСА
SELECT 
  'TRANSACTION_STATS' as analysis_type,
  type,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(COALESCE(amount_uni::numeric, 0)) as total_uni,
  SUM(COALESCE(amount_ton::numeric, 0)) as total_ton,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM transactions 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY transaction_count DESC;