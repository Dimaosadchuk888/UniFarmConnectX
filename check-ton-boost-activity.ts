import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTonBoostActivity() {
  console.log('=== Проверка активности TON Boost планировщика ===\n');

  // 1. Проверка активных TON Boost пользователей
  const { data: activeUsers, error: usersError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .not('boost_package_id', 'is', null);

  if (usersError) {
    console.error('❌ Ошибка при получении активных пользователей:', usersError);
    return;
  }

  console.log(`✅ Найдено активных TON Boost пользователей: ${activeUsers?.length || 0}\n`);

  // 2. Проверка последних транзакций TON_BOOST_INCOME
  const { data: recentTransactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'TON_BOOST_INCOME')
    .order('created_at', { ascending: false })
    .limit(10);

  if (txError) {
    console.error('❌ Ошибка при получении транзакций:', txError);
  } else {
    console.log(`📊 Найдено транзакций TON_BOOST_INCOME: ${recentTransactions?.length || 0}`);
    
    if (recentTransactions && recentTransactions.length > 0) {
      console.log('\nПоследние транзакции:');
      recentTransactions.forEach(tx => {
        const date = new Date(tx.created_at);
        console.log(`- ${date.toLocaleString()}: User ${tx.user_id}, Сумма: ${tx.amount_ton} TON`);
      });
    } else {
      console.log('❌ Транзакций TON_BOOST_INCOME не найдено!');
    }
  }

  // 3. Проверка времени с момента запуска сервера
  const serverStartTime = new Date(Date.now() - process.uptime() * 1000);
  console.log(`\n⏱️ Сервер запущен: ${serverStartTime.toLocaleString()}`);
  console.log(`⏱️ Время работы: ${Math.floor(process.uptime() / 60)} минут`);

  // 4. Проверка последних транзакций вообще
  const { data: allRecentTx, error: allTxError } = await supabase
    .from('transactions')
    .select('type, created_at, user_id, amount_ton, amount_uni')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!allTxError && allRecentTx) {
    console.log('\n📋 Последние 10 транзакций всех типов:');
    allRecentTx.forEach(tx => {
      const date = new Date(tx.created_at);
      const amount = tx.amount_ton ? `${tx.amount_ton} TON` : `${tx.amount_uni} UNI`;
      console.log(`- ${date.toLocaleString()}: ${tx.type} (User ${tx.user_id}): ${amount}`);
    });
  }

  // 5. Проверка баланса пользователя 74
  const { data: user74, error: userError } = await supabase
    .from('users')
    .select('id, balance_ton, balance_uni')
    .eq('id', 74)
    .single();

  if (!userError && user74) {
    console.log(`\n💰 Баланс пользователя 74: ${user74.balance_ton} TON, ${user74.balance_uni} UNI`);
  }

  // 6. Проверка пользователя 74 в ton_farming_data
  const { data: tonData74, error: tonError } = await supabase
    .from('ton_farming_data')
    .select('*')
    .eq('user_id', '74')
    .single();

  if (!tonError && tonData74) {
    console.log(`\n🎯 TON Farming данные пользователя 74:`);
    console.log(`- boost_package_id: ${tonData74.boost_package_id}`);
    console.log(`- farming_balance: ${tonData74.farming_balance}`);
    console.log(`- farming_rate: ${tonData74.farming_rate}`);
  } else {
    console.log(`\n❌ Пользователь 74 не имеет активного TON Boost`);
  }
}

checkTonBoostActivity().catch(console.error);