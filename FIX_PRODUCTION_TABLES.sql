-- Добавляем недостающие поля в uni_farming_data
ALTER TABLE uni_farming_data 
ADD COLUMN IF NOT EXISTS farming_rate NUMERIC(10,6) DEFAULT 0.01,
ADD COLUMN IF NOT EXISTS farming_start_timestamp TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS farming_last_update TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS farming_deposit NUMERIC(20,9) DEFAULT 0;

-- Добавляем недостающие поля в ton_farming_data
ALTER TABLE ton_farming_data
ADD COLUMN IF NOT EXISTS farming_rate NUMERIC(10,6) DEFAULT 0.01,
ADD COLUMN IF NOT EXISTS farming_start_timestamp TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS farming_last_update TIMESTAMPTZ DEFAULT NOW();

-- Обновляем существующие записи в uni_farming_data
UPDATE uni_farming_data
SET 
  farming_rate = 0.01,
  farming_start_timestamp = farming_start,
  farming_last_update = updated_at,
  farming_deposit = deposit_amount
WHERE farming_rate IS NULL;

-- Обновляем существующие записи в ton_farming_data  
UPDATE ton_farming_data
SET
  farming_rate = CASE 
    WHEN boost_package_id = 1 THEN 0.01
    WHEN boost_package_id = 2 THEN 0.015
    WHEN boost_package_id = 3 THEN 0.02
    WHEN boost_package_id = 4 THEN 0.025
    WHEN boost_package_id = 5 THEN 0.03
    ELSE 0.01
  END,
  farming_start_timestamp = created_at,
  farming_last_update = updated_at
WHERE farming_rate IS NULL;

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_uni_farming_active ON uni_farming_data(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ton_farming_active ON ton_farming_data(boost_active) WHERE boost_active = true;
CREATE INDEX IF NOT EXISTS idx_uni_farming_user ON uni_farming_data(user_id);
CREATE INDEX IF NOT EXISTS idx_ton_farming_user ON ton_farming_data(user_id);