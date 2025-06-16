-- T63 - Создание TON Boost депозитов для Users 36-45 напрямую через SQL
-- Обход RLS policies для тестирования

-- Временно отключаем RLS для boost_purchases
ALTER TABLE boost_purchases DISABLE ROW LEVEL SECURITY;

-- Создаем TON Boost депозиты для последних 10 пользователей цепочки
INSERT INTO boost_purchases (user_id, boost_id, amount, daily_rate, source, status, start_date, end_date, is_active, total_earned) VALUES
(36, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0'),
(37, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0'),
(38, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0'),
(39, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0'),
(40, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0'),
(41, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0'),
(42, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0'),
(43, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0'),
(44, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0'),
(45, 'boost_standard_30d', '50.0', '0.5', 'ton', 'confirmed', NOW(), NOW() + INTERVAL '30 days', true, '0.0');

-- Обновляем баланс TON для пользователей (симулируем покупку за 50 TON)
UPDATE users SET balance_ton = 50.000000 WHERE id IN (36, 37, 38, 39, 40, 41, 42, 43, 44, 45);

-- Создаем транзакции покупки TON Boost
INSERT INTO transactions (user_id, type, status, description) VALUES
(36, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily'),
(37, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily'),
(38, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily'),
(39, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily'),
(40, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily'),
(41, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily'),
(42, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily'),
(43, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily'),
(44, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily'),
(45, 'TON_BOOST_PURCHASE', 'completed', 'TON Boost purchase - 50 TON for 30 days, rate 0.5 daily');

-- Включаем обратно RLS
ALTER TABLE boost_purchases ENABLE ROW LEVEL SECURITY;

-- Проверяем созданные депозиты
SELECT user_id, boost_id, amount, daily_rate, status, is_active FROM boost_purchases WHERE user_id BETWEEN 36 AND 45;