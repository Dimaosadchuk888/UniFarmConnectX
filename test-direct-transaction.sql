-- Создаем тестовую транзакцию напрямую для проверки
INSERT INTO transactions (
  user_id,
  type,
  amount_uni,
  amount_ton,
  status,
  currency,
  description,
  source,
  created_at
) VALUES (
  48,
  'DEPOSIT',
  '20',
  '0',
  'completed',
  'UNI',
  'Direct test UNI deposit',
  'farming',
  NOW()
) RETURNING *;

-- Проверяем все транзакции пользователя 48
SELECT * FROM transactions 
WHERE user_id = 48 
ORDER BY created_at DESC;