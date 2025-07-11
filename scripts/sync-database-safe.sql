-- =====================================================
-- БЕЗОПАСНАЯ СИНХРОНИЗАЦИЯ БД С КОДОМ UNIFARM
-- Проверяет существование элементов перед добавлением
-- =====================================================

-- 1. ДОБАВЛЕНИЕ ТИПОВ ТРАНЗАКЦИЙ (с проверкой существования)
DO $$
BEGIN
  -- Проверяем каждый тип перед добавлением
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BOOST_REWARD' AND enumtypid = 'transaction_type'::regtype) THEN
    ALTER TYPE transaction_type ADD VALUE 'BOOST_REWARD';
    RAISE NOTICE 'Добавлен тип BOOST_REWARD';
  ELSE
    RAISE NOTICE 'Тип BOOST_REWARD уже существует';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MISSION_REWARD' AND enumtypid = 'transaction_type'::regtype) THEN
    ALTER TYPE transaction_type ADD VALUE 'MISSION_REWARD';
    RAISE NOTICE 'Добавлен тип MISSION_REWARD';
  ELSE
    RAISE NOTICE 'Тип MISSION_REWARD уже существует';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DAILY_BONUS' AND enumtypid = 'transaction_type'::regtype) THEN
    ALTER TYPE transaction_type ADD VALUE 'DAILY_BONUS';
    RAISE NOTICE 'Добавлен тип DAILY_BONUS';
  ELSE
    RAISE NOTICE 'Тип DAILY_BONUS уже существует';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REFERRAL_REWARD' AND enumtypid = 'transaction_type'::regtype) THEN
    ALTER TYPE transaction_type ADD VALUE 'REFERRAL_REWARD';
    RAISE NOTICE 'Добавлен тип REFERRAL_REWARD';
  ELSE
    RAISE NOTICE 'Тип REFERRAL_REWARD уже существует';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'WITHDRAWAL' AND enumtypid = 'transaction_type'::regtype) THEN
    ALTER TYPE transaction_type ADD VALUE 'WITHDRAWAL';
    RAISE NOTICE 'Добавлен тип WITHDRAWAL';
  ELSE
    RAISE NOTICE 'Тип WITHDRAWAL уже существует';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DEPOSIT' AND enumtypid = 'transaction_type'::regtype) THEN
    ALTER TYPE transaction_type ADD VALUE 'DEPOSIT';
    RAISE NOTICE 'Добавлен тип DEPOSIT';
  ELSE
    RAISE NOTICE 'Тип DEPOSIT уже существует';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FARMING_DEPOSIT' AND enumtypid = 'transaction_type'::regtype) THEN
    ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
    RAISE NOTICE 'Добавлен тип FARMING_DEPOSIT';
  ELSE
    RAISE NOTICE 'Тип FARMING_DEPOSIT уже существует';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BOOST_PURCHASE' AND enumtypid = 'transaction_type'::regtype) THEN
    ALTER TYPE transaction_type ADD VALUE 'BOOST_PURCHASE';
    RAISE NOTICE 'Добавлен тип BOOST_PURCHASE';
  ELSE
    RAISE NOTICE 'Тип BOOST_PURCHASE уже существует';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AIRDROP_CLAIM' AND enumtypid = 'transaction_type'::regtype) THEN
    ALTER TYPE transaction_type ADD VALUE 'AIRDROP_CLAIM';
    RAISE NOTICE 'Добавлен тип AIRDROP_CLAIM';
  ELSE
    RAISE NOTICE 'Тип AIRDROP_CLAIM уже существует';
  END IF;
END $$;

-- 2. КРИТИЧНО: Добавляем отсутствующее поле last_active в users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();

-- 3. Добавляем поля amount и currency в transactions (критично для работы системы)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS amount NUMERIC(20,8),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10);

-- 4. Проверяем текущее состояние
DO $$
DECLARE
  type_count INTEGER;
  has_last_active BOOLEAN;
  has_amount BOOLEAN;
BEGIN
  -- Проверяем количество типов транзакций
  SELECT COUNT(*) INTO type_count 
  FROM pg_enum 
  WHERE enumtypid = 'transaction_type'::regtype;
  
  -- Проверяем наличие поля last_active
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'last_active'
  ) INTO has_last_active;
  
  -- Проверяем наличие поля amount
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' 
    AND column_name = 'amount'
  ) INTO has_amount;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== РЕЗУЛЬТАТЫ СИНХРОНИЗАЦИИ ===';
  RAISE NOTICE 'Типов транзакций в БД: %', type_count;
  RAISE NOTICE 'Поле users.last_active: %', CASE WHEN has_last_active THEN 'существует ✅' ELSE 'отсутствует ❌' END;
  RAISE NOTICE 'Поле transactions.amount: %', CASE WHEN has_amount THEN 'существует ✅' ELSE 'отсутствует ❌' END;
  RAISE NOTICE '';
  
  IF type_count >= 10 AND has_last_active AND has_amount THEN
    RAISE NOTICE '✅ БАЗА ДАННЫХ ГОТОВА К РАБОТЕ!';
  ELSE
    RAISE NOTICE '⚠️ Требуется дополнительная настройка';
  END IF;
END $$;