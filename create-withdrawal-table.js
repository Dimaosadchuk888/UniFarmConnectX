const path = require('path');

async function createWithdrawalRequestsTable() {
  // Dynamically import TypeScript module
  const { supabase } = await import('./core/supabase.ts');
  
  console.log('Создание таблицы withdrawal_requests через Supabase...');
  
  // Проверяем, существует ли таблица
  const { data: existingData, error: checkError } = await supabase
    .from('withdrawal_requests')
    .select('id')
    .limit(1);
  
  if (!checkError) {
    console.log('Таблица withdrawal_requests уже существует');
    
    // Проверяем структуру
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .limit(0);
      
    console.log('Структура таблицы готова');
    return;
  }
  
  console.log('Таблица withdrawal_requests не найдена');
  console.log('Создайте таблицу в Supabase Dashboard со следующей структурой:');
  console.log(`
CREATE TABLE withdrawal_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'TON',
  wallet_address VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  admin_notes TEXT,
  admin_username VARCHAR(100),
  CHECK (amount > 0),
  CHECK (status IN ('pending', 'approved', 'rejected', 'processing'))
);

CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created_at ON withdrawal_requests(created_at);
  `);
}

createWithdrawalRequestsTable().catch(console.error);