import { supabase } from '../core/supabase';

async function executeDatabaseSync() {
  console.log('🚀 НАЧИНАЮ СИНХРОНИЗАЦИЮ БАЗЫ ДАННЫХ С КОДОМ...\n');

  const sqlCommands = [
    {
      name: 'Добавление типов транзакций',
      sql: `
        DO $$
        BEGIN
          -- Проверяем и добавляем только несуществующие типы
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BOOST_REWARD' AND enumtypid = 'transaction_type'::regtype) THEN
            ALTER TYPE transaction_type ADD VALUE 'BOOST_REWARD';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MISSION_REWARD' AND enumtypid = 'transaction_type'::regtype) THEN
            ALTER TYPE transaction_type ADD VALUE 'MISSION_REWARD';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DAILY_BONUS' AND enumtypid = 'transaction_type'::regtype) THEN
            ALTER TYPE transaction_type ADD VALUE 'DAILY_BONUS';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REFERRAL_REWARD' AND enumtypid = 'transaction_type'::regtype) THEN
            ALTER TYPE transaction_type ADD VALUE 'REFERRAL_REWARD';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'WITHDRAWAL' AND enumtypid = 'transaction_type'::regtype) THEN
            ALTER TYPE transaction_type ADD VALUE 'WITHDRAWAL';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DEPOSIT' AND enumtypid = 'transaction_type'::regtype) THEN
            ALTER TYPE transaction_type ADD VALUE 'DEPOSIT';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FARMING_DEPOSIT' AND enumtypid = 'transaction_type'::regtype) THEN
            ALTER TYPE transaction_type ADD VALUE 'FARMING_DEPOSIT';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BOOST_PURCHASE' AND enumtypid = 'transaction_type'::regtype) THEN
            ALTER TYPE transaction_type ADD VALUE 'BOOST_PURCHASE';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AIRDROP_CLAIM' AND enumtypid = 'transaction_type'::regtype) THEN
            ALTER TYPE transaction_type ADD VALUE 'AIRDROP_CLAIM';
          END IF;
        END $$;
      `
    },
    {
      name: 'Добавление поля last_active в users',
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT NOW();`
    },
    {
      name: 'Добавление недостающих полей в users (часть 1)',
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS guest_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS referred_by_user_id INTEGER REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS farming_start_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS last_farming_claim TIMESTAMP,
        ADD COLUMN IF NOT EXISTS total_farming_earned NUMERIC(20,8) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS active_boost_id INTEGER,
        ADD COLUMN IF NOT EXISTS boost_end_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS missions_completed INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0;
      `
    },
    {
      name: 'Добавление недостающих полей в users (часть 2)',
      sql: `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_daily_bonus TIMESTAMP,
        ADD COLUMN IF NOT EXISTS airdrop_eligible BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS total_referral_earnings NUMERIC(20,8) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS referral_level INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS withdrawal_limit NUMERIC(20,8),
        ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS two_fa_secret VARCHAR(255),
        ADD COLUMN IF NOT EXISTS language_code VARCHAR(10) DEFAULT 'en';
      `
    },
    {
      name: 'Добавление недостающих полей в users (часть 3)',
      sql: `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
        ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS bio TEXT,
        ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS vip_expiry TIMESTAMP,
        ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
      `
    },
    {
      name: 'Добавление поля amount в transactions',
      sql: `
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS amount NUMERIC(20,8),
        ADD COLUMN IF NOT EXISTS currency VARCHAR(10);
      `
    },
    {
      name: 'Добавление полей в transactions (часть 1)',
      sql: `
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS from_user_id INTEGER REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS to_user_id INTEGER REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(20,8) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS fee_currency VARCHAR(10),
        ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(20,8),
        ADD COLUMN IF NOT EXISTS blockchain_network VARCHAR(50),
        ADD COLUMN IF NOT EXISTS blockchain_address VARCHAR(255),
        ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(255);
      `
    },
    {
      name: 'Добавление полей в transactions (часть 2)',
      sql: `
        ALTER TABLE transactions
        ADD COLUMN IF NOT EXISTS blockchain_confirmations INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS error_message TEXT,
        ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
        ADD COLUMN IF NOT EXISTS parent_transaction_id INTEGER REFERENCES transactions(id),
        ADD COLUMN IF NOT EXISTS batch_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS ip_address INET,
        ADD COLUMN IF NOT EXISTS user_agent TEXT,
        ADD COLUMN IF NOT EXISTS device_info JSONB,
        ADD COLUMN IF NOT EXISTS location_info JSONB;
      `
    },
    {
      name: 'Создание индексов для users',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
        CREATE INDEX IF NOT EXISTS idx_users_guest_id ON users(guest_id);
        CREATE INDEX IF NOT EXISTS idx_users_referred_by_user_id ON users(referred_by_user_id);
        CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
      `
    },
    {
      name: 'Создание индексов для transactions',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_transactions_amount ON transactions(amount);
        CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
        CREATE INDEX IF NOT EXISTS idx_transactions_from_user_id ON transactions(from_user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_to_user_id ON transactions(to_user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_blockchain_tx_hash ON transactions(blockchain_tx_hash);
      `
    },
    {
      name: 'Создание таблицы user_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS user_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          session_token VARCHAR(255) UNIQUE NOT NULL,
          ip_address INET,
          user_agent TEXT,
          device_info JSONB,
          location_info JSONB,
          last_activity TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    },
    {
      name: 'Создание индексов для user_sessions',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
      `
    },
    {
      name: 'Добавление полей в referrals',
      sql: `
        ALTER TABLE referrals
        ADD COLUMN IF NOT EXISTS inviter_id INTEGER REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS invited_id INTEGER REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_commission NUMERIC(20,8) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS parent_referral_id INTEGER REFERENCES referrals(id);
      `
    },
    {
      name: 'Добавление полей в user_missions',
      sql: `
        ALTER TABLE user_missions
        ADD COLUMN IF NOT EXISTS mission_id INTEGER NOT NULL,
        ADD COLUMN IF NOT EXISTS user_id INTEGER NOT NULL REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'in_progress',
        ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS target INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(20,8),
        ADD COLUMN IF NOT EXISTS reward_currency VARCHAR(10),
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
      `
    },
    {
      name: 'Создание таблицы referral_commissions',
      sql: `
        CREATE TABLE IF NOT EXISTS referral_commissions (
          id SERIAL PRIMARY KEY,
          from_user_id INTEGER NOT NULL REFERENCES users(id),
          to_user_id INTEGER NOT NULL REFERENCES users(id),
          source_transaction_id INTEGER REFERENCES transactions(id),
          level INTEGER NOT NULL,
          commission_rate NUMERIC(5,2) NOT NULL,
          commission_amount NUMERIC(20,8) NOT NULL,
          currency VARCHAR(10) NOT NULL,
          source_type VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `
    },
    {
      name: 'Создание индексов для referral_commissions',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_referral_commissions_from_user ON referral_commissions(from_user_id);
        CREATE INDEX IF NOT EXISTS idx_referral_commissions_to_user ON referral_commissions(to_user_id);
        CREATE INDEX IF NOT EXISTS idx_referral_commissions_created ON referral_commissions(created_at);
      `
    },
    {
      name: 'Создание таблицы system_settings',
      sql: `
        CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          key VARCHAR(100) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          value_type VARCHAR(50) DEFAULT 'string',
          description TEXT,
          is_public BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `
    },
    {
      name: 'Добавление системных настроек',
      sql: `
        INSERT INTO system_settings (key, value, value_type, description) VALUES
        ('uni_farming_base_rate', '0.01', 'number', 'Базовая ставка UNI фарминга (1% в день)'),
        ('ton_boost_enabled', 'true', 'boolean', 'Включен ли TON Boost'),
        ('referral_max_levels', '20', 'number', 'Максимальное количество уровней рефералов'),
        ('daily_bonus_base_amount', '5', 'number', 'Базовая сумма ежедневного бонуса UNI'),
        ('withdrawal_min_amount_ton', '1', 'number', 'Минимальная сумма вывода TON'),
        ('withdrawal_fee_percentage', '2', 'number', 'Комиссия за вывод в процентах')
        ON CONFLICT (key) DO NOTHING;
      `
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const command of sqlCommands) {
    console.log(`⚙️  Выполняю: ${command.name}...`);
    
    try {
      // Используем Supabase rpc для выполнения сырых SQL команд
      const { data, error } = await supabase.rpc('execute_sql', {
        query: command.sql
      });

      if (error) {
        // Если функция execute_sql не существует, попробуем альтернативный подход
        if (error.message.includes('function') || error.message.includes('execute_sql')) {
          console.log(`⚠️  RPC функция не найдена, пропускаю: ${command.name}`);
          console.log(`   SQL сохранен в scripts/sync-database-to-code-immediate.sql`);
        } else {
          console.error(`❌ Ошибка: ${error.message}`);
          errorCount++;
        }
      } else {
        console.log(`✅ Успешно: ${command.name}`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Критическая ошибка: ${err}`);
      errorCount++;
    }
  }

  console.log('\n📊 РЕЗУЛЬТАТЫ СИНХРОНИЗАЦИИ:');
  console.log(`✅ Успешно выполнено: ${successCount}`);
  console.log(`❌ Ошибок: ${errorCount}`);
  console.log(`📁 Полный SQL скрипт: scripts/sync-database-to-code-immediate.sql`);
  
  if (errorCount === sqlCommands.length) {
    console.log('\n⚠️  ВАЖНО: Не удалось выполнить команды через API.');
    console.log('Используйте SQL скрипт scripts/sync-database-to-code-immediate.sql');
    console.log('в Supabase SQL Editor для ручного выполнения.');
  }
}

executeDatabaseSync().catch(console.error);