-- 🔧 SQL-запрос для активации TON Boost депозитов по 2 TON для пользователей 251 и 255
-- ИСПРАВЛЕННАЯ ВЕРСИЯ - без несуществующих столбцов

-- ========================================
-- ТАБЛИЦА 1: ОБНОВЛЕНИЕ users 
-- ========================================
-- Активируем TON Boost для планировщика дохода

UPDATE users 
SET 
  ton_boost_package = 1,                    -- ID пакета "Starter Boost" 
  ton_boost_rate = 0.03,                    -- Дневная ставка 3%
  ton_boost_active = true                   -- ⭐ КРИТИЧНО: активация для планировщика
WHERE id IN (251, 255);

-- ========================================
-- ТАБЛИЦА 2: СОЗДАНИЕ/ОБНОВЛЕНИЕ ton_farming_data
-- ========================================
-- Создаем записи фарминга с депозитами 2 TON

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
  '251',                                    -- user_id как STRING (важно!)
  true,                                     -- boost_active
  1,                                        -- boost_package_id (Starter Boost)
  '0.03',                                   -- farming_rate (3% дневная ставка)
  '2.0',                                    -- farming_balance (2 TON депозит)
  NOW() + INTERVAL '30 days',               -- boost_expires_at (30 дней)
  NOW(),                                    -- farming_start_timestamp
  NOW(),                                    -- farming_last_update
  NOW(),                                    -- created_at
  NOW()                                     -- updated_at
),
-- Пользователь 255
(
  '255',                                    -- user_id как STRING (важно!)
  true,                                     -- boost_active
  1,                                        -- boost_package_id (Starter Boost)
  '0.03',                                   -- farming_rate (3% дневная ставка)  
  '2.0',                                    -- farming_balance (2 TON депозит)
  NOW() + INTERVAL '30 days',               -- boost_expires_at (30 дней)
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
  farming_balance = CASE 
    WHEN EXCLUDED.farming_balance IS NOT NULL 
    THEN (COALESCE(CAST(ton_farming_data.farming_balance AS NUMERIC), 0) + CAST(EXCLUDED.farming_balance AS NUMERIC))::TEXT
    ELSE ton_farming_data.farming_balance
  END,
  boost_expires_at = EXCLUDED.boost_expires_at,
  farming_start_timestamp = CASE 
    WHEN ton_farming_data.farming_start_timestamp IS NULL 
    THEN EXCLUDED.farming_start_timestamp 
    ELSE ton_farming_data.farming_start_timestamp 
  END,
  farming_last_update = EXCLUDED.farming_last_update,
  updated_at = EXCLUDED.updated_at;

-- ========================================
-- ТАБЛИЦА 3: СОЗДАНИЕ ЗАПИСИ ТРАНЗАКЦИИ
-- ========================================
-- Создаем транзакции депозитов для истории

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
  'BOOST_PURCHASE',                         -- type (соответствует TransactionsTransactionType)
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
  'BOOST_PURCHASE',                         -- type (соответствует TransactionsTransactionType)
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

-- Проверяем статус в таблице users
SELECT id, username, ton_boost_package, ton_boost_rate, ton_boost_active
FROM users 
WHERE id IN (251, 255);

-- Проверяем записи в ton_farming_data
SELECT user_id, boost_active, boost_package_id, farming_rate, farming_balance, boost_expires_at
FROM ton_farming_data 
WHERE user_id IN ('251', '255');

-- Проверяем созданные транзакции
SELECT id, user_id, type, amount_ton, description, created_at
FROM transactions 
WHERE user_id IN (251, 255) 
  AND description LIKE '%компенсация%'
ORDER BY created_at DESC;

-- ========================================
-- КОММЕНТАРИИ К ЛОГИКЕ
-- ========================================

/*
ИСПРАВЛЕНИЯ:
- Удален несуществующий столбец updated_at из UPDATE users
- Удален несуществующий столбец updated_at из INSERT transactions

АРХИТЕКТУРНАЯ ЛОГИКА:

1. ТАБЛИЦА users:
   - ton_boost_package: ID пакета для планировщика доходов
   - ton_boost_rate: Дневная ставка для расчета доходов  
   - ton_boost_active: КРИТИЧНО - флаг для планировщика

2. ТАБЛИЦА ton_farming_data:
   - user_id как STRING (важно для совместимости)
   - farming_balance: Сумма депозита для фарминга
   - boost_active: Активность буста
   - Накопительная логика при конфликтах

3. ТАБЛИЦА transactions:
   - Создает записи для истории транзакций
   - Тип BOOST_PURCHASE для корректного отображения
   - Метаданные с информацией о компенсации

ПЛАНИРОВЩИК ДОХОДОВ:
Будет искать пользователей с:
- ton_boost_active = true (users)
- boost_active = true (ton_farming_data)
- farming_balance > 0 (ton_farming_data)

ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
- Пользователи 251 и 255 начнут получать доходы от планировщика
- Депозиты 2 TON будут корректно учитываться в системе
- Транзакции появятся в истории операций
*/