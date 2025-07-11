-- Скрипт оптимизации базы данных UniFarm - Фаза 1
-- Дата: 2025-07-11
-- ВНИМАНИЕ: Выполняйте каждый блок по отдельности и проверяйте результаты!

-- ========================================
-- 1. УДАЛЕНИЕ НЕИСПОЛЬЗУЕМОГО ПОЛЯ last_active
-- ========================================
-- Проверка существования поля
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'last_active';

-- Удаление поля (выполнить если поле существует)
-- ВНИМАНИЕ: Поле есть в БД, но НЕ используется в коде
ALTER TABLE users DROP COLUMN IF EXISTS last_active;

-- ========================================
-- 2. КОНСОЛИДАЦИЯ ДУБЛИРУЮЩИХСЯ ПОЛЕЙ
-- ========================================

-- 2.1 Миграция данных из referrer_id в referred_by (если есть данные)
UPDATE users 
SET referred_by = referrer_id 
WHERE referrer_id IS NOT NULL 
  AND referred_by IS NULL;

-- Проверка результатов миграции
SELECT COUNT(*) as migrated_count 
FROM users 
WHERE referrer_id IS NOT NULL;

-- Удаление дублирующего поля referrer_id
ALTER TABLE users DROP COLUMN IF EXISTS referrer_id;

-- 2.2 Миграция данных из uni_farming_deposit в uni_deposit_amount (если есть данные)
UPDATE users 
SET uni_deposit_amount = uni_farming_deposit 
WHERE uni_farming_deposit IS NOT NULL 
  AND uni_farming_deposit > 0
  AND (uni_deposit_amount IS NULL OR uni_deposit_amount = 0);

-- Проверка результатов миграции
SELECT COUNT(*) as migrated_count 
FROM users 
WHERE uni_farming_deposit IS NOT NULL 
  AND uni_farming_deposit > 0;

-- Удаление дублирующего поля uni_farming_deposit
ALTER TABLE users DROP COLUMN IF EXISTS uni_farming_deposit;

-- ========================================
-- 3. ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ ТИПОВ ТРАНЗАКЦИЙ
-- ========================================

-- Проверка существующих типов
SELECT unnest(enum_range(NULL::transaction_type))::text as existing_types
ORDER BY existing_types;

-- Добавление недостающих типов (выполнять по одному)
DO $$
BEGIN
  -- FARMING_DEPOSIT
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'FARMING_DEPOSIT' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
  ) THEN
    ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
    RAISE NOTICE 'Добавлен тип FARMING_DEPOSIT';
  END IF;

  -- BOOST_PURCHASE
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'BOOST_PURCHASE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
  ) THEN
    ALTER TYPE transaction_type ADD VALUE 'BOOST_PURCHASE';
    RAISE NOTICE 'Добавлен тип BOOST_PURCHASE';
  END IF;

  -- DAILY_BONUS
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'DAILY_BONUS' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
  ) THEN
    ALTER TYPE transaction_type ADD VALUE 'DAILY_BONUS';
    RAISE NOTICE 'Добавлен тип DAILY_BONUS';
  END IF;

  -- MISSION_REWARD
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'MISSION_REWARD' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
  ) THEN
    ALTER TYPE transaction_type ADD VALUE 'MISSION_REWARD';
    RAISE NOTICE 'Добавлен тип MISSION_REWARD';
  END IF;

  -- REFERRAL_REWARD
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'REFERRAL_REWARD' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
  ) THEN
    ALTER TYPE transaction_type ADD VALUE 'REFERRAL_REWARD';
    RAISE NOTICE 'Добавлен тип REFERRAL_REWARD';
  END IF;

  -- BOOST_REWARD
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'BOOST_REWARD' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_type')
  ) THEN
    ALTER TYPE transaction_type ADD VALUE 'BOOST_REWARD';
    RAISE NOTICE 'Добавлен тип BOOST_REWARD';
  END IF;
END$$;

-- Проверка результатов
SELECT unnest(enum_range(NULL::transaction_type))::text as transaction_types
ORDER BY transaction_types;

-- ========================================
-- 4. ПРОВЕРКА РЕЗУЛЬТАТОВ ОПТИМИЗАЦИИ
-- ========================================

-- Проверка структуры таблицы users после изменений
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('last_active', 'referrer_id', 'referred_by', 
                      'uni_farming_deposit', 'uni_deposit_amount')
ORDER BY column_name;

-- Статистика по транзакциям
SELECT type, COUNT(*) as count
FROM transactions
GROUP BY type
ORDER BY count DESC;