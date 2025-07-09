-- Активируем фарминг для пользователя 62
UPDATE users 
SET uni_farming_active = true
WHERE id = 62;

-- Проверяем результат
SELECT 
    id,
    username,
    balance_uni,
    uni_deposit_amount,
    uni_farming_rate,
    uni_farming_active,
    uni_farming_start_timestamp
FROM users 
WHERE id = 62;