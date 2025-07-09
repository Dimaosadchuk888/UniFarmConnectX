-- Скрипт для включения начислений фарминга для пользователя 62
-- Решает проблему отсутствующих начислений из-за отсутствия uni_farming_rate

-- 1. Проверка текущего состояния пользователя
SELECT 
  id,
  telegram_id,
  balance_uni,
  uni_deposit_amount,
  uni_farming_start_timestamp,
  uni_farming_rate,
  uni_farming_last_update
FROM users 
WHERE id = 62;

-- 2. Установка uni_farming_rate для активации фарминга
UPDATE users
SET uni_farming_rate = '0.01'  -- 0.01 UNI в час (примерно 1% в день от депозита)
WHERE id = 62;

-- 3. Проверка результата
SELECT 
  id,
  telegram_id,
  balance_uni,
  uni_deposit_amount,
  uni_farming_start_timestamp,
  uni_farming_rate,
  uni_farming_last_update,
  -- Проверка, что все условия для активного фарминга выполнены
  CASE 
    WHEN uni_farming_start_timestamp IS NOT NULL 
      AND uni_deposit_amount IS NOT NULL 
      AND CAST(uni_deposit_amount AS DECIMAL) > 0
      AND uni_farming_rate IS NOT NULL 
      AND CAST(uni_farming_rate AS DECIMAL) > 0
    THEN 'АКТИВЕН'
    ELSE 'НЕАКТИВЕН'
  END as farming_status
FROM users 
WHERE id = 62;

-- После выполнения этого скрипта:
-- 1. Планировщик автоматически подхватит пользователя в следующем цикле (каждые 5 минут)
-- 2. Начисления будут происходить автоматически
-- 3. Баланс начнет увеличиваться с текущих 448.22702 UNI