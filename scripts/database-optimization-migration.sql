-- ============================================
-- UniFarm Database Optimization Migration
-- Дата: 2025-08-01
-- ВАЖНО: Сделайте BACKUP перед выполнением!
-- ============================================

-- Проверка версии PostgreSQL
SELECT version();

-- ============================================
-- ФАЗА 1: ПОДГОТОВКА И ПРОВЕРКИ
-- ============================================

-- 1.1 Создаём временную таблицу для логирования миграции
CREATE TABLE IF NOT EXISTS migration_log (
  id SERIAL PRIMARY KEY,
  step VARCHAR(100),
  status VARCHAR(20),
  details TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

-- Начинаем транзакцию
BEGIN;

-- ============================================
-- ФАЗА 2: СИНХРОНИЗАЦИЯ ДАННЫХ
-- ============================================

-- 2.1 Синхронизация UNI farming данных (если есть расхождения)
UPDATE users u
SET 
  uni_deposit_amount = GREATEST(u.uni_deposit_amount, COALESCE(ufd.deposit_amount, 0)),
  uni_farming_balance = GREATEST(u.uni_farming_balance, COALESCE(ufd.farming_balance, 0)),
  uni_farming_rate = COALESCE(NULLIF(u.uni_farming_rate, 0), ufd.farming_rate, 0.01),
  uni_farming_active = u.uni_farming_active OR COALESCE(ufd.is_active, false)
FROM uni_farming_data ufd
WHERE u.id = ufd.user_id
  AND (u.uni_deposit_amount < ufd.deposit_amount 
       OR u.uni_farming_balance < ufd.farming_balance);

INSERT INTO migration_log (step, status, details)
VALUES ('sync_uni_farming', 'completed', 'Синхронизированы данные UNI farming');

-- 2.2 Синхронизация TON boost данных
UPDATE users u
SET 
  ton_boost_active = u.ton_boost_active OR COALESCE(tfd.boost_active, false),
  ton_boost_rate = GREATEST(u.ton_boost_rate, COALESCE(tfd.farming_rate, 0)),
  ton_farming_balance = GREATEST(u.ton_farming_balance, COALESCE(tfd.farming_balance, 0))
FROM ton_farming_data tfd
WHERE u.id = CAST(tfd.user_id AS INTEGER)
  AND (NOT u.ton_boost_active AND tfd.boost_active
       OR u.ton_boost_rate < tfd.farming_rate);

INSERT INTO migration_log (step, status, details)
VALUES ('sync_ton_boost', 'completed', 'Синхронизированы данные TON boost');

-- ============================================
-- ФАЗА 3: СОЗДАНИЕ VIEWS ДЛЯ СОВМЕСТИМОСТИ
-- ============================================

-- 3.1 View для полной информации о выводах
CREATE OR REPLACE VIEW withdraw_requests_full AS
SELECT 
  wr.id,
  wr.user_id,
  wr.amount_ton,
  wr.ton_wallet,
  wr.status,
  wr.created_at,
  wr.processed_at,
  wr.processed_by,
  u.telegram_id,
  u.username,
  u.first_name,
  u.balance_ton as current_balance
FROM withdraw_requests wr
JOIN users u ON wr.user_id = u.id;

-- 3.2 View для фарминг статуса
CREATE OR REPLACE VIEW user_farming_status AS
SELECT 
  id,
  telegram_id,
  username,
  -- UNI farming
  uni_farming_active,
  uni_deposit_amount,
  uni_farming_balance,
  uni_farming_rate,
  uni_farming_start_timestamp,
  uni_farming_last_update,
  -- TON boost
  ton_boost_active,
  ton_boost_package_id,
  ton_boost_rate,
  ton_farming_balance,
  -- Общие балансы
  balance_uni,
  balance_ton
FROM users;

-- 3.3 View для балансов
CREATE OR REPLACE VIEW user_balances AS
SELECT 
  id,
  telegram_id,
  username,
  balance_uni,
  balance_ton,
  uni_farming_balance,
  ton_farming_balance,
  (balance_uni + uni_farming_balance) as total_uni,
  (balance_ton + ton_farming_balance) as total_ton
FROM users;

-- 3.4 View для реферальной системы
CREATE OR REPLACE VIEW user_referral_stats AS
SELECT 
  u.id,
  u.telegram_id,
  u.username,
  u.ref_code,
  u.referred_by,
  r.username as referrer_username,
  COUNT(DISTINCT ref.id) as direct_referrals,
  COUNT(DISTINCT ref2.id) as level2_referrals
FROM users u
LEFT JOIN users r ON u.referred_by = r.id
LEFT JOIN users ref ON ref.referred_by = u.id
LEFT JOIN users ref2 ON ref2.referred_by = ref.id
GROUP BY u.id, u.telegram_id, u.username, u.ref_code, u.referred_by, r.username;

INSERT INTO migration_log (step, status, details)
VALUES ('create_views', 'completed', 'Созданы views для совместимости');

-- ============================================
-- ФАЗА 4: ДОБАВЛЕНИЕ ВЫЧИСЛЯЕМЫХ ПОЛЕЙ
-- ============================================

-- 4.1 Добавляем вычисляемые поля в transactions (если не существуют)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'unified_amount'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN unified_amount DECIMAL(20,6) 
    GENERATED ALWAYS AS (COALESCE(amount, amount_uni + amount_ton)) STORED;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'unified_currency'
  ) THEN
    ALTER TABLE transactions
    ADD COLUMN unified_currency VARCHAR(10)
    GENERATED ALWAYS AS (
      COALESCE(
        currency,
        CASE 
          WHEN amount_ton > 0 THEN 'TON'
          WHEN amount_uni > 0 THEN 'UNI'
          ELSE 'UNKNOWN'
        END
      )
    ) STORED;
  END IF;
END $$;

INSERT INTO migration_log (step, status, details)
VALUES ('add_computed_columns', 'completed', 'Добавлены вычисляемые поля в transactions');

-- ============================================
-- ФАЗА 5: СОЗДАНИЕ ИНДЕКСОВ
-- ============================================

-- 5.1 Индексы для users
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_balance_uni ON users(balance_uni) WHERE balance_uni > 0;
CREATE INDEX IF NOT EXISTS idx_users_balance_ton ON users(balance_ton) WHERE balance_ton > 0;
CREATE INDEX IF NOT EXISTS idx_users_farming_active ON users(uni_farming_active) WHERE uni_farming_active = true;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by) WHERE referred_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_ref_code ON users(ref_code);

-- 5.2 Индексы для transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_unified ON transactions(user_id, unified_currency, created_at DESC);

-- 5.3 Индексы для withdraw_requests
CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdraw_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_withdraw_user ON withdraw_requests(user_id, created_at DESC);

INSERT INTO migration_log (step, status, details)
VALUES ('create_indexes', 'completed', 'Созданы все необходимые индексы');

-- ============================================
-- ФАЗА 6: ОЧИСТКА ДУБЛИРУЮЩИХ ПОЛЕЙ
-- ============================================

-- 6.1 Удаляем дублирующие поля из withdraw_requests
ALTER TABLE withdraw_requests 
DROP COLUMN IF EXISTS telegram_id CASCADE,
DROP COLUMN IF EXISTS username CASCADE;

INSERT INTO migration_log (step, status, details)
VALUES ('clean_withdraw_requests', 'completed', 'Удалены дублирующие поля из withdraw_requests');

-- ============================================
-- ФАЗА 7: АРХИВИРОВАНИЕ И УДАЛЕНИЕ ТАБЛИЦ
-- ============================================

-- 7.1 Создаём архивные копии перед удалением
CREATE TABLE IF NOT EXISTS archive_uni_farming_data AS 
SELECT *, NOW() as archived_at FROM uni_farming_data;

CREATE TABLE IF NOT EXISTS archive_ton_farming_data AS 
SELECT *, NOW() as archived_at FROM ton_farming_data;

-- 7.2 Удаляем пустые/дублирующие таблицы
DROP TABLE IF EXISTS uni_farming_data CASCADE;
DROP TABLE IF EXISTS ton_farming_data CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;

INSERT INTO migration_log (step, status, details)
VALUES ('drop_duplicate_tables', 'completed', 'Удалены дублирующие таблицы, созданы архивы');

-- ============================================
-- ФАЗА 8: ФИНАЛЬНАЯ ОПТИМИЗАЦИЯ
-- ============================================

-- 8.1 Обновляем статистику для оптимизатора запросов
ANALYZE users;
ANALYZE transactions;
ANALYZE withdraw_requests;

-- 8.2 Создаём сводную статистику
INSERT INTO migration_log (step, status, details)
SELECT 
  'final_stats',
  'info',
  format('Users: %s, Transactions: %s, Withdrawals: %s',
    (SELECT COUNT(*) FROM users),
    (SELECT COUNT(*) FROM transactions),
    (SELECT COUNT(*) FROM withdraw_requests)
  );

-- ============================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ============================================

-- Проверяем успешность всех шагов
DO $$
DECLARE
  error_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO error_count
  FROM migration_log
  WHERE status = 'error';
  
  IF error_count > 0 THEN
    RAISE EXCEPTION 'Миграция завершена с ошибками. Проверьте migration_log';
  END IF;
END $$;

-- Фиксируем транзакцию
COMMIT;

-- ============================================
-- ПОСТ-МИГРАЦИОННЫЕ ПРОВЕРКИ
-- ============================================

-- Выводим сводку миграции
SELECT 
  step,
  status,
  details,
  executed_at
FROM migration_log
ORDER BY id;

-- Проверяем целостность данных
SELECT 
  'post_migration_check' as check_type,
  COUNT(DISTINCT u.id) as total_users,
  SUM(CASE WHEN u.balance_uni > 0 THEN 1 ELSE 0 END) as users_with_uni,
  SUM(CASE WHEN u.balance_ton > 0 THEN 1 ELSE 0 END) as users_with_ton,
  SUM(CASE WHEN u.uni_farming_active THEN 1 ELSE 0 END) as active_farmers,
  SUM(CASE WHEN u.ton_boost_active THEN 1 ELSE 0 END) as active_boosters
FROM users u;

-- ============================================
-- ИНСТРУКЦИИ ПОСЛЕ МИГРАЦИИ:
-- 
-- 1. Обновите код репозиториев:
--    - UniFarmingRepository - удалить ссылки на uni_farming_data
--    - TonFarmingRepository - удалить ссылки на ton_farming_data
--    - WithdrawController - использовать view withdraw_requests_full
-- 
-- 2. Обновите schema.ts:
--    - Удалить определения удалённых таблиц
--    - Добавить определения для views
-- 
-- 3. Протестируйте основные функции:
--    - Авторизация пользователей
--    - Отображение балансов
--    - Фарминг UNI
--    - TON boost
--    - Создание выводов
-- 
-- 4. Мониторьте производительность:
--    - Проверьте скорость запросов
--    - Следите за использованием индексов
-- ============================================