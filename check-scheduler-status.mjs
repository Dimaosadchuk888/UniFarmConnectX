import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchedulerStatus() {
  console.log('=== ПРОВЕРКА СОСТОЯНИЯ ПЛАНИРОВЩИКА ===\n');

  // 1. Последние транзакции FARMING_REWARD
  const { data: recentTx, error: txError } = await supabase
    .from('transactions')
    .select('created_at, user_id, amount_uni, status')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Последние 5 транзакций FARMING_REWARD:');
  if (recentTx && recentTx.length > 0) {
    recentTx.forEach(tx => {
      const time = new Date(tx.created_at).toLocaleTimeString();
      console.log(`  ${time} - User ${tx.user_id}: ${tx.amount_uni} UNI (${tx.status})`);
    });
    
    // Проверяем интервал между транзакциями
    if (recentTx.length > 1) {
      const time1 = new Date(recentTx[0].created_at);
      const time2 = new Date(recentTx[1].created_at);
      const diffMinutes = Math.abs(time1 - time2) / (1000 * 60);
      console.log(`\nИнтервал между последними транзакциями: ${diffMinutes.toFixed(2)} минут`);
    }
  } else {
    console.log('  Транзакции не найдены');
  }

  // 2. Проверка временных меток обновления
  const { data: farmers, error: farmersError } = await supabase
    .from('users')
    .select('id, uni_farming_last_update')
    .eq('uni_farming_active', true)
    .not('uni_farming_last_update', 'is', null)
    .order('uni_farming_last_update', { ascending: false })
    .limit(5);
    
  console.log('\n\nПоследние обновления временных меток (uni_farming_last_update):');
  if (farmers && farmers.length > 0) {
    farmers.forEach(f => {
      const time = new Date(f.uni_farming_last_update).toLocaleTimeString();
      const minutesAgo = (Date.now() - new Date(f.uni_farming_last_update)) / (1000 * 60);
      console.log(`  User ${f.id}: ${time} (${minutesAgo.toFixed(1)} минут назад)`);
    });
  } else {
    console.log('  Обновления временных меток не найдены');
  }

  // 3. Проверка активных фармеров
  const { data: activeFarmers, error: activeError } = await supabase
    .from('users')
    .select('id')
    .eq('uni_farming_active', true);
    
  console.log(`\n\nВсего активных фармеров: ${activeFarmers?.length || 0}`);

  console.log('\n✅ Проверка завершена');
}

checkSchedulerStatus().catch(console.error);