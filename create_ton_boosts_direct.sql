-- T65: Создание тестовых TON Boost пакетов для проверки RLS политик
-- Создание тестовых boost пакетов напрямую через SQL

-- Проверяем существующих пользователей
SELECT id, username, telegram_id, balance_ton FROM users WHERE telegram_id >= 20000000001 LIMIT 5;

-- Создаем тестовые boost пакеты для пользователей цепочки
INSERT INTO boost_purchases (
  user_id, 
  boost_id, 
  source, 
  tx_hash, 
  amount, 
  daily_rate, 
  status, 
  is_active, 
  start_date, 
  end_date, 
  total_earned,
  created_at
) VALUES 
-- Boost для chain_user_1 (ID 26)
(26, 'BOOST_STANDARD_30D', 'ton', 'test_tx_hash_26_boost', 10.0, 0.5, 'confirmed', true, NOW(), NOW() + INTERVAL '30 days', 0.0, NOW()),

-- Boost для chain_user_2 (ID 27) 
(27, 'BOOST_PREMIUM_15D', 'ton', 'test_tx_hash_27_boost', 25.0, 1.2, 'confirmed', true, NOW(), NOW() + INTERVAL '15 days', 0.0, NOW()),

-- Boost для final_test_user (ID 4)
(4, 'BOOST_MEGA_7D', 'ton', 'test_tx_hash_4_boost', 50.0, 3.0, 'confirmed', true, NOW(), NOW() + INTERVAL '7 days', 0.0, NOW());

-- Проверяем созданные boost пакеты
SELECT 
  bp.user_id, 
  u.username,
  bp.boost_id, 
  bp.amount, 
  bp.daily_rate, 
  bp.status, 
  bp.is_active,
  bp.start_date,
  bp.end_date
FROM boost_purchases bp
JOIN users u ON bp.user_id = u.id
WHERE bp.status = 'confirmed' AND bp.is_active = true;

-- Проверяем балансы TON пользователей перед началом
SELECT id, username, balance_ton FROM users WHERE id IN (4, 26, 27);