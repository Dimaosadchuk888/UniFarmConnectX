import { supabase } from './core/supabase';

async function checkWithdrawalTable() {
  console.log('Проверка таблицы withdrawal_requests...');
  
  // Проверяем, существует ли таблица
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      console.log('❌ Таблица withdrawal_requests НЕ существует');
      console.log('\nДля создания таблицы выполните в Supabase SQL Editor:');
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
    } else {
      console.log('Ошибка проверки таблицы:', error);
    }
  } else {
    console.log('✅ Таблица withdrawal_requests существует');
    console.log('Записей в таблице:', data?.length || 0);
  }
}

checkWithdrawalTable().catch(console.error);