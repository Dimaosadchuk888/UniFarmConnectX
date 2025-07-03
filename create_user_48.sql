-- Создать пользователя ID=48 с правильными данными
INSERT INTO users (
  id, 
  telegram_id, 
  username, 
  first_name, 
  ref_code, 
  balance_uni, 
  balance_ton,
  created_at
) VALUES (
  48,
  88888888,
  'demo_user',
  'Demo User',
  'REF_1750952576614_t938vs',
  '441979.00241',
  '929.013199',
  '2025-06-14T18:29:46.744845'
) ON CONFLICT (id) DO UPDATE SET
  telegram_id = 88888888,
  username = 'demo_user',
  first_name = 'Demo User',
  ref_code = 'REF_1750952576614_t938vs',
  balance_uni = '441979.00241',
  balance_ton = '929.013199';
