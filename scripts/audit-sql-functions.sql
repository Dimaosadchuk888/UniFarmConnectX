-- Функции для аудита системы UniFarm Connect

-- 1. Получение списка таблиц
CREATE OR REPLACE FUNCTION get_table_list()
RETURNS TABLE(table_name text)
LANGUAGE sql
AS $$
  SELECT tablename::text 
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY tablename;
$$;

-- 2. Проверка целостности балансов
CREATE OR REPLACE FUNCTION check_balance_integrity()
RETURNS TABLE(
  user_id bigint,
  telegram_id bigint,
  balance_uni numeric,
  calculated_uni numeric,
  difference_uni numeric,
  balance_ton numeric,
  calculated_ton numeric,
  difference_ton numeric
)
LANGUAGE sql
AS $$
  WITH user_calculations AS (
    SELECT 
      u.id as user_id,
      u.telegram_id,
      u.balance_uni,
      u.balance_ton,
      COALESCE(SUM(CASE 
        WHEN t.currency = 'UNI' AND t.status = 'completed' 
        THEN CASE 
          WHEN t.type IN ('FARMING_REWARD', 'REFERRAL_REWARD', 'DAILY_BONUS', 'MISSION_REWARD') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FARMING_DEPOSIT') THEN -t.amount
          ELSE 0
        END
        ELSE 0
      END), 0) as calculated_uni,
      COALESCE(SUM(CASE 
        WHEN t.currency = 'TON' AND t.status = 'completed' 
        THEN CASE 
          WHEN t.type IN ('TON_DEPOSIT', 'BOOST_PURCHASE') THEN t.amount_ton
          WHEN t.type = 'WITHDRAWAL' THEN -t.amount
          ELSE 0
        END
        ELSE 0
      END), 0) as calculated_ton
    FROM users u
    LEFT JOIN transactions t ON t.user_id = u.id
    GROUP BY u.id, u.telegram_id, u.balance_uni, u.balance_ton
  )
  SELECT 
    user_id,
    telegram_id,
    balance_uni,
    calculated_uni,
    balance_uni - calculated_uni as difference_uni,
    balance_ton,
    calculated_ton,
    balance_ton - calculated_ton as difference_ton
  FROM user_calculations
  WHERE ABS(balance_uni - calculated_uni) > 0.01 
     OR ABS(balance_ton - calculated_ton) > 0.01;
$$;

-- 3. Поиск дубликатов транзакций
CREATE OR REPLACE FUNCTION find_duplicate_transactions()
RETURNS TABLE(
  tx_hash text,
  duplicate_count bigint,
  user_ids text,
  amounts text,
  created_at_list text
)
LANGUAGE sql
AS $$
  SELECT 
    tx_hash,
    COUNT(*) as duplicate_count,
    STRING_AGG(user_id::text, ', ') as user_ids,
    STRING_AGG(amount::text, ', ') as amounts,
    STRING_AGG(created_at::text, ', ') as created_at_list
  FROM transactions
  WHERE tx_hash IS NOT NULL AND tx_hash != ''
  GROUP BY tx_hash
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC;
$$;

-- 4. Получение индексов таблиц
CREATE OR REPLACE FUNCTION get_table_indexes()
RETURNS TABLE(
  table_name text,
  index_name text,
  column_names text
)
LANGUAGE sql
AS $$
  SELECT 
    tablename::text as table_name,
    indexname::text as index_name,
    indexdef::text as column_names
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname;
$$;

-- 5. Получение размеров таблиц
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name text,
  size_mb text,
  row_count bigint
)
LANGUAGE sql
AS $$
  SELECT 
    relname::text as table_name,
    ROUND(pg_total_relation_size(c.oid)::numeric / 1024 / 1024, 2)::text as size_mb,
    n_live_tup as row_count
  FROM pg_class c
  LEFT JOIN pg_stat_user_tables s ON c.relname = s.relname
  WHERE c.relkind = 'r' 
    AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ORDER BY pg_total_relation_size(c.oid) DESC;
$$;