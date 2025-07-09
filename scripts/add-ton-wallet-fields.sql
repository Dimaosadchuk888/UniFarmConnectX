-- Скрипт для добавления полей TON-кошелька в таблицу users
-- Дата: 09.07.2025
-- Цель: Синхронизация структуры БД с бизнес-логикой TON Boost

-- Добавляем недостающие поля для TON-кошелька
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ton_wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS ton_wallet_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ton_wallet_linked_at TIMESTAMP;

-- Добавляем индекс для быстрого поиска по адресу кошелька
CREATE INDEX IF NOT EXISTS idx_users_ton_wallet_address 
  ON users(ton_wallet_address) 
  WHERE ton_wallet_address IS NOT NULL;

-- Проверяем результат
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN ('ton_wallet_address', 'ton_wallet_verified', 'ton_wallet_linked_at')
ORDER BY ordinal_position;