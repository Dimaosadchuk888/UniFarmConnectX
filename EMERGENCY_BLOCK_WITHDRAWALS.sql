-- 🚨 ЭКСТРЕННАЯ БЛОКИРОВКА ВЫВОДА СРЕДСТВ
-- Выполнить НЕМЕДЛЕННО в Supabase SQL Editor
-- Время критично!

-- 1. НЕМЕДЛЕННАЯ БЛОКИРОВКА ВСЕХ ЗАТРОНУТЫХ ПОЛЬЗОВАТЕЛЕЙ
UPDATE users 
SET 
    withdrawal_blocked = true,
    withdrawal_block_reason = 'Проверка транзакций TON Boost - временная блокировка',
    withdrawal_blocked_at = NOW()
WHERE id IN (25, 184, 224, 192, 250, 287, 197, 220, 246, 258, 290, 251, 255);

-- 2. ПРОВЕРКА БЛОКИРОВКИ
SELECT id, username, balance_ton, ton_boost_active, withdrawal_blocked
FROM users 
WHERE id IN (25, 184, 224, 192, 250, 287, 197, 220, 246, 258, 290, 251, 255)
ORDER BY balance_ton DESC;

-- 3. ЛОГИРОВАНИЕ ДЕЙСТВИЯ
INSERT INTO admin_actions (
    action_type,
    description,
    metadata,
    created_at
) VALUES (
    'EMERGENCY_WITHDRAWAL_BLOCK',
    'Экстренная блокировка вывода для пользователей с багом BOOST_PURCHASE',
    jsonb_build_object(
        'affected_users', ARRAY[25, 184, 224, 192, 250, 287, 197, 220, 246, 258, 290, 251, 255],
        'reason', 'BOOST_PURCHASE транзакции с amount_ton = 0',
        'potential_loss', '131 TON'
    ),
    NOW()
);