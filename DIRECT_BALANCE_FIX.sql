-- ПРЯМОЕ ИСПРАВЛЕНИЕ БАЛАНСОВ USER 251 И 255
-- Простое добавление +2 TON к текущим балансам

-- Проверяем текущие балансы ДО изменений
SELECT 
  'БАЛАНСЫ ДО ИЗМЕНЕНИЙ:' as info,
  id, 
  username, 
  balance_ton as current_ton
FROM users 
WHERE id IN (251, 255);

-- НАПРЯМУЮ ДОБАВЛЯЕМ 2 TON К КАЖДОМУ
UPDATE users SET balance_ton = balance_ton + 2.000000 WHERE id = 251;
UPDATE users SET balance_ton = balance_ton + 2.000000 WHERE id = 255;

-- Проверяем результат ПОСЛЕ изменений  
SELECT 
  'БАЛАНСЫ ПОСЛЕ ИЗМЕНЕНИЙ:' as info,
  id, 
  username, 
  balance_ton as new_ton_balance,
  '+2 TON добавлено' as note
FROM users 
WHERE id IN (251, 255);