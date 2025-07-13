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

async function investigateBalanceUpdateIssue() {
  console.log('🔍 ИССЛЕДОВАНИЕ: Почему баланс UNI не обновляется после farming-операций\n');
  console.log('=' * 80);
  
  // 1. Проверка транзакций FARMING_REWARD
  console.log('\n📊 1. АНАЛИЗ ТРАНЗАКЦИЙ FARMING_REWARD');
  console.log('-' * 40);
  
  const { data: recentRewards, error: rewardsError } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'FARMING_REWARD')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (recentRewards && recentRewards.length > 0) {
    console.log(`Найдено ${recentRewards.length} последних транзакций FARMING_REWARD для user 74:\n`);
    
    let totalRewards = 0;
    recentRewards.forEach((tx, i) => {
      console.log(`  ${i + 1}. ID: ${tx.id}`);
      console.log(`     Время: ${new Date(tx.created_at).toLocaleString()}`);
      console.log(`     Сумма: ${tx.amount_uni} UNI`);
      console.log(`     Статус: ${tx.status}`);
      console.log(`     Currency: ${tx.currency}`);
      totalRewards += parseFloat(tx.amount_uni || 0);
    });
    
    console.log(`\n  📈 Сумма последних 5 наград: ${totalRewards.toFixed(6)} UNI`);
  } else {
    console.log('❌ Транзакции FARMING_REWARD не найдены');
  }
  
  // 2. Проверка текущего баланса пользователя
  console.log('\n\n💰 2. ТЕКУЩИЙ БАЛАНС ПОЛЬЗОВАТЕЛЯ');
  console.log('-' * 40);
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, balance_uni, uni_farming_active, uni_deposit_amount, uni_farming_last_update')
    .eq('id', 74)
    .single();
    
  if (user) {
    console.log(`User ID: ${user.id}`);
    console.log(`Баланс UNI: ${user.balance_uni}`);
    console.log(`Farming активен: ${user.uni_farming_active}`);
    console.log(`Сумма депозита: ${user.uni_deposit_amount}`);
    console.log(`Последнее обновление: ${user.uni_farming_last_update ? new Date(user.uni_farming_last_update).toLocaleString() : 'NULL'}`);
  }
  
  // 3. Проверка всех транзакций пользователя для расчета ожидаемого баланса
  console.log('\n\n📑 3. РАСЧЕТ ОЖИДАЕМОГО БАЛАНСА НА ОСНОВЕ ВСЕХ ТРАНЗАКЦИЙ');
  console.log('-' * 40);
  
  const { data: allTransactions, error: allTxError } = await supabase
    .from('transactions')
    .select('type, amount_uni, status')
    .eq('user_id', 74)
    .in('status', ['completed', 'confirmed']);
    
  if (allTransactions) {
    let calculatedBalance = 0;
    const transactionSummary = {};
    
    allTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount_uni || 0);
      if (!transactionSummary[tx.type]) {
        transactionSummary[tx.type] = { count: 0, total: 0 };
      }
      transactionSummary[tx.type].count++;
      transactionSummary[tx.type].total += amount;
      
      // Логика расчета баланса на основе типа транзакции
      if (tx.type === 'FARMING_REWARD' || tx.type === 'MISSION_REWARD' || 
          tx.type === 'REFERRAL_REWARD' || tx.type === 'DAILY_BONUS') {
        calculatedBalance += amount;
      } else if (tx.type === 'FARMING_DEPOSIT') {
        calculatedBalance -= amount;
      }
    });
    
    console.log('Сводка по типам транзакций:');
    Object.entries(transactionSummary).forEach(([type, data]) => {
      console.log(`  ${type}: ${data.count} транзакций, сумма: ${data.total.toFixed(6)} UNI`);
    });
    
    console.log(`\n📊 Расчетный баланс на основе транзакций: ${calculatedBalance.toFixed(6)} UNI`);
    console.log(`💰 Фактический баланс в БД: ${user?.balance_uni || 0} UNI`);
    console.log(`❗ Расхождение: ${Math.abs(calculatedBalance - (user?.balance_uni || 0)).toFixed(6)} UNI`);
  }
  
  // 4. Анализ последних изменений баланса
  console.log('\n\n🔄 4. АНАЛИЗ ИЗМЕНЕНИЙ БАЛАНСА');
  console.log('-' * 40);
  
  // Получаем историю транзакций с балансом (если такая есть)
  const { data: recentTx, error: recentTxError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (recentTx && recentTx.length > 0) {
    console.log('Последние 10 транзакций (все типы):');
    recentTx.forEach((tx, i) => {
      console.log(`\n  ${i + 1}. ${tx.type} - ${tx.amount_uni || 0} UNI`);
      console.log(`     Время: ${new Date(tx.created_at).toLocaleString()}`);
      console.log(`     Статус: ${tx.status}`);
      console.log(`     Метаданные: ${JSON.stringify(tx.metadata || {})}`);
    });
  }
  
  console.log('\n\n✅ Исследование завершено');
}

investigateBalanceUpdateIssue().catch(console.error);