-- 🛡️ БЕЗОПАСНЫЕ ИСПРАВЛЕНИЯ ДЛЯ ПРОДАКШЕНА
-- Предотвращение дублированных транзакций

-- 1. Создаем уникальный индекс для предотвращения дублированных DAILY_BONUS
-- Этот индекс предотвратит создание одинаковых бонусов в течение часа
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unique_daily_bonus_per_hour
ON transactions (user_id, type, amount, currency, (date_trunc('hour', created_at)))
WHERE type = 'DAILY_BONUS' AND currency = 'UNI';

-- 2. Создаем уникальный индекс для предотвращения дублированных FARMING_DEPOSIT  
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unique_farming_deposit_per_minute
ON transactions (user_id, type, amount, (date_trunc('minute', created_at)))
WHERE type = 'FARMING_DEPOSIT';

-- 3. Создаем уникальный индекс для предотвращения дублированных FARMING_REWARD
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unique_farming_reward_per_minute  
ON transactions (user_id, type, amount, (date_trunc('minute', created_at)))
WHERE type = 'FARMING_REWARD';

-- 4. Создаем индекс для быстрого поиска недавних транзакций
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_recent_by_user_type
ON transactions (user_id, type, created_at DESC)
WHERE created_at > NOW() - INTERVAL '1 hour';

-- 5. Добавляем constraint для предотвращения TON Boost дубликатов
ALTER TABLE transactions 
ADD CONSTRAINT IF NOT EXISTS chk_no_duplicate_boost_bonus 
CHECK (
  CASE 
    WHEN type = 'DAILY_BONUS' AND currency = 'UNI' 
    THEN (
      SELECT COUNT(*) 
      FROM transactions t2 
      WHERE t2.user_id = transactions.user_id 
        AND t2.type = 'DAILY_BONUS' 
        AND t2.currency = 'UNI'
        AND t2.amount = transactions.amount
        AND t2.created_at > transactions.created_at - INTERVAL '10 minutes'
        AND t2.id != transactions.id
    ) = 0
    ELSE TRUE
  END
);

COMMENT ON INDEX idx_unique_daily_bonus_per_hour IS 'Предотвращает дублированные DAILY_BONUS в течение часа';
COMMENT ON INDEX idx_unique_farming_deposit_per_minute IS 'Предотвращает дублированные FARMING_DEPOSIT в течение минуты';
COMMENT ON INDEX idx_unique_farming_reward_per_minute IS 'Предотвращает дублированные FARMING_REWARD в течение минуты';
COMMENT ON INDEX idx_transactions_recent_by_user_type IS 'Быстрый поиск недавних транзакций для проверки дубликатов';