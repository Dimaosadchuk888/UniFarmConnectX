# Инструкции по созданию таблиц в Supabase

## Необходимые действия

### 1. Откройте Supabase Dashboard
- Перейдите в SQL Editor вашего проекта Supabase
- URL: https://app.supabase.com/project/wunnsvicbebssrjqedor/sql/new

### 2. Выполните следующий SQL скрипт:

```sql
-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦЫ UNI_FARMING_DATA
-- =====================================================
CREATE TABLE IF NOT EXISTS uni_farming_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    deposit_amount NUMERIC(20, 9) DEFAULT 0,
    farming_balance NUMERIC(20, 9) DEFAULT 0,
    farming_rate NUMERIC(10, 6) DEFAULT 0.01,
    farming_start_timestamp TIMESTAMP WITH TIME ZONE,
    farming_last_update TIMESTAMP WITH TIME ZONE,
    farming_deposit NUMERIC(20, 9) DEFAULT 0,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для uni_farming_data
CREATE INDEX IF NOT EXISTS idx_uni_farming_active ON uni_farming_data(is_active);
CREATE INDEX IF NOT EXISTS idx_uni_farming_updated ON uni_farming_data(farming_last_update);

-- =====================================================
-- СОЗДАНИЕ ТАБЛИЦЫ TON_FARMING_DATA
-- =====================================================
CREATE TABLE IF NOT EXISTS ton_farming_data (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    farming_balance NUMERIC(20, 9) DEFAULT 0,
    farming_rate NUMERIC(10, 6) DEFAULT 0.01,
    farming_start_timestamp TIMESTAMP WITH TIME ZONE,
    farming_last_update TIMESTAMP WITH TIME ZONE,
    farming_accumulated NUMERIC(20, 9) DEFAULT 0,
    farming_last_claim TIMESTAMP WITH TIME ZONE,
    boost_active BOOLEAN DEFAULT FALSE,
    boost_package_id INTEGER,
    boost_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для ton_farming_data
CREATE INDEX IF NOT EXISTS idx_ton_farming_active ON ton_farming_data(boost_active);
CREATE INDEX IF NOT EXISTS idx_ton_farming_updated ON ton_farming_data(farming_last_update);

-- =====================================================
-- МИГРАЦИЯ ДАННЫХ ИЗ ТАБЛИЦЫ USERS
-- =====================================================

-- Миграция UNI farming данных
INSERT INTO uni_farming_data (
    user_id,
    deposit_amount,
    farming_balance,
    farming_rate,
    farming_start_timestamp,
    farming_last_update,
    farming_deposit,
    is_active
)
SELECT 
    id as user_id,
    COALESCE(uni_deposit_amount, 0) as deposit_amount,
    COALESCE(uni_farming_balance, 0) as farming_balance,
    COALESCE(uni_farming_rate, 0.01) as farming_rate,
    uni_farming_start_timestamp,
    uni_farming_last_update,
    COALESCE(uni_farming_deposit, 0) as farming_deposit,
    COALESCE(uni_farming_active, false) as is_active
FROM users
WHERE uni_farming_active = true OR uni_deposit_amount > 0
ON CONFLICT (user_id) DO NOTHING;

-- Миграция TON farming данных
INSERT INTO ton_farming_data (
    user_id,
    farming_balance,
    farming_rate,
    farming_start_timestamp,
    farming_last_update,
    farming_accumulated,
    farming_last_claim,
    boost_active,
    boost_package_id,
    boost_expires_at
)
SELECT 
    id as user_id,
    COALESCE(ton_farming_balance, 0) as farming_balance,
    COALESCE(ton_farming_rate, 0.01) as farming_rate,
    ton_farming_start_timestamp,
    ton_farming_last_update,
    COALESCE(ton_farming_accumulated, 0) as farming_accumulated,
    ton_farming_last_claim,
    COALESCE(ton_boost_active, false) as boost_active,
    ton_boost_package_id,
    ton_boost_expires_at
FROM users
WHERE ton_boost_active = true OR ton_farming_balance > 0
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =====================================================
SELECT 'uni_farming_data count:' as info, COUNT(*) as count FROM uni_farming_data
UNION ALL
SELECT 'ton_farming_data count:' as info, COUNT(*) as count FROM ton_farming_data;
```

### 3. После выполнения скрипта

Проверьте результаты:
- Должны быть созданы 2 новые таблицы
- В uni_farming_data должно быть около 10 записей
- В ton_farming_data может быть меньше записей (только пользователи с активным boost)

### 4. Включите Row Level Security (RLS)

```sql
-- Включение RLS для новых таблиц
ALTER TABLE uni_farming_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ton_farming_data ENABLE ROW LEVEL SECURITY;

-- Политики для uni_farming_data
CREATE POLICY "Users can view own uni farming data" ON uni_farming_data
    FOR SELECT USING (auth.uid()::text = (SELECT telegram_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update own uni farming data" ON uni_farming_data
    FOR UPDATE USING (auth.uid()::text = (SELECT telegram_id FROM users WHERE id = user_id));

-- Политики для ton_farming_data
CREATE POLICY "Users can view own ton farming data" ON ton_farming_data
    FOR SELECT USING (auth.uid()::text = (SELECT telegram_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update own ton farming data" ON ton_farming_data
    FOR UPDATE USING (auth.uid()::text = (SELECT telegram_id FROM users WHERE id = user_id));
```

## Важные замечания

1. **Резервная копия**: Перед выполнением рекомендуется сделать резервную копию данных
2. **Постепенная миграция**: Код уже обновлен для работы с новыми таблицами
3. **Обратная совместимость**: Старые поля в таблице users пока остаются для совместимости

## После создания таблиц

Запустите проверку:
```bash
npx tsx scripts/check-and-create-tables.ts
```

Если таблицы созданы успешно, вы увидите количество записей в каждой таблице.