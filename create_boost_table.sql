-- T65: Создание тестовых boost пакетов через простую вставку
-- Обход RLS политик boost_purchases

-- Проверяем схему boost_purchases
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'boost_purchases' 
AND table_schema = 'public';

-- Простая вставка без upsert
INSERT INTO boost_purchases (
  user_id, boost_id, source, tx_hash, amount, 
  daily_rate, status, is_active, start_date, end_date
) VALUES 
-- Boost для chain_user_5 (ID 30)
(30, 'BOOST_STANDARD_30D', 'ton', 'test_tx_hash_30', 10.0, 
 0.5, 'confirmed', true, NOW(), NOW() + INTERVAL '30 days'),

-- Boost для chain_user_4 (ID 29) 
(29, 'BOOST_PREMIUM_15D', 'ton', 'test_tx_hash_29', 25.0, 
 1.2, 'confirmed', true, NOW(), NOW() + INTERVAL '15 days'),

-- Boost для final_test_user (ID 4)
(4, 'BOOST_MEGA_7D', 'ton', 'test_tx_hash_4', 50.0, 
 3.0, 'confirmed', true, NOW(), NOW() + INTERVAL '7 days');

-- Проверяем созданные записи
SELECT user_id, boost_id, amount, daily_rate, status, is_active
FROM boost_purchases 
WHERE status = 'confirmed';

-- Проверяем балансы пользователей
SELECT id, username, balance_ton 
FROM users 
WHERE id IN (4, 29, 30);