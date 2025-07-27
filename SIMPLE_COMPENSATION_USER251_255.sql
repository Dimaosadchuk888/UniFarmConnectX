-- ПРОСТАЯ КОМПЕНСАЦИЯ: +2 TON для User 251 и 255

-- 1. Backup (на всякий случай)
CREATE TABLE backup_compensation_251_255 AS 
SELECT id, username, balance_ton FROM users WHERE id IN (251, 255);

-- 2. Проверяем текущие балансы
SELECT id, username, balance_ton as current_balance FROM users WHERE id IN (251, 255);

-- 3. Добавляем по 2 TON каждому
UPDATE users SET balance_ton = balance_ton + 2.0 WHERE id = 251;
UPDATE users SET balance_ton = balance_ton + 2.0 WHERE id = 255;

-- 4. Проверяем результат
SELECT 
    id, 
    username, 
    balance_ton as new_balance,
    '(+2 TON добавлено)' as note
FROM users WHERE id IN (251, 255);