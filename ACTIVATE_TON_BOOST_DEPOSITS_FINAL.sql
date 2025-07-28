-- 🔧 ФИНАЛЬНАЯ ВЕРСИЯ: SQL-запрос для активации TON Boost депозитов по 2 TON
-- для пользователей 251 и 255 с исправлением всех ошибок типов данных

-- ========================================
-- ТАБЛИЦА 1: ОБНОВЛЕНИЕ users 
-- ========================================

UPDATE users 
SET 
  ton_boost_package = 1,                    -- ID пакета "Starter Boost" 
  ton_boost_rate = 0.03,                    -- Дневная ставка 3%
  ton_boost_active = true                   -- ⭐ КРИТИЧНО: активация для планировщика
WHERE id IN (251, 255);

-- ========================================
-- ТАБЛИЦА 2: СОЗДАНИЕ/ОБНОВЛЕНИЕ ton_farming_data
-- ========================================

INSERT INTO ton_farming_data (
  user_id,
  boost_active,
  boost_package_id,
  farming_rate,
  farming_balance,
  boost_expires_at,
  farming_start_timestamp,
  farming_last_update,
  created_at,
  updated_at
) VALUES 
-- Пользователь 251
(
  '251',                                    -- user_id как STRING
  true,                                     -- boost_active
  1,                                        -- boost_package_id
  '0.03',                                   -- farming_rate
  '2.0',                                    -- farming_balance (2 TON депозит)
  NOW() + INTERVAL '30 days',               -- boost_expires_at
  NOW(),                                    -- farming_start_timestamp
  NOW(),                                    -- farming_last_update
  NOW(),                                    -- created_at
  NOW()                                     -- updated_at
),
-- Пользователь 255
(
  '255',                                    -- user_id как STRING
  true,                                     -- boost_active
  1,                                        -- boost_package_id
  '0.03',                                   -- farming_rate  
  '2.0',                                    -- farming_balance (2 TON депозит)
  NOW() + INTERVAL '30 days',               -- boost_expires_at
  NOW(),                                    -- farming_start_timestamp
  NOW(),                                    -- farming_last_update
  NOW(),                                    -- created_at
  NOW()                                     -- updated_at
)
ON CONFLICT (user_id) 
DO UPDATE SET
  boost_active = true,
  boost_package_id = 1,
  farming_rate = '0.03',
  farming_balance = (
    COALESCE(CAST(ton_farming_data.farming_balance AS NUMERIC), 0) + 
    CAST(EXCLUDED.farming_balance AS NUMERIC)
  )::TEXT,
  boost_expires_at = EXCLUDED.boost_expires_at,
  farming_start_timestamp = COALESCE(ton_farming_data.farming_start_timestamp, EXCLUDED.farming_start_timestamp),
  farming_last_update = EXCLUDED.farming_last_update,
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- ТАБЛИЦА 3: СОЗДАНИЕ ЗАПИСИ ТРАНЗАКЦИИ
-- ========================================

INSERT INTO transactions (
  user_id,
  type,
  amount,
  amount_uni,
  amount_ton,
  currency,
  status,
  description,
  metadata,
  created_at
) VALUES 
-- Депозит для пользователя 251
(
  251,                                      -- user_id как INTEGER 
  'BOOST_PURCHASE',                         -- type
  '2.0',                                    -- amount
  '0',                                      -- amount_uni
  '2.0',                                    -- amount_ton
  'TON',                                    -- currency
  'completed',                              -- status
  'TON Boost депозит активирован (компенсация)',  -- description
  jsonb_build_object(
    'transaction_type', 'manual_activation',
    'compensation', true,
    'boost_package_id', 1,
    'activation_date', NOW()::text
  ),                                        -- metadata
  NOW()                                     -- created_at
),
-- Депозит для пользователя 255
(
  255,                                      -- user_id как INTEGER
  'BOOST_PURCHASE',                         -- type
  '2.0',                                    -- amount
  '0',                                      -- amount_uni
  '2.0',                                    -- amount_ton
  'TON',                                    -- currency
  'completed',                              -- status
  'TON Boost депозит активирован (компенсация)',  -- description
  jsonb_build_object(
    'transaction_type', 'manual_activation',
    'compensation', true,
    'boost_package_id', 1,
    'activation_date', NOW()::text
  ),                                        -- metadata
  NOW()                                     -- created_at
);

-- ========================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- ========================================

-- Проверяем активацию в таблице users
SELECT 
  id, 
  username, 
  ton_boost_package, 
  ton_boost_rate, 
  ton_boost_active,
  'users table updated' as status
FROM users 
WHERE id IN (251, 255);

-- Проверяем записи фарминга
SELECT 
  user_id, 
  boost_active, 
  boost_package_id, 
  farming_rate, 
  farming_balance, 
  boost_expires_at,
  'ton_farming_data created/updated' as status
FROM ton_farming_data 
WHERE user_id IN ('251', '255');

-- Проверяем созданные транзакции
SELECT 
  id, 
  user_id, 
  type, 
  amount_ton, 
  description, 
  created_at,
  'transaction history added' as status
FROM transactions 
WHERE user_id IN (251, 255) 
  AND description LIKE '%компенсация%'
ORDER BY created_at DESC;

-- Общая сводка активации
SELECT 
  'АКТИВАЦИЯ ЗАВЕРШЕНА' as message,
  'Пользователи 251 и 255 готовы к получению дохода от планировщика' as result;