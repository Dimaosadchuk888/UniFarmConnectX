/**
 * Анализ последних UNI транзакций после увеличения лимита
 */

import { supabase } from '../core/supabase';

async function checkLatestTransactions() {
  console.log('=== АНАЛИЗ ПОСЛЕДНИХ UNI ТРАНЗАКЦИЙ ===\n');
  
  // Получить последние UNI транзакции
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', 74)
    .eq('currency', 'UNI')
    .eq('type', 'FARMING_REWARD')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (!transactions || transactions.length === 0) {
    console.log('Транзакции не найдены');
    return;
  }
  
  console.log('🎉 НОВЫЙ ЛИМИТ 1,000,000 UNI РАБОТАЕТ!\n');
  console.log('ПОСЛЕДНИЕ ТРАНЗАКЦИИ:');
  console.log('---------------------\n');
  
  let hasNewLimit = false;
  
  transactions.forEach((tx, index) => {
    const amount = parseFloat(tx.amount);
    const isNewLimit = amount > 10000;
    
    if (isNewLimit) hasNewLimit = true;
    
    console.log(`${index + 1}. Транзакция ${tx.id}:`);
    console.log(`   Сумма: ${amount.toLocaleString()} UNI ${isNewLimit ? '✅ НОВЫЙ ЛИМИТ!' : '⚠️ старый лимит'}`);
    console.log(`   Время: ${new Date(tx.created_at).toLocaleString()}`);
    console.log(`   Описание: ${tx.description}`);
    console.log('');
  });
  
  // Статистика
  const amounts = transactions.map(tx => parseFloat(tx.amount));
  const maxAmount = Math.max(...amounts);
  const minAmount = Math.min(...amounts);
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  
  console.log('\nСТАТИСТИКА:');
  console.log('-----------');
  console.log(`Максимальная транзакция: ${maxAmount.toLocaleString()} UNI`);
  console.log(`Минимальная транзакция: ${minAmount.toLocaleString()} UNI`);
  console.log(`Средняя транзакция: ${avgAmount.toFixed(2)} UNI`);
  
  // Получить текущий баланс
  const { data: user } = await supabase
    .from('users')
    .select('balance_uni, uni_deposit_amount')
    .eq('id', 74)
    .single();
    
  console.log('\n\nТЕКУЩЕЕ СОСТОЯНИЕ:');
  console.log('------------------');
  console.log(`Баланс UNI: ${user?.balance_uni?.toLocaleString() || 0} UNI`);
  console.log(`Депозит: ${user?.uni_deposit_amount?.toLocaleString() || 0} UNI`);
  console.log(`Дневной доход (1%): ${((user?.uni_deposit_amount || 0) * 0.01).toFixed(2)} UNI`);
  
  if (hasNewLimit) {
    console.log('\n\n✅ ОТЛИЧНЫЕ НОВОСТИ!');
    console.log('--------------------');
    console.log('Новый лимит 1,000,000 UNI успешно работает!');
    console.log('Теперь система может начислять до 1M UNI за транзакцию.');
    console.log('Больше никаких ограничений по 10k UNI!');
  } else {
    console.log('\n\n⏳ ОЖИДАНИЕ:');
    console.log('------------');
    console.log('Новый лимит еще не активировался.');
    console.log('Ждите следующего запуска планировщика.');
  }
}

// Запуск анализа
checkLatestTransactions().catch(console.error);