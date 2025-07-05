-- Создание таблицы для заявок на вывод TON
-- Таблица хранит все заявки пользователей на вывод средств

CREATE TABLE IF NOT EXISTS withdraw_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL,
    telegram_id TEXT,
    username TEXT,
    amount_ton NUMERIC(20, 9) NOT NULL CHECK (amount_ton > 0),
    ton_wallet TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by TEXT -- username или telegram_id админа
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user_id ON withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_created_at ON withdraw_requests(created_at DESC);

-- Комментарии к полям
COMMENT ON TABLE withdraw_requests IS 'Заявки на вывод TON из системы UniFarm';
COMMENT ON COLUMN withdraw_requests.id IS 'Уникальный идентификатор заявки';
COMMENT ON COLUMN withdraw_requests.user_id IS 'ID пользователя из таблицы users';
COMMENT ON COLUMN withdraw_requests.telegram_id IS 'Telegram ID пользователя для отображения в админ-боте';
COMMENT ON COLUMN withdraw_requests.username IS 'Username пользователя для отображения в админ-боте';
COMMENT ON COLUMN withdraw_requests.amount_ton IS 'Сумма вывода в TON (с точностью до 9 знаков)';
COMMENT ON COLUMN withdraw_requests.ton_wallet IS 'Адрес TON кошелька получателя';
COMMENT ON COLUMN withdraw_requests.status IS 'Статус заявки: pending, approved, rejected';
COMMENT ON COLUMN withdraw_requests.created_at IS 'Дата и время создания заявки';
COMMENT ON COLUMN withdraw_requests.processed_at IS 'Дата и время обработки заявки';
COMMENT ON COLUMN withdraw_requests.processed_by IS 'Кто обработал заявку (username или telegram_id админа)';