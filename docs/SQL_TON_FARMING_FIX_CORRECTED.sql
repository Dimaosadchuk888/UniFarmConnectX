-- SQL для добавления недостающих полей TON farming в таблицу users
-- Исправленная версия без ошибки package_id
-- Дата: 28 июня 2025

-- ===================================================
-- ЧАСТЬ 1: Добавление недостающих полей TON farming
-- ===================================================

-- Добавляем все недостающие поля для TON farming
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_farming_balance DECIMAL(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ton_farming_rate DECIMAL(10,6) DEFAULT 0.001,
ADD COLUMN IF NOT EXISTS ton_farming_start_timestamp TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ton_farming_last_update TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ton_farming_accumulated DECIMAL(20,8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ton_farming_last_claim TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ton_boost_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ton_boost_package_id VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ton_boost_rate DECIMAL(10,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ton_boost_expires_at TIMESTAMP DEFAULT NULL;

-- ===================================================
-- ЧАСТЬ 2: Миграция данных из balance_ton в ton_farming_balance
-- ===================================================

-- Копируем существующие балансы TON в новое поле ton_farming_balance
UPDATE users 
SET ton_farming_balance = COALESCE(balance_ton, 0)
WHERE balance_ton IS NOT NULL AND balance_ton > 0;

-- Активируем TON farming для пользователей с балансом
UPDATE users 
SET 
  ton_farming_start_timestamp = NOW(),
  ton_farming_last_update = NOW()
WHERE ton_farming_balance > 0;

-- ===================================================
-- ЧАСТЬ 3: Активация TON boost для пользователей с активными пакетами
-- ===================================================

-- Активируем TON boost для пользователей у которых есть записи в boost_purchases
-- ИСПРАВЛЕНО: используем boost_type вместо несуществующей колонки package_id
UPDATE users u
SET 
  ton_boost_active = true,
  ton_boost_package_id = bp.boost_type,
  ton_boost_rate = bp.rate,
  ton_boost_expires_at = bp.expires_at
FROM (
  SELECT DISTINCT ON (user_id) 
    user_id, 
    boost_type, 
    rate, 
    expires_at
  FROM boost_purchases
  WHERE status = 'active' 
    AND expires_at > NOW()
  ORDER BY user_id, created_at DESC
) bp
WHERE u.id = bp.user_id;

-- ===================================================
-- ЧАСТЬ 4: Создание индексов для производительности
-- ===================================================

-- Индексы для быстрого поиска активных TON фармеров
CREATE INDEX IF NOT EXISTS idx_users_ton_farming_active 
ON users(ton_farming_balance) 
WHERE ton_farming_balance > 0;

CREATE INDEX IF NOT EXISTS idx_users_ton_boost_active 
ON users(ton_boost_active) 
WHERE ton_boost_active = true;

-- ===================================================
-- ЧАСТЬ 5: Выводим статистику после применения
-- ===================================================

SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN ton_farming_balance > 0 THEN 1 END) as ton_farmers,
  COUNT(CASE WHEN ton_boost_active THEN 1 END) as ton_boost_users,
  SUM(ton_farming_balance) as total_ton_farming_balance,
  AVG(ton_farming_rate) as avg_ton_farming_rate
FROM users;

-- Конец скрипта
-- После применения этого SQL:
-- 1. API сможет корректно возвращать поле ton_farming_balance
-- 2. Frontend перестанет показывать ошибки 
-- 3. TON farming будет работать корректно