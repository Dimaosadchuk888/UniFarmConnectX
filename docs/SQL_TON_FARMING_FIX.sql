-- SQL для исправления критической проблемы с полями TON farming в Supabase
-- Проблема: API возвращает ton_farming_balance, но БД содержит только balance_ton
-- Дата создания: 28 июня 2025

-- ===================================================
-- ЧАСТЬ 1: Добавление недостающих полей TON farming
-- ===================================================

-- 1. Добавляем поле ton_farming_balance если его нет
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_farming_balance DECIMAL(20,8) DEFAULT 0;

-- 2. Добавляем поле ton_farming_rate если его нет
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_farming_rate DECIMAL(10,6) DEFAULT 0.001;

-- 3. Добавляем поле ton_farming_start_timestamp если его нет
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_farming_start_timestamp TIMESTAMP WITH TIME ZONE;

-- 4. Добавляем поле ton_farming_last_update если его нет
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_farming_last_update TIMESTAMP WITH TIME ZONE;

-- 5. Добавляем поле ton_accumulated_rewards если его нет (для накопленных наград)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_accumulated_rewards DECIMAL(20,8) DEFAULT 0;

-- 6. Добавляем поле ton_last_claim если его нет (для последнего клейма)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_last_claim TIMESTAMP WITH TIME ZONE;

-- 7. Добавляем поле ton_boost_active если его нет (флаг активности TON boost)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_boost_active BOOLEAN DEFAULT false;

-- 8. Добавляем поле ton_boost_package_id если его нет (ID активного пакета)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_boost_package_id INTEGER;

-- 9. Добавляем поле ton_boost_rate если его нет (процентная ставка от boost)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_boost_rate DECIMAL(5,3) DEFAULT 0;

-- 10. Добавляем поле ton_boost_expires_at если его нет (срок истечения boost)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS ton_boost_expires_at TIMESTAMP WITH TIME ZONE;

-- ===================================================
-- ЧАСТЬ 2: Миграция данных из старых полей
-- ===================================================

-- Переносим данные из balance_ton в ton_farming_balance
UPDATE users 
SET ton_farming_balance = balance_ton 
WHERE balance_ton IS NOT NULL AND balance_ton > 0 AND ton_farming_balance = 0;

-- Устанавливаем временные метки для активных фармеров
UPDATE users 
SET 
  ton_farming_start_timestamp = COALESCE(ton_farming_start_timestamp, NOW()),
  ton_farming_last_update = COALESCE(ton_farming_last_update, NOW())
WHERE ton_farming_balance > 0 AND ton_farming_start_timestamp IS NULL;

-- ===================================================
-- ЧАСТЬ 3: Активация TON boost для пользователей с активными пакетами
-- ===================================================

-- Активируем TON boost для пользователей у которых есть записи в boost_purchases
UPDATE users u
SET 
  ton_boost_active = true,
  ton_boost_package_id = bp.package_id,
  ton_boost_rate = bp.rate,
  ton_boost_expires_at = bp.expires_at
FROM (
  SELECT DISTINCT ON (user_id) 
    user_id, 
    package_id, 
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

-- Индекс для быстрого поиска активных TON фармеров
CREATE INDEX IF NOT EXISTS idx_users_ton_farming_active 
ON users(id) 
WHERE ton_farming_balance > 0 AND ton_farming_start_timestamp IS NOT NULL;

-- Индекс для быстрого поиска пользователей с активным TON boost
CREATE INDEX IF NOT EXISTS idx_users_ton_boost_active 
ON users(id) 
WHERE ton_boost_active = true AND ton_boost_expires_at > NOW();

-- ===================================================
-- ЧАСТЬ 5: Проверка результатов
-- ===================================================

-- Проверяем количество пользователей с TON farming
SELECT 
  COUNT(*) as total_ton_farmers,
  SUM(ton_farming_balance) as total_ton_deposited,
  COUNT(CASE WHEN ton_boost_active = true THEN 1 END) as active_boosts
FROM users 
WHERE ton_farming_balance > 0;

-- Детальная информация о первых 10 TON фармерах
SELECT 
  id,
  username,
  ton_farming_balance,
  ton_farming_rate,
  ton_farming_start_timestamp,
  ton_boost_active,
  ton_boost_rate,
  ton_boost_package_id
FROM users 
WHERE ton_farming_balance > 0
ORDER BY ton_farming_balance DESC
LIMIT 10;

-- ===================================================
-- ВАЖНО: После выполнения этого SQL:
-- 1. API endpoint /api/v2/ton-farming/info будет корректно работать
-- 2. Frontend получит ожидаемое поле ton_farming_balance
-- 3. TON boost система будет полностью функциональна
-- 4. Все накопленные награды будут корректно рассчитываться
-- ===================================================