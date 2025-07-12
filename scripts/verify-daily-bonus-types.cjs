#!/usr/bin/env node

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function verifyTypes() {
  console.log('=== ПРОВЕРКА ТИПОВ ТРАНЗАКЦИЙ В БД ===\n');

  // 1. Проверяем последнюю daily bonus транзакцию
  const { data: lastDailyBonus } = await supabase
    .from('transactions')
    .select('id, type, amount_uni, created_at')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log('Последняя транзакция user 74:');
  console.log(lastDailyBonus?.[0]);
  
  // 2. Проверяем таблицу daily_bonus_logs
  const { data: logs, error: logsError } = await supabase
    .from('daily_bonus_logs')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log('\nТаблица daily_bonus_logs:');
  if (logsError?.code === '42P01') {
    console.log('Таблица НЕ существует');
  } else if (logs?.length > 0) {
    console.log('Последняя запись:', logs[0]);
  } else {
    console.log('Записей нет');
  }
  
  // 3. Проверяем структуру таблицы transactions
  const { data: columns } = await supabase
    .rpc('get_table_columns', { table_name: 'transactions' });
    
  console.log('\nПоля таблицы transactions:');
  console.log(columns?.map(c => c.column_name).join(', '));
}

verifyTypes().catch(console.error);
