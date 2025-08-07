import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function checkDepositTransactions() {
  console.log('[CheckDepositTransactions] Проверяем депозитные транзакции...\n');

  try {
    // Ищем транзакции с отрицательными суммами (депозиты)
    const { data: deposits, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'FARMING_REWARD')
      .lt('amount_uni', 0)  // Отрицательные суммы
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ERROR] Ошибка получения транзакций:', error);
      return;
    }

    console.log(`📊 Найдено ${deposits?.length || 0} депозитных транзакций (отрицательные суммы):\n`);
    
    deposits?.forEach(t => {
      console.log(`  ID: ${t.id}`);
      console.log(`  User: ${t.user_id}`);
      console.log(`  Type: ${t.type}`);
      console.log(`  Amount: ${t.amount_uni} UNI`);
      console.log(`  Description: ${t.description}`);
      console.log(`  Created: ${t.created_at}`);
      console.log('  ---');
    });

    // Проверяем также user_id=62
    console.log('\n🔍 Транзакции пользователя 62:');
    const { data: userTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', 62)
      .eq('type', 'FARMING_REWARD')
      .limit(5)
      .order('created_at', { ascending: false });

    userTransactions?.forEach(t => {
      console.log(`  ${t.created_at}: ${t.amount_uni} UNI - ${t.description}`);
    });

  } catch (error) {
    console.error('[ERROR] Общая ошибка:', error);
  }
}

checkDepositTransactions();