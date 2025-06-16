-- Создание таблицы boost_purchases для системы покупки Boost-пакетов
-- T51: Реализация покупки Boost-пакета через внутренний и внешний TON-кошелёк

CREATE TABLE IF NOT EXISTS boost_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  boost_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('wallet', 'ton')),
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_boost_purchases_user_id ON boost_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_status ON boost_purchases(status);
CREATE INDEX IF NOT EXISTS idx_boost_purchases_tx_hash ON boost_purchases(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boost_purchases_created_at ON boost_purchases(created_at);

-- Комментарии к таблице и полям
COMMENT ON TABLE boost_purchases IS 'Таблица покупок Boost-пакетов через внутренний и внешний TON кошелек';
COMMENT ON COLUMN boost_purchases.id IS 'Уникальный идентификатор покупки';
COMMENT ON COLUMN boost_purchases.user_id IS 'ID пользователя (telegram_id)';
COMMENT ON COLUMN boost_purchases.boost_id IS 'ID Boost-пакета';
COMMENT ON COLUMN boost_purchases.source IS 'Источник оплаты: wallet (внутренний) или ton (внешний)';
COMMENT ON COLUMN boost_purchases.tx_hash IS 'Хеш транзакции в блокчейне (только для внешних платежей)';
COMMENT ON COLUMN boost_purchases.status IS 'Статус покупки: pending, confirmed, failed';
COMMENT ON COLUMN boost_purchases.created_at IS 'Дата создания записи';
COMMENT ON COLUMN boost_purchases.updated_at IS 'Дата последнего обновления';